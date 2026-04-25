// ─── Types ────────────────────────────────────────────────────────────────────

export type Lang = "en" | "es";

export interface Translations {
  // Hero
  trustBadge:     string;
  language:       string;
  heroH1:         string;
  heroSub:        string;

  // Address input
  addressLabel:   string;
  addressExample: string;
  exportBtn:      string;
  fetching:       string;
  noDataStored:   string;

  // Date filter
  filterTitle:    string;
  from:           string;
  to:             string;
  thisYear:       string;
  lastYear:       string;
  last30Days:     string;

  // Loading
  loadingText:    string;

  // Error / empty states
  errorTitle:     string;
  noTxFound:      string;
  resolved:       string;
  noTxDesc:       string;
  noTxInRange:    string;
  noTxInRangeHint:string;

  // Results header
  txFoundSingle:  string;
  txFound:        string;
  totalOnChain:   string;

  // Summary stats
  received:       string;
  sent:           string;
  fees:           string;
  transactions:   string;
  otherTokens:    string;

  // Stacking rewards (PoX)
  stackingRewards:     string;
  btcReceived:         string;
  stackingRewardsNote: string;

  // Export bar
  compatNote:     string;
  downloadBtn:    string;
  copyBtn:        string;
  copiedBtn:      string;

  // Transaction table
  previewTitle:   string;
  stxTransfers:   string;
  stxTransfersP:  string;
  colDate:        string;
  colDirection:   string;
  colAmount:      string;
  colFee:         string;
  colHash:        string;
  dirReceived:    string;
  dirSent:        string;
  dirSelf:        string;
  showingOf:      string;
  showingOf2:     string;
  showingOf3:     string;

  // Footer
  footerText:     string;
  footerSuffix:   string;

  // How it works
  howItWorks:     string;
  step1Title:     string;
  step1Desc:      string;
  step2Title:     string;
  step2Desc:      string;
  step3Title:     string;
  step3Desc:      string;

  // Why this tool
  whyTitle:       string;
  why1:           string;
  why2:           string;
  why3:           string;

  // Donation
  donationTitle:  string;
  donationBtn:    string;
  copiedDonation: string;
}

// ─── English ───────────────────────────────────────────────────────────────────

const en: Translations = {
  trustBadge:     "Stacks Tax Export",
  language:       "Español",
  heroH1:         "Export STX Transactions for Tax Reporting",
  heroSub:        "Clean, tax-ready CSV from your Stacks wallet. Compatible with Koinly, CoinTracking & Awaken.",

  addressLabel:   "Stacks wallet address or BNS name",
  addressExample: "e.g. SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR or flor.btc",
  exportBtn:      "Export CSV",
  fetching:       "Fetching…",
  noDataStored:   "No data stored",

  filterTitle:    "Date Range",
  from:           "From",
  to:             "To",
  thisYear:       "This Year",
  lastYear:       "Last Year",
  last30Days:     "Last 30 Days",

  loadingText:    "Fetching transactions from the blockchain…",

  errorTitle:     "Something went wrong",
  noTxFound:      "No transactions found",
  resolved:       "Resolved from:",
  noTxDesc:       "This address has no confirmed transactions on the Stacks network.",
  noTxInRange:    "No transactions in this date range",
  noTxInRangeHint:"Try expanding the date range or selecting a different period.",

  txFoundSingle:  "transaction found",
  txFound:        "transactions found",
  totalOnChain:   "total on-chain",

  received:       "Received",
  sent:           "Sent",
  fees:           "Fees",
  transactions:   "Transactions",
  otherTokens:    "Other Tokens",

  stackingRewards:     "Stacking Rewards (PoX)",
  btcReceived:         "BTC Received",
  stackingRewardsNote: "BTC earned by locking STX in Proof-of-Transfer cycles. Reported as income in tax tools like Koinly.",

  compatNote:     "Compatible with Koinly, CoinTracking, and Awaken.",
  downloadBtn:    "Download CSV",
  copyBtn:        "Copy CSV",
  copiedBtn:      "Copied!",

  previewTitle:   "Transaction Preview",
  stxTransfers:   "transfer",
  stxTransfersP:  "transfers",
  colDate:        "Date",
  colDirection:   "Direction",
  colAmount:      "Amount",
  colFee:         "Fee",
  colHash:        "Tx Hash",
  dirReceived:    "Received",
  dirSent:        "Sent",
  dirSelf:        "Self",
  showingOf:      "Showing",
  showingOf2:     "of",
  showingOf3:     "transactions",

  footerText:     "Powered by",
  footerSuffix:   "· No affiliation",

  howItWorks:     "How it works",
  step1Title:     "Enter your wallet",
  step1Desc:      "Paste a Stacks address (SP…) or a BNS name like flor.btc.",
  step2Title:     "We fetch the data",
  step2Desc:      "Transactions are pulled live from the Stacks blockchain via the Hiro API.",
  step3Title:     "Download your CSV",
  step3Desc:      "Import the file directly into Koinly, CoinTracking, or Awaken.",

  whyTitle:       "Why StacksCSV?",
  why1:           "Correct timestamps — Nakamoto & pre-Nakamoto compatible",
  why2:           "FT tokens (ALEX, WELSH, sBTC…) + PoX stacking rewards in BTC",
  why3:           "Privacy-first: no login, no data stored, fully open source",

  donationTitle:  "If this saved you time, consider tipping 🧡",
  donationBtn:    "Copy flor.btc",
  copiedDonation: "Address copied!",
};

// ─── Spanish ───────────────────────────────────────────────────────────────────

const es: Translations = {
  trustBadge:     "Exportador de Taxes Stacks",
  language:       "English",
  heroH1:         "Exporta tus transacciones STX para impuestos",
  heroSub:        "CSV limpio desde tu wallet de Stacks. Compatible con Koinly, CoinTracking y Awaken.",

  addressLabel:   "Dirección Stacks o nombre BNS",
  addressExample: "ej. SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQ9H6DPR o flor.btc",
  exportBtn:      "Exportar CSV",
  fetching:       "Cargando…",
  noDataStored:   "Sin almacenamiento",

  filterTitle:    "Rango de Fechas",
  from:           "Desde",
  to:             "Hasta",
  thisYear:       "Este Año",
  lastYear:       "Año Pasado",
  last30Days:     "Últimos 30 Días",

  loadingText:    "Obteniendo transacciones de la blockchain…",

  errorTitle:     "Algo salió mal",
  noTxFound:      "Sin transacciones",
  resolved:       "Resuelto desde:",
  noTxDesc:       "Esta dirección no tiene transacciones confirmadas en la red Stacks.",
  noTxInRange:    "Sin transacciones en este rango de fechas",
  noTxInRangeHint:"Prueba ampliando el rango o seleccionando otro período.",

  txFoundSingle:  "transacción encontrada",
  txFound:        "transacciones encontradas",
  totalOnChain:   "total en cadena",

  received:       "Recibido",
  sent:           "Enviado",
  fees:           "Comisiones",
  transactions:   "Transacciones",
  otherTokens:    "Otros Tokens",

  stackingRewards:     "Recompensas de Stacking (PoX)",
  btcReceived:         "BTC Recibido",
  stackingRewardsNote: "BTC ganado al bloquear STX en ciclos de Proof-of-Transfer. Se reporta como ingreso en herramientas como Koinly.",

  compatNote:     "Compatible con Koinly, CoinTracking y Awaken.",
  downloadBtn:    "Descargar CSV",
  copyBtn:        "Copiar CSV",
  copiedBtn:      "¡Copiado!",

  previewTitle:   "Vista Previa",
  stxTransfers:   "transferencia",
  stxTransfersP:  "transferencias",
  colDate:        "Fecha",
  colDirection:   "Dirección",
  colAmount:      "Cantidad",
  colFee:         "Comisión",
  colHash:        "Tx Hash",
  dirReceived:    "Recibido",
  dirSent:        "Enviado",
  dirSelf:        "Propio",
  showingOf:      "Mostrando",
  showingOf2:     "de",
  showingOf3:     "transacciones",

  footerText:     "Impulsado por",
  footerSuffix:   "· Sin afiliación",

  howItWorks:     "Cómo funciona",
  step1Title:     "Ingresa tu wallet",
  step1Desc:      "Pega una dirección Stacks (SP…) o un nombre BNS como flor.btc.",
  step2Title:     "Obtenemos los datos",
  step2Desc:      "Las transacciones se cargan en vivo desde la blockchain Stacks via la API de Hiro.",
  step3Title:     "Descarga tu CSV",
  step3Desc:      "Importa el archivo directamente en Koinly, CoinTracking o Awaken.",

  whyTitle:       "¿Por qué StacksCSV?",
  why1:           "Timestamps correctos — compatible con Nakamoto y pre-Nakamoto",
  why2:           "Tokens FT (ALEX, WELSH, sBTC…) + recompensas PoX en BTC",
  why3:           "Privacidad primero: sin login, sin almacenamiento, código abierto",

  donationTitle:  "Si te ahorró tiempo, considera una propina 🧡",
  donationBtn:    "Copiar flor.btc",
  copiedDonation: "¡Dirección copiada!",
};

// ─── Translations map ─────────────────────────────────────────────────────────

export const translations: Record<Lang, Translations> = { en, es };

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns a translation function for the given language.
 *
 * Usage:
 *   const t = useTranslations(lang);
 *   t("heroH1")   // → string
 */
export function useTranslations(lang: Lang) {
  return (key: keyof Translations): string => translations[lang][key];
}
