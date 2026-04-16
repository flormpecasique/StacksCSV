/**
 * transform.ts
 * Converts raw Hiro API transactions into clean CSV rows.
 *
 * IMPORTANT RULES:
 *  - Only STX token_transfer transactions are processed.
 *  - Only SUCCESSFUL transactions are included.
 *  - microSTX → STX conversion: divide by 1,000,000
 *  - If the queried address is the RECIPIENT  → populate Received columns
 *  - If the queried address is the SENDER     → populate Sent + Fee columns
 *  - Self-transfers (send to yourself)        → populate both Received and Sent
 */

import type { HiroTransaction, CsvRow } from "@/types";

// 1 STX = 1,000,000 microSTX
const MICROSTX_PER_STX = 1_000_000;

/**
 * Converts a microSTX string (from the API) to a human-readable STX string.
 * Returns empty string for zero or invalid values.
 *
 * @example microStxToStx("1500000") → "1.5"
 */
function microStxToStx(microStx: string): string {
  const raw = parseInt(microStx, 10);
  if (isNaN(raw) || raw === 0) return "";
  // Use toFixed(6) then strip trailing zeros
  const stx = (raw / MICROSTX_PER_STX).toFixed(6).replace(/\.?0+$/, "");
  return stx;
}

/**
 * Transforms a raw Hiro transaction into a CsvRow for the given wallet address.
 * Returns null if the transaction should be excluded (wrong type, failed, etc.)
 */
function transformTransaction(
  tx: HiroTransaction,
  walletAddress: string
): CsvRow | null {
  // ── Filter: only successful STX token_transfer transactions ──────────────
  if (tx.tx_type !== "token_transfer") return null;
  if (tx.tx_status !== "success") return null;
  if (!tx.token_transfer) return null;

  const { recipient_address, amount } = tx.token_transfer;
  const isSender    = tx.sender_address.toLowerCase() === walletAddress.toLowerCase();
  const isRecipient = recipient_address.toLowerCase()  === walletAddress.toLowerCase();

  // Address must be involved in this transaction
  if (!isSender && !isRecipient) return null;

  // ── Build the CSV row ─────────────────────────────────────────────────────
  const stxAmount = microStxToStx(amount);
  const feeAmount = isSender ? microStxToStx(tx.fee_rate) : "";

  return {
    date:             tx.burn_block_time_iso,
    // RECEIVED: populated only when the wallet address is the recipient
    receivedAmount:   isRecipient ? stxAmount : "",
    receivedCurrency: isRecipient ? "STX" : "",
    // SENT: populated only when the wallet address is the sender
    sentAmount:       isSender ? stxAmount : "",
    sentCurrency:     isSender ? "STX" : "",
    // FEE: only the sender pays the fee
    feeAmount,
    feeCurrency:      feeAmount ? "STX" : "",
    txHash:           tx.tx_id,
  };
}

/**
 * Filters and transforms an array of raw Hiro transactions for a wallet address.
 * Filters out non-STX-transfer and failed transactions, converts microSTX to STX.
 * Returns an array of CsvRow sorted newest-first.
 *
 * @param transactions  Raw HiroTransaction array from the API
 * @param walletAddress The Stacks principal address being queried
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

  // Sort newest first (ISO strings sort correctly lexicographically)
  rows.sort((a, b) => (a.date > b.date ? -1 : 1));

  return rows;
}

// ─── CSV Generation ────────────────────────────────────────────────────────

/**
 * Serializes CsvRow array into a valid CSV string.
 * Uses exact column names required by tax software.
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
    val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;

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
