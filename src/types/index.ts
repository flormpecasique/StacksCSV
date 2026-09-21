// ─── Hiro API: transactions ──────────────────────────────────────────────────

export interface HiroTransactionWithTransfers {
  tx: HiroTransaction;
  stx_sent:      string;
  stx_received:  string;
  stx_transfers: StxTransfer[];
  ft_transfers:  FtTransfer[];
  nft_transfers: unknown[];
}

export interface HiroTransaction {
  tx_id:                string;
  tx_type:              string;   // "token_transfer" | "contract_call" | "coinbase" | ...
  tx_status:            string;   // "success" | "abort_by_response" | ...
  block_time?:          number;   // Stacks block time (Unix seconds, Nakamoto)
  block_time_iso?:      string;
  burn_block_time?:     number;   // Bitcoin anchor block time (Unix seconds)
  burn_block_time_iso?: string;
  sender_address:       string;
  fee_rate:             string;
  contract_call?: {
    contract_id:   string;
    function_name: string;
  };
  token_transfer?: {
    recipient_address: string;
    amount:            string;
    memo:              string;
  };
}

export interface StxTransfer {
  amount:     string;
  sender?:    string;
  recipient?: string;
}

/**
 * SIP-010 fungible token transfer.
 * sender/recipient are required because transform.ts dereferences them directly.
 */
export interface FtTransfer {
  amount:           string;
  asset_identifier: string;   // e.g. "SP3K8...token::alex"
  sender:           string;
  recipient:        string;
}

/**
 * Paginated response from /extended/v1/address/{addr}/transactions_with_transfers
 */
export interface HiroTransactionsWithTransfersResponse {
  limit:   number;
  offset:  number;
  total:   number;
  results: HiroTransactionWithTransfers[];
}

// ─── Token metadata ──────────────────────────────────────────────────────────

export interface TokenMetadata {
  symbol:   string;
  decimals: number;
  name:     string;
}

// ─── CSV row ─────────────────────────────────────────────────────────────────

/**
 * One row in the exported CSV.
 *
 * Compatible with Koinly, CoinTracking, and Awaken import formats.
 *
 * txType values:
 *   "STX Transfer"           – direct STX send/receive
 *   "FT Transfer (SYMBOL)"   – SIP-010 fungible token transfer
 *   "Stacking Reward (PoX)"  – BTC reward from Proof-of-Transfer
 */
export interface CsvRow {
  date:             string;   // ISO 8601 UTC
  receivedAmount:   string;
  receivedCurrency: string;
  sentAmount:       string;
  sentCurrency:     string;
  feeAmount:        string;
  feeCurrency:      string;
  txHash:           string;
  txType:           string;
}

// ─── API responses (our own /api/transactions endpoint) ──────────────────────

export interface ApiSuccessResponse {
  address:       string;
  resolvedFrom?: string;   // present when input was a BNS name
  rows:          CsvRow[];
  total:         number;   // total tx count on-chain (before date filter)
}

export interface ApiErrorResponse {
  error: string;
}
