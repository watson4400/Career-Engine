import type { MarketSnapshot } from "../types/index.js";
import { RISK } from "../config/constants.js";

/** Compact JSON for Jev — keep well under 400 tokens. */
export function serializeSnapshot(s: MarketSnapshot): string {
  const compact = {
    s: s.symbol,
    id: s.schemaId,
    t: s.asOfMs,
    mid: round(s.mid, 6),
    spr_bps: round(s.spreadBps, 2),
    imb: round(s.imbalance, 4),
    rvol: round(s.realizedVol, 6),
    inv: round(s.inventoryQty, 6),
    inv_pct: round(s.inventoryNotionalPct, 4),
    dd: round(s.drawdownPct, 4),
    day_loss: round(s.dailyLossPct, 4),
    fund_pa: s.fundingRatePa ?? null,
    oi: s.openInterest ?? null,
  };
  return JSON.stringify(compact);
}

export function estimateTokens(text: string): number {
  // Conservative: ~4 chars/token for numeric JSON
  return Math.ceil(text.length / 4);
}

export function assertSnapshotBudget(text: string): void {
  const tokens = estimateTokens(text);
  if (tokens > RISK.maxSnapshotTokens) {
    throw new Error(`snapshot exceeds token budget: ${tokens} > ${RISK.maxSnapshotTokens}`);
  }
}

function round(n: number, d: number): number {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}
