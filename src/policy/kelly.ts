import { RISK } from "../config/constants.js";

/**
 * Fractional Kelly for a binary edge.
 * f* = (b*p - q) / b with b=1 (even money approx for directional sleeve),
 * then cost-haircut and capped at quarter Kelly.
 */
export function kellyFraction(p: number, b: number = 1, haircut: number = RISK.kellyCostHaircut): number {
  if (p <= 0 || p >= 1) return 0;
  if (b <= 0) return 0;
  const q = 1 - p;
  const f = (b * p - q) / b;
  if (f <= 0) return 0;
  return Math.min(f * haircut, RISK.kellyFractionCap);
}

/**
 * Size as Kelly, then clamp to remaining position capacity when adding risk.
 * `remainingCapacityPct` is maxPosition - |inventory| (or inventory when reducing).
 */
export function sizedNotionalPct(
  calibratedP: number,
  remainingCapacityPct: number = RISK.maxPositionNotionalPct,
  haircut: number = RISK.kellyCostHaircut,
): number {
  const f = kellyFraction(calibratedP, 1, haircut);
  const capped = Math.min(f, Math.max(0, remainingCapacityPct));
  if (capped < RISK.minOrderNotionalPct) return 0;
  return capped;
}
