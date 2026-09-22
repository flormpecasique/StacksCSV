/**
 * adapter.ts
 * Bridges StacksCSV's parsed rows (CsvRow) into the engine's RawFlow[].
 *
 * The critical piece is GROUPING BY txHash: StacksCSV emits one row per side of
 * a transfer, so a DEX swap arrives as a "sent" row + a "received" row sharing a
 * txHash. We regroup them so a swap becomes a single `swap` flow (out + in at the
 * same instant) instead of a disconnected sale and purchase — which is what keeps
 * the cost basis of the acquired asset correct and avoids phantom gains.
 *
 * The CsvRow shape is redeclared locally (not imported from "@/types") so this
 * module stays self-contained and portable; your CsvRow satisfies it structurally.
 */
import type { RawFlow } from "./types";

export interface StacksCsvRow {
  date: string;
  receivedAmount: string;
  receivedCurrency: string;
  sentAmount: string;
  sentCurrency: string;
  feeAmount: string;
  feeCurrency: string;
  txHash: string;
  txType: string;
}

export interface AdapterOptions {
  /**
   * Classify a received row as taxable INCOME (staking reward, airdrop, payment)
   * rather than a plain acquisition. Income is taxed at receipt AND sets basis.
   * Wire this to your stacking-api data (e.g. match txHash against reward txs).
   */
  isIncome?: (row: StacksCsvRow) => boolean;
  /**
   * txHashes that are transfers between the user's OWN wallets. These are NOT
   * taxable and are excluded entirely (otherwise they look like sell + buy and
   * over-report). On-chain data alone can't detect these — you supply them.
   */
  selfTransferTxHashes?: Set<string>;
}

export interface AdapterResult {
  flows: RawFlow[];
  /** Rows/groups intentionally dropped, with why. Surface these, never hide them. */
  skipped: Array<{ txHash: string; reason: string }>;
}

const EPOCH0 = new Date(0).toISOString(); // StacksCSV's "missing date" marker

function hasVal(s: string | undefined): s is string {
  return typeof s === "string" && s.trim() !== "";
}

/** Convert StacksCSV rows into engine-ready flows. Pure, no I/O. */
export function csvRowsToRawFlows(
  rows: StacksCsvRow[],
  options: AdapterOptions = {},
): AdapterResult {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const selfTransfers = options.selfTransferTxHashes ?? new Set<string>();
  const isIncome = options.isIncome ?? (() => false);

  const flows: RawFlow[] = [];
  const skipped: AdapterResult["skipped"] = [];

  // Group rows by txHash, preserving order.
  const groups = new Map<string, StacksCsvRow[]>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || !hasVal(row.txHash)) {
      skipped.push({ txHash: row?.txHash ?? "(none)", reason: "row missing txHash" });
      continue;
    }
    if (row.date === EPOCH0 || !hasVal(row.date)) {
      skipped.push({ txHash: row.txHash, reason: "missing/epoch-0 date" });
      continue;
    }
    const g = groups.get(row.txHash) ?? [];
    g.push(row);
    groups.set(row.txHash, g);
  }

  for (const [txHash, group] of groups) {
    if (selfTransfers.has(txHash)) {
      skipped.push({ txHash, reason: "self-transfer (excluded, not taxable)" });
      continue;
    }

    const timestamp = group[0].date;

    // One fee per tx (the sender's row carries it). Take the first non-empty.
    const feeRow = group.find((r) => hasVal(r.feeAmount) && hasVal(r.feeCurrency));
    const feeAsset = feeRow?.feeCurrency;
    const feeQty = feeRow?.feeAmount;

    const sent = group.filter((r) => hasVal(r.sentCurrency) && hasVal(r.sentAmount));
    const received = group.filter((r) => hasVal(r.receivedCurrency) && hasVal(r.receivedAmount));
    const receivedIncome = received.filter((r) => isIncome(r));
    const receivedPlain = received.filter((r) => !isIncome(r));

    // --- Swap: exactly one sent + one plain received of a DIFFERENT asset ---
    if (
      sent.length === 1 &&
      receivedPlain.length === 1 &&
      receivedIncome.length === 0 &&
      sent[0].sentCurrency !== receivedPlain[0].receivedCurrency
    ) {
      flows.push({
        kind: "swap",
        assetOut: sent[0].sentCurrency,
        qtyOut: sent[0].sentAmount,
        assetIn: receivedPlain[0].receivedCurrency,
        qtyIn: receivedPlain[0].receivedAmount,
        timestamp,
        txid: txHash,
        note: sent[0].txType,
        ...(feeAsset && feeQty ? { feeAsset, feeQty } : {}),
      });
      continue;
    }

    // --- Otherwise: each leg is its own flow ---
    let feeAttached = false;
    const attachFee = (): Partial<RawFlow> => {
      if (feeAttached || !feeAsset || !feeQty) return {};
      feeAttached = true;
      return { feeAsset, feeQty };
    };

    // Disposals first so the fee (paid by the sender) attaches to a dispose.
    for (const r of sent) {
      flows.push({
        kind: "dispose",
        asset: r.sentCurrency,
        qty: r.sentAmount,
        timestamp,
        txid: txHash,
        note: r.txType,
        ...attachFee(),
      });
    }
    for (const r of receivedIncome) {
      flows.push({
        kind: "income",
        asset: r.receivedCurrency,
        qty: r.receivedAmount,
        timestamp,
        txid: txHash,
        note: r.txType,
      });
    }
    for (const r of receivedPlain) {
      flows.push({
        kind: "acquire",
        asset: r.receivedCurrency,
        qty: r.receivedAmount,
        timestamp,
        txid: txHash,
        note: r.txType,
        ...attachFee(),
      });
    }

    if (sent.length === 0 && received.length === 0) {
      skipped.push({ txHash, reason: "no received/sent amounts" });
    }
  }

  return { flows, skipped };
}
