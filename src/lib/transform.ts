/**
 * transform.ts
 * Converts raw Hiro API transactions into clean CSV rows.
 *
 * RULES:
 *  - Only STX token_transfer transactions are processed.
 *  - Only SUCCESSFUL transactions are included.
 *  - microSTX → STX: divide by 1,000,000
 *  - If the queried address is RECIPIENT  → populate Received columns
 *  - If the queried address is SENDER     → populate Sent + Fee columns
 *  - Self-transfers                       → populate both
 */

import type { HiroTransaction, CsvRow } from "@/types";

const MICROSTX_PER_STX = 1_000_000;

/**
 * Converts a microSTX string to a human-readable STX string.
 * Returns empty string for zero or invalid values.
 * @example microStxToStx("1500000") → "1.5"
 */
function microStxToStx(microStx: string): string {
  const raw = parseInt(microStx, 10);
  if (isNaN(raw) || raw === 0) return "";
  return (raw / MICROSTX_PER_STX).toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Transforms a single raw Hiro transaction into a CsvRow.
 * Returns null if the transaction should be excluded.
 */
function transformTransaction(
  tx: HiroTransaction,
  walletAddress: string
): CsvRow | null {
  if (tx.tx_type !== "token_transfer") return null;
  if (tx.tx_status !== "success") return null;
  if (!tx.token_transfer) return null;

  const { recipient_address, amount } = tx.token_transfer;
  const isSender    = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
  const isRecipient = recipient_address.toLowerCase()  === walletAddress.toLowerCase();

  if (!isSender && !isRecipient) return null;

  const stxAmount = microStxToStx(amount);
  const feeAmount = isSender ? microStxToStx(tx.fee_rate) : "";

  return {
    date:             tx.burn_block_time_iso,
    receivedAmount:   isRecipient ? stxAmount : "",
    receivedCurrency: isRecipient ? "STX" : "",
    sentAmount:       isSender ? stxAmount : "",
    sentCurrency:     isSender ? "STX" : "",
    feeAmount,
    feeCurrency:      feeAmount ? "STX" : "",
    txHash:           tx.tx_id,
  };
}

/**
 * Filters and transforms an array of raw Hiro transactions.
 * Returns CsvRow array sorted newest-first.
 */
export function transformTransactions(
  transactions: HiroTransaction[],
  walletAddress: string
): CsvRow[] {
  const rows: CsvRow[] = [];

  for (const tx of transactions) {
    const row = transformTransaction(tx, walletAddress);
    if (row) rows.push(row);
  }

  rows.sort((a, b) => (a.date > b.date ? -1 : 1));
  return rows;
}

// ─── CSV Generation ────────────────────────────────────────────────────────

/**
 * Serializes CsvRow array into a valid CSV string.
 * Column headers match Koinly / CoinTracking / Awaken format exactly.
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
  ];

  const escape = (val: string) =>
    val.includes(",") || val.includes('"')
      ? `"${val.replace(/"/g, '""')}"`
      : val;

  const lines = [
    HEADERS.join(","),
    ...rows.map((row) =>
      [
        escape(row.date),
        escape(row.receivedAmount),
        escape(row.receivedCurrency),
        escape(row.sentAmount),
        escape(row.sentCurrency),
        escape(row.feeAmount),
        escape(row.feeCurrency),
        escape(row.txHash),
      ].join(",")
    ),
  ];

  return lines.join("\n");
}
