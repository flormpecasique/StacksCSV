import type { Decimal } from "../decimal";
import type { FiatCurrency } from "../types";
import type { PriceProvider } from "./provider";

/**
 * Wraps any PriceProvider with:
 * - de-duplication: one in-flight request per (asset, day, fiat), so a report
 *   with 500 transactions on 30 unique days makes 30 network calls, not 500.
 * - a bounded in-memory cache (privacy-first: nothing is persisted unless YOU
 *   plug in a storage backend; the raw wallet data never leaves the client).
 * - a concurrency limiter so we never open hundreds of sockets at once
 *   (protects both the user's browser and the upstream rate limit).
 *
 * SECURITY: cache keys are derived only from (asset, day, fiat) — never from
 * wallet addresses or txids — so the cache can't leak identifying data and is
 * safe to share across users if you later move it server-side.
 */
export interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/** Default: a plain Map with a hard size cap (simple LRU-ish eviction). */
class BoundedMapStore implements CacheStore {
  private map = new Map<string, string>();
  constructor(private max = 5000) {}
  get(key: string) {
    const v = this.map.get(key);
    if (v !== undefined) {
      // refresh recency
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: string, value: string) {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }
}

export class CachingPriceProvider implements PriceProvider {
  private inflight = new Map<string, Promise<Decimal>>();
  private store: CacheStore;
  private maxConcurrent: number;
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(
    private inner: PriceProvider,
    opts: { store?: CacheStore; maxConcurrent?: number } = {},
  ) {
    this.store = opts.store ?? new BoundedMapStore();
    this.maxConcurrent = Math.max(1, Math.min(opts.maxConcurrent ?? 4, 16));
  }

  async getDailyPrice(assetId: string, dayUtc: string, fiat: FiatCurrency): Promise<Decimal> {
    const key = `${fiat}|${assetId}|${dayUtc}`;

    const cached = this.store.get(key);
    if (cached !== undefined) {
      const { Decimal } = await import("../decimal");
      return new Decimal(cached);
    }

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const p = this.acquireSlot()
      .then(() => this.inner.getDailyPrice(assetId, dayUtc, fiat))
      .then((price) => {
        this.store.set(key, price.toString());
        return price;
      })
      .finally(() => {
        this.inflight.delete(key);
        this.releaseSlot();
      });

    this.inflight.set(key, p);
    return p;
  }

  private acquireSlot(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private releaseSlot() {
    const next = this.queue.shift();
    if (next) next();
    else this.active--;
  }
}
