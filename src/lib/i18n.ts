export type Lang = "en" | "es";

export interface Translations {
  // Headings & labels
  title:               string;
  subtitle:            string;
  placeholder:         string;
  fetchButton:         string;
  fetching:            string;

  // Date filter
  dateRange:           string;
  from:                string;
  to:                  string;
  thisYear:            string;
  lastYear:            string;
  last30Days:          string;

  // Summary stats
  received:            string;
  sent:                string;
  fees:                string;
  transactions:        string;
  otherTokens:         string;

  // ── Stacking rewards (NEW) ──────────────────────────────
  stackingRewards:     string;   // section header
  btcReceived:         string;   // label for BTC amount
  stackingRewardsNote: string;   // small explanatory note
  // ────────────────────────────────────────────────────────

  // Table
  tablePreview:        string;
  date:                string;
  type:                string;
  amount:              string;
  currency:            string;
  fee:                 string;
  txHash:              string;
  noTransactions:      string;
  showingRows:         string;

  // Export
  downloadCsv:         string;
  copyCsv:             string;
  copied:              string;

  // Trust / footer
  noDataStored:        string;
  openSource:          string;

  // Donation
  donationTitle:       string;
  donationDesc:        string;
  donationCopied:      string;

  // Errors
  invalidAddress:      string;
  fetchError:          string;
  emptyResult:         string;
}

const en: Translations = {
  title:               "Stacks CSV Exporter",
  subtitle:            "Export your STX transactions for tax reporting",
  placeholder:         "Enter STX address or BNS name (e.g. flor.btc)",
  fetchButton:         "Fetch Transactions",
  fetching:            "Fetching transactions…",

  dateRange:           "Date Range",
  from:                "From",
  to:                  "To",
  thisYear:            "This Year",
  lastYear:            "Last Year",
  last30Days:          "Last 30 Days",

  received:            "Received",
  sent:                "Sent",
  fees:                "Fees",
  transactions:        "Transactions",
  otherTokens:         "Other Tokens",

  // Stacking rewards
  stackingRewards:     "Stacking Rewards (PoX)",
  btcReceived:         "BTC Received",
  stackingRewardsNote: "BTC earned by locking STX in Proof-of-Transfer cycles. Reported as income in tax tools like Koinly.",

  tablePreview:        "Transaction Preview",
  date:                "Date",
  type:                "Type",
  amount:              "Amount",
  currency:            "Currency",
  fee:                 "Fee",
  txHash:              "Tx Hash",
  noTransactions:      "No transactions found for this date range.",
  showingRows:         "Showing first 10 rows",

  downloadCsv:         "Download CSV",
  copyCsv:             "Copy CSV",
  copied:              "Copied!",

  noDataStored:        "No data stored. Transactions are fetched live and never saved.",
  openSource:          "Open source",

  donationTitle:       "Support this tool",
  donationDesc:        "If this saved you time, consider tipping:",
  donationCopied:      "Address copied!",

  invalidAddress:      "Please enter a valid STX address (SP… / SM…) or BNS name.",
  fetchError:          "Failed to fetch transactions. Please try again.",
  emptyResult:         "No transactions found for this address.",
};

const es: Translations = {
  title:               "Stacks CSV Exporter",
  subtitle:            "Exporta tus transacciones STX para declarar impuestos",
  placeholder:         "Dirección STX o nombre BNS (ej. flor.btc)",
  fetchButton:         "Obtener Transacciones",
  fetching:            "Obteniendo transacciones…",

  dateRange:           "Rango de Fechas",
  from:                "Desde",
  to:                  "Hasta",
  thisYear:            "Este Año",
  lastYear:            "Año Pasado",
  last30Days:          "Últimos 30 Días",

  received:            "Recibido",
  sent:                "Enviado",
  fees:                "Comisiones",
  transactions:        "Transacciones",
  otherTokens:         "Otros Tokens",

  // Stacking rewards
  stackingRewards:     "Recompensas de Stacking (PoX)",
  btcReceived:         "BTC Recibido",
  stackingRewardsNote: "BTC ganado al bloquear STX en ciclos de Proof-of-Transfer. Se reporta como ingreso en herramientas como Koinly.",

  tablePreview:        "Vista previa",
  date:                "Fecha",
  type:                "Tipo",
  amount:              "Cantidad",
  currency:            "Moneda",
  fee:                 "Comisión",
  txHash:              "Tx Hash",
  noTransactions:      "No se encontraron transacciones en este rango de fechas.",
  showingRows:         "Mostrando primeras 10 filas",

  downloadCsv:         "Descargar CSV",
  copyCsv:             "Copiar CSV",
  copied:              "¡Copiado!",

  noDataStored:        "Sin almacenamiento de datos. Las transacciones se obtienen en vivo y nunca se guardan.",
  openSource:          "Código abierto",

  donationTitle:       "Apoya esta herramienta",
  donationDesc:        "Si te ahorró tiempo, considera una propina:",
  donationCopied:      "¡Dirección copiada!",

  invalidAddress:      "Ingresa una dirección STX válida (SP… / SM…) o nombre BNS.",
  fetchError:          "Error al obtener transacciones. Inténtalo de nuevo.",
  emptyResult:         "No se encontraron transacciones para esta dirección.",
};

export const translations: Record<Lang, Translations> = { en, es };
