/**
 * transform.ts
 * Converts raw Hiro API transactions_with_transfers into clean CsvRows.
 */

import type { HiroTransactionWithTransfers, CsvRow } from "@/types";
import { getTokenMetadata } from "@/lib/hiro-api";

// ─── Date resolution ────────────────────────────────────────────────────────

/**
 * Returns the most accurate ISO timestamp for a transaction.
 *
 * Priority:
 *   1. block_time_iso       — Stacks block time (Nakamoto, ~5s precision)
 *   2. burn_block_time_iso  — Bitcoin anchor (pre-Nakamoto, ~10min granularity)
 *   3. Derive from Unix seconds (block_time → burn_block_time)
 *   4. Epoch 0 — explicit "missing" marker (NEVER current time, that's misleading)
 *
 * IMPORTANT: We trust the ISO string on its own without requiring the matching
 * Unix timestamp to also be present. The Hiro API sometimes returns only one
 * of the pair; rejecting valid ISO strings just because the Unix counterpart
 * is missing causes us to fall through to a wrong date.
 */
export function resolveTransactionDate(tx: HiroTransactionWithTransfers["tx"]): string {
  // Validate an ISO string by parsing it. Rejects empty, invalid, or epoch-1970 values.
  function tryIso(iso: string | undefined | null): string | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (isNaN(ms))                  return null;
    if (ms < 1_000_000_000_000)     return null; // before 2001 = clearly bogus
    return iso;
  }

  // 1. Stacks block time (Nakamoto, most accurate)
  const stacksIso = tryIso(tx.block_time_iso);
  if (stacksIso) return stacksIso;

  // 2. Bitcoin anchor block time (pre-Nakamoto, or Nakamoto fallback)
  const burnIso = tryIso(tx.burn_block_time_iso);
  if (burnIso) return burnIso;

  // 3. Derive from Unix timestamps (in seconds)
  const UNIX_2001 = 1_000_000_000;
  if (tx.block_time && tx.block_time > UNIX_2001) {
    return new Date(tx.block_time * 1000).toISOString();
  }
  if (tx.burn_block_time && tx.burn_block_time > UNIX_2001) {
    return new Date(tx.burn_block_time * 1000).toISOString();
  }

  // 4. Last resort: epoch 0 (1970-01-01).
  //    DO NOT use new Date().toISOString() — that puts the CURRENT time on
  //    every transaction with missing data, which is silently wrong.
  //    Showing 1970 makes broken data obvious instead of plausibly wrong.
  return new Date(0).toISOString();
}

// ─── Amount conversion ──────────────────────────────────────────────────────

export function rawToDecimal(raw: string, decimals: number): string {
  const value = parseInt(raw, 10);
  if (isNaN(value) || value === 0) return "";
  if (decimals === 0) return value.toString();
  const divisor = Math.pow(10, decimals);
  return (value / divisor).toFixed(decimals).replace(/\.?0+$/, "");
}

const microStxToStx = (raw: string) => rawToDecimal(raw, 6);

// ─── STX transfer rows ──────────────────────────────────────────────────────

function stxRows(
  item: HiroTransactionWithTransfers,
  walletAddress: string,
  date: string,
  includeFee: boolean
): CsvRow[] {
  const { tx } = item;
  if (tx.tx_type !== "token_transfer" || !tx.token_transfer) return [];

  const { recipient_address, amount } = tx.token_transfer;
  const isSender    = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
  const isRecipient = recipient_address.toLowerCase()  === walletAddress.toLowerCase();
  if (!isSender && !isRecipient) return [];

  const stxAmount = microStxToStx(amount);
  const feeAmount = isSender && includeFee ? microStxToStx(tx.fee_rate) : "";

  return [{
    date,
    receivedAmount:   isRecipient ? stxAmount : "",
    receivedCurrency: isRecipient ? "STX" : "",
    sentAmount:       isSender ? stxAmount : "",
    sentCurrency:     isSender ? "STX" : "",
    feeAmount,
    feeCurrency:      feeAmount ? "STX" : "",
    txHash:           tx.tx_id,
    txType:           "STX Transfer",
  }];
}

// ─── STX transfer rows from contract calls (swaps / DeFi) ───────────────────

/**
 * Captures STX that moves INSIDE a contract call (DEX swaps, DeFi, etc.) via the
 * `stx_transfers` array. `stxRows` above only handles `tx_type === "token_transfer"`
 * (direct sends), so without this the STX leg of a swap was silently dropped and
 * a swap looked like a one-sided FT transfer.
 *
 * This is called ONLY for non-token_transfer txs (see the main loop), so it can
 * never double-count a simple STX send that `stxRows` already produced.
 *
 * Notes:
 *  - `stx_transfers[].sender/recipient` are optional in the Hiro payload; entries
 *    that don't involve this wallet (internal protocol movements) are skipped.
 *  - The network fee is attached to the first outgoing STX leg only, exactly once,
 *    mirroring the fee logic in `stxRows` / `ftRows`.
 */
function stxTransferRows(
  item: HiroTransactionWithTransfers,
  walletAddress: string,
  date: string,
  includeFee: boolean
): CsvRow[] {
  const { tx } = item;
  if (!item.stx_transfers || item.stx_transfers.length === 0) return [];

  const wallet = walletAddress.toLowerCase();
  const rows: CsvRow[] = [];
  let feeUsed = false;

  // Human-readable label from the contract call when available.
  const fnName = tx.contract_call?.function_name;
  const label  = fnName ? `STX Transfer (${fnName})` : "STX Transfer (contract)";

  for (const t of item.stx_transfers) {
    const isSender    = (t.sender    ?? "").toLowerCase() === wallet;
    const isRecipient = (t.recipient ?? "").toLowerCase() === wallet;
    if (!isSender && !isRecipient) continue;

    const stxAmount = microStxToStx(t.amount);
    if (!stxAmount) continue; // zero/invalid amount → skip (matches rawToDecimal)

    const feeAmount = isSender && includeFee && !feeUsed ? microStxToStx(tx.fee_rate) : "";
    if (feeAmount) feeUsed = true;

    rows.push({
      date,
      receivedAmount:   isRecipient ? stxAmount : "",
      receivedCurrency: isRecipient ? "STX" : "",
      sentAmount:       isSender ? stxAmount : "",
      sentCurrency:     isSender ? "STX" : "",
      feeAmount,
      feeCurrency:      feeAmount ? "STX" : "",
      txHash:           tx.tx_id,
      txType:           label,
    });
  }

  return rows;
}

// ─── FT transfer rows ───────────────────────────────────────────────────────

async function ftRows(
  item: HiroTransactionWithTransfers,
  walletAddress: string,
  date: string,
  feeAlreadyClaimed: boolean
): Promise<CsvRow[]> {
  if (!item.ft_transfers || item.ft_transfers.length === 0) return [];

  const rows: CsvRow[] = [];
  const { tx } = item;
  let feeUsed = feeAlreadyClaimed;

  for (const ft of item.ft_transfers) {
    const wallet      = walletAddress.toLowerCase();
    const isSender    = ft.sender.toLowerCase()    === wallet;
    const isRecipient = ft.recipient.toLowerCase() === wallet;

    if (!isSender && !isRecipient) continue;

    const meta     = await getTokenMetadata(ft.asset_identifier);
    const ftAmount = rawToDecimal(ft.amount, meta.decimals);

    const feeAmount = isSender && !feeUsed ? microStxToStx(tx.fee_rate) : "";
    if (feeAmount) feeUsed = true;

    rows.push({
      date,
      receivedAmount:   isRecipient ? ftAmount : "",
      receivedCurrency: isRecipient ? meta.symbol : "",
      sentAmount:       isSender ? ftAmount : "",
      sentCurrency:     isSender ? meta.symbol : "",
      feeAmount,
      feeCurrency:      feeAmount ? "STX" : "",
      txHash:           tx.tx_id,
      txType:           `FT Transfer (${meta.symbol})`,
    });
  }

  return rows;
}

// ─── Main transform function ────────────────────────────────────────────────

export async function transformTransactions(
  transactions: HiroTransactionWithTransfers[],
  walletAddress: string
): Promise<CsvRow[]> {
  const { prefetchTokenMetadata } = await import("@/lib/hiro-api");
  const allAssetIds = transactions
    .flatMap(item => item.ft_transfers ?? [])
    .map(ft => ft.asset_identifier);
  await prefetchTokenMetadata(allAssetIds);

  const allRows: CsvRow[] = [];
  const wallet = walletAddress.toLowerCase();

  for (const item of transactions) {
    if (item.tx.tx_status !== "success") continue;

    const date = resolveTransactionDate(item.tx);
    const isTxSender = item.tx.sender_address.toLowerCase() === wallet;

    // Direct STX sends come through tx.token_transfer (stxRows); STX that moves
    // inside a contract call (swaps/DeFi) comes through stx_transfers. These are
    // mutually exclusive per tx, so we pick one source and never double-count.
    const stxR = item.tx.tx_type === "token_transfer"
      ? stxRows(item, walletAddress, date, true)
      : stxTransferRows(item, walletAddress, date, true);
    const stxClaimedFee = stxR.some(r => !!r.feeAmount);
    const ftR  = await ftRows(item, walletAddress, date, stxClaimedFee);

    if (
      stxR.length === 0 &&
      ftR.length > 0 &&
      isTxSender &&
      !ftR[0].feeAmount
    ) {
      ftR[0].feeAmount   = microStxToStx(item.tx.fee_rate);
      ftR[0].feeCurrency = "STX";
    }

    allRows.push(...stxR, ...ftR);
  }

  allRows.sort((a, b) => (a.date > b.date ? -1 : 1));
  return allRows;
}

// ─── CSV serialization ──────────────────────────────────────────────────────

export function rowsToCsv(rows: CsvRow[]): string {
  const HEADERS = [
    "Date", "Received Amount", "Received Currency",
    "Sent Amount", "Sent Currency",
    "Fee Amount", "Fee Currency",
    "TxHash", "Type",
  ];

  const esc = (v: string) =>
    v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;

  const lines = [
    HEADERS.join(","),
    ...rows.map(r => [
      esc(r.date),
      esc(r.receivedAmount),
      esc(r.receivedCurrency),
      esc(r.sentAmount),
      esc(r.sentCurrency),
      esc(r.feeAmount),
      esc(r.feeCurrency),
      esc(r.txHash),
      esc(r.txType),
    ].join(",")),
  ];

  return lines.join("\n");
}
