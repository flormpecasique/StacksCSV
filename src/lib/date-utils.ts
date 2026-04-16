/**
 * date-utils.ts
 * Pure utility functions for date filtering and formatting.
 * All comparisons use UTC midnight to avoid timezone issues.
 */

import type { CsvRow } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string; // "YYYY-MM-DD"
  to:   string; // "YYYY-MM-DD"
}

export interface TransactionSummary {
  received:     number; // total STX received
  sent:         number; // total STX sent
  fees:         number; // total STX fees paid
  count:        number; // number of transactions
}

// ─── Date string helpers ───────────────────────────────────────────────────

/**
 * Formats a Date object as "YYYY-MM-DD" for use in HTML date inputs.
 */
export function formatDateForInput(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parses a "YYYY-MM-DD" string to a UTC midnight Date object.
 * The end-of-day boundary is handled in the filter with +1 day logic.
 */
function parseInputDate(dateStr: string): Date {
  // new Date("YYYY-MM-DD") is parsed as UTC midnight by the spec
  return new Date(dateStr + "T00:00:00.000Z");
}

// ─── Quick-range presets ───────────────────────────────────────────────────

/** Jan 1 → Dec 31 of the current year (UTC). */
export function getThisYearRange(): DateRange {
  const year = new Date().getUTCFullYear();
  return {
    from: `${year}-01-01`,
    to:   `${year}-12-31`,
  };
}

/** Jan 1 → Dec 31 of last year (UTC). */
export function getLastYearRange(): DateRange {
  const year = new Date().getUTCFullYear() - 1;
  return {
    from: `${year}-01-01`,
    to:   `${year}-12-31`,
  };
}

/** Today − 30 days → today (UTC). */
export function getLast30DaysRange(): DateRange {
  const today = new Date();
  const from  = new Date(today);
  from.setUTCDate(today.getUTCDate() - 30);
  return {
    from: formatDateForInput(from),
    to:   formatDateForInput(today),
  };
}

/** Returns the default range: current year. */
export function getDefaultRange(): DateRange {
  return getThisYearRange();
}

// ─── Filtering ─────────────────────────────────────────────────────────────

/**
 * Filters CsvRow array by a date range (inclusive on both ends).
 *
 * Comparison is done in UTC:
 *   include if:  fromMidnight <= txDate < (toMidnight + 1 day)
 *
 * @param rows      All fetched CSV rows
 * @param range     { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
 */
export function filterRowsByDateRange(
  rows: CsvRow[],
  range: DateRange
): CsvRow[] {
  if (!range.from && !range.to) return rows;

  const fromMs = range.from
    ? parseInputDate(range.from).getTime()
    : -Infinity;

  // "to" is inclusive: add 1 day so the entire "to" day is included
  const toMs = range.to
    ? parseInputDate(range.to).getTime() + 24 * 60 * 60 * 1000
    : Infinity;

  return rows.filter((row) => {
    const txMs = new Date(row.date).getTime();
    return txMs >= fromMs && txMs < toMs;
  });
}

// ─── Summary computation ───────────────────────────────────────────────────

/**
 * Computes aggregate stats from a CsvRow array.
 * Parses string amounts safely; invalid values are treated as 0.
 */
export function computeSummary(rows: CsvRow[]): TransactionSummary {
  let received = 0;
  let sent     = 0;
  let fees     = 0;

  for (const row of rows) {
    const r = parseFloat(row.receivedAmount);
    const s = parseFloat(row.sentAmount);
    const f = parseFloat(row.feeAmount);
    if (!isNaN(r)) received += r;
    if (!isNaN(s)) sent     += s;
    if (!isNaN(f)) fees     += f;
  }

  return {
    received: Math.round(received * 1_000_000) / 1_000_000,
    sent:     Math.round(sent     * 1_000_000) / 1_000_000,
    fees:     Math.round(fees     * 1_000_000) / 1_000_000,
    count:    rows.length,
  };
}

// ─── CSV filename ──────────────────────────────────────────────────────────

/**
 * Builds a descriptive filename for the CSV export.
 * Example: "stx-SP2J6ZY48-2025-01-01_to_2025-12-31.csv"
 */
export function buildCsvFilename(address: string, range: DateRange): string {
  const addr = address.slice(0, 10);
  if (range.from && range.to && range.from === `${new Date().getUTCFullYear()}-01-01` && range.to === `${new Date().getUTCFullYear()}-12-31`) {
    return `stx-${addr}-${new Date().getUTCFullYear()}.csv`;
  }
  const from = range.from || "start";
  const to   = range.to   || "end";
  return `stx-${addr}-${from}_to_${to}.csv`;
}
