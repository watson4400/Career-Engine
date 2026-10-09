import type { PredictionRecord } from "../types/index.js";

/** Brier score = mean (p - outcome)^2 ; lower is better. */
export function brierScore(records: PredictionRecord[]): number {
  const scored = records.filter((r) => r.outcome === 0 || r.outcome === 1);
  if (!scored.length) return Number.NaN;
  const sum = scored.reduce((acc, r) => acc + (r.p - (r.outcome as number)) ** 2, 0);
  return sum / scored.length;
}

export function calibrationBuckets(records: PredictionRecord[], buckets = 5): { lo: number; hi: number; n: number; avgP: number; hitRate: number }[] {
  const scored = records.filter((r) => r.outcome === 0 || r.outcome === 1);
  const out = [];
  for (let i = 0; i < buckets; i++) {
    const lo = i / buckets;
    const hi = (i + 1) / buckets;
    const slice = scored.filter((r) => r.p >= lo && (i === buckets - 1 ? r.p <= hi : r.p < hi));
    const n = slice.length;
    const avgP = n ? slice.reduce((a, r) => a + r.p, 0) / n : 0;
    const hitRate = n ? slice.reduce((a, r) => a + (r.outcome as number), 0) / n : 0;
    out.push({ lo, hi, n, avgP, hitRate });
  }
  return out;
}
