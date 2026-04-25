// ─── Hiro API types ───────────────────────────────────────────────────────────

export interface HiroTransactionWithTransfers {
  tx: HiroTransaction;
  stx_sent:      string;
  stx_received:  string;
  stx_transfers: StxTransfer[];
  ft_transfers:  FtTransfer[];
  nft_transfers: unknown[];
}

export interface HiroTransaction {
  tx_id:             string;
  tx_type:           string;   // "token_transfer" | "contract_call" | "coinbase" | ...
  tx_status:         string;   // "success" | "abort_by_response" | ...
  block_time_iso?:   string;
  burn_block_time_iso?: string;
  burn_block_time?:  number;
  sender_address:    string;
  fee_rate:          string;
  contract_call?: {
    contract_id:     string;
    function_name:   string;
  };
  token_transfer?: {
    recipient_address: string;
    amount:            string;
    memo:              string;
  };
}

export interface StxTransfer {
  amount:    string;
  sender?:   string;
  recipient?: string;
}

export interface FtTransfer {
  amount:          string;
  asset_identifier: string;   // e.g. "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token::age000-governance-token"
  sender?:         string;
  recipient?:      string;
}

export interface TokenMetadata {
  symbol:   string;
  decimals: number;
  name:     string;
}

// ─── CSV row ──────────────────────────────────────────────────────────────────

/**
 * One row in the exported CSV.
 *
 * Compatible with Koinly, CoinTracking, and Awaken import formats.
 *
 * txType values:
 *   "STX Transfer"           – direct STX send/receive
 *   "FT Transfer"            – SIP-010 fungible token transfer
 *   "Contract Call"          – generic Clarity contract call
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

// ─── API response ─────────────────────────────────────────────────────────────

export interface ApiSuccessResponse {
  address: string;
  rows:    CsvRow[];
}
