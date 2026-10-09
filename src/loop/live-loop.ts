import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { escalateToBrain } from "../brain/escalate.js";
import { RISK } from "../config/constants.js";
import { PaperExchange } from "../exchange/paper.js";
import { JevClient } from "../jev/client.js";
import { FINALISTS, questionsForSchema } from "../jev/schemas.js";
import { evaluatePolicy } from "../policy/gates.js";
import { KillSwitch } from "../risk/kill-switch.js";
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
  startingEquity?: number;
  startMid?: number;
}

export interface LoopResult {
  holds: number;
  orders: number;
  escalations: number;
  blocks: number;
  fills: number;
  equity: number;
  pnlPct: number;
  maxDrawdownPct: number;
  reasonCounts: Record<string, number>;
  labeledPredictions: number;
  brierReady: PredictionRecord[];
}

interface PendingLabel {
  id: string;
  schemaId: string;
  tsMs: number;
  p: number;
  side: "buy" | "sell";
  entryMid: number;
  resolveAtIndex: number;
}

export interface SyntheticWorld {
  mids: number[];
  /** Causal signal available at bar i; AR(1) so it predicts near-future returns. */
  signals: number[];
}

function syntheticBook(symbol: string, mid: number, tsMs: number, imb = 0): BookTick {
  const spread = mid * 0.0004;
  const bidSz = 10 * (1 + imb);
  const askSz = 10 * (1 - imb);
  return {
    symbol,
    tsMs,
    bids: [{ price: mid - spread / 2, size: Math.max(0.01, bidSz) }],
    asks: [{ price: mid + spread / 2, size: Math.max(0.01, askSz) }],
  };
}

/**
 * Build mids + causal signals. Signal at i is known before trading i and
 * persists (AR(1)), so following it has a real edge for outcomeHorizon labels.
 */
export function synthesizeWorld(candles: number, startMid: number, seed = 42): SyntheticWorld {
  const mids: number[] = [];
  const signals: number[] = [];
  let mid = startMid;
  let signal = 0;
  for (let i = 0; i < candles; i++) {
    const innovation = Math.sin((seed + i) / 19) * 0.9 + Math.cos((seed + i) / 47) * 0.4;
    signal = 0.88 * signal + 0.12 * innovation;
    signal = Math.max(-1, Math.min(1, signal));
    const noise = Math.sin((seed + i) * 1.7) * 0.00025;
    mid = mid * (1 + 0.0018 * signal + noise);
    mids.push(mid);
    signals.push(signal);
  }
  return { mids, signals };
}

/** @deprecated prefer synthesizeWorld */
export function synthesizeMidPath(candles: number, startMid: number, seed = 42): number[] {
  return synthesizeWorld(candles, startMid, seed).mids;
}

export async function runPaperLoop(
  cfg: LoopConfig,
  jev: JevClient,
  midPath: number[] = [],
  signalPath: number[] = [],
): Promise<LoopResult> {
  const outDir = cfg.outDir ?? join("data/sessions", cfg.sessionId);
  mkdirSync(outDir, { recursive: true });

  const engine = new StateEngine({ symbol: cfg.symbol, schemaId: cfg.schemaId });
  const exchange = new PaperExchange(cfg.startingEquity ?? 100_000);
  const kill = new KillSwitch(join(outDir, "kill-switch.json"));
  kill.disarm("paper-session");
  const risk = new RiskGate(kill);

  const world =
    midPath.length > 0
      ? { mids: midPath, signals: signalPath }
      : synthesizeWorld(cfg.candles, cfg.startMid ?? 83_000);

  let holds = 0;
  let orders = 0;
  let escalations = 0;
  let blocks = 0;
  const reasonCounts: Record<string, number> = {};
  const pending: PendingLabel[] = [];
  const labeled: PredictionRecord[] = [];
  const t0 = Date.UTC(2026, 9, 9, 12, 0, 0);
  let peak = exchange.portfolio.equity;
  let maxDd = 0;
  let lastOrderBar = -10_000;

  const bump = (reason: string) => {
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  };

  for (let i = 0; i < cfg.candles; i++) {
    const mid = world.mids[i] ?? world.mids[world.mids.length - 1]!;
    const signal = world.signals[i] ?? 0;
    const ts = t0 + i * 60_000;
    const wall = ts + 10;
    // Imbalance mirrors causal signal (what a microstructure proxy would show)
    const imb = Math.max(-0.9, Math.min(0.9, signal * 0.8));
    const tick = syntheticBook(cfg.symbol, mid, ts, imb);
    engine.onBook(tick, wall);
    exchange.setMid(mid);
    const snap = engine.snapshot(exchange.portfolio);
    const state = serializeSnapshot(snap);
    const decision = await jev.decide(state, questionsForSchema(cfg.schemaId));
    const policy = evaluatePolicy(decision, snap);

    for (const p of [...pending]) {
      if (i >= p.resolveAtIndex) {
        const exitMid = mid;
        const won =
          p.side === "buy" ? exitMid > p.entryMid * 1.0001 : exitMid < p.entryMid * 0.9999;
        const rec: PredictionRecord = {
          id: p.id,
          schemaId: p.schemaId,
          tsMs: p.tsMs,
          p: p.p,
          outcome: won ? 1 : 0,
        };
        labeled.push(rec);
        appendFileSync(join(outDir, "predictions.jsonl"), JSON.stringify(rec) + "\n");
        pending.splice(pending.indexOf(p), 1);
      }
    }

    peak = Math.max(peak, exchange.portfolio.equity);
    maxDd = Math.max(maxDd, peak > 0 ? (peak - exchange.portfolio.equity) / peak : 0);

    if (policy.action === "hold") {
      holds++;
      bump(`hold:${policy.reason.split(" ")[0]}`);
      journal(outDir, { t: ts, i, action: "hold", reason: policy.reason, mid, inv: snap.inventoryNotionalPct });
      continue;
    }
    if (policy.action === "escalate") {
      escalations++;
      bump(`escalate:${policy.reason.split(" ")[0]}`);
      escalateToBrain(policy.reason, snap, policy.decision, join(outDir, "escalations.jsonl"));
      journal(outDir, { t: ts, i, action: "escalate", reason: policy.reason, mid });
      continue;
    }

    // Anti-churn: at least 3 bars between adds (flatten still allowed)
    const reducing =
      Math.sign(exchange.portfolio.inventoryQty) !== 0 &&
      ((policy.intent.side === "sell" && exchange.portfolio.inventoryQty > 0) ||
        (policy.intent.side === "buy" && exchange.portfolio.inventoryQty < 0));
    if (!reducing && i - lastOrderBar < 3) {
      holds++;
      bump("hold:cooldown");
      journal(outDir, { t: ts, i, action: "hold", reason: "cooldown", mid });
      continue;
    }

    const auth = risk.authorize(policy.intent, exchange.portfolio, mid);
    if (!auth.ok) {
      blocks++;
      bump(`block:${auth.reason.split(" ")[0]}`);
      journal(outDir, { t: ts, i, action: "block", reason: auth.reason, mid });
      continue;
    }

    const fill = exchange.place(policy.intent, ts);
    orders++;
    lastOrderBar = i;
    bump("order");
    if (fill) {
      pending.push({
        id: fill.id,
        schemaId: fill.schemaId,
        tsMs: ts,
        p: fill.predictedP,
        side: fill.side,
        entryMid: mid,
        resolveAtIndex: i + RISK.outcomeHorizonCandles,
      });
    }
    journal(outDir, {
      t: ts,
      i,
      action: "order",
      reason: policy.intent.reason,
      intent: policy.intent,
      fill,
      mid,
      equity: exchange.portfolio.equity,
    });
  }

  const startEq = cfg.startingEquity ?? 100_000;
  return {
    holds,
    orders,
    escalations,
    blocks,
    fills: exchange.fills.length,
    equity: exchange.portfolio.equity,
    pnlPct: (exchange.portfolio.equity - startEq) / startEq,
    maxDrawdownPct: maxDd,
    reasonCounts,
    labeledPredictions: labeled.length,
    brierReady: labeled,
  };
}

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
