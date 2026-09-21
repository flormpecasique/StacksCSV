import type { Decimal } from "../decimal";
import type { FiatCurrency } from "../types";

/**
 * A price provider returns the fiat price of one unit of an asset on a given
 * UTC day. Daily granularity is what tax authorities accept and it caches
 * perfectly (one lookup per unique asset+day).
 */
export interface PriceProvider {
  getDailyPrice(assetId: string, dayUtc: string, fiat: FiatCurrency): Promise<Decimal>;
}

/** Thrown when a price genuinely can't be determined. We NEVER swallow this. */
export class PriceUnavailableError extends Error {
  constructor(
    public readonly assetId: string,
    public readonly dayUtc: string,
    public readonly reason: string,
  ) {
    super(`No price for ${assetId} on ${dayUtc}: ${reason}`);
    this.name = "PriceUnavailableError";
  }
}

/** Convert an epoch-ms timestamp to a stable UTC day key "YYYY-MM-DD". */
export function toUtcDay(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

/** CoinGecko's history endpoint wants "dd-mm-yyyy". */
export function utcDayToCoinGecko(dayUtc: string): string {
  const [y, m, d] = dayUtc.split("-");
  return `${d}-${m}-${y}`;
}
