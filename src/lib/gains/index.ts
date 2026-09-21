/**
 * Public API for the realized-gains engine.
 *
 * Typical usage in StacksCSV (client-side, privacy-first):
 *
 *   import { computeRealizedGains, CoinGeckoPriceProvider, CachingPriceProvider } from "@/lib/gains";
 *
 *   const provider = new CachingPriceProvider(new CoinGeckoPriceProvider());
 *   const { result, summary, errors } = await computeRealizedGains(flows, provider, {
 *     method: "FIFO", fiat: "EUR", longTermThresholdDays: 0, // ES: no ST/LT split
 *   });
 *
 * `flows` is your parsed transactions mapped to RawFlow[]. Nothing is stored;
 * the only network calls are daily price lookups keyed by (asset, day).
 */
import { priceFlows } from "./pricing";
import { runEngine } from "./engine";
import { summarize, type ReportSummary } from "./report";
import type { EngineConfig, RawFlow, RealizedGainsResult } from "./types";
import type { PriceProvider } from "./prices/provider";

export async function computeRealizedGains(
  flows: RawFlow[],
  provider: PriceProvider,
  config: Partial<EngineConfig> = {},
): Promise<{
  result: RealizedGainsResult;
  summary: ReportSummary;
  errors: Array<{ txid: string; reason: string }>;
}> {
  const fiat = config.fiat ?? "USD";
  const { events, errors } = await priceFlows(flows, provider, fiat, {
    maxFlows: config.maxEvents,
  });
  const result = runEngine(events, config);
  const summary = summarize(result);
  return { result, summary, errors };
}

export { priceFlows } from "./pricing";
export { runEngine } from "./engine";
export { summarize } from "./report";
export type { ReportSummary } from "./report";
export { CoinGeckoPriceProvider } from "./prices/coingecko";
export { CachingPriceProvider } from "./prices/cache";
export { PriceUnavailableError, toUtcDay } from "./prices/provider";
export type { PriceProvider } from "./prices/provider";
export { getAsset, requireAsset, isKnownAsset } from "./assets";
export * from "./types";
