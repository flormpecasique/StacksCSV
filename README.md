# Stacks Tax & Data Export Layer

> Export your Stacks (STX) wallet transactions as a CSV file compatible with **Koinly**, **CoinTracking**, and **Awaken** tax software.

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js **18+**
- npm or yarn

### 1. Clone / download the project
```bash
git clone https://github.com/your-username/stacks-csv-exporter.git
cd stacks-csv-exporter
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel
```
Follow the prompts. Zero config required — Vercel auto-detects Next.js.

### Option B — GitHub + Vercel Dashboard
1. Push this project to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Click **Deploy** — no environment variables needed

### Option C — One-click deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## 📁 Project Structure

```
stacks-csv-exporter/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout + SEO metadata
│   │   ├── page.tsx              # Main application page (all UI logic)
│   │   ├── globals.css           # Tailwind base + custom CSS variables
│   │   └── api/
│   │       └── transactions/
│   │           └── route.ts      # API endpoint: GET /api/transactions?address=...
│   ├── components/
│   │   ├── AddressInput.tsx      # Wallet address form with validation
│   │   ├── TransactionTable.tsx  # Preview table (first 10 rows)
│   │   ├── DonationSection.tsx   # Donation banner with copy button
│   │   └── LoadingSkeleton.tsx   # Shimmer loading state
│   ├── lib/
│   │   ├── hiro-api.ts           # Hiro API client + pagination + in-memory cache
│   │   └── transform.ts          # microSTX → STX conversion + CSV generation
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── postcss.config.mjs
```

---

## 🔌 API Reference

### `GET /api/transactions?address={stacksAddress}`

**Parameters**
| Param     | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| `address` | string | ✅        | Stacks principal (SP... or SM...) |

**Success Response (200)**
```json
{
  "rows": [
    {
      "date": "2024-01-15T10:23:45.000Z",
      "receivedAmount": "10.5",
      "receivedCurrency": "STX",
      "sentAmount": "",
      "sentCurrency": "",
      "feeAmount": "",
      "feeCurrency": "",
      "txHash": "0xabc123..."
    }
  ],
  "total": 142,
  "fetched": 38
}
```

**Error Response (400 / 404 / 502)**
```json
{ "error": "Invalid Stacks address format." }
```

---

## 🔄 How Transactions Are Transformed

### Raw Hiro API response (example)
```json
{
  "tx_id": "0x1234abcd...",
  "tx_type": "token_transfer",
  "tx_status": "success",
  "sender_address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ",
  "fee_rate": "1000",
  "burn_block_time_iso": "2024-01-15T10:23:45.000Z",
  "token_transfer": {
    "recipient_address": "SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159",
    "amount": "10500000",
    "memo": ""
  }
}
```

### Transformation rules
| Condition | Received | Sent | Fee |
|-----------|----------|------|-----|
| Wallet = recipient | `10.5 STX` | — | — |
| Wallet = sender | — | `10.5 STX` | `0.001 STX` |
| Wallet = both (self-transfer) | `10.5 STX` | `10.5 STX` | `0.001 STX` |

**microSTX → STX**: divide by `1,000,000`
- `10500000 microSTX` → `10.5 STX`
- `1000 microSTX fee` → `0.001 STX`

### Output CSV row
```
Date,Received Amount,Received Currency,Sent Amount,Sent Currency,Fee Amount,Fee Currency,TxHash
2024-01-15T10:23:45.000Z,10.5,STX,,,,,0x1234abcd...
```

---

## ⚡ Performance Notes

- **Pagination**: fetches all pages concurrently in batches of 5 (avoids rate limits)
- **In-memory cache**: results cached for 2 minutes per address (repeated exports are instant)
- **No database**: fully stateless — safe to run on Vercel's serverless edge
- **Minimal JS bundle**: no UI libraries, only Next.js + Tailwind

---

## 🔮 Future Improvements (not implemented)

1. **Fungible token transfers** — export SIP-010 token transfers (ALEX, WELSH, etc.)
2. **Stacking rewards** — detect and export PoX stacking cycle rewards
3. **Smart contract calls** — parse contract interactions for DeFi protocols
4. **Date range filter** — let users export a specific year (e.g., for 2023 taxes only)
5. **Multi-address merge** — combine transactions from several wallets into one CSV
6. **Hiro API key support** — env variable to raise rate limits for heavy users
7. **Vercel KV caching** — replace in-memory cache with persistent edge cache
8. **BNS name resolution** — accept `.btc` names and resolve them to SP addresses

---

## 📄 CSV Column Reference (Tax Software Compatibility)

| Column | Koinly | CoinTracking | Awaken |
|--------|--------|--------------|--------|
| Date | ✅ | ✅ | ✅ |
| Received Amount | ✅ | ✅ | ✅ |
| Received Currency | ✅ | ✅ | ✅ |
| Sent Amount | ✅ | ✅ | ✅ |
| Sent Currency | ✅ | ✅ | ✅ |
| Fee Amount | ✅ | ✅ | ✅ |
| Fee Currency | ✅ | ✅ | ✅ |
| TxHash | ✅ (as Notes) | ✅ | ✅ |

---

## 🧡 Donate

If this tool saved you time, consider donating to the developer:

**Stacks address:** `flor.btc`
