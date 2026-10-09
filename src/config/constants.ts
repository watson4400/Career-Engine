/** Hard limits — owned by code, never by Jev. */
export const RISK = {
  maxDrawdownPct: 0.15,
  maxPositionNotionalPct: 0.25,
  maxDailyLossPct: 0.03,
  minDirectionConfidence: 0.8,
  /** Raised from 2 → 2.5 after paper-trainer Brier > 0.25 (2026-10-09 session). */
  minSetupQuality: 2.5,
  escalateConfidenceBelow: 0.6,
  kellyFractionCap: 0.25,
  /** Extra haircut on Kelly after edge estimate (costs / model error). */
  kellyCostHaircut: 0.5,
  /** Shrink raw direction probs toward 0.5 before Kelly / Brier logging. */
  probabilityShrink: 0.55,
  /** Skip dust orders as a fraction of equity. */
  minOrderNotionalPct: 0.005,
  /** BTC books are tight; alts need more room (override with MAX_SPREAD_BPS). */
  maxSpreadBps: 25,
  maxSpreadBpsAlt: 60,
  maxSnapshotTokens: 400,
  /** Candles ahead used to label paper prediction outcomes. */
  outcomeHorizonCandles: 5,
} as const;

/** Effective spread cap for a Coinbase product or engine symbol. */
export function maxSpreadBpsForSymbol(productOrSymbol: string): number {
  const env = Number(process.env.MAX_SPREAD_BPS);
  if (Number.isFinite(env) && env > 0) return env;
  const upper = productOrSymbol.trim().toUpperCase();
  const base = upper.includes("-")
    ? (upper.split("-")[0] ?? "BTC")
    : upper.replace(/USDT$|USD$/, "") || "BTC";
  return base === "BTC" ? RISK.maxSpreadBps : RISK.maxSpreadBpsAlt;
}

export const JEV = {
  model: process.env.JEV_MODEL ?? "jev-latest",
  typesafeUrl: "https://api.typesafe.ai/v1/systemone",
  hostedUrl: "https://jevtypesafeai.com/api/v1/decide",
} as const;

export function isLiveTrading(): boolean {
  return process.env.LIVE_TRADING === "true";
}
