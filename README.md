# 🟣 Stacks Tax & Data Export Layer

![Preview](/preview.jpeg)

> A missing data layer for Stacks — export clean, tax-ready STX transactions in seconds.

StacksCSV helps you turn raw blockchain activity into **accurate CSV exports for tax reporting tools like Koinly, CoinTracking, and Awaken**.

Built to solve a real problem in the Stacks ecosystem:
> ❌ Incomplete explorer data  
> ❌ Manual CSV fixes  
> ❌ Poor tax tool compatibility  

---

## 🌍 Live App
👉 https://stackscsv.vercel.app/

---

# 🚨 Problem

Stacks currently lacks a reliable data export layer for tax reporting.

Users often face:
- broken or incomplete exports from explorers
- manual data cleaning for tax tools
- incorrect transaction classification in platforms like Awaken or Koinly
- no standard format for STX transactions

This results in hours of manual work during tax season.

---

# 💡 Solution

StacksCSV provides:

- Clean STX transaction extraction
- Tax-ready CSV formatting
- Date filtering (tax year support)
- Compatible output for major tax platforms
- No login, no data storage, fully client-safe

---

# ⚡ Features

### 📤 Export STX transactions
Convert wallet activity into structured, tax-ready CSV files.

### 📅 Date filtering
Export only relevant tax periods (e.g. 2023, 2024).

### 📊 Tax summary
Instant overview:
- total received
- total sent
- total fees
- transaction count

### 🧾 Tax software compatibility
Works with:
- Koinly
- CoinTracking
- Awaken

### 🔒 Privacy-first
- No accounts
- No data stored
- Everything processed on demand

---

# 🚀 Quick Start

## Prerequisites
- Node.js 18+

## Install

```bash
git clone https://github.com/your-username/stackscsv.git
cd stackscsv
npm install
npm run dev
```

Open:
👉 http://localhost:3000

---

# 🌐 Deploy

## Vercel (recommended)

1. Push to GitHub  
2. Import into Vercel  
3. Deploy

Or use:

```bash
vercel
```

---

# 🧠 Why this matters

Stacks currently does not have a reliable tax data layer.

This tool acts as:
> a lightweight **infrastructure layer for STX transaction exports**


---

# ⚡ Performance

- Serverless-ready (Vercel optimized)
- No database required
- Fast in-memory caching
- Minimal bundle size (no heavy UI libraries)

---

# 🔮 Roadmap

- Support for SIP-010 tokens (ALEX, WELSH, etc.)
- Stacking rewards export (PoX)
- Smart contract transaction parsing
- Multi-wallet aggregation
- .btc name resolution
- Persistent edge caching (Vercel KV)

---

# 🤝 Use case

Perfect for users who need:
- Stacks tax reporting
- CSV exports for crypto accountants
- Year-end transaction summaries
- Clean data for Awaken / Koinly

---

# 🧡 Donate

If this tool saves you time:

**STX Address:** `flor.btc`
