import type { CsvRow } from "@/types";

// ─── DateRange type ───────────────────────────────────────────────────────────

export interface DateRange {
  from: string;   // YYYY-MM-DD or ""
  to:   string;   // YYYY-MM-DD or ""
}

// ─── Preset ranges ────────────────────────────────────────────────────────────

export function getThisYearRange(): DateRange {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function getLastYearRange(): DateRange {
  const y = new Date().getFullYear() - 1;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

export function getLast30DaysRange(): DateRange {
  const now  = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { from, to: now.toISOString().slice(0, 10) };
}

export function getDefaultRange(): DateRange {
  return getThisYearRange();
}

// ─── Date range filtering ─────────────────────────────────────────────────────

export function filterRowsByDateRange(rows: CsvRow[], range: DateRange): CsvRow[] {
  const { from, to } = range;
  if (!from && !to) return rows;
  return rows.filter((r) => {
    const d = r.date.slice(0, 10);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
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
  totalReceived: number;
  totalSent:     number;
  totalFees:     number;
  txCount:       number;
  tokenSummary:  TokenSummaryEntry[];
  btcRewards:    number;
}

export function computeSummary(rows: CsvRow[]): Summary {
  let totalReceived = 0;
  let totalSent     = 0;
  let totalFees     = 0;

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

    if (recvCur === "STX") totalReceived += recv;
    if (sentCur === "STX") totalSent     += sent;
    if (fee > 0)           totalFees     += fee;

    if (recvCur && recvCur !== "STX") addToken(recvCur, recv, 0);
    if (sentCur && sentCur !== "STX") addToken(sentCur, 0, sent);
  }

  const tokenSummary: TokenSummaryEntry[] = [...tokenMap.entries()]
    .filter(([, v]) => v.received > 0 || v.sent > 0)
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => {
      if (a.currency === "BTC") return -1;
      if (b.currency === "BTC") return  1;
      return a.currency.localeCompare(b.currency);
    });

  const btcEntry   = tokenMap.get("BTC");
  const btcRewards = btcEntry?.received ?? 0;

  return { totalReceived, totalSent, totalFees, txCount: rows.length, tokenSummary, btcRewards };
}

// ─── CSV filename builder ─────────────────────────────────────────────────────

export function buildCsvFilename(address: string, range: DateRange): string {
  const short       = address.slice(0, 10);
  const currentYear = new Date().getFullYear().toString();
  const prevYear    = (new Date().getFullYear() - 1).toString();
  const { from, to } = range;

  if (from === `${currentYear}-01-01` && to === `${currentYear}-12-31`)
    return `stx-${short}-${currentYear}.csv`;
  if (from === `${prevYear}-01-01` && to === `${prevYear}-12-31`)
    return `stx-${short}-${prevYear}.csv`;

  return `stx-${short}-${from || "start"}_to_${to || "end"}.csv`;
}
