// ─── Raw Hiro API Types ────────────────────────────────────────────────────

/**
 * Raw transaction shape from /extended/v1/address/{addr}/transactions_with_transfers
 * Includes both STX and FT (SIP-010) transfer events.
 *
 * Key date fields:
 *   burn_block_time_iso  — Bitcoin anchor block timestamp (pre-Nakamoto, always present)
 *   block_time_iso       — Stacks block timestamp (Nakamoto+, more precise)
 */
export interface HiroTransaction {
  tx_id:      string;
  tx_type:    "token_transfer" | "smart_contract" | "contract_call" | "coinbase" | "poison_microblock";
  tx_status:  "success" | "abort_by_response" | "abort_by_post_condition" | "pending";
  sender_address: string;
  fee_rate:   string;           // microSTX as string

  // Timestamps — use block_time_iso when available (Nakamoto), else burn_block_time_iso
  burn_block_time:     number;  // Unix seconds (Bitcoin anchor)
  burn_block_time_iso: string;  // ISO 8601 UTC
  block_time?:         number;  // Unix seconds (Stacks block, Nakamoto only)
  block_time_iso?:     string;  // ISO 8601 UTC (Stacks block, Nakamoto only)

  // Present only for tx_type === "token_transfer"
  token_transfer?: {
    recipient_address: string;
    amount:            string;  // microSTX
    memo:              string;
  };
}

/**
 * FT (SIP-010 fungible token) transfer event within a transaction.
 * Returned by the transactions_with_transfers endpoint.
 */
export interface FtTransfer {
  asset_identifier: string;   // e.g. "SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-alex::alex"
  amount:           string;   // raw integer amount (needs decimals conversion)
  sender:           string;   // Stacks address
  recipient:        string;   // Stacks address
}

/**
 * STX transfer event within a transaction (detail level).
 */
export interface StxTransfer {
  amount:    string;          // microSTX
  sender:    string;
  recipient: string;
}

/**
 * One item from /extended/v1/address/{addr}/transactions_with_transfers
 */
export interface HiroTransactionWithTransfers {
  tx:            HiroTransaction;
  stx_sent:      string;      // total microSTX sent in this tx
  stx_received:  string;      // total microSTX received
  stx_transfers: StxTransfer[];
  ft_transfers:  FtTransfer[];
}

export interface HiroTransactionsWithTransfersResponse {
  limit:   number;
  offset:  number;
  total:   number;
  results: HiroTransactionWithTransfers[];
}

// ─── Token metadata from Hiro Token Metadata API ──────────────────────────

export interface TokenMetadata {
  symbol:   string;   // e.g. "ALEX", "WELSH", "sBTC"
  decimals: number;   // e.g. 8
  name:     string;   // e.g. "Alex Lab Token"
}

// ─── Transformed / Exported Types ─────────────────────────────────────────

/**
 * A single CSV row — one entry per token transfer event.
 * Multiple rows can share the same txHash (one STX + multiple FTs).
 *
 * Mirrors Koinly / Awaken / CoinTracking import format.
 */
export interface CsvRow {
  date:             string;   // ISO 8601 UTC
  receivedAmount:   string;   // token amount (empty if sender)
  receivedCurrency: string;   // "STX", "ALEX", "sBTC"… or ""
  sentAmount:       string;   // token amount (empty if recipient)
  sentCurrency:     string;   // token ticker or ""
  feeAmount:        string;   // STX (only for the sender, first row of the tx)
  feeCurrency:      string;   // "STX" or ""
  txHash:           string;
  txType:           string;   // "STX Transfer" | "FT Transfer" | etc. (informational)
}

// ─── API Route Types ───────────────────────────────────────────────────────

export interface ApiSuccessResponse {
  rows:          CsvRow[];
  total:         number;
  fetched:       number;
  address:       string;
  resolvedFrom?: string;
}

export interface ApiErrorResponse {
  error: string;
}
