import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Fill, PredictionRecord } from "../types/index.js";
import { brierScore, calibrationBuckets } from "./brier.js";
import { CORE_DECISION_QUESTIONS } from "../jev/schemas.js";

export interface OvernightReport {
  sessionId: string;
  generatedAt: string;
  fills: number;
  misses: number;
  brier: number;
  buckets: ReturnType<typeof calibrationBuckets>;
  schemaPath: string;
  notes: string[];
}

/**
 * Nightly loop: read fills/misses, measure calibration, rewrite Jev schema artifact.
 */
export function runOvernightReview(opts: {
  sessionId: string;
  fills: Fill[];
  predictions: PredictionRecord[];
  misses: number;
  outDir?: string;
}): OvernightReport {
  const outDir = opts.outDir ?? "data/sessions";
  mkdirSync(outDir, { recursive: true });
  const brier = brierScore(opts.predictions);
  const buckets = calibrationBuckets(opts.predictions);
  const notes: string[] = [];

  if (!Number.isNaN(brier) && brier > 0.25) {
    notes.push("Brier > 0.25 — tighten setup_quality instructions; raise toxic_flow sensitivity.");
  }
  if (opts.misses > opts.fills.length) {
    notes.push("More misses than fills — review spread gate and confidence threshold.");
  }

  const schemaPath = join(outDir, `${opts.sessionId}.jev-schema.json`);
  const nextSchema = {
    version: new Date().toISOString(),
    questions: CORE_DECISION_QUESTIONS,
    tuning: {
      minSetupQuality: brier > 0.25 ? 2.5 : 2,
      notes,
    },
  };
  writeFileSync(schemaPath, JSON.stringify(nextSchema, null, 2));

  const report: OvernightReport = {
    sessionId: opts.sessionId,
    generatedAt: new Date().toISOString(),
    fills: opts.fills.length,
    misses: opts.misses,
    brier,
    buckets,
    schemaPath,
    notes,
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
