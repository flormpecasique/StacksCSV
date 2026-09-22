/**
 * http-price.ts
 *
 * Fast, reliable pricing for the interactive flow. Instead of hitting CoinGecko
 * per day from the browser (slow, rate-limited, CORS-fragile), we:
 *   1. scan the flows for the unique assets + overall date range needed,
 *   2. make ONE request to our own /api/price proxy (same-origin: no CORS, and
 *      the server does 1 range call per asset + can hold a CoinGecko key), and
 *   3. serve every daily price from the returned series, in memory.
 *
 * Privacy note: /api/price only ever receives coin ids + a date range — never a
 * wallet address. The address never leaves the device through this path.
 */
import { Decimal, toDecimal } from "./decimal";
import { getAsset } from "./assets";
import { PriceUnavailableError, toUtcDay } from "./prices/provider";
import type { PriceProvider } from "./prices/provider";
import type { FiatCurrency, RawFlow } from "./types";

type Series = Array<[number, number]>; // [ms, price]

export interface PrefetchOptions {
  fiat: FiatCurrency;
  endpoint?: string;          // default "/api/price"
  signal?: AbortSignal;       // for an overall timeout
  fetchImpl?: typeof fetch;   // injectable for tests
  /** Max distance (days) between a needed day and the nearest priced point. */
  toleranceDays?: number;
}

const MS_DAY = 86_400_000;

function tsToMs(ts: string | number): number {
  const ms = typeof ts === "number" ? ts : Date.parse(ts);
  if (!Number.isFinite(ms)) throw new RangeError("bad timestamp in flow");
  return ms;
}

/** All (assetId, day-ms) the engine will ask about, given these flows. */
function collectNeeds(flows: RawFlow[]): { assets: Set<string>; minMs: number; maxMs: number } {
  const assets = new Set<string>();
  let minMs = Infinity, maxMs = -Infinity;
  const add = (asset: string | undefined, ms: number) => {
    if (!asset) return;
    assets.add(asset);
    if (ms < minMs) minMs = ms;
    if (ms > maxMs) maxMs = ms;
  };
  for (const f of flows) {
    const ms = tsToMs(f.timestamp);
    // A swap is priced off assetOut only (assetIn inherits that fiat value),
    // so we never need a price for assetIn.
    if (f.kind === "swap") add(f.assetOut, ms);
    else add(f.asset, ms);
    if (f.feeQty) add(f.feeAsset, ms);
  }
  return { assets, minMs, maxMs };
}

/**
 * Prefetch all needed prices and return a PriceProvider backed by memory.
 * Throws only on a total failure (network/timeout); individual unpriceable
 * assets surface later as PriceUnavailableError → the report's "review" section.
 */
export async function createPrefetchedProvider(
  flows: RawFlow[],
  opts: PrefetchOptions,
): Promise<PriceProvider> {
  const fiat = opts.fiat;
  const endpoint = opts.endpoint ?? "/api/price";
  const doFetch = opts.fetchImpl ?? fetch;
  const tolMs = (opts.toleranceDays ?? 3) * MS_DAY;

  const { assets, minMs, maxMs } = collectNeeds(flows);

  // Resolve to CoinGecko ids; assets without a feed are simply not fetched and
  // will throw PriceUnavailableError when asked (flagged for review, never $0).
  const ids = new Set<string>();
  for (const a of assets) {
    // Unknown tokens (not in the registry) are skipped here rather than crashing
    // the whole report; the pricing stage flags their transactions for review.
    const info = getAsset(a);
    if (info?.coingeckoId) ids.add(info.coingeckoId);
  }

  const byId = new Map<string, Series>();

  if (ids.size > 0 && Number.isFinite(minMs)) {
    // Pad the range so boundary days always have a surrounding point.
    const from = Math.floor((minMs - 2 * MS_DAY) / 1000);
    const to = Math.ceil((maxMs + 2 * MS_DAY) / 1000);
    const url =
      `${endpoint}?ids=${encodeURIComponent([...ids].join(","))}` +
      `&vs=${encodeURIComponent(fiat.toLowerCase())}&from=${from}&to=${to}`;

    const res = await doFetch(url, { signal: opts.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`price service error ${res.status}`);
    const body = (await res.json()) as { prices?: Record<string, Series> };
    for (const [id, series] of Object.entries(body.prices ?? {})) {
      if (Array.isArray(series)) byId.set(id, series);
    }
  }

  return {
    async getDailyPrice(assetId: string, dayUtc: string): Promise<Decimal> {
      const info = getAsset(assetId);
      if (!info || info.coingeckoId === null) {
        throw new PriceUnavailableError(assetId, dayUtc, "no price feed configured");
      }
      const series = byId.get(info.coingeckoId);
      if (!series || series.length === 0) {
        throw new PriceUnavailableError(assetId, dayUtc, "no price data returned");
      }
      const target = Date.parse(`${dayUtc}T12:00:00Z`);
      let best = series[0];
      let bestDiff = Math.abs(series[0][0] - target);
      for (let i = 1; i < series.length; i++) {
        const diff = Math.abs(series[i][0] - target);
        if (diff < bestDiff) { best = series[i]; bestDiff = diff; }
      }
      if (bestDiff > tolMs) {
        throw new PriceUnavailableError(assetId, dayUtc, "no priced point near this date");
      }
      return toDecimal(best[1], "price");
    },
  };
}

/** Re-export so callers can convert a flow timestamp to a day key if needed. */
export { toUtcDay };
