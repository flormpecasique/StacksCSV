/**
 * Pricing stage. Converts raw on-chain flows into fiat-priced TaxEvents.
 *
 * This is the ONLY async / I/O part of the pipeline. Keeping it separate from
 * the matching engine means the engine stays pure and deterministic (easy to
 * audit and test), and all network concerns live here behind the PriceProvider.
 *
 * A crypto-to-crypto SWAP is correctly expanded into TWO taxable events at the
 * same instant: a disposal of the out-asset and an acquisition of the in-asset,
 * each valued at fiat FMV. This is the step most naive tax exports get wrong.
 */
import { Decimal, ZERO, toDecimal } from "./decimal";
import { normalizeFlow, NormalizedFlow } from "./validate";
import { toUtcDay } from "./prices/provider";
import type { PriceProvider } from "./prices/provider";
import type { FiatCurrency, RawFlow, TaxEvent } from "./types";

export interface PricingResult {
  events: TaxEvent[];
  /** Flows we could not price/parse, with the reason. Never silently dropped. */
  errors: Array<{ txid: string; reason: string }>;
}

export async function priceFlows(
  flows: RawFlow[],
  provider: PriceProvider,
  fiat: FiatCurrency,
  opts: { maxFlows?: number } = {},
): Promise<PricingResult> {
  if (!Array.isArray(flows)) throw new TypeError("flows must be an array");
  const maxFlows = opts.maxFlows ?? 100_000;
  if (flows.length > maxFlows) {
    throw new RangeError(`Too many flows (${flows.length} > ${maxFlows})`);
  }

  const events: TaxEvent[] = [];
  const errors: Array<{ txid: string; reason: string }> = [];

  for (let i = 0; i < flows.length; i++) {
    try {
      const f = normalizeFlow(flows[i], i);
      const produced = await priceOne(f, provider, fiat);
      events.push(...produced);
    } catch (err) {
      errors.push({
        txid: flows[i]?.txid ?? `index-${i}`,
        reason: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  // Deterministic order: by time, then txid. The engine relies on chronological
  // processing for FIFO/LIFO correctness.
  events.sort((a, b) => a.timestampMs - b.timestampMs || a.txid.localeCompare(b.txid));
  return { events, errors };
}

async function priceOne(
  f: NormalizedFlow,
  provider: PriceProvider,
  fiat: FiatCurrency,
): Promise<TaxEvent[]> {
  const day = toUtcDay(f.timestampMs);
  const feeFiat = await priceFee(f, provider, fiat, day);

  switch (f.kind) {
    case "acquire": {
      const qty = toDecimal(f.qty, "qty");
      const unit = await provider.getDailyPrice(f.asset!, day, fiat);
      return [{
        kind: "acquire", asset: f.asset!, qty,
        fiatCost: qty.mul(unit), feeFiat,
        timestampMs: f.timestampMs, txid: f.txid, note: f.note, warnings: [],
      }];
    }
    case "dispose": {
      const qty = toDecimal(f.qty, "qty");
      const unit = await provider.getDailyPrice(f.asset!, day, fiat);
      return [{
        kind: "dispose", asset: f.asset!, qty,
        fiatProceeds: qty.mul(unit), feeFiat,
        timestampMs: f.timestampMs, txid: f.txid, note: f.note, warnings: [],
      }];
    }
    case "income": {
      const qty = toDecimal(f.qty, "qty");
      const unit = await provider.getDailyPrice(f.asset!, day, fiat);
      return [{
        kind: "income", asset: f.asset!, qty,
        fiatValue: qty.mul(unit),
        timestampMs: f.timestampMs, txid: f.txid, note: f.note, warnings: [],
      }];
    }
    case "swap": {
      const qtyOut = toDecimal(f.qtyOut, "qtyOut");
      const qtyIn = toDecimal(f.qtyIn, "qtyIn");
      const unitOut = await provider.getDailyPrice(f.assetOut!, day, fiat);
      // Value both legs off the disposed side's FMV so proceeds == cost of the
      // acquired asset (the two sides of a swap are equal in fiat by definition
      // at execution). This avoids double-counting spread as phantom gain.
      const fiatValue = qtyOut.mul(unitOut);
      return [
        {
          kind: "dispose", asset: f.assetOut!, qty: qtyOut,
          fiatProceeds: fiatValue, feeFiat,
          timestampMs: f.timestampMs, txid: f.txid,
          note: f.note ? `${f.note} (swap out)` : "swap out", warnings: [],
        },
        {
          kind: "acquire", asset: f.assetIn!, qty: qtyIn,
          fiatCost: fiatValue, feeFiat: ZERO, // fee already charged on the dispose leg
          timestampMs: f.timestampMs, txid: f.txid,
          note: f.note ? `${f.note} (swap in)` : "swap in", warnings: [],
        },
      ];
    }
  }
}

async function priceFee(
  f: NormalizedFlow,
  provider: PriceProvider,
  fiat: FiatCurrency,
  day: string,
): Promise<Decimal> {
  if (f.feeQty === undefined || f.feeAsset === undefined) return ZERO;
  const feeQty = toDecimal(f.feeQty, "feeQty");
  if (feeQty.lte(0)) return ZERO;
  const unit = await provider.getDailyPrice(f.feeAsset, day, fiat);
  return feeQty.mul(unit);
}
