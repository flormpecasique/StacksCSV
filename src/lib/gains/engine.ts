/**
 * The realized-gains engine. PURE and SYNCHRONOUS: no network, no clock reads
 * except the audit timestamp. Given the same priced events + config it always
 * produces the same result, which is exactly what you want for something a
 * user might have to defend to a tax authority.
 */
import { Decimal, ZERO } from "./decimal";
import type {
  CostBasisMethod,
  DisposalLeg,
  EngineConfig,
  IncomeRecord,
  RealizedDisposal,
  RealizedGainsResult,
  TaxEvent,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

const ENGINE_VERSION = "1.0.0";
const MS_PER_DAY = 86_400_000;

interface Lot {
  asset: string;
  qtyRemaining: Decimal;
  costPerUnit: Decimal; // fiat, includes acquisition fee
  acquiredAt: number;
}

/** Holds open lots per asset and matches disposals against them. */
class LotBook {
  private lots = new Map<string, Lot[]>();

  addLot(lot: Lot) {
    const arr = this.lots.get(lot.asset) ?? [];
    arr.push(lot);
    this.lots.set(lot.asset, arr);
  }

  /**
   * Consume `qty` of `asset`, returning the matched legs. If lots run out and
   * policy is "zero", the shortfall is matched at zero cost (flagged); if
   * "error", it throws.
   */
  consume(
    asset: string,
    qty: Decimal,
    disposedAt: number,
    method: CostBasisMethod,
    missingBasis: "zero" | "error",
    longTermDays: number,
  ): { legs: Array<Omit<DisposalLeg, "proceeds" | "gain">>; matchedQty: Decimal } {
    let remaining = qty;
    const legs: Array<Omit<DisposalLeg, "proceeds" | "gain">> = [];
    const pool = this.lots.get(asset) ?? [];

    while (remaining.gt(0) && pool.length > 0) {
      const idx = pickLotIndex(pool, method);
      const lot = pool[idx];
      const take = Decimal.min(remaining, lot.qtyRemaining);

      const costBasis = take.mul(lot.costPerUnit);
      const holdingDays = Math.max(0, Math.floor((disposedAt - lot.acquiredAt) / MS_PER_DAY));
      legs.push({
        acquiredAt: lot.acquiredAt,
        qty: take,
        costBasis,
        holdingDays,
        term: longTermDays > 0 && holdingDays >= longTermDays ? "long" : "short",
        missingBasis: false,
      });

      lot.qtyRemaining = lot.qtyRemaining.minus(take);
      remaining = remaining.minus(take);
      if (lot.qtyRemaining.lte(0)) pool.splice(idx, 1);
    }
    this.lots.set(asset, pool);

    if (remaining.gt(0)) {
      if (missingBasis === "error") {
        throw new RangeError(
          `Disposed ${qty} ${asset} but only ${qty.minus(remaining)} had a recorded cost basis`,
        );
      }
      // Zero-cost fallback: conservative (max taxable gain) and clearly flagged.
      legs.push({
        acquiredAt: disposedAt,
        qty: remaining,
        costBasis: ZERO,
        holdingDays: 0,
        term: "short",
        missingBasis: true,
      });
    }
    return { legs, matchedQty: qty };
  }
}

/** Choose which lot to draw from next, per method. */
function pickLotIndex(pool: Lot[], method: CostBasisMethod): number {
  switch (method) {
    case "FIFO":
      return indexOfExtreme(pool, (a, b) => a.acquiredAt <= b.acquiredAt);
    case "LIFO":
      return indexOfExtreme(pool, (a, b) => a.acquiredAt >= b.acquiredAt);
    case "HIFO":
      return indexOfExtreme(pool, (a, b) => a.costPerUnit.gte(b.costPerUnit));
    case "ACB":
      // Average-cost: collapse the pool to one blended lot on demand.
      return 0;
    default:
      return 0;
  }
}

function indexOfExtreme(pool: Lot[], better: (a: Lot, b: Lot) => boolean): number {
  let best = 0;
  for (let i = 1; i < pool.length; i++) if (better(pool[i], pool[best])) best = i;
  return best;
}

/** For ACB we blend all lots of an asset into one before matching. */
function blendForAcb(book: LotBook, asset: string) {
  // access via a tiny escape hatch below
  (book as any).blend?.(asset);
}

// Extend LotBook with ACB blending without exposing internals broadly.
(LotBook.prototype as any).blend = function (asset: string) {
  const pool: Lot[] = this.lots.get(asset) ?? [];
  if (pool.length <= 1) return;
  let qty = ZERO;
  let cost = ZERO;
  let earliest = pool[0].acquiredAt;
  for (const l of pool) {
    qty = qty.plus(l.qtyRemaining);
    cost = cost.plus(l.qtyRemaining.mul(l.costPerUnit));
    if (l.acquiredAt < earliest) earliest = l.acquiredAt;
  }
  if (qty.lte(0)) {
    this.lots.set(asset, []);
    return;
  }
  this.lots.set(asset, [{ asset, qtyRemaining: qty, costPerUnit: cost.div(qty), acquiredAt: earliest }]);
};

/**
 * Main entry point. Events MUST be chronologically sorted (priceFlows does
 * this). Returns realized disposals + income records + any warnings.
 */
export function runEngine(events: TaxEvent[], partial: Partial<EngineConfig> = {}): RealizedGainsResult {
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...partial };
  if (events.length > config.maxEvents) {
    throw new RangeError(`Too many events (${events.length} > ${config.maxEvents})`);
  }

  const book = new LotBook();
  const disposals: RealizedDisposal[] = [];
  const income: IncomeRecord[] = [];
  const warnings: string[] = [];

  for (const ev of events) {
    switch (ev.kind) {
      case "acquire": {
        // Acquisition fee is capitalized into basis (added to cost).
        const totalCost = ev.fiatCost.plus(ev.feeFiat);
        book.addLot({
          asset: ev.asset,
          qtyRemaining: ev.qty,
          costPerUnit: totalCost.div(ev.qty),
          acquiredAt: ev.timestampMs,
        });
        break;
      }
      case "income": {
        // Ordinary income at FMV, and the lot's basis is that same FMV.
        income.push({
          txid: ev.txid,
          asset: ev.asset,
          receivedAt: ev.timestampMs,
          qty: ev.qty,
          fiatValue: ev.fiatValue,
        });
        book.addLot({
          asset: ev.asset,
          qtyRemaining: ev.qty,
          costPerUnit: ev.fiatValue.div(ev.qty),
          acquiredAt: ev.timestampMs,
        });
        break;
      }
      case "dispose": {
        if (config.method === "ACB") blendForAcb(book, ev.asset);
        const { legs } = book.consume(
          ev.asset, ev.qty, ev.timestampMs, config.method, config.missingBasis, config.longTermThresholdDays,
        );

        // Disposal fee reduces proceeds. Allocate net proceeds across legs by
        // qty share, but give the LAST leg the exact remainder so the legs sum
        // to net proceeds with zero drift (sum of leg gains == disposal gain).
        const netProceeds = ev.fiatProceeds.minus(ev.feeFiat);
        const legRecords: DisposalLeg[] = [];
        let costTotal = ZERO;
        let allocated = ZERO;
        const evWarnings = [...ev.warnings];

        for (let i = 0; i < legs.length; i++) {
          const leg = legs[i];
          const isLast = i === legs.length - 1;
          const proceeds = isLast
            ? netProceeds.minus(allocated)
            : netProceeds.mul(leg.qty.div(ev.qty));
          if (!isLast) allocated = allocated.plus(proceeds);
          const gain = proceeds.minus(leg.costBasis);
          if (leg.missingBasis) {
            evWarnings.push(
              `Missing cost basis for ${leg.qty.toString()} ${ev.asset} — treated as zero-cost (review this).`,
            );
          }
          legRecords.push({ ...leg, proceeds, gain });
          costTotal = costTotal.plus(leg.costBasis);
        }

        const gainTotal = netProceeds.minus(costTotal);
        disposals.push({
          txid: ev.txid,
          asset: ev.asset,
          disposedAt: ev.timestampMs,
          qty: ev.qty,
          proceeds: netProceeds,
          costBasis: costTotal,
          gain: gainTotal,
          method: config.method,
          legs: legRecords,
          warnings: evWarnings,
        });
        if (evWarnings.length) warnings.push(...evWarnings);
        break;
      }
    }
  }

  return {
    disposals,
    income,
    warnings,
    config,
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      method: config.method,
      fiat: config.fiat,
    },
  };
}
