/* Minimal dependency-free test harness (run with tsx). */
import { Decimal } from "../decimal";
import { runEngine } from "../engine";
import { priceFlows } from "../pricing";
import { summarize } from "../report";
import { computeRealizedGains } from "../index";
import { CoinGeckoPriceProvider } from "../prices/coingecko";
import { CachingPriceProvider } from "../prices/cache";
import { PriceUnavailableError } from "../prices/provider";
import type { PriceProvider } from "../prices/provider";
import type { RawFlow, TaxEvent } from "../types";

let passed = 0, failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error("  ✗ FAIL:", msg); }
}
function eq(a: string, b: string, msg: string) { assert(a === b, `${msg} (got ${a}, want ${b})`); }
async function expectThrow(fn: () => Promise<any> | any, msg: string) {
  try { await fn(); failed++; console.error("  ✗ FAIL (no throw):", msg); }
  catch { passed++; }
}

const D = (s: string) => new Decimal(s);
const day = (d: string) => Date.parse(d + "T12:00:00Z");

// ---- A fake price provider: fixed prices per (asset, day) --------------------
function fakeProvider(prices: Record<string, Record<string, string>>): PriceProvider {
  return {
    async getDailyPrice(asset, dayUtc) {
      const p = prices[asset]?.[dayUtc];
      if (p === undefined) throw new PriceUnavailableError(asset, dayUtc, "no fixture");
      return D(p);
    },
  };
}

async function run() {
  // ============ 1. FIFO realized gain, two lots ============
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-01-01", txid: "a1" },
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-02-01", txid: "a2" },
      { kind: "dispose", asset: "STX", qty: "150", timestamp: "2024-06-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-01-01": "1.00", "2024-02-01": "2.00", "2024-06-01": "5.00" } };
    const { result, summary } = await computeRealizedGains(flows, fakeProvider(prices), {
      method: "FIFO", fiat: "USD", longTermThresholdDays: 365,
    });
    // proceeds 150*5=750; cost: 100@1 + 50@2 = 200; gain 550
    eq(summary.totals.proceeds, "750.00", "FIFO proceeds");
    eq(summary.totals.costBasis, "200.00", "FIFO cost basis");
    eq(summary.totals.totalGain, "550.00", "FIFO total gain");
    assert(result.disposals[0].legs.length === 2, "FIFO produced 2 legs");
    // all short term (< 365 days)
    eq(summary.totals.shortTermGain, "550.00", "FIFO short-term");
  }

  // ============ 2. HIFO uses highest-cost lot first ============
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-01-01", txid: "a1" },
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-02-01", txid: "a2" },
      { kind: "dispose", asset: "STX", qty: "100", timestamp: "2024-06-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-01-01": "1.00", "2024-02-01": "2.00", "2024-06-01": "5.00" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "HIFO", fiat: "USD" });
    // HIFO sells the $2 lot: cost 200, proceeds 500, gain 300
    eq(summary.totals.costBasis, "200.00", "HIFO picks high-cost lot");
    eq(summary.totals.totalGain, "300.00", "HIFO gain");
  }

  // ============ 3. ACB blends cost ============
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-01-01", txid: "a1" },
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-02-01", txid: "a2" },
      { kind: "dispose", asset: "STX", qty: "100", timestamp: "2024-06-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-01-01": "1.00", "2024-02-01": "2.00", "2024-06-01": "5.00" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "ACB", fiat: "USD" });
    // blended cost = (100 + 200)/200 = 1.5/unit; 100 sold => cost 150, gain 350
    eq(summary.totals.costBasis, "150.00", "ACB blended cost");
    eq(summary.totals.totalGain, "350.00", "ACB gain");
  }

  // ============ 4. Staking income = ordinary income + basis ============
  {
    const flows: RawFlow[] = [
      { kind: "income", asset: "STX", qty: "10", timestamp: "2024-03-01", txid: "r1" },
      { kind: "dispose", asset: "STX", qty: "10", timestamp: "2024-09-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-03-01": "2.00", "2024-09-01": "3.00" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    eq(summary.totals.ordinaryIncome, "20.00", "staking income at receipt");
    // basis 20 (10@2), proceeds 30 (10@3), gain 10
    eq(summary.totals.totalGain, "10.00", "gain from staked coins uses FMV basis");
  }

  // ============ 5. Fees: acquisition fee -> basis, disposal fee -> proceeds ==
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "100", timestamp: "2024-01-01", txid: "a1", feeAsset: "STX", feeQty: "1" },
      { kind: "dispose", asset: "STX", qty: "100", timestamp: "2024-06-01", txid: "d1", feeAsset: "STX", feeQty: "1" },
    ];
    // price 1 at buy (fee 1 STX = $1 -> basis 101), price 5 at sell (fee 1 STX = $5 -> proceeds 500-5=495)
    const prices = { STX: { "2024-01-01": "1.00", "2024-06-01": "5.00" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    eq(summary.totals.costBasis, "101.00", "acquisition fee capitalized into basis");
    eq(summary.totals.proceeds, "495.00", "disposal fee reduces proceeds");
    eq(summary.totals.totalGain, "394.00", "gain net of both fees");
  }

  // ============ 6. Missing basis -> zero-cost + review flag ============
  {
    const flows: RawFlow[] = [
      { kind: "dispose", asset: "STX", qty: "50", timestamp: "2024-06-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-06-01": "5.00" } };
    const { summary, result } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD", missingBasis: "zero" });
    eq(summary.totals.costBasis, "0.00", "missing basis -> zero cost");
    eq(summary.totals.totalGain, "250.00", "full proceeds are gain when basis unknown");
    assert(summary.needsReview, "missing basis flags needsReview");
    assert(result.disposals[0].legs[0].missingBasis === true, "leg marked missingBasis");
  }

  // ============ 6b. Missing basis -> error policy throws in engine ==========
  {
    const events: TaxEvent[] = [
      { kind: "dispose", asset: "STX", qty: D("5"), fiatProceeds: D("25"), feeFiat: D("0"),
        timestampMs: day("2024-06-01"), txid: "d1", warnings: [] },
    ];
    let threw = false;
    try { runEngine(events, { missingBasis: "error" }); } catch { threw = true; }
    assert(threw, "missingBasis:error throws");
  }

  // ============ 7. Swap = dispose out + acquire in, no phantom gain ==========
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "1000", timestamp: "2024-01-01", txid: "a1" },
      { kind: "swap", assetOut: "STX", qtyOut: "500", assetIn: "ALEX", qtyIn: "250", timestamp: "2024-06-01", txid: "s1" },
      { kind: "dispose", asset: "ALEX", qty: "250", timestamp: "2024-07-01", txid: "d1" },
    ];
    const prices = {
      STX: { "2024-01-01": "1.00", "2024-06-01": "4.00" },
      ALEX: { "2024-07-01": "10.00" },
    };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    // swap out: dispose 500 STX @4 = proceeds 2000, basis 500@1 = 500, gain 1500
    // ALEX acquired at fiat value 2000 (basis), later sold 250@10 = 2500, gain 500
    // total gain 2000
    eq(summary.totals.totalGain, "2000.00", "swap decomposed correctly, no double count");
    assert(summary.byAsset.some(a => a.asset === "ALEX"), "ALEX appears in per-asset");
  }

  // ============ 8. Long vs short term split ============
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "10", timestamp: "2023-01-01", txid: "a1" },
      { kind: "dispose", asset: "STX", qty: "10", timestamp: "2024-06-01", txid: "d1" }, // >365d
    ];
    const prices = { STX: { "2023-01-01": "1.00", "2024-06-01": "5.00" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD", longTermThresholdDays: 365 });
    eq(summary.totals.longTermGain, "40.00", "held >365d counts as long term");
    eq(summary.totals.shortTermGain, "0.00", "nothing short term");
  }

  // ============ 9. No float drift ============
  {
    const flows: RawFlow[] = [
      { kind: "acquire", asset: "STX", qty: "0.1", timestamp: "2024-01-01", txid: "a1" },
      { kind: "acquire", asset: "STX", qty: "0.2", timestamp: "2024-01-02", txid: "a2" },
      { kind: "dispose", asset: "STX", qty: "0.3", timestamp: "2024-06-01", txid: "d1" },
    ];
    const prices = { STX: { "2024-01-01": "1", "2024-01-02": "1", "2024-06-01": "1" } };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    // 0.1 + 0.2 = 0.3 exactly; cost 0.30, proceeds 0.30, gain 0.00
    eq(summary.totals.totalGain, "0.00", "0.1+0.2 handled exactly (no float bug)");
  }

  // ============ 10. Validation rejects hostile / bad input ============
  {
    const bad: RawFlow[] = [{ kind: "acquire", asset: "STX", qty: "-5", timestamp: "2024-01-01", txid: "x" }];
    const { errors, events } = await priceFlows(bad, fakeProvider({ STX: { "2024-01-01": "1" } }), "USD");
    assert(events.length === 0 && errors.length === 1, "negative qty rejected, not priced");

    const badDate: RawFlow[] = [{ kind: "acquire", asset: "STX", qty: "5", timestamp: "1990-01-01", txid: "x" }];
    const r2 = await priceFlows(badDate, fakeProvider({}), "USD");
    assert(r2.errors.length === 1, "absurd pre-2009 date rejected");

    const unknownAsset: RawFlow[] = [{ kind: "acquire", asset: "SCAMCOIN", qty: "5", timestamp: "2024-01-01", txid: "x" }];
    const r3 = await priceFlows(unknownAsset, fakeProvider({}), "USD");
    assert(r3.errors.length === 1 && /Unknown asset/.test(r3.errors[0].reason), "unknown asset refused (not priced as 0)");

    const tooPrecise: RawFlow[] = [{ kind: "acquire", asset: "STX", qty: "1.1234567", timestamp: "2024-01-01", txid: "x" }];
    const r4 = await priceFlows(tooPrecise, fakeProvider({ STX: { "2024-01-01": "1" } }), "USD");
    assert(r4.errors.length === 1, "over-precision (7dp on 6dp STX) rejected");
  }

  // ============ 11. CoinGecko provider: allowlist + URL safety + fake fetch ==
  {
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return {
        ok: true, status: 200,
        json: async () => ({ market_data: { current_price: { usd: 1.23 } } }),
      } as any;
    }) as unknown as typeof fetch;

    const cg = new CoinGeckoPriceProvider({ fetchImpl: fakeFetch });
    const price = await cg.getDailyPrice("STX", "2024-06-01", "USD");
    eq(price.toString(), "1.23", "CoinGecko parses price");
    assert(calledUrl.startsWith("https://api.coingecko.com/api/v3/coins/blockstack/history"), "URL pinned to allowlisted host + mapped id");
    assert(calledUrl.includes("date=01-06-2024"), "date formatted dd-mm-yyyy");

    // Unknown asset must never reach fetch
    await expectThrow(() => cg.getDailyPrice("SCAMCOIN", "2024-06-01", "USD"), "unknown asset blocked before fetch");

    // Stablecoin short-circuits without network
    let stableFetched = false;
    const cg2 = new CoinGeckoPriceProvider({ fetchImpl: (async () => { stableFetched = true; return {} as any; }) as any });
    const usdc = await cg2.getDailyPrice("USDC", "2024-06-01", "USD");
    eq(usdc.toString(), "1", "USDC pegged to 1");
    assert(!stableFetched, "stablecoin skips network");

    // 429 then success (retry path); keep maxRetries low + no real sleep delay impact
    let n = 0;
    const flakyFetch = (async () => {
      n++;
      if (n === 1) return { ok: false, status: 429, json: async () => ({}) } as any;
      return { ok: true, status: 200, json: async () => ({ market_data: { current_price: { usd: 2 } } }) } as any;
    }) as unknown as typeof fetch;
    const cg3 = new CoinGeckoPriceProvider({ fetchImpl: flakyFetch, maxRetries: 2 });
    const retried = await cg3.getDailyPrice("STX", "2024-06-01", "USD");
    eq(retried.toString(), "2", "retries on 429 then succeeds");
    assert(n === 2, "exactly one retry happened");

    // http (non-https) base rejected
    let ctorThrew = false;
    try { new CoinGeckoPriceProvider({ baseUrl: "http://evil.example" }); } catch { ctorThrew = true; }
    assert(ctorThrew, "non-https base URL rejected");
  }

  // ============ 12. Caching dedups identical lookups ============
  {
    let calls = 0;
    const counting: PriceProvider = {
      async getDailyPrice() { calls++; return D("3"); },
    };
    const cached = new CachingPriceProvider(counting, { maxConcurrent: 2 });
    const results = await Promise.all([
      cached.getDailyPrice("STX", "2024-06-01", "USD"),
      cached.getDailyPrice("STX", "2024-06-01", "USD"),
      cached.getDailyPrice("STX", "2024-06-01", "USD"),
    ]);
    assert(results.every(r => r.toString() === "3"), "cache returns correct value");
    assert(calls === 1, "3 identical lookups -> 1 upstream call");
    await cached.getDailyPrice("STX", "2024-06-02", "USD"); // different day
    assert(calls === 2, "different day -> new call");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
