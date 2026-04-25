/**
 * transform.ts
 * Converts raw Hiro API transactions_with_transfers into clean CsvRows.
 *
 * KEY UPGRADES vs v1:
 *
 * 1. DATE FIX (Nakamoto compatibility)
 *    Pre-Nakamoto: use burn_block_time_iso (Bitcoin anchor timestamp)
 *    Post-Nakamoto: use block_time_iso (actual Stacks block time, more precise)
 *    Fallback: derive from burn_block_time unix seconds if ISO strings are missing/zero.
 *
 * 2. FT TRANSFER SUPPORT (SIP-010 tokens)
 *    Each transaction can have multiple ft_transfers.
 *    Each produces its own CsvRow with the correct token symbol + amount.
 *    The tx fee (STX) is credited to the FIRST row only.
 *
 * 3. AMOUNT PRECISION
 *    STX: divide by 1_000_000 (6 decimals)
 *    FT: divide by 10^decimals (8 for ALEX/sBTC/xBTC, 6 for most others, 0 for some)
 *
 * RULES (unchanged):
 *  - Only SUCCESSFUL transactions are exported
 *  - If user is RECIPIENT  → Received columns
 *  - If user is SENDER     → Sent columns + Fee (first row only)
 *  - Self-transfer         → Both Received and Sent
 */

import type { HiroTransactionWithTransfers, FtTransfer, CsvRow } from "@/types";
import { getTokenMetadata } from "@/lib/hiro-api";

// ─── Date resolution ────────────────────────────────────────────────────────

/**
 * Returns the most accurate ISO timestamp for a transaction.
 *
 * Priority:
 *   1. block_time_iso  — Stacks block time (Nakamoto, most accurate)
 *   2. burn_block_time_iso — Bitcoin anchor block time (pre-Nakamoto)
 *   3. Derived from unix timestamp burn_block_time * 1000
 *
 * A value of 0 or epoch (1970-01-01) is treated as "missing".
 */
export function resolveTransactionDate(tx: HiroTransactionWithTransfers["tx"]): string {
  const EPOCH_THRESHOLD = 1_000_000; // any Unix ts < this is clearly wrong (year 1970)

  // 1. Nakamoto block_time_iso
  if (
    tx.block_time_iso &&
    tx.block_time &&
    tx.block_time > EPOCH_THRESHOLD
  ) {
    return tx.block_time_iso;
  }

  // 2. Burn block (Bitcoin anchor) — pre-Nakamoto
  if (
    tx.burn_block_time_iso &&
    tx.burn_block_time &&
    tx.burn_block_time > EPOCH_THRESHOLD
  ) {
    return tx.burn_block_time_iso;
  }

  // 3. Derive from unix timestamp
  if (tx.burn_block_time && tx.burn_block_time > EPOCH_THRESHOLD) {
    return new Date(tx.burn_block_time * 1000).toISOString();
  }

  // 4. Last resort (should never happen for confirmed txs)
  return new Date().toISOString();
}

// ─── Amount conversion ──────────────────────────────────────────────────────

/**
 * Converts a raw integer amount string to a human-readable decimal string.
 * Strips trailing zeros. Returns "" for zero/invalid.
 *
 * @example rawToDecimal("150000000", 8) → "1.5"
 * @example rawToDecimal("1000000",   6) → "1"
 */
export function rawToDecimal(raw: string, decimals: number): string {
  const value = parseInt(raw, 10);
  if (isNaN(value) || value === 0) return "";
  if (decimals === 0) return value.toString();
  const divisor = Math.pow(10, decimals);
  return (value / divisor).toFixed(decimals).replace(/\.?0+$/, "");
}

// micro-STX has 6 decimals
const microStxToStx = (raw: string) => rawToDecimal(raw, 6);

// ─── STX transfer rows ──────────────────────────────────────────────────────

/**
 * Builds CsvRow(s) for the STX token_transfer in a transaction.
 * Returns [] if the transaction is not a token_transfer or doesn't involve the wallet.
 */
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

// ─── FT transfer rows ───────────────────────────────────────────────────────

/**
 * Builds CsvRow(s) for each FT (SIP-010) transfer in a transaction.
 * Token metadata (symbol + decimals) must already be in cache.
 * Fee is included only in the first row where the wallet is the sender.
 */
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
    const wallet    = walletAddress.toLowerCase();
    const isSender    = ft.sender.toLowerCase()    === wallet;
    const isRecipient = ft.recipient.toLowerCase() === wallet;

    // Skip if this wallet is not involved in this specific transfer
    if (!isSender && !isRecipient) continue;

    // Fetch token metadata (from cache — prefetched before this call)
    const meta       = await getTokenMetadata(ft.asset_identifier);
    const ftAmount   = rawToDecimal(ft.amount, meta.decimals);

    // Fee: only if sender, only for the first row of this tx
    const feeAmount  = isSender && !feeUsed ? microStxToStx(tx.fee_rate) : "";
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

/**
 * Transforms ALL fetched transactions into CsvRows.
 * Handles:
 *   - STX token_transfer (direct transfers)
 *   - FT transfers (SIP-010 tokens via contract calls)
 *   - Correct timestamps (Nakamoto-compatible)
 *   - Fee attribution (sender only, first row of tx)
 *
 * Sorted newest-first.
 */
export async function transformTransactions(
  transactions: HiroTransactionWithTransfers[],
  walletAddress: string
): Promise<CsvRow[]> {
  // Pre-fetch all unique FT token metadata in parallel
  const { prefetchTokenMetadata } = await import("@/lib/hiro-api");
  const allAssetIds = transactions
    .flatMap(item => item.ft_transfers ?? [])
    .map(ft => ft.asset_identifier);
  await prefetchTokenMetadata(allAssetIds);

  const allRows: CsvRow[] = [];
  const wallet = walletAddress.toLowerCase();

  for (const item of transactions) {
    // Skip failed transactions
    if (item.tx.tx_status !== "success") continue;

    const date = resolveTransactionDate(item.tx);

    // Determine if this wallet is the fee payer (sender of the tx)
    const isTxSender = item.tx.sender_address.toLowerCase() === wallet;

    // 1. STX transfer rows
    const stxR = stxRows(item, walletAddress, date, true /* include fee if applicable */);

    // 2. FT transfer rows
    //    Fee is only on the first row — if STX row already claimed it, skip for FT rows.
    const stxClaimedFee = stxR.some(r => !!r.feeAmount);
    const ftR  = await ftRows(item, walletAddress, date, stxClaimedFee);

    // If no STX transfer but wallet is sender of a contract_call with FT transfers,
    // the fee still belongs to the wallet — attach it to the first FT row.
    if (
      stxR.length === 0 &&
      ftR.length > 0 &&
      isTxSender &&
      !ftR[0].feeAmount
    ) {
      ftR[0].feeAmount  = microStxToStx(item.tx.fee_rate);
      ftR[0].feeCurrency = "STX";
    }

    // Combine: STX rows first, then FT rows
    allRows.push(...stxR, ...ftR);
  }

  // Sort newest-first (ISO strings sort lexicographically)
  allRows.sort((a, b) => (a.date > b.date ? -1 : 1));

  return allRows;
}

// ─── CSV serialization ──────────────────────────────────────────────────────

/**
 * Serializes CsvRow[] into a valid CSV string.
 *
 * Column order matches Koinly / CoinTracking / Awaken import format.
 * An extra "Type" column is appended (informational, ignored by most tax tools).
 */
export function rowsToCsv(rows: CsvRow[]): string {
  const HEADERS = [
    "Date",
    "Received Amount",
    "Received Currency",
    "Sent Amount",
    "Sent Currency",
    "Fee Amount",
    "Fee Currency",
    "TxHash",
    "Type",
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
