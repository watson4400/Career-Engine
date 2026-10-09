import { RISK } from "../config/constants.js";

/**
 * Fractional Kelly for a binary edge.
 * f* = (b*p - q) / b with b=1 (even money approx for directional sleeve),
 * then capped at quarter Kelly.
 */
export function kellyFraction(p: number, b: number = 1): number {
  if (p <= 0 || p >= 1) return 0;
  if (b <= 0) return 0;
  const q = 1 - p;
  const f = (b * p - q) / b;
  if (f <= 0) return 0;
  return Math.min(f, RISK.kellyFractionCap);
}

/** Apply an extra haircut (e.g. 0.5 = half of capped Kelly). */
export function sizedNotionalPct(calibratedP: number, haircut: number = 1): number {
  const f = kellyFraction(calibratedP);
  return Math.max(0, Math.min(RISK.kellyFractionCap, f * haircut));
}
