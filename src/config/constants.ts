/** Hard limits — owned by code, never by Jev. */
export const RISK = {
  maxDrawdownPct: 0.15,
  maxPositionNotionalPct: 0.25,
  maxDailyLossPct: 0.03,
  minDirectionConfidence: 0.8,
  minSetupQuality: 2,
  escalateConfidenceBelow: 0.6,
  kellyFractionCap: 0.25,
  maxSpreadBps: 25,
  maxSnapshotTokens: 400,
} as const;

export const JEV = {
  model: process.env.JEV_MODEL ?? "jev-latest",
  typesafeUrl: "https://api.typesafe.ai/v1/systemone",
  hostedUrl: "https://jevtypesafeai.com/api/v1/decide",
} as const;

export function isLiveTrading(): boolean {
  return process.env.LIVE_TRADING === "true";
}
