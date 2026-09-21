/**
 * Aggregates a RealizedGainsResult into summary figures.
 *
 * ROUNDING: full precision is kept through every calculation; we only round to
 * 2 fiat decimals HERE, at presentation time, so intermediate steps never
 * accumulate rounding error. Quantities keep native precision.
 */
import { Decimal, ZERO } from "./decimal";
import type { RealizedGainsResult } from "./types";

export interface YearSummary {
  year: number;
  proceeds: string;
  costBasis: string;
  shortTermGain: string;
  longTermGain: string;
  totalGain: string;
  income: string;
}

export interface AssetSummary {
  asset: string;
  proceeds: string;
  costBasis: string;
  gain: string;
}

export interface ReportSummary {
  fiat: string;
  method: string;
  totals: {
    proceeds: string;
    costBasis: string;
    shortTermGain: string;
    longTermGain: string;
    totalGain: string;
    ordinaryIncome: string;
  };
  byYear: YearSummary[];
  byAsset: AssetSummary[];
  warnings: string[];
  needsReview: boolean;
  meta: RealizedGainsResult["meta"];
}

function fiat2(d: Decimal): string {
  const s = d.toFixed(2, Decimal.ROUND_HALF_UP);
  return s === "-0.00" ? "0.00" : s; // avoid ugly signed zero in reports
}

function yearOf(ms: number): number {
  return new Date(ms).getUTCFullYear();
}

export function summarize(result: RealizedGainsResult): ReportSummary {
  let proceeds = ZERO, cost = ZERO, shortG = ZERO, longG = ZERO, incomeTotal = ZERO;
  const years = new Map<number, { proceeds: Decimal; cost: Decimal; short: Decimal; long: Decimal; income: Decimal }>();
  const assets = new Map<string, { proceeds: Decimal; cost: Decimal; gain: Decimal }>();

  const yearBucket = (y: number) => {
    let b = years.get(y);
    if (!b) { b = { proceeds: ZERO, cost: ZERO, short: ZERO, long: ZERO, income: ZERO }; years.set(y, b); }
    return b;
  };
  const assetBucket = (a: string) => {
    let b = assets.get(a);
    if (!b) { b = { proceeds: ZERO, cost: ZERO, gain: ZERO }; assets.set(a, b); }
    return b;
  };

  for (const d of result.disposals) {
    proceeds = proceeds.plus(d.proceeds);
    cost = cost.plus(d.costBasis);
    const y = yearOf(d.disposedAt);
    const yb = yearBucket(y);
    yb.proceeds = yb.proceeds.plus(d.proceeds);
    yb.cost = yb.cost.plus(d.costBasis);
    const ab = assetBucket(d.asset);
    ab.proceeds = ab.proceeds.plus(d.proceeds);
    ab.cost = ab.cost.plus(d.costBasis);
    ab.gain = ab.gain.plus(d.gain);

    for (const leg of d.legs) {
      if (leg.term === "long") { longG = longG.plus(leg.gain); yb.long = yb.long.plus(leg.gain); }
      else { shortG = shortG.plus(leg.gain); yb.short = yb.short.plus(leg.gain); }
    }
  }

  for (const inc of result.income) {
    incomeTotal = incomeTotal.plus(inc.fiatValue);
    yearBucket(yearOf(inc.receivedAt)).income = yearBucket(yearOf(inc.receivedAt)).income.plus(inc.fiatValue);
  }

  const byYear = [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, b]) => ({
      year,
      proceeds: fiat2(b.proceeds),
      costBasis: fiat2(b.cost),
      shortTermGain: fiat2(b.short),
      longTermGain: fiat2(b.long),
      totalGain: fiat2(b.short.plus(b.long)),
      income: fiat2(b.income),
    }));

  const byAsset = [...assets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([asset, b]) => ({
      asset,
      proceeds: fiat2(b.proceeds),
      costBasis: fiat2(b.cost),
      gain: fiat2(b.gain),
    }));

  return {
    fiat: result.config.fiat,
    method: result.config.method,
    totals: {
      proceeds: fiat2(proceeds),
      costBasis: fiat2(cost),
      shortTermGain: fiat2(shortG),
      longTermGain: fiat2(longG),
      totalGain: fiat2(shortG.plus(longG)),
      ordinaryIncome: fiat2(incomeTotal),
    },
    byYear,
    byAsset,
    warnings: result.warnings,
    needsReview: result.warnings.length > 0,
    meta: result.meta,
  };
}
