/**
 * report-builder.ts
 *
 * Turns a RealizedGainsResult into a structured, localized TaxReportDoc that a
 * renderer (PDF, HTML, screen) can lay out. Pure and deterministic. Numbers are
 * formatted for the jurisdiction's locale here; the canonical values remain the
 * engine's Decimal strings.
 */
import { summarize } from "./report";
import type { RealizedGainsResult } from "./types";
import type { Jurisdiction, JurisdictionLabels } from "./jurisdictions";

export interface ReportTable {
  columns: string[];
  rows: string[][];
}

/** A grouped, de-duplicated block of items that need the user's attention. */
export interface ReviewGroup {
  title: string;
  help?: string;
  items: string[];
}

export interface TaxReportDoc {
  labels: JurisdictionLabels;
  header: {
    title: string;
    subtitle: string;
    fields: Array<{ label: string; value: string }>;
  };
  summary: Array<{ label: string; value: string }>;
  byYear: ReportTable;
  byAsset: ReportTable;
  disposals: ReportTable;
  income: ReportTable | null;
  review: ReviewGroup[];
  notes: string[];
  disclaimer: string;
}

export interface BuildOptions {
  /** Wallet address/BNS to print on the report (optional; privacy-first default is none). */
  wallet?: string;
  /** Extra review lines, e.g. pricing errors from computeRealizedGains(). */
  errors?: Array<{ txid: string; reason: string }>;
  /** Override the period label (defaults to min–max year found in the data). */
  periodLabel?: string;
  /** Override the structural labels (e.g. to follow the UI language, not the country). */
  labels?: JurisdictionLabels;
  /** Override the disclaimer text (e.g. to follow the UI language). */
  disclaimer?: string;
}

function moneyFmt(locale: string, currency: string) {
  try {
    const nf = new Intl.NumberFormat(locale, { style: "currency", currency });
    return (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? nf.format(n) : v;
    };
  } catch {
    return (v: string) => `${v} ${currency}`;
  }
}

function dateFmt(locale: string) {
  const df = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
  return (ms: number) => df.format(new Date(ms));
}

function disposalTerm(legs: RealizedGainsResult["disposals"][number]["legs"], labels: JurisdictionLabels): string {
  const hasShort = legs.some((l) => l.term === "short");
  const hasLong = legs.some((l) => l.term === "long");
  if (hasShort && hasLong) return labels.termMixed;
  return hasLong ? labels.termLong : labels.termShort;
}

export function buildTaxReport(
  result: RealizedGainsResult,
  jurisdiction: Jurisdiction,
  options: BuildOptions = {},
): TaxReportDoc {
  const L = options.labels ?? jurisdiction.labels;
  const money = moneyFmt(jurisdiction.locale, jurisdiction.fiat);
  const fmtDate = dateFmt(jurisdiction.locale);
  const showTerm = jurisdiction.longTermThresholdDays > 0;

  const s = summarize(result);

  // Period label from the data if not provided.
  const years = [
    ...result.disposals.map((d) => new Date(d.disposedAt).getUTCFullYear()),
    ...result.income.map((i) => new Date(i.receivedAt).getUTCFullYear()),
  ];
  const periodLabel =
    options.periodLabel ??
    (years.length ? (Math.min(...years) === Math.max(...years)
      ? `${Math.min(...years)}`
      : `${Math.min(...years)}–${Math.max(...years)}`) : "—");

  const headerFields: Array<{ label: string; value: string }> = [
    { label: L.fieldPeriod, value: periodLabel },
    { label: L.fieldMethod, value: jurisdiction.method },
    { label: L.fieldCurrency, value: jurisdiction.fiat },
    { label: L.fieldGenerated, value: fmtDate(Date.parse(result.meta.generatedAt)) },
  ];
  if (options.wallet) headerFields.push({ label: L.fieldWallet, value: options.wallet });

  // Summary (hide term rows where the jurisdiction has no distinction).
  const summary: Array<{ label: string; value: string }> = [
    { label: L.proceeds, value: money(s.totals.proceeds) },
    { label: L.costBasis, value: money(s.totals.costBasis) },
    { label: L.netGain, value: money(s.totals.totalGain) },
  ];
  if (showTerm) {
    summary.push({ label: L.shortTerm, value: money(s.totals.shortTermGain) });
    summary.push({ label: L.longTerm, value: money(s.totals.longTermGain) });
  }
  summary.push({ label: L.ordinaryIncome, value: money(s.totals.ordinaryIncome) });

  // By year
  const byYearCols = [L.colYear, L.colProceeds, L.colCost, L.colGain];
  if (showTerm) byYearCols.push(L.shortTerm, L.longTerm);
  byYearCols.push(L.ordinaryIncome);
  const byYear: ReportTable = {
    columns: byYearCols,
    rows: s.byYear.map((y) => {
      const row = [String(y.year), money(y.proceeds), money(y.costBasis), money(y.totalGain)];
      if (showTerm) row.push(money(y.shortTermGain), money(y.longTermGain));
      row.push(money(y.income));
      return row;
    }),
  };

  // By asset
  const byAsset: ReportTable = {
    columns: [L.colAsset, L.colProceeds, L.colCost, L.colGain],
    rows: s.byAsset.map((a) => [a.asset, money(a.proceeds), money(a.costBasis), money(a.gain)]),
  };

  // Disposals detail
  const dispCols = [L.colDate, L.colAsset, L.colQty, L.colProceeds, L.colCost, L.colGain];
  if (showTerm) dispCols.push(L.colTerm);
  const disposals: ReportTable = {
    columns: dispCols,
    rows: result.disposals
      .slice()
      .sort((a, b) => a.disposedAt - b.disposedAt)
      .map((d) => {
        const row = [
          fmtDate(d.disposedAt),
          d.asset,
          d.qty.toString(),
          money(d.proceeds.toFixed(2)),
          money(d.costBasis.toFixed(2)),
          money(d.gain.toFixed(2)),
        ];
        if (showTerm) row.push(disposalTerm(d.legs, L));
        return row;
      }),
  };

  // Income
  const income: ReportTable | null = result.income.length
    ? {
        columns: [L.colDate, L.colAsset, L.colQty, L.colValue],
        rows: result.income
          .slice()
          .sort((a, b) => a.receivedAt - b.receivedAt)
          .map((i) => [fmtDate(i.receivedAt), i.asset, i.qty.toString(), money(i.fiatValue.toFixed(2))]),
      }
    : null;

  // Review section: classify + de-duplicate the warnings and pricing errors into
  // a few clean groups, instead of one long repetitive list.
  const missingBasis = new Set<string>();
  const unknownAssets = new Set<string>();
  const noPrice = new Set<string>();
  const other = new Set<string>();

  for (const w of result.warnings) {
    const m = /Missing cost basis for (.+?) —/.exec(w);
    if (m) missingBasis.add(m[1].trim());
    else other.add(w);
  }
  for (const e of options.errors ?? []) {
    const reason = e.reason;
    const unknown = /Unknown asset "([^"]+)"/.exec(reason);
    const nop = /No price for (\S+) on (\S+)/.exec(reason);
    if (unknown) unknownAssets.add(unknown[1]);
    else if (nop) noPrice.add(`${nop[1]} — ${nop[2]}`);
    else other.add(reason);
  }

  const review: ReviewGroup[] = [];
  if (missingBasis.size) review.push({ title: L.reviewMissingBasis, help: L.reviewMissingBasisHelp, items: [...missingBasis] });
  if (unknownAssets.size) review.push({ title: L.reviewUnknownAsset, help: L.reviewUnknownAssetHelp, items: [...unknownAssets] });
  if (noPrice.size) review.push({ title: L.reviewNoPrice, help: L.reviewNoPriceHelp, items: [...noPrice] });
  if (other.size) review.push({ title: L.reviewOther, items: [...other] });

  return {
    labels: L,
    header: { title: L.reportTitle, subtitle: L.subtitle, fields: headerFields },
    summary,
    byYear,
    byAsset,
    disposals,
    income,
    review,
    notes: [jurisdiction.methodNote, ...jurisdiction.notes],
    disclaimer: options.disclaimer ?? jurisdiction.disclaimer,
  };
}
