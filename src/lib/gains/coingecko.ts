import { Decimal, toDecimal } from "../decimal";
import { requireAsset } from "../assets";
import type { FiatCurrency } from "../types";
import {
  PriceProvider,
  PriceUnavailableError,
  utcDayToCoinGecko,
} from "./provider";

/**
 * CoinGecko historical price provider.
 *
 * SECURITY DESIGN:
 * - Base URL is a PINNED constant. The asset id is resolved through the
 *   registry allowlist (requireAsset) and every URL segment/param is
 *   encodeURIComponent'd. There is no way for transaction data to steer the
 *   request to another host (SSRF-safe).
 * - `fetchImpl` is injectable so this is unit-testable without network and so
 *   a caller can swap in a server-side proxy that adds an API key. The key is
 *   NEVER read here — keeping it out of the client bundle. If you use the Pro
 *   API, put the key in a Vercel serverless route and point fetchImpl at it.
 * - Hard request timeout via AbortController (no hanging sockets → no DoS).
 * - Exponential backoff with jitter on 429/5xx, capped retries.
 * - Stablecoins short-circuit to ~1.0 so we don't spend rate-limit budget on them.
 */

const PINNED_BASE = "https://api.coingecko.com/api/v3";

export interface CoinGeckoOptions {
  fetchImpl?: typeof fetch;
  baseUrl?: string; // only to point at your own proxy; must be https
  timeoutMs?: number;
  maxRetries?: number;
  /** Treat these coingecko ids as pegged 1:1 to the fiat (skip network). */
  stableIds?: Set<string>;
}

const STABLE_IDS = new Set(["usd-coin", "tether", "dai"]);

export class CoinGeckoPriceProvider implements PriceProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly stableIds: Set<string>;

  constructor(opts: CoinGeckoOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    const base = opts.baseUrl ?? PINNED_BASE;
    if (!/^https:\/\//.test(base)) {
      throw new Error("CoinGecko base URL must be https");
    }
    this.baseUrl = base.replace(/\/+$/, "");
    this.timeoutMs = clampInt(opts.timeoutMs ?? 10_000, 1_000, 60_000);
    this.maxRetries = clampInt(opts.maxRetries ?? 4, 0, 8);
    this.stableIds = opts.stableIds ?? STABLE_IDS;
  }

  async getDailyPrice(
    assetId: string,
    dayUtc: string,
    fiat: FiatCurrency,
  ): Promise<Decimal> {
    const asset = requireAsset(assetId); // allowlist enforcement
    if (asset.coingeckoId === null) {
      throw new PriceUnavailableError(assetId, dayUtc, "no price feed configured");
    }
    const vs = fiat.toLowerCase();
    if (this.stableIds.has(asset.coingeckoId)) {
      return new Decimal(1); // pegged; avoid burning rate limit
    }

    const cgDate = utcDayToCoinGecko(dayUtc);
    // Every dynamic segment is encoded; nothing user-controlled reaches the host.
    const url =
      `${this.baseUrl}/coins/${encodeURIComponent(asset.coingeckoId)}/history` +
      `?date=${encodeURIComponent(cgDate)}&localization=false`;

    const body = await this.getJson(url, assetId, dayUtc);

    const price = body?.market_data?.current_price?.[vs];
    if (price === undefined || price === null) {
      throw new PriceUnavailableError(assetId, dayUtc, `no ${fiat} price in response`);
    }
    const d = toDecimal(price, "price");
    if (d.lt(0)) throw new PriceUnavailableError(assetId, dayUtc, "negative price");
    return d;
  }

  private async getJson(url: string, assetId: string, dayUtc: string): Promise<any> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          signal: controller.signal,
          headers: { accept: "application/json" },
          // no credentials, no cookies — this is a public read
        });
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          if (attempt++ >= this.maxRetries) {
            throw new PriceUnavailableError(assetId, dayUtc, `upstream ${res.status}`);
          }
          await sleep(backoffMs(attempt));
          continue;
        }
        if (!res.ok) {
          throw new PriceUnavailableError(assetId, dayUtc, `HTTP ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        // Network error / abort: retry a few times, then surface cleanly.
        if (err instanceof PriceUnavailableError) throw err;
        if (attempt++ >= this.maxRetries) {
          throw new PriceUnavailableError(assetId, dayUtc, describeError(err));
        }
        await sleep(backoffMs(attempt));
      } finally {
        clearTimeout(timer);
      }
    }
  }
}

function clampInt(n: number, min: number, max: number): number {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function backoffMs(attempt: number): number {
  const base = Math.min(1000 * 2 ** (attempt - 1), 15_000);
  return base + Math.floor(Math.random() * 250); // jitter avoids thundering herd
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.name === "AbortError" ? "timeout" : err.name;
  return "network error";
}
