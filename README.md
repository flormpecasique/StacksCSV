# 🟣 StacksCSV — Tax & Data Export Layer for Stacks

![Preview](/preview.jpeg)

> A missing data layer for Stacks — turn raw on-chain activity into **tax-ready CSV exports** and a **professional capital-gains PDF report**, in seconds.

**StacksCSV** takes a Stacks address (or `.btc` name) and produces:

1. 📤 A **clean CSV** compatible with Koinly, CoinTracking and Awaken.
2. 🧾 A **fiscal PDF report** with realized gains/losses, valued at historical prices, localized for your country.

Everything runs on demand — **no accounts, no persistent storage**.

---

## 🌍 Live App
👉 **https://stackscsv.vercel.app/**

---

# 🚨 Problem

Stacks lacks a reliable data layer for tax reporting. Users face:

- broken or incomplete exports from explorers
- manual CSV cleaning for tax tools
- incorrect transaction classification in Awaken / Koinly
- no historical fiat valuation for STX or SIP-010 tokens
- swaps and contract-call token movements that get lost

The result: hours of manual work every tax season.

---

# 💡 Solution

StacksCSV provides two deliverables from a single address:

### 📤 CSV export (for tax software)
- Clean STX + SIP-010 transaction extraction
- Stacking (PoX) rewards included
- Contract-call token movements (swaps, DeFi) correctly captured
- Date filtering (tax-year support)
- CSV-injection-safe output
- Compatible with **Koinly · CoinTracking · Awaken**

### 🧾 Fiscal PDF report (built in the browser)
- **Realized gains/losses** with your choice of cost-basis method (FIFO / LIFO / HIFO / ACB)
- **Historical prices** for each transaction (via CoinGecko)
- Swaps correctly split into disposal + acquisition (no phantom gains)
- Staking rewards treated as **income at fair market value**
- **Multi-jurisdiction**: 🇪🇸 Spain · 🇺🇸 US · 🇲🇽 Mexico · 🇦🇷 Argentina · 🇨🇴 Colombia · 🇵🇹 Portugal · 🇩🇪 Germany · 🇬🇧 UK · 🇨🇦 Canada · 🌐 International
- **"Items to review"** section that flags (never hides) anything the engine couldn't value with certainty — missing cost basis, unpriced tokens, or dates without market data

> The report shows **figures, not the tax you owe**. It is a technical supporting document, **not tax advice** (see the disclaimer below).

---

# 🔒 Privacy & Security

Privacy-first by design, and built with tax-grade correctness in mind.

**Privacy**
- No accounts, no login, **no persistent storage**
- The realized-gains calculation and PDF generation happen **entirely in your browser** — that data never leaves your device
- The server transiently queries Hiro (for transactions) and CoinGecko (for historical prices, coin IDs + dates only — never your address) and caches results briefly in memory

**Security**
- **Decimal math everywhere** (no floating-point drift in money calculations)
- **Fail-closed pricing**: an asset with no reliable price is flagged for review, never valued at $0 or a guess
- **Input validation**: Stacks addresses and BNS names are strictly validated before any outbound request (no path/parameter injection)
- **CSV-injection protection**: values starting with `= + - @` are neutralized so a malicious token name can't execute a formula in Excel/Sheets
- **Security headers + CSP**, per-IP rate limiting, and SSRF-safe price/data proxies
- API keys (if any) live in server environment variables — **never committed to the repo**

---

# 🧩 How it works

```
Address / .btc
      │
      ▼
/api/transactions ──► Hiro (server) ──► clean CsvRow[]  ──►  CSV download
      │                                        │
      │                                        ▼
      │                               csvRowsToRawFlows()      (browser)
      │                                        │
      ▼                                        ▼
/api/price ──► CoinGecko (server, batched)  realized-gains engine (FIFO/…)
      │                                        │
      └──────────► historical prices ─────────►│
                                               ▼
                                     jurisdiction profile + PDF (browser)
```

- **`/api/transactions`** — resolves the address / `.btc`, fetches paginated transactions and stacking rewards from Hiro, and returns clean rows.
- **`/api/price`** — a server-side CoinGecko proxy that fetches one price range per asset (fast, no CORS, cache-friendly).
- **`src/lib/gains/`** — the tax engine: adapter → pricing → FIFO/LIFO/HIFO/ACB matching → jurisdiction-localized report → PDF.

---

# 🪙 Supported tokens (historical pricing)

Priced via CoinGecko (verified IDs): **STX, sBTC, BTC, xBTC, USDC, aeUSDC, USDCx, ALEX, VELAR, WELSH, sUSDT, stSTX, USDH, NOT, DIKO, LEO**.

Tokens without a reliable price feed (e.g. `USDA`, `stSTXbtc`) are **recognized but flagged "to review"** rather than mis-priced.

**Adding a token:** open its page on [coingecko.com](https://www.coingecko.com), copy the value shown as **"API ID"** (⚠️ this is often *not* the URL slug — e.g. LEO's URL is `leo-2` but its API ID is `leopold`), confirm it's the correct Stacks token via its contract, then add it to `src/lib/gains/assets.ts`.

---

# 🛠️ Tech stack

- **Next.js 14** (App Router) · **TypeScript** · **Tailwind CSS**
- **decimal.js** — exact money math
- **jsPDF** + **jspdf-autotable** — client-side PDF (dynamically imported, kept out of the main bundle)
- **Hiro API** (transactions) · **CoinGecko API** (historical prices)
- Deployed on **Vercel** (serverless, no database)

---

# 🚀 Quick Start

### Prerequisites
- Node.js 18+

### Install & run

```bash
git clone https://github.com/flormpecasique/StacksCSV.git
cd StacksCSV
npm install
npm run dev
```

Open 👉 http://localhost:3000

### Environment variables (optional)

| Variable | Purpose |
| --- | --- |
| `COINGECKO_API_KEY` | A free CoinGecko **demo** key. Optional — raises price-lookup rate limits under heavy use. Set it in Vercel → Settings → Environment Variables. **Never commit it.** |

---

# 🌐 Deploy

**Vercel (recommended)**

1. Push to GitHub
2. Import the repo into Vercel
3. Deploy

Or from the CLI:

```bash
vercel
```

---

# 🔮 Roadmap

- SIP-010 tokens (ALEX, WELSH, VELAR, …) ✅
- Stacking rewards export (PoX) ✅
- `.btc` name resolution ✅
- Contract-call token parsing (swaps / DeFi) ✅
- Historical price valuation ✅
- Realized-gains engine (FIFO / LIFO / HIFO / ACB) ✅
- Multi-jurisdiction fiscal PDF report ✅
- Expand verified token price coverage 🔄
- Multi-wallet aggregation ⏳
- Self-transfer detection between own wallets ⏳

---

# ⚠️ Disclaimer

StacksCSV is a **technical tool**, not a tax or accounting service. The reports it generates are supporting documents based on on-chain data and the selected method; they do **not** constitute tax advice, and they do **not** compute the tax you owe. The legal classification of each transaction and all filing obligations are the responsibility of the taxpayer and their advisor. Always verify the figures and your jurisdiction's current rules before filing.

---

# 🤝 Use case

Perfect for anyone who needs:
- Stacks tax reporting (CSV for Koinly / CoinTracking / Awaken)
- A realized gains/loss report valued at historical prices
- Year-end transaction summaries for a crypto accountant
- Clean, standardized STX transaction data

---

# 🧡 Donate

If this tool saved you time, consider a tip:

**STX / .btc:** `flor.btc`
