/**
 * Input validation.
 *
 * SECURITY: everything here treats RawFlow as UNTRUSTED input. The data comes
 * from an external API (Hiro) and possibly user paste, so we validate shape,
 * ranges and types before any of it reaches the pricing or matching logic.
 * We fail loud on malformed rows instead of coercing them into plausible-but-
 * wrong numbers.
 */
import { toDecimal, Decimal } from "./decimal";
import { requireAsset } from "./assets";
import type { RawFlow } from "./types";

export interface NormalizedFlow extends RawFlow {
  timestampMs: number;
}

/** Parse a timestamp (ISO string or epoch ms) into a bounded epoch-ms number. */
export function parseTimestamp(ts: string | number, field = "timestamp"): number {
  let ms: number;
  if (typeof ts === "number") {
    ms = ts;
  } else if (typeof ts === "string") {
    ms = Date.parse(ts);
  } else {
    throw new RangeError(`Invalid ${field}: wrong type`);
  }
  if (!Number.isFinite(ms)) throw new RangeError(`Invalid ${field}: unparseable`);
  // Reject absurd dates (before Bitcoin genesis 2009, or far future) — these
  // are almost always corrupt rows and would fetch garbage historical prices.
  const MIN = Date.UTC(2009, 0, 1);
  const MAX = Date.now() + 24 * 3600 * 1000; // allow small clock skew
  if (ms < MIN || ms > MAX) throw new RangeError(`Invalid ${field}: out of range`);
  return ms;
}

/** Validate that a quantity string is positive and within the asset's precision. */
export function validateQty(asset: string, qty: unknown, field = "qty"): Decimal {
  const d = toDecimal(qty, field);
  if (d.lte(0)) throw new RangeError(`Invalid ${field}: must be > 0`);
  // Allowlist enforcement lives here so it holds no matter which price
  // provider is used: an unknown asset can't be priced reliably, so it must
  // surface as an error, never be silently valued at 0.
  const info = requireAsset(asset);
  if (d.decimalPlaces() > info.decimals) {
    throw new RangeError(
      `Invalid ${field}: ${d.decimalPlaces()} decimals exceeds ${asset} precision (${info.decimals})`,
    );
  }
  return d;
}

/** Normalize + validate one flow. Returns a typed, safe copy or throws. */
export function normalizeFlow(flow: RawFlow, index: number): NormalizedFlow {
  const where = `flow[${index}] (${flow.txid ?? "no-txid"})`;
  if (!flow || typeof flow !== "object") throw new RangeError(`${where}: not an object`);
  if (typeof flow.txid !== "string" || flow.txid.length === 0 || flow.txid.length > 128) {
    throw new RangeError(`${where}: invalid txid`);
  }
  const timestampMs = parseTimestamp(flow.timestamp, `${where}.timestamp`);

  switch (flow.kind) {
    case "acquire":
    case "dispose":
    case "income":
      if (!flow.asset) throw new RangeError(`${where}: missing asset`);
      validateQty(flow.asset, flow.qty, `${where}.qty`);
      break;
    case "swap":
      if (!flow.assetOut || !flow.assetIn) throw new RangeError(`${where}: swap needs assetIn/assetOut`);
      validateQty(flow.assetOut, flow.qtyOut, `${where}.qtyOut`);
      validateQty(flow.assetIn, flow.qtyIn, `${where}.qtyIn`);
      break;
    default:
      throw new RangeError(`${where}: unknown kind "${(flow as RawFlow).kind}"`);
  }

  if (flow.feeQty !== undefined) {
    if (!flow.feeAsset) throw new RangeError(`${where}: feeQty without feeAsset`);
    requireAsset(flow.feeAsset); // fee asset must also be priceable
    // Fee may legitimately be 0; only reject negatives / non-numbers.
    const f = toDecimal(flow.feeQty, `${where}.feeQty`);
    if (f.lt(0)) throw new RangeError(`${where}.feeQty: must be >= 0`);
  }

  return { ...flow, timestampMs };
}
