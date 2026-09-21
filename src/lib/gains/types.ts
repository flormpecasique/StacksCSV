import type { Decimal } from "./decimal";

/** Cost-basis / lot-matching method. */
export type CostBasisMethod = "FIFO" | "LIFO" | "HIFO" | "ACB";

/** What to do when a disposal has no recorded acquisition to draw basis from. */
export type MissingBasisPolicy = "zero" | "error";

/** Fiat currency the whole report is denominated in (ISO 4217). */
export type FiatCurrency = "USD" | "EUR" | "GBP" | (string & {});

/**
 * A raw on-chain flow, BEFORE fiat pricing. This is the shape you map your
 * already-parsed Stacks transactions into. Amounts are in the asset's own
 * human units (e.g. STX, not microSTX) as strings to avoid float loss.
 */
export interface RawFlow {
  kind: "acquire" | "dispose" | "income" | "swap";
  /** ISO timestamp or epoch ms. Used to pick the historical price day. */
  timestamp: string | number;
  txid: string;
  note?: string;

  // acquire | dispose | income
  asset?: string;
  qty?: string;

  // swap (a swap is a dispose of `out` + acquire of `in`, same instant)
  assetOut?: string;
  qtyOut?: string;
  assetIn?: string;
  qtyIn?: string;

  /** Network/protocol fee for this tx, in a single asset (usually STX). */
  feeAsset?: string;
  feeQty?: string;
}

/** A priced, engine-ready event. Produced by pricing.ts from RawFlow. */
export type TaxEvent =
  | AcquireEvent
  | DisposeEvent
  | IncomeEvent;

interface BaseEvent {
  timestampMs: number;
  txid: string;
  note?: string;
  /** Non-fatal issues attached during pricing (e.g. price fell back). */
  warnings: string[];
}

export interface AcquireEvent extends BaseEvent {
  kind: "acquire";
  asset: string;
  qty: Decimal;
  /** Total fiat cost of the acquired qty (excl. fee). */
  fiatCost: Decimal;
  feeFiat: Decimal;
}

export interface DisposeEvent extends BaseEvent {
  kind: "dispose";
  asset: string;
  qty: Decimal;
  /** Total fiat proceeds for the disposed qty (excl. fee). */
  fiatProceeds: Decimal;
  feeFiat: Decimal;
}

export interface IncomeEvent extends BaseEvent {
  kind: "income";
  asset: string;
  qty: Decimal;
  /** Fair market value at receipt = taxable ordinary income AND the lot's basis. */
  fiatValue: Decimal;
}

/** One matched leg of a disposal against a single lot. */
export interface DisposalLeg {
  acquiredAt: number;
  qty: Decimal;
  costBasis: Decimal;
  proceeds: Decimal;
  gain: Decimal;
  holdingDays: number;
  term: "short" | "long";
  /** True if basis was synthesized because no acquisition was found. */
  missingBasis: boolean;
}

export interface RealizedDisposal {
  txid: string;
  asset: string;
  disposedAt: number;
  qty: Decimal;
  proceeds: Decimal;
  costBasis: Decimal;
  gain: Decimal;
  method: CostBasisMethod;
  legs: DisposalLeg[];
  warnings: string[];
}

export interface IncomeRecord {
  txid: string;
  asset: string;
  receivedAt: number;
  qty: Decimal;
  fiatValue: Decimal;
}

export interface EngineConfig {
  method: CostBasisMethod;
  fiat: FiatCurrency;
  /** Days held to count as "long term" (e.g. 365 for US). 0 disables the split. */
  longTermThresholdDays: number;
  missingBasis: MissingBasisPolicy;
  /** Hard cap on events processed, to bound work on hostile/huge inputs. */
  maxEvents: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  method: "FIFO",
  fiat: "USD",
  longTermThresholdDays: 365,
  missingBasis: "zero",
  maxEvents: 100_000,
};

export interface RealizedGainsResult {
  disposals: RealizedDisposal[];
  income: IncomeRecord[];
  warnings: string[];
  config: EngineConfig;
  /** For auditability: exactly how this report was produced. */
  meta: {
    generatedAt: string;
    engineVersion: string;
    method: CostBasisMethod;
    fiat: FiatCurrency;
  };
}
