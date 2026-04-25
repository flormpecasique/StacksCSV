import type { CsvRow } from "@/types";

// ─── Date range filtering ─────────────────────────────────────────────────────

export function filterRowsByDateRange(
  rows: CsvRow[],
  from: string,
  to: string
): CsvRow[] {
  if (!from && !to) return rows;
  return rows.filter((r) => {
    const d = r.date.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

// ─── Summary computation ──────────────────────────────────────────────────────

export interface TokenSummaryEntry {
  currency: string;
  received: number;
  sent:     number;
}

export interface Summary {
  totalReceived: number;  // STX received
  totalSent:     number;  // STX sent (absolute)
  totalFees:     number;  // STX fees
  txCount:       number;
  tokenSummary:  TokenSummaryEntry[]; // non-STX tokens + BTC stacking rewards
  btcRewards:    number;              // total BTC from PoX (convenience field)
}

export function computeSummary(rows: CsvRow[]): Summary {
  let totalReceived = 0;
  let totalSent     = 0;
  let totalFees     = 0;

  // Map: currency → { received, sent }
  const tokenMap = new Map<string, { received: number; sent: number }>();

  function addToken(currency: string, received: number, sent: number) {
    const prev = tokenMap.get(currency) ?? { received: 0, sent: 0 };
    tokenMap.set(currency, {
      received: prev.received + received,
      sent:     prev.sent     + sent,
    });
  }

  for (const row of rows) {
    const recv    = parseFloat(row.receivedAmount)   || 0;
    const sent    = parseFloat(row.sentAmount)       || 0;
    const fee     = parseFloat(row.feeAmount)        || 0;
    const recvCur = row.receivedCurrency?.toUpperCase() ?? "";
    const sentCur = row.sentCurrency?.toUpperCase()     ?? "";

    // STX accounting
    if (recvCur === "STX") totalReceived += recv;
    if (sentCur === "STX") totalSent     += sent;
    if (fee > 0)           totalFees     += fee;  // fees are always STX

    // Non-STX tokens (FT tokens + BTC stacking rewards)
    if (recvCur && recvCur !== "STX") addToken(recvCur, recv, 0);
    if (sentCur && sentCur !== "STX") addToken(sentCur, 0, sent);
  }

  // Build sorted array: BTC first, then alphabetical
  const tokenSummary: TokenSummaryEntry[] = [...tokenMap.entries()]
    .filter(([, v]) => v.received > 0 || v.sent > 0)
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => {
      if (a.currency === "BTC") return -1;
      if (b.currency === "BTC") return  1;
      return a.currency.localeCompare(b.currency);
    });

  const btcEntry  = tokenMap.get("BTC");
  const btcRewards = btcEntry?.received ?? 0;

  return {
    totalReceived,
    totalSent,
    totalFees,
    txCount: rows.length,
    tokenSummary,
    btcRewards,
  };
}

// ─── CSV filename builder ─────────────────────────────────────────────────────

export function buildCsvFilename(address: string, from: string, to: string): string {
  const short = address.slice(0, 10);
  const currentYear = new Date().getFullYear().toString();

  const isFullYear =
    from === `${currentYear}-01-01` && to === `${currentYear}-12-31`;

  const isLastYear =
    from === `${parseInt(currentYear) - 1}-01-01` &&
    to   === `${parseInt(currentYear) - 1}-12-31`;

  if (isFullYear)  return `stx-${short}-${currentYear}.csv`;
  if (isLastYear)  return `stx-${short}-${parseInt(currentYear) - 1}.csv`;

  const fromLabel = from || "start";
  const toLabel   = to   || "end";
  return `stx-${short}-${fromLabel}_to_${toLabel}.csv`;
}

// ─── Date presets ─────────────────────────────────────────────────────────────

export function getDatePresets() {
  const now  = new Date();
  const year = now.getFullYear();

  return {
    thisYear: {
      from: `${year}-01-01`,
      to:   `${year}-12-31`,
    },
    lastYear: {
      from: `${year - 1}-01-01`,
      to:   `${year - 1}-12-31`,
    },
    last30: {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
  };
}
