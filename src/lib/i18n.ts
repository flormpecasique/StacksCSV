/**
 * i18n.ts
 * Minimal EN/ES translations for the date filter feature.
 * Add new keys here as needed.
 */

export type Lang = "en" | "es";

export const translations = {
  en: {
    // Input label
    filterTitle:    "Filter by date",
    from:           "From",
    to:             "To",
    // Quick-select buttons
    thisYear:       "This Year",
    lastYear:       "Last Year",
    last30Days:     "Last 30 Days",
    allTime:        "All Time",
    // Summary
    summaryTitle:   "Summary",
    received:       "Received",
    sent:           "Sent",
    fees:           "Fees",
    transactions:   "Transactions",
    // Export
    downloadCsv:    "Download CSV",
    // Empty / states
    noTxInRange:    "No transactions found for the selected date range.",
    noTxFound:      "No STX transfers found",
    noTxDesc:       "This address has no simple STX transfer transactions.",
    // Address input
    addressLabel:   "Stacks Address or BNS Name",
    addressHint:    "Accepts SP… addresses and BNS names like",
    // Language toggle label
    language:       "Language",
    // How it works
    howItWorks:     "How it works",
    step1Title:     "Enter your address or BNS name",
    step1Desc:      'Paste your SP… address or use your BNS name like "flor.btc".',
    step2Title:     "We fetch everything",
    step2Desc:      "All STX transfer transactions are pulled from the Stacks blockchain via Hiro API.",
    step3Title:     "Download your CSV",
    step3Desc:      "Filter by date range, then export a clean CSV compatible with Koinly, CoinTracking, and Awaken.",
    // Footer
    footerText:     "Data provided by",
    footerSuffix:   "· Stacks CSV Exporter is open-source and non-custodial",
    // Donation
    donationTitle:  "Found this useful?",
    donationDesc:   "Consider sending a small donation to support development",
    // Errors
    errorTitle:     "Something went wrong",
    // Loading
    loadingText:    "Fetching all transactions from Stacks blockchain…",
    // Resolved BNS
    resolved:       "Resolved",
    // Preview table
    previewTitle:   "Preview",
    stxTransfers:   "STX transfer",
    stxTransfersP:  "STX transfers",
    showingOf:      "Showing",
    showingOf2:     "of",
    showingOf3:     "transactions. All rows are included in the CSV.",
    colDate:        "Date",
    colDirection:   "Direction",
    colAmount:      "Amount (STX)",
    colFee:         "Fee (STX)",
    colHash:        "Tx Hash",
    dirReceived:    "Received",
    dirSent:        "Sent",
    dirSelf:        "Self",
    // Stats bar
    stxTransfersStat:   "STX Transfers",
    totalOnChain:       "Total On-Chain Txs",
  },
  es: {
    filterTitle:    "Filtrar por fecha",
    from:           "Desde",
    to:             "Hasta",
    thisYear:       "Este año",
    lastYear:       "Año pasado",
    last30Days:     "Últimos 30 días",
    allTime:        "Todo",
    summaryTitle:   "Resumen",
    received:       "Recibido",
    sent:           "Enviado",
    fees:           "Comisiones",
    transactions:   "Transacciones",
    downloadCsv:    "Descargar CSV",
    noTxInRange:    "No se encontraron transacciones en el rango de fechas seleccionado.",
    noTxFound:      "No se encontraron transferencias STX",
    noTxDesc:       "Esta dirección no tiene transferencias STX simples.",
    addressLabel:   "Dirección Stacks o nombre BNS",
    addressHint:    "Acepta direcciones SP… y nombres BNS como",
    language:       "Idioma",
    howItWorks:     "Cómo funciona",
    step1Title:     "Ingresa tu dirección o nombre BNS",
    step1Desc:      'Pega tu dirección SP… o usa tu nombre BNS como "flor.btc".',
    step2Title:     "Obtenemos todo",
    step2Desc:      "Todas las transferencias STX se obtienen de la blockchain de Stacks vía la API de Hiro.",
    step3Title:     "Descarga tu CSV",
    step3Desc:      "Filtra por rango de fechas y exporta un CSV limpio compatible con Koinly, CoinTracking y Awaken.",
    footerText:     "Datos provistos por",
    footerSuffix:   "· Stacks CSV Exporter es de código abierto y sin custodia",
    donationTitle:  "¿Te resultó útil?",
    donationDesc:   "Considera enviar una pequeña donación para apoyar el desarrollo",
    errorTitle:     "Algo salió mal",
    loadingText:    "Obteniendo todas las transacciones de la blockchain de Stacks…",
    resolved:       "Resuelto",
    previewTitle:   "Vista previa",
    stxTransfers:   "transferencia STX",
    stxTransfersP:  "transferencias STX",
    showingOf:      "Mostrando",
    showingOf2:     "de",
    showingOf3:     "transacciones. Todas las filas están incluidas en el CSV.",
    colDate:        "Fecha",
    colDirection:   "Dirección",
    colAmount:      "Cantidad (STX)",
    colFee:         "Comisión (STX)",
    colHash:        "Hash Tx",
    dirReceived:    "Recibido",
    dirSent:        "Enviado",
    dirSelf:        "Propio",
    stxTransfersStat:   "Transferencias STX",
    totalOnChain:       "Txs totales on-chain",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

/** Returns a translator function scoped to the given language. */
export function useTranslations(lang: Lang) {
  return (key: TranslationKey): string => translations[lang][key];
}
