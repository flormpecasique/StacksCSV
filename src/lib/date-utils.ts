/**
 * date-utils.ts
 * Pure utility functions for date filtering, range presets, and summary computation.
 */

import type { CsvRow } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string; // "YYYY-MM-DD"
  to:   string; // "YYYY-MM-DD"
}

export interface TransactionSummary {
  received:     number;   // total STX received
  sent:         number;   // total STX sent
  fees:         number;   // total STX fees paid
  count:        number;   // total row count
  tokenSummary: Record<string, { received: number; sent: number }>; // per-token
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatDateForInput(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseInputDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

// ─── Presets ─────────────────────────────────────────────────────────────────

export function getThisYearRange(): DateRange {
  const year = new Date().getUTCFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function getLastYearRange(): DateRange {
  const year = new Date().getUTCFullYear() - 1;
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function getLast30DaysRange(): DateRange {
  const today = new Date();
  const from  = new Date(today);
  from.setUTCDate(today.getUTCDate() - 30);
  return { from: formatDateForInput(from), to: formatDateForInput(today) };
}

export function getDefaultRange(): DateRange {
  return getThisYearRange();
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export function filterRowsByDateRange(rows: CsvRow[], range: DateRange): CsvRow[] {
  if (!range.from && !range.to) return rows;

  const fromMs = range.from ? parseInputDate(range.from).getTime() : -Infinity;
  const toMs   = range.to
    ? parseInputDate(range.to).getTime() + 24 * 60 * 60 * 1000
    : Infinity;

  return rows.filter(row => {
    const txMs = new Date(row.date).getTime();
    return txMs >= fromMs && txMs < toMs;
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────

/**
 * Computes aggregate stats.
 * STX figures are in the top-level received/sent/fees.
 * Other tokens accumulate in tokenSummary keyed by symbol.
 */
export function computeSummary(rows: CsvRow[]): TransactionSummary {
  let received = 0;
  let sent     = 0;
  let fees     = 0;
  const tokenSummary: Record<string, { received: number; sent: number }> = {};

  for (const row of rows) {
    const isStx = row.receivedCurrency === "STX" || row.sentCurrency === "STX";

    // STX
    if (isStx) {
      const r = parseFloat(row.receivedAmount); if (!isNaN(r)) received += r;
      const s = parseFloat(row.sentAmount);     if (!isNaN(s)) sent     += s;
    } else {
      // FT token
      const ticker = row.receivedCurrency || row.sentCurrency;
      if (ticker) {
        if (!tokenSummary[ticker]) tokenSummary[ticker] = { received: 0, sent: 0 };
        const r = parseFloat(row.receivedAmount); if (!isNaN(r)) tokenSummary[ticker].received += r;
        const s = parseFloat(row.sentAmount);     if (!isNaN(s)) tokenSummary[ticker].sent     += s;
      }
    }

    // Fees are always STX
    const f = parseFloat(row.feeAmount); if (!isNaN(f)) fees += f;
  }

  return {
    received: Math.round(received * 1_000_000) / 1_000_000,
    sent:     Math.round(sent     * 1_000_000) / 1_000_000,
    fees:     Math.round(fees     * 1_000_000) / 1_000_000,
    count:    rows.length,
    tokenSummary,
  };
}

// ─── Filename ─────────────────────────────────────────────────────────────────

export function buildCsvFilename(address: string, range: DateRange): string {
  const addr = address.slice(0, 10);
  const year = new Date().getUTCFullYear();
  if (
    range.from === `${year}-01-01` &&
    range.to   === `${year}-12-31`
  ) {
    return `stx-${addr}-${year}.csv`;
  }
  const from = range.from || "start";
  const to   = range.to   || "end";
  return `stx-${addr}-${from}_to_${to}.csv`;
}
