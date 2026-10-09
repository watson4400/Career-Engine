import { RISK } from "../config/constants.js";
import type { Fill, OrderIntent, PortfolioState } from "../types/index.js";

/**
 * Build a market intent that closes inventory (sell if long, buy if short).
 * Returns null if flat / dust.
 */
export function buildFlattenIntent(
  portfolio: PortfolioState,
  mid: number,
  schemaId: string,
  symbol: string,
): OrderIntent | null {
  if (!(mid > 0) || portfolio.equity <= 0) return null;
  const notional = Math.abs(portfolio.inventoryQty * mid);
  const notionalPct = notional / portfolio.equity;
  if (notionalPct < RISK.minOrderNotionalPct || Math.abs(portfolio.inventoryQty) < 1e-10) {
    return null;
  }
  return {
    schemaId,
    symbol,
    side: portfolio.inventoryQty > 0 ? "sell" : "buy",
    notionalPct: Math.min(notionalPct, RISK.kellyFractionCap),
    reason: "emergency_flatten",
    directionConfidence: 1,
    setupQuality: 3,
    calibratedP: 0.5,
  };
}

export interface FlattenExecutor {
  placeMarket(
    intent: OrderIntent,
    tsMs: number,
    mid: number,
    equity: number,
  ): Promise<Fill | null> | Fill | null;
}

/**
 * Place emergency flatten. Caller must only invoke after kill is armed (or for test).
 */
export async function executeFlatten(
  executor: FlattenExecutor,
  portfolio: PortfolioState,
  mid: number,
  tsMs: number,
  schemaId: string,
  symbol: string,
): Promise<Fill | null> {
  const intent = buildFlattenIntent(portfolio, mid, schemaId, symbol);
  if (!intent) return null;
  return executor.placeMarket(intent, tsMs, mid, portfolio.equity);
}
