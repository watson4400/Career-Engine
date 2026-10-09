import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { JevClient } from "../jev/client.js";
import { paperTrainerDecide } from "../jev/paper-trainer.js";
import { runPaperLoop, synthesizeWorld } from "../loop/live-loop.js";
import { runOvernightReview } from "../review/overnight.js";
import type { Fill } from "../types/index.js";

async function main(): Promise<void> {
  const candles = Number(process.env.PAPER_CANDLES ?? 240);
  const sessionId = `paper-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const outDir = join("data/sessions", sessionId);
  mkdirSync(outDir, { recursive: true });

  const useLiveJev = Boolean(process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY);
  const jev = useLiveJev
    ? new JevClient()
    : new JevClient({
        mockDecide: async (state) => paperTrainerDecide(state),
      });

  const world = synthesizeWorld(candles, 83_000, 42);
  const result = await runPaperLoop(
    {
      sessionId,
      schemaId: "btc_regime_beta",
      symbol: "BTCUSDT",
      candles,
      outDir,
      startMid: 83_000,
    },
    jev,
    world.mids,
    world.signals,
  );

  const journalPath = join(outDir, "journal.jsonl");
  const fills: Fill[] = [];
  if (existsSync(journalPath)) {
    for (const line of readFileSync(journalPath, "utf8").trim().split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as { action: string; fill?: Fill };
      if (row.fill) fills.push(row.fill);
    }
  }

  const report = runOvernightReview({
    sessionId,
    fills,
    predictions: result.brierReady,
    holds: result.holds,
    blocks: result.blocks,
    escalations: result.escalations,
    reasonCounts: result.reasonCounts,
    outDir,
  });

  const summary = {
    mode: useLiveJev ? "live-jev" : "paper-trainer",
    sessionId,
    result: {
      holds: result.holds,
      orders: result.orders,
      blocks: result.blocks,
      escalations: result.escalations,
      fills: result.fills,
      equity: result.equity,
      pnlPct: result.pnlPct,
      maxDrawdownPct: result.maxDrawdownPct,
      labeledPredictions: result.labeledPredictions,
      reasonCounts: result.reasonCounts,
    },
    overnight: {
      brier: report.brier,
      notes: report.notes,
      tuning: report.tuning,
    },
  };
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
