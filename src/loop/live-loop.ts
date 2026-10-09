import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { escalateToBrain } from "../brain/escalate.js";
import { PaperExchange } from "../exchange/paper.js";
import { JevClient } from "../jev/client.js";
import { FINALISTS, questionsForSchema } from "../jev/schemas.js";
import { evaluatePolicy } from "../policy/gates.js";
import { RiskGate } from "../risk/risk-gate.js";
import { serializeSnapshot } from "../state/snapshot.js";
import { StateEngine } from "../state/state-engine.js";
import type { BookTick, JevDecision, PredictionRecord } from "../types/index.js";

export interface LoopConfig {
  sessionId: string;
  schemaId: string;
  symbol: string;
  candles: number;
  outDir?: string;
}

export interface LoopResult {
  holds: number;
  orders: number;
  escalations: number;
  blocks: number;
  fills: number;
  equity: number;
}

function syntheticBook(symbol: string, mid: number, tsMs: number, imb = 0): BookTick {
  const spread = mid * 0.0004;
  const bidSz = 10 * (1 + imb);
  const askSz = 10 * (1 - imb);
  return {
    symbol,
    tsMs,
    bids: [{ price: mid - spread / 2, size: bidSz }],
    asks: [{ price: mid + spread / 2, size: askSz }],
  };
}

export async function runPaperLoop(
  cfg: LoopConfig,
  jev: JevClient,
  midPath: number[] = [],
): Promise<LoopResult> {
  const outDir = cfg.outDir ?? join("data/sessions", cfg.sessionId);
  mkdirSync(outDir, { recursive: true });

  const engine = new StateEngine({ symbol: cfg.symbol, schemaId: cfg.schemaId });
  const exchange = new PaperExchange(100_000);
  const risk = new RiskGate();
  // Paper loop: disarm kill switch for simulation only
  risk.getKillSwitch().disarm("paper-session");

  let holds = 0;
  let orders = 0;
  let escalations = 0;
  let blocks = 0;
  let mid = 83_000;
  const t0 = Date.UTC(2026, 9, 9, 12, 0, 0);

  for (let i = 0; i < cfg.candles; i++) {
    mid = midPath[i] ?? mid * (1 + Math.sin(i / 7) * 0.0015);
    const ts = t0 + i * 60_000;
    const wall = ts + 10;
    const tick = syntheticBook(cfg.symbol, mid, ts, Math.sin(i / 5) * 0.2);
    engine.onBook(tick, wall);
    exchange.setMid(mid);
    const snap = engine.snapshot(exchange.portfolio);
    const state = serializeSnapshot(snap);
    const decision = await jev.decide(state, questionsForSchema(cfg.schemaId));
    const policy = evaluatePolicy(decision, snap);

    if (policy.action === "hold") {
      holds++;
      journal(outDir, { t: ts, action: "hold", reason: policy.reason });
      continue;
    }
    if (policy.action === "escalate") {
      escalations++;
      escalateToBrain(policy.reason, snap, policy.decision, join(outDir, "escalations.jsonl"));
      journal(outDir, { t: ts, action: "escalate", reason: policy.reason });
      continue;
    }

    const auth = risk.authorize(policy.intent, exchange.portfolio, mid);
    if (!auth.ok) {
      blocks++;
      journal(outDir, { t: ts, action: "block", reason: auth.reason });
      continue;
    }

    const fill = exchange.place(policy.intent, ts);
    orders++;
    if (fill) {
      const pred: PredictionRecord = {
        id: fill.id,
        schemaId: fill.schemaId,
        tsMs: ts,
        p: fill.predictedP,
        outcome: null,
      };
      appendFileSync(join(outDir, "predictions.jsonl"), JSON.stringify(pred) + "\n");
    }
    journal(outDir, { t: ts, action: "order", intent: policy.intent, fill });
  }

  return {
    holds,
    orders,
    escalations,
    blocks,
    fills: exchange.fills.length,
    equity: exchange.portfolio.equity,
  };
}

/** Parallel multi-schema evaluation helper (one Jev call shape per schema). */
export async function scoreFinalists(
  stateBySchema: Record<string, string>,
  jev: JevClient,
): Promise<Record<string, JevDecision>> {
  const active = FINALISTS.filter((f) => f.autoSize && stateBySchema[f.id]);
  const entries = await Promise.all(
    active.map(async (f) => {
      const d = await jev.decide(stateBySchema[f.id]!, questionsForSchema(f.id));
      return [f.id, d] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function journal(outDir: string, row: unknown): void {
  appendFileSync(join(outDir, "journal.jsonl"), JSON.stringify(row) + "\n");
}
