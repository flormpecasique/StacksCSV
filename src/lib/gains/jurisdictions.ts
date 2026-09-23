/**
 * jurisdictions.ts
 *
 * A jurisdiction profile does NOT encode a country's tax law. It only sets the
 * handful of knobs that legitimately vary between countries — cost-basis method,
 * currency, whether short/long term matters, and the report's language/labels —
 * plus non-binding notes. The universal, correct figures come from the engine;
 * the legal filing is the user's / their accountant's responsibility.
 *
 * Add a country by adding one profile. Everything downstream stays the same.
 */
import type { CostBasisMethod, EngineConfig, FiatCurrency } from "./types";

export interface JurisdictionLabels {
  reportTitle: string;
  subtitle: string;
  fieldPeriod: string;
  fieldMethod: string;
  fieldCurrency: string;
  fieldGenerated: string;
  fieldWallet: string;
  summary: string;
  proceeds: string;
  costBasis: string;
  netGain: string;
  shortTerm: string;
  longTerm: string;
  ordinaryIncome: string;
  byYear: string;
  byAsset: string;
  disposals: string;
  income: string;
  review: string;
  reviewEmpty: string;
  reviewMissingBasis: string;
  reviewMissingBasisHelp: string;
  reviewUnknownAsset: string;
  reviewUnknownAssetHelp: string;
  reviewNoPrice: string;
  reviewNoPriceHelp: string;
  reviewOther: string;
  notesTitle: string;
  disclaimerTitle: string;
  colYear: string;
  colDate: string;
  colAsset: string;
  colQty: string;
  colProceeds: string;
  colCost: string;
  colGain: string;
  colTerm: string;
  colValue: string;
  termShort: string;
  termLong: string;
  termMixed: string;
  page: string;
}

export interface Jurisdiction {
  code: string;
  name: string;
  flag: string;
  fiat: FiatCurrency;
  locale: string; // BCP-47, for number/date formatting
  method: CostBasisMethod;
  methodNote: string;
  /** 0 = no short/long-term distinction; the term column is hidden. */
  longTermThresholdDays: number;
  notes: string[];
  disclaimer: string;
  labels: JurisdictionLabels;
}

const ES_LABELS: JurisdictionLabels = {
  reportTitle: "Informe de ganancias y pérdidas — Criptoactivos",
  subtitle: "Documento técnico de respaldo (no es asesoramiento fiscal)",
  fieldPeriod: "Periodo", fieldMethod: "Método", fieldCurrency: "Moneda",
  fieldGenerated: "Generado", fieldWallet: "Dirección",
  summary: "Resumen", proceeds: "Valor de transmisión", costBasis: "Coste de adquisición",
  netGain: "Ganancia/pérdida neta", shortTerm: "Corto plazo", longTerm: "Largo plazo",
  ordinaryIncome: "Ingresos (rendimientos)",
  byYear: "Por ejercicio", byAsset: "Por activo", disposals: "Detalle de transmisiones",
  income: "Ingresos por recompensas/Staking", review: "Elementos a revisar",
  reviewEmpty: "No hay elementos marcados para revisión.",
  reviewMissingBasis: "Coste de adquisición faltante",
  reviewMissingBasisHelp: "Ventas sin compra previa registrada en este periodo (coste asumido = 0). Incluye tu historial anterior o revísalo con tu asesor: la ganancia puede estar sobreestimada.",
  reviewUnknownAsset: "Activos no reconocidos",
  reviewUnknownAssetHelp: "Tokens sin fuente de precio; sus operaciones se excluyeron del cálculo para no introducir cifras erróneas.",
  reviewNoPrice: "Sin precio en la fecha",
  reviewNoPriceHelp: "El token está reconocido, pero no había precio de mercado en esa fecha (normalmente por ser muy reciente).",
  reviewOther: "Otros",
  notesTitle: "Notas de la jurisdicción", disclaimerTitle: "Aviso legal",
  colYear: "Ejercicio", colDate: "Fecha", colAsset: "Activo", colQty: "Cantidad",
  colProceeds: "Transmisión", colCost: "Adquisición", colGain: "Ganancia/pérdida",
  colTerm: "Plazo", colValue: "Importe",
  termShort: "Corto", termLong: "Largo", termMixed: "Mixto", page: "Página",
};

const EN_LABELS: JurisdictionLabels = {
  reportTitle: "Capital Gains & Income Report — Crypto Assets",
  subtitle: "Technical supporting document (not tax advice)",
  fieldPeriod: "Period", fieldMethod: "Method", fieldCurrency: "Currency",
  fieldGenerated: "Generated", fieldWallet: "Address",
  summary: "Summary", proceeds: "Proceeds", costBasis: "Cost basis",
  netGain: "Net gain/loss", shortTerm: "Short term", longTerm: "Long term",
  ordinaryIncome: "Ordinary income",
  byYear: "By tax year", byAsset: "By asset", disposals: "Disposals detail",
  income: "Income from rewards/Staking", review: "Items to review",
  reviewEmpty: "No items flagged for review.",
  reviewMissingBasis: "Missing cost basis",
  reviewMissingBasisHelp: "Disposals with no recorded acquisition in this period (cost treated as 0). Include your earlier history or review with your advisor: the gain may be overstated.",
  reviewUnknownAsset: "Unrecognized assets",
  reviewUnknownAssetHelp: "Tokens with no price source; their transactions were excluded from the calculation to avoid introducing wrong figures.",
  reviewNoPrice: "No price on that date",
  reviewNoPriceHelp: "The token is recognized, but there was no market price on that date (usually because it is very recent).",
  reviewOther: "Other",
  notesTitle: "Jurisdiction notes", disclaimerTitle: "Disclaimer",
  colYear: "Year", colDate: "Date", colAsset: "Asset", colQty: "Quantity",
  colProceeds: "Proceeds", colCost: "Cost", colGain: "Gain/Loss",
  colTerm: "Term", colValue: "Amount",
  termShort: "Short", termLong: "Long", termMixed: "Mixed", page: "Page",
};

const COMMON_DISCLAIMER_ES =
  "Este documento es un informe técnico generado a partir de datos on-chain con el método indicado. " +
  "No constituye asesoramiento fiscal ni contable. La calificación legal de cada operación y las " +
  "obligaciones de declaración son responsabilidad del contribuyente y su asesor. Verifica las cifras " +
  "y la normativa vigente de tu jurisdicción antes de presentar cualquier declaración.";

const COMMON_DISCLAIMER_EN =
  "This document is a technical report generated from on-chain data using the stated method. " +
  "It is not tax or accounting advice. The legal treatment of each transaction and all filing " +
  "obligations are the responsibility of the taxpayer and their advisor. Verify the figures and the " +
  "current rules of your jurisdiction before filing.";

const REGISTRY: Record<string, Jurisdiction> = Object.create(null);

function register(j: Jurisdiction) { REGISTRY[j.code.toUpperCase()] = j; }

register({
  code: "ES",
  name: "España",
  flag: "🇪🇸",
  fiat: "EUR",
  locale: "es-ES",
  method: "FIFO",
  methodNote:
    "FIFO. Criterio general de valores homogéneos aplicado por la AEAT a criptomonedas. " +
    "Confírmalo con tu asesor para tu caso concreto.",
  longTermThresholdDays: 0, // España no distingue corto/largo plazo para el tipo aplicable
  notes: [
    "Las ganancias y pérdidas por transmisión de criptoactivos se integran, con carácter general, en la base imponible del ahorro del IRPF.",
    "Este informe muestra la ganancia/pérdida y los ingresos, NO la cuota a pagar: los tipos del ahorro cambian y los aplica tu declaración/asesor.",
    "El tratamiento de recompensas y Staking no es unánime (rendimiento del capital mobiliario, ganancia o actividad económica). Revísalo con tu asesor.",
    "Pueden existir obligaciones informativas específicas para criptoactivos. Consulta la normativa vigente de la AEAT.",
  ],
  disclaimer: COMMON_DISCLAIMER_ES,
  labels: ES_LABELS,
});

register({
  code: "US",
  name: "United States",
  flag: "🇺🇸",
  fiat: "USD",
  locale: "en-US",
  method: "FIFO",
  methodNote:
    "FIFO by default. HIFO or specific-identification are permitted with adequate records — " +
    "choose your method with your advisor.",
  longTermThresholdDays: 365,
  notes: [
    "Capital gains/losses are generally reported on Form 8949 and Schedule D; holding period over one year is long-term.",
    "Staking and other rewards are generally ordinary income at fair market value on receipt, which then becomes the cost basis.",
    "This report shows figures, not tax owed: rates and thresholds are applied by your filing software or advisor.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN,
  labels: EN_LABELS,
});

// ── LatAm (Spanish labels) ──────────────────────────────────────────────────
register({
  code: "MX", name: "México", flag: "🇲🇽", fiat: "MXN", locale: "es-MX",
  method: "FIFO",
  methodNote: "FIFO por defecto. El método y tratamiento dependen de tu situación; confírmalo con tu asesor.",
  longTermThresholdDays: 0,
  notes: [
    "En México, las operaciones con criptoactivos pueden tener implicaciones fiscales según su naturaleza y tu situación.",
    "Este informe muestra ganancias/pérdidas e ingresos, no la cuota: los tipos los aplica tu declaración o asesor.",
    "Verifica el tratamiento vigente con el SAT y con un asesor fiscal.",
  ],
  disclaimer: COMMON_DISCLAIMER_ES, labels: ES_LABELS,
});
register({
  code: "AR", name: "Argentina", flag: "🇦🇷", fiat: "ARS", locale: "es-AR",
  method: "FIFO",
  methodNote: "FIFO por defecto. Confirma el método aplicable con tu asesor.",
  longTermThresholdDays: 0,
  notes: [
    "El tratamiento de criptoactivos en Argentina ha cambiado con el tiempo; verifica la normativa vigente (ARCA/AFIP).",
    "Este informe no calcula la cuota ni aplica regímenes especiales; consúltalo con tu asesor.",
  ],
  disclaimer: COMMON_DISCLAIMER_ES, labels: ES_LABELS,
});
register({
  code: "CO", name: "Colombia", flag: "🇨🇴", fiat: "COP", locale: "es-CO",
  method: "FIFO",
  methodNote: "FIFO por defecto. Confirma el método aplicable con tu asesor.",
  longTermThresholdDays: 0,
  notes: [
    "Verifica el tratamiento vigente de criptoactivos con la DIAN y con un asesor fiscal.",
    "Este informe muestra ganancias/pérdidas e ingresos, no la cuota a pagar.",
  ],
  disclaimer: COMMON_DISCLAIMER_ES, labels: ES_LABELS,
});

// ── Europe / others (English labels) ────────────────────────────────────────
register({
  code: "PT", name: "Portugal", flag: "🇵🇹", fiat: "EUR", locale: "en-GB",
  method: "FIFO",
  methodNote: "FIFO by default. Confirm the method that applies to your case.",
  longTermThresholdDays: 0,
  notes: [
    "In Portugal, gains on crypto held over 365 days may be treated differently from short-term gains; this report does not apply that distinction automatically.",
    "Confirm current rules and any exemptions with your advisor.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN, labels: EN_LABELS,
});
register({
  code: "DE", name: "Germany", flag: "🇩🇪", fiat: "EUR", locale: "en-GB",
  method: "FIFO",
  methodNote: "FIFO is commonly used in Germany. Confirm with your advisor.",
  longTermThresholdDays: 0,
  notes: [
    "In Germany, gains on crypto held for more than one year may be tax-exempt; this report does NOT apply that exemption — review holding periods with your advisor.",
    "This report shows figures, not tax owed.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN, labels: EN_LABELS,
});
register({
  code: "GB", name: "United Kingdom", flag: "🇬🇧", fiat: "GBP", locale: "en-GB",
  method: "ACB",
  methodNote: "The UK uses share pooling (average cost). This report approximates it with ACB.",
  longTermThresholdDays: 0,
  notes: [
    "UK rules include same-day and 30-day 'bed and breakfasting' matching that this report does NOT implement; the ACB figure is an approximation.",
    "Confirm your Capital Gains position and allowances with your advisor or HMRC guidance.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN, labels: EN_LABELS,
});
register({
  code: "CA", name: "Canada", flag: "🇨🇦", fiat: "CAD", locale: "en-CA",
  method: "ACB",
  methodNote: "Canada uses the adjusted cost base (average cost) method.",
  longTermThresholdDays: 0,
  notes: [
    "Superficial-loss rules may apply and are not implemented here; confirm with your advisor.",
    "Only 50% of capital gains are generally taxable in Canada; this report shows the full gain, not the taxable portion.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN, labels: EN_LABELS,
});

register({
  code: "INT",
  name: "International (generic)",
  flag: "🌐",
  fiat: "USD",
  locale: "en-US",
  method: "FIFO",
  methodNote: "FIFO by default. Confirm the method required by your jurisdiction.",
  longTermThresholdDays: 0,
  notes: [
    "This is a generic profile. Cost-basis method, fiscal year, currency and reward treatment vary by country.",
    "Select or create a profile matching your jurisdiction, and confirm everything with a local advisor.",
  ],
  disclaimer: COMMON_DISCLAIMER_EN,
  labels: EN_LABELS,
});

/** Report structural labels by UI language (decoupled from the jurisdiction). */
export function getReportLabels(lang: string): JurisdictionLabels {
  return lang?.toLowerCase().startsWith("es") ? ES_LABELS : EN_LABELS;
}

/** The "not tax advice" disclaimer in the UI language. */
export function getReportDisclaimer(lang: string): string {
  return lang?.toLowerCase().startsWith("es") ? COMMON_DISCLAIMER_ES : COMMON_DISCLAIMER_EN;
}

export function getJurisdiction(code: string): Jurisdiction {
  const j = REGISTRY[(code ?? "").toUpperCase()];
  if (!j) throw new RangeError(`Unknown jurisdiction "${code}". Available: ${listJurisdictions().join(", ")}`);
  return j;
}

export function listJurisdictions(): string[] {
  return Object.keys(REGISTRY);
}

/** Lightweight list for building a selector UI: code, display name, flag, currency. */
export function getJurisdictionOptions(): Array<{ code: string; name: string; flag: string; fiat: string }> {
  return Object.values(REGISTRY).map((j) => ({ code: j.code, name: j.name, flag: j.flag, fiat: j.fiat }));
}

/** Derive the engine config implied by a jurisdiction (method, fiat, term split). */
export function engineConfigFor(j: Jurisdiction): Partial<EngineConfig> {
  return {
    method: j.method,
    fiat: j.fiat,
    longTermThresholdDays: j.longTermThresholdDays,
  };
}
