import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Fill, PredictionRecord } from "../types/index.js";
import { brierScore, calibrationBuckets } from "./brier.js";
import { CORE_DECISION_QUESTIONS } from "../jev/schemas.js";
import { RISK } from "../config/constants.js";

export interface OvernightReport {
  sessionId: string;
  generatedAt: string;
  fills: number;
  holds: number;
  blocks: number;
  escalations: number;
  brier: number;
  buckets: ReturnType<typeof calibrationBuckets>;
  schemaPath: string;
  notes: string[];
  tuning: Record<string, number>;
  reasonCounts: Record<string, number>;
}

/**
 * Nightly loop: read fills/misses, measure calibration, rewrite Jev schema artifact.
 */
export function runOvernightReview(opts: {
  sessionId: string;
  fills: Fill[];
  predictions: PredictionRecord[];
  holds?: number;
  blocks?: number;
  escalations?: number;
  reasonCounts?: Record<string, number>;
  outDir?: string;
}): OvernightReport {
  const outDir = opts.outDir ?? "data/sessions";
  mkdirSync(outDir, { recursive: true });
  const holds = opts.holds ?? 0;
  const blocks = opts.blocks ?? 0;
  const escalations = opts.escalations ?? 0;
  const reasonCounts = opts.reasonCounts ?? {};
  const brier = brierScore(opts.predictions);
  const buckets = calibrationBuckets(opts.predictions);
  const notes: string[] = [];
  const tuning: Record<string, number> = {
    minSetupQuality: RISK.minSetupQuality,
    kellyCostHaircut: RISK.kellyCostHaircut,
    minDirectionConfidence: RISK.minDirectionConfidence,
  };

  if (!Number.isNaN(brier) && brier > 0.25) {
    notes.push("Brier > 0.25 — tighten setup_quality instructions; raise toxic_flow sensitivity.");
    tuning.minSetupQuality = 2.5;
  } else if (!Number.isNaN(brier) && brier < 0.15 && opts.predictions.length >= 8) {
    notes.push("Brier healthy — keep setup gate; do not loosen risk caps.");
  }

  const blockPos = Object.keys(reasonCounts).filter((k) => k.startsWith("block:max_position")).length;
  const holdCap = reasonCounts["hold:at_position_cap"] ?? 0;
  if (blockPos > 0 || (reasonCounts["block:max_position"] ?? 0) > opts.fills.length) {
    notes.push(
      "Position-cap pressure detected — prefer inventory-aware hold + residual Kelly (already in policy); do not raise max_position.",
    );
    tuning.kellyCostHaircut = Math.min(0.75, RISK.kellyCostHaircut + 0.1);
  }
  if (holdCap > opts.fills.length * 2) {
    notes.push("Many at_position_cap holds — paper trainer correctly refusing to pile on; consider mean-revert flatten sleeve.");
  }
  if (holds > opts.fills.length * 3 && blocks === 0) {
    notes.push("High selective holds with zero risk blocks — gate selectivity OK.");
  }
  if (escalations > 0) {
    notes.push(`${escalations} Brain escalations — review crisis/confidence path before next open.`);
  }
  if (opts.predictions.length < 5) {
    notes.push("Too few labeled predictions for stable Brier — lengthen paper session.");
  }

  const schemaPath = join(outDir, `${opts.sessionId}.jev-schema.json`);
  const nextSchema = {
    version: new Date().toISOString(),
    questions: CORE_DECISION_QUESTIONS,
    tuning,
    notes,
  };
  writeFileSync(schemaPath, JSON.stringify(nextSchema, null, 2));

  const report: OvernightReport = {
    sessionId: opts.sessionId,
    generatedAt: new Date().toISOString(),
    fills: opts.fills.length,
    holds,
    blocks,
    escalations,
    brier,
    buckets,
    schemaPath,
    notes,
    tuning,
    reasonCounts,
  };
  writeFileSync(join(outDir, `${opts.sessionId}.overnight.json`), JSON.stringify(report, null, 2));
  return report;
}

export function loadPredictions(path: string): PredictionRecord[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as PredictionRecord);
}
