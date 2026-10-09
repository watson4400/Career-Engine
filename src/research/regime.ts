export interface RegimeInputs {
  btcDom: number;
  btcChg7d: number;
  btcChg30d: number;
  ethChg7d: number;
  mcapChg24h: number;
  fearGreed: number;
  /** Annualized funding if available */
  btcFundingPa?: number | null;
}

export type SoftRegime = "trending" | "mean_reverting" | "high_vol" | "crisis";

/** Offline Brain helper — not used as a hard risk limit. */
export function inferSoftRegime(i: RegimeInputs): SoftRegime {
  if (i.mcapChg24h < -12 || i.fearGreed <= 15) return "crisis";
  if (Math.abs(i.btcChg7d) > 12 || (i.btcFundingPa ?? 0) > 40) return "high_vol";
  if (i.btcChg30d > 5 && i.btcDom > 52) return "trending";
  return "mean_reverting";
}
