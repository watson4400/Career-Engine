import { JevClient } from "../jev/client.js";
import type { JevDecision } from "../types/index.js";
import { runPaperLoop } from "../loop/live-loop.js";
import { runOvernightReview } from "../review/overnight.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Fill, PredictionRecord } from "../types/index.js";

function mockDecision(): JevDecision {
  return {
    regime: {
      type: "choice",
      choice: "trending",
      confidence: 0.9,
      probabilities: { trending: 0.9, mean_reverting: 0.05, high_vol: 0.04, crisis: 0.01 },
    },
    direction: {
      type: "choice",
      choice: "long",
      confidence: 0.85,
      probabilities: { long: 0.85, short: 0.05, neutral: 0.1 },
    },
    toxic_flow: { type: "noul", noul: 0.2 },
    setup_quality: { type: "score", score: 2.2, confidence: 0.8 },
    risk_state: {
      type: "choice",
      choice: "safe",
      confidence: 0.9,
      probabilities: { safe: 0.9, near_limit: 0.08, reduce: 0.02 },
    },
  };
}

async function main(): Promise<void> {
  const sessionId = `paper-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const jev = new JevClient({
    mockDecide: async () => mockDecision(),
  });
  const result = await runPaperLoop(
    {
      sessionId,
      schemaId: "btc_regime_beta",
      symbol: "BTCUSDT",
      candles: 48,
    },
    jev,
  );
  console.log(JSON.stringify({ sessionId, result }, null, 2));

  const outDir = join("data/sessions", sessionId);
  const journalPath = join(outDir, "journal.jsonl");
  const fills: Fill[] = [];
  let misses = 0;
  if (existsSync(journalPath)) {
    for (const line of readFileSync(journalPath, "utf8").trim().split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as { action: string; fill?: Fill };
      if (row.action === "hold" || row.action === "block") misses++;
      if (row.fill) fills.push(row.fill);
    }
  }
  const predPath = join(outDir, "predictions.jsonl");
  const predictions: PredictionRecord[] = existsSync(predPath)
    ? readFileSync(predPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as PredictionRecord)
    : [];
  // Label outcomes naively for demo: p>0.5 → assume win half the time via hash
  for (const p of predictions) {
    p.outcome = p.p >= 0.8 ? 1 : 0;
  }
  const report = runOvernightReview({ sessionId, fills, predictions, misses, outDir });
  console.log(JSON.stringify({ overnight: report }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
