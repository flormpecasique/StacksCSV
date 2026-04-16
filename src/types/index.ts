// ─── Raw Hiro API Types ────────────────────────────────────────────────────

export interface HiroTransaction {
  tx_id: string;
  tx_type:
    | "token_transfer"
    | "smart_contract"
    | "contract_call"
    | "coinbase"
    | "poison_microblock";
  tx_status:
    | "success"
    | "abort_by_response"
    | "abort_by_post_condition"
    | "pending";
  sender_address: string;
  fee_rate: string;            // microSTX as string
  burn_block_time_iso: string; // e.g. "2023-05-14T12:34:56.000Z"
  token_transfer?: {
    recipient_address: string;
    amount: string;            // microSTX as string
    memo: string;
  };
}

export interface HiroTransactionsResponse {
  limit: number;
  offset: number;
  total: number;
  results: HiroTransaction[];
}

// ─── Transformed / Exported Types ─────────────────────────────────────────

/**
 * A single row in the exported CSV.
 * Mirrors Koinly / Awaken / CoinTracking import format.
 */
export interface CsvRow {
  date: string;
  receivedAmount: string;
  receivedCurrency: string;
  sentAmount: string;
  sentCurrency: string;
  feeAmount: string;
  feeCurrency: string;
  txHash: string;
}

// ─── API Route Types ───────────────────────────────────────────────────────

export interface ApiSuccessResponse {
  rows: CsvRow[];
  total: number;
  fetched: number;
  address: string;        // the resolved SP... address
  resolvedFrom?: string;  // the original BNS name if one was used (e.g. "flor.btc")
}

export interface ApiErrorResponse {
  error: string;
}
