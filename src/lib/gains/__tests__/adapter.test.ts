/* Adapter tests. Run with: npx tsx src/lib/gains/__tests__/adapter.test.ts */
import { csvRowsToRawFlows, type StacksCsvRow } from "../adapter";
import { computeRealizedGains } from "../index";
import { Decimal } from "../decimal";
import { PriceUnavailableError } from "../prices/provider";
import type { PriceProvider } from "../prices/provider";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) passed++; else { failed++; console.error("  ✗", m); } }
function eq(a: unknown, b: unknown, m: string) { assert(a === b, `${m} (got ${a}, want ${b})`); }

const EPOCH0 = new Date(0).toISOString();
const D = (s: string) => new Decimal(s);

function row(p: Partial<StacksCsvRow>): StacksCsvRow {
  return {
    date: "2024-06-01T12:00:00.000Z",
    receivedAmount: "", receivedCurrency: "",
    sentAmount: "", sentCurrency: "",
    feeAmount: "", feeCurrency: "",
    txHash: "0xtx", txType: "", ...p,
  };
}

function fakeProvider(prices: Record<string, Record<string, string>>): PriceProvider {
  return {
    async getDailyPrice(asset, day) {
      const p = prices[asset]?.[day];
      if (p === undefined) throw new PriceUnavailableError(asset, day, "no fixture");
      return D(p);
    },
  };
}

async function run() {
  // 1. Plain receive -> acquire; plain send -> dispose
  {
    const { flows, skipped } = csvRowsToRawFlows([
      row({ txHash: "a", receivedAmount: "100", receivedCurrency: "STX" }),
      row({ txHash: "b", sentAmount: "40", sentCurrency: "STX", feeAmount: "0.5", feeCurrency: "STX" }),
    ]);
    eq(flows.length, 2, "two flows");
    eq(flows[0].kind, "acquire", "receive -> acquire");
    eq(flows[1].kind, "dispose", "send -> dispose");
    eq(flows[1].feeAsset, "STX", "fee carried onto dispose");
    eq(skipped.length, 0, "nothing skipped");
  }

  // 2. Swap detection: sent + received, same txHash, different assets -> one swap
  {
    const { flows } = csvRowsToRawFlows([
      row({ txHash: "s1", sentAmount: "500", sentCurrency: "STX", feeAmount: "1", feeCurrency: "STX", txType: "FT Transfer (ALEX)" }),
      row({ txHash: "s1", receivedAmount: "250", receivedCurrency: "ALEX" }),
    ]);
    eq(flows.length, 1, "swap collapses to one flow");
    eq(flows[0].kind, "swap", "detected as swap");
    eq(flows[0].assetOut, "STX", "swap out = STX");
    eq(flows[0].assetIn, "ALEX", "swap in = ALEX");
    eq(flows[0].qtyOut, "500", "qtyOut");
    eq(flows[0].qtyIn, "250", "qtyIn");
    eq(flows[0].feeAsset, "STX", "swap keeps fee");
  }

  // 3. Income classification (staking) -> income, not acquire
  {
    const { flows } = csvRowsToRawFlows(
      [row({ txHash: "r1", receivedAmount: "10", receivedCurrency: "STX", txType: "Stacking Reward" })],
      { isIncome: (r) => r.txType.includes("Stacking") },
    );
    eq(flows[0].kind, "income", "staking row -> income");
  }

  // 4. Epoch-0 date is skipped, not priced with a wrong date
  {
    const { flows, skipped } = csvRowsToRawFlows([
      row({ txHash: "z", date: EPOCH0, receivedAmount: "5", receivedCurrency: "STX" }),
    ]);
    eq(flows.length, 0, "epoch-0 produces no flow");
    eq(skipped.length, 1, "epoch-0 recorded in skipped");
    assert(/epoch-0/.test(skipped[0].reason), "skip reason mentions date");
  }

  // 5. Self-transfer excluded
  {
    const { flows, skipped } = csvRowsToRawFlows(
      [
        row({ txHash: "self", sentAmount: "20", sentCurrency: "STX" }),
        row({ txHash: "keep", sentAmount: "5", sentCurrency: "STX" }),
      ],
      { selfTransferTxHashes: new Set(["self"]) },
    );
    eq(flows.length, 1, "self-transfer dropped, other kept");
    eq(flows[0].txid, "keep", "kept the non-self tx");
    assert(skipped.some((s) => s.txHash === "self"), "self-transfer in skipped");
  }

  // 6. End-to-end: adapter -> engine produces correct gain
  {
    const rows: StacksCsvRow[] = [
      row({ txHash: "buy", date: "2024-01-01T12:00:00.000Z", receivedAmount: "100", receivedCurrency: "STX" }),
      row({ txHash: "sell", date: "2024-06-01T12:00:00.000Z", sentAmount: "100", sentCurrency: "STX" }),
    ];
    const { flows } = csvRowsToRawFlows(rows);
    const prices = { STX: { "2024-01-01": "1.00", "2024-06-01": "5.00" } };
    const { summary, errors } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    eq(errors.length, 0, "no pricing errors");
    eq(summary.totals.costBasis, "100.00", "e2e basis");
    eq(summary.totals.proceeds, "500.00", "e2e proceeds");
    eq(summary.totals.totalGain, "400.00", "e2e gain");
  }

  // 7. Swap end-to-end: no phantom gain on the acquired asset's basis
  {
    const rows: StacksCsvRow[] = [
      row({ txHash: "buy", date: "2024-01-01T12:00:00.000Z", receivedAmount: "1000", receivedCurrency: "STX" }),
      row({ txHash: "swap", date: "2024-06-01T12:00:00.000Z", sentAmount: "500", sentCurrency: "STX" }),
      row({ txHash: "swap", date: "2024-06-01T12:00:00.000Z", receivedAmount: "250", receivedCurrency: "ALEX" }),
      row({ txHash: "sell", date: "2024-07-01T12:00:00.000Z", sentAmount: "250", sentCurrency: "ALEX" }),
    ];
    const { flows } = csvRowsToRawFlows(rows);
    const prices = {
      STX: { "2024-01-01": "1.00", "2024-06-01": "4.00" },
      ALEX: { "2024-07-01": "10.00" },
    };
    const { summary } = await computeRealizedGains(flows, fakeProvider(prices), { method: "FIFO", fiat: "USD" });
    // STX dispose 500@4=2000 - basis 500@1=500 => 1500
    // ALEX basis = 2000 (from swap), sold 250@10=2500 => 500
    eq(summary.totals.totalGain, "2000.00", "swap e2e total gain, no double count");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
