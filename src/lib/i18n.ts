/**
 * i18n.ts — EN / ES translations
 */

export type Lang = "en" | "es";

export const translations = {
  en: {
    // ── Hero ──────────────────────────────────────────────────────────────
    heroH1:           "Export your Stacks transactions for taxes in seconds",
    heroSub:          "Download a clean, tax-ready CSV from your STX wallet. No login required.",
    trustBadge:       "Free · No login · Open tool",

    // ── Input ─────────────────────────────────────────────────────────────
    addressLabel:     "Your Stacks address or BNS name",
    addressHint:      "Accepts SP… addresses and BNS names like",
    addressExample:   "Example: SP3FBR2AGK5H229ANADEN...",
    noDataStored:     "We don't store your data",
    exportBtn:        "Export →",
    fetching:         "Fetching…",

    // ── Filter ────────────────────────────────────────────────────────────
    filterTitle:      "Filter by date",
    from:             "From",
    to:               "To",
    thisYear:         "This Year",
    lastYear:         "Last Year",
    last30Days:       "Last 30 Days",

    // ── Results header ────────────────────────────────────────────────────
    txFound:          "transactions found",
    txFoundSingle:    "transaction found",
    totalOnChain:     "Total on-chain txs",
    stxTransfersStat: "STX Transfers",

    // ── Tax Summary ───────────────────────────────────────────────────────
    summaryTitle:     "Tax Summary",
    received:         "Received",
    sent:             "Sent",
    fees:             "Fees",
    transactions:     "Transactions",

    // ── Export ────────────────────────────────────────────────────────────
    downloadBtn:      "Download tax-ready CSV",
    copyBtn:          "Copy CSV",
    copiedBtn:        "Copied!",
    compatNote:       "Compatible with Koinly, CoinTracking and other tax tools",

    // ── Empty states ──────────────────────────────────────────────────────
    noTxFound:        "No STX transfers found for this address.",
    noTxDesc:         "This address has no simple STX transfer transactions.",
    noTxInRange:      "No transactions found for this date range.",
    noTxInRangeHint:  "Try selecting a different period.",

    // ── How it works ──────────────────────────────────────────────────────
    howItWorks:       "How it works",
    step1Title:       "Enter your address",
    step1Desc:        "Paste your SP… address or BNS name (e.g. flor.btc).",
    step2Title:       "We fetch everything",
    step2Desc:        "All STX transfers pulled from the Stacks blockchain. Nothing stored.",
    step3Title:       "Download your CSV",
    step3Desc:        "Filter by year, then export a tax-ready CSV for any crypto tax tool.",

    // ── Why this tool ─────────────────────────────────────────────────────
    whyTitle:         "Why this tool?",
    why1:             "Built for Stacks users",
    why2:             "Designed for tax reporting",
    why3:             "No data stored. Ever.",

    // ── Donation ──────────────────────────────────────────────────────────
    donationTitle:    "If this tool saved you time, consider supporting it",
    donationBtn:      "Donate · flor.btc",
    copiedDonation:   "Address copied!",

    // ── Misc ──────────────────────────────────────────────────────────────
    previewTitle:     "Preview",
    stxTransfers:     "transaction",
    stxTransfersP:    "transactions",
    showingOf:        "Showing",
    showingOf2:       "of",
    showingOf3:       "— all rows included in the CSV.",
    colDate:          "Date",
    colDirection:     "Direction",
    colAmount:        "Amount (STX)",
    colFee:           "Fee (STX)",
    colHash:          "Tx Hash",
    dirReceived:      "Received",
    dirSent:          "Sent",
    dirSelf:          "Self",
    resolved:         "Resolved",
    loadingText:      "Fetching all transactions from the Stacks blockchain…",
    errorTitle:       "Something went wrong",
    footerText:       "Data by",
    footerSuffix:     "· Open-source · No data stored",
    language:         "ES",
  },

  es: {
    heroH1:           "Exporta tus transacciones Stacks para impuestos en segundos",
    heroSub:          "Descarga un CSV limpio y listo para impuestos desde tu wallet STX. Sin registro.",
    trustBadge:       "Gratis · Sin registro · Herramienta abierta",
    addressLabel:     "Tu dirección Stacks o nombre BNS",
    addressHint:      "Acepta direcciones SP… y nombres BNS como",
    addressExample:   "Ejemplo: SP3FBR2AGK5H229ANADEN...",
    noDataStored:     "No almacenamos tus datos",
    exportBtn:        "Exportar →",
    fetching:         "Obteniendo…",
    filterTitle:      "Filtrar por fecha",
    from:             "Desde",
    to:               "Hasta",
    thisYear:         "Este año",
    lastYear:         "Año pasado",
    last30Days:       "Últimos 30 días",
    txFound:          "transacciones encontradas",
    txFoundSingle:    "transacción encontrada",
    totalOnChain:     "Txs totales on-chain",
    stxTransfersStat: "Transferencias STX",
    summaryTitle:     "Resumen fiscal",
    received:         "Recibido",
    sent:             "Enviado",
    fees:             "Comisiones",
    transactions:     "Transacciones",
    downloadBtn:      "Descargar CSV para impuestos",
    copyBtn:          "Copiar CSV",
    copiedBtn:        "¡Copiado!",
    compatNote:       "Compatible con Koinly, CoinTracking y otras herramientas fiscales",
    noTxFound:        "No se encontraron transferencias STX para esta dirección.",
    noTxDesc:         "Esta dirección no tiene transferencias STX simples.",
    noTxInRange:      "No se encontraron transacciones en este rango de fechas.",
    noTxInRangeHint:  "Prueba seleccionando un período diferente.",
    howItWorks:       "Cómo funciona",
    step1Title:       "Ingresa tu dirección",
    step1Desc:        "Pega tu dirección SP… o nombre BNS (ej. flor.btc).",
    step2Title:       "Obtenemos todo",
    step2Desc:        "Todas las transferencias STX desde la blockchain. Sin almacenamiento.",
    step3Title:       "Descarga tu CSV",
    step3Desc:        "Filtra por año y exporta un CSV para cualquier herramienta fiscal.",
    whyTitle:         "¿Por qué esta herramienta?",
    why1:             "Construida para usuarios de Stacks",
    why2:             "Diseñada para reportes fiscales",
    why3:             "Sin almacenamiento de datos. Nunca.",
    donationTitle:    "Si esta herramienta te ahorró tiempo, considera apoyarla",
    donationBtn:      "Donar · flor.btc",
    copiedDonation:   "¡Dirección copiada!",
    previewTitle:     "Vista previa",
    stxTransfers:     "transacción",
    stxTransfersP:    "transacciones",
    showingOf:        "Mostrando",
    showingOf2:       "de",
    showingOf3:       "— todas incluidas en el CSV.",
    colDate:          "Fecha",
    colDirection:     "Dirección",
    colAmount:        "Cantidad (STX)",
    colFee:           "Comisión (STX)",
    colHash:          "Hash Tx",
    dirReceived:      "Recibido",
    dirSent:          "Enviado",
    dirSelf:          "Propio",
    resolved:         "Resuelto",
    loadingText:      "Obteniendo transacciones de la blockchain de Stacks…",
    errorTitle:       "Algo salió mal",
    footerText:       "Datos de",
    footerSuffix:     "· Código abierto · Sin almacenamiento",
    language:         "EN",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function useTranslations(lang: Lang) {
  return (key: TranslationKey): string => translations[lang][key];
}
