/**
 * Centralized Decimal configuration.
 *
 * SECURITY / CORRECTNESS: money math must never use JS floats. `0.1 + 0.2`
 * is not `0.3`, and in a tax report that silent drift becomes a wrong number
 * reported to a tax authority. We route ALL arithmetic through decimal.js with
 * high precision and an explicit rounding mode, and only round to presentation
 * precision at the very end (see report.ts).
 */
import Decimal from "decimal.js";

// 40 significant digits is far more than any on-chain amount * fiat price needs.
// ROUND_HALF_UP is the most common expectation for tax rounding; if a specific
// jurisdiction requires banker's rounding, change this in one place.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

/** Parse any untrusted numeric input into a finite, safe Decimal or throw. */
export function toDecimal(value: unknown, field = "amount"): Decimal {
  // Reject the footguns explicitly rather than letting Decimal coerce them.
  if (value === null || value === undefined || value === "") {
    throw new RangeError(`Invalid ${field}: empty`);
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError(`Invalid ${field}: not finite`);
  }
  let d: Decimal;
  try {
    d = new Decimal(value as Decimal.Value);
  } catch {
    throw new RangeError(`Invalid ${field}: not a number`);
  }
  if (!d.isFinite()) throw new RangeError(`Invalid ${field}: not finite`);
  return d;
}

export const ZERO = new Decimal(0);
