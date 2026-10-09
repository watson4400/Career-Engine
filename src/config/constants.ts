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
  maxSpreadBps: 25,
  maxSnapshotTokens: 400,
  /** Candles ahead used to label paper prediction outcomes. */
  outcomeHorizonCandles: 5,
} as const;

export const JEV = {
  model: process.env.JEV_MODEL ?? "jev-latest",
  typesafeUrl: "https://api.typesafe.ai/v1/systemone",
  hostedUrl: "https://jevtypesafeai.com/api/v1/decide",
} as const;

export function isLiveTrading(): boolean {
  return process.env.LIVE_TRADING === "true";
}
