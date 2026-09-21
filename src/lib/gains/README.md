# Realized-Gains Engine for StacksCSV

A self-contained module that turns parsed Stacks transactions into a **realized
capital-gains + income report** (FIFO / LIFO / HIFO / ACB), with historical fiat
pricing. Pure engine, injectable price provider, no data stored.

Drop the folder into `src/lib/gains/` and import from `@/lib/gains`.

## Pipeline

```
Your parsed txs ──map──▶ RawFlow[] ──priceFlows()──▶ TaxEvent[] ──runEngine()──▶ result ──summarize()──▶ ReportSummary
                         (untrusted)   (async, I/O)      (priced)     (pure, sync)                (rounded output)
```

`computeRealizedGains()` does all three steps for you.

```ts
import { computeRealizedGains, CoinGeckoPriceProvider, CachingPriceProvider } from "@/lib/gains";

const provider = new CachingPriceProvider(new CoinGeckoPriceProvider());

const { result, summary, errors } = await computeRealizedGains(flows, provider, {
  method: "FIFO",
  fiat: "EUR",
  longTermThresholdDays: 0, // España: sin distinción corto/largo plazo
  missingBasis: "zero",     // marca para revisión en vez de romper
});

// summary.totals.totalGain, summary.byYear, summary.byAsset
// errors[] = flows that could not be priced/parsed (surface these, never hide them)
// summary.needsReview === true when any disposal lacked a cost basis
```

## Mapping your transactions → `RawFlow`

You already parse STX / SIP-010 / PoX. Map each into one of:

- **acquire** — you received an asset by buying/bridging in: `{ kind:"acquire", asset, qty, timestamp, txid, feeAsset?, feeQty? }`
- **dispose** — you sent/sold an asset: `{ kind:"dispose", asset, qty, timestamp, txid, feeAsset?, feeQty? }`
- **income** — PoX/staking reward: `{ kind:"income", asset, qty, timestamp, txid }`
- **swap** — DEX trade (ALEX/Velar): `{ kind:"swap", assetOut, qtyOut, assetIn, qtyIn, timestamp, txid, feeAsset?, feeQty? }`

`qty` are strings in human units (STX, not microSTX). Timestamps are ISO or epoch ms.

## Security / correctness decisions (why it's built this way)

- **No floats, ever.** All math goes through `decimal.js` at 40-digit precision;
  rounding happens once, at output. `0.1 + 0.2` is exactly `0.3` here.
- **Untrusted input is validated.** Negative/zero/over-precise amounts, absurd
  dates (pre-2009 / future), and **unknown assets** are rejected and returned in
  `errors[]` — never coerced into a plausible-but-wrong number.
- **Unknown asset ≠ $0.** The asset registry (`assets.ts`) is an allowlist. An
  asset with no price feed is refused, so a mystery token can't silently zero out
  a gain calculation.
- **Fail-closed on missing prices.** `PriceUnavailableError` is never swallowed.
- **SSRF-safe pricing.** The CoinGecko base URL is pinned, the coin id comes from
  the allowlist, every URL part is `encodeURIComponent`'d. Transaction data can
  never steer an outbound request to another host.
- **No secrets in the client.** `CoinGeckoPriceProvider` reads no API key. For the
  Pro API, run a Vercel serverless route that injects the key and point
  `fetchImpl`/`baseUrl` at it — the key stays server-side, out of the bundle.
- **Bounded work.** Request timeouts (AbortController), capped retries with
  jittered backoff on 429/5xx, a concurrency limiter, and `maxEvents` caps so a
  huge/hostile input can't hang the tab or hammer the upstream.
- **Deterministic + auditable.** Same input + config ⇒ same output. Every result
  carries `meta` (method, fiat, engine version, timestamp).
- **Privacy-first preserved.** Cache keys are only `(asset, day, fiat)` — never
  addresses or txids — so nothing identifying is cached or could leak if you later
  move the cache server-side.

## Tax logic implemented

- Acquisition fees are **capitalized into cost basis**; disposal fees **reduce
  proceeds** (allocated across matched lots with exact remainder, no drift).
- Staking rewards = **ordinary income at FMV on receipt**, and that FMV becomes
  the lot's cost basis for the later disposal (two tax events, handled).
- Swaps are correctly split into a **disposal of the out-asset + acquisition of
  the in-asset** at the same fiat FMV (the thing generic exporters get wrong).
- Short vs long term via `longTermThresholdDays` (set `0` to disable, e.g. ES).

## Known limitations (decide before shipping the "complete report")

- **Self-transfers between your own wallets are NOT taxable.** This engine is
  per-flow; if your data includes wallet→wallet moves of the same owner, exclude
  them upstream (or tag them), otherwise they'll look like dispose+acquire and
  over-report. Wallet-aware lot tracking is the natural v2.
- **Method/fee treatment is jurisdiction-dependent.** The engine gives you the
  numbers; the *legal* choice of method and whether gas-as-disposal applies is a
  config/policy decision. Not tax advice.
- Daily price granularity (tax-authority standard). Intraday isn't used.

## Tests

```
npx tsx src/lib/gains/__tests__/engine.test.ts
```

40 assertions cover FIFO/LIFO/HIFO/ACB, income, fees, missing basis, swaps,
long/short split, float-safety, input validation, URL/allowlist safety, retry,
and cache de-duplication.
