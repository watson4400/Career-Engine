import { appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escalateToBrain } from "../brain/escalate.js";
import { isLiveTrading } from "../config/constants.js";
import { CoinbaseAdvancedClient, productToEngineSymbol } from "../exchange/coinbase/client.js";
import { JevClient } from "../jev/client.js";
import { paperTrainerDecide } from "../jev/paper-trainer.js";
import { questionsForSchema, resolveSchemaId } from "../jev/schemas.js";
import { evaluatePolicy } from "../policy/gates.js";
import { buildFlattenIntent } from "../risk/flatten.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { RiskGate } from "../risk/risk-gate.js";
import { serializeSnapshot } from "../state/snapshot.js";
import { StateEngine } from "../state/state-engine.js";
import type { PredictionRecord } from "../types/index.js";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export interface CoinbaseLoopConfig {
  sessionId: string;
  candles: number;
  /** ms between candles */
  intervalMs: number;
  schemaId?: string;
  outDir?: string;
}

function globalKillPath(): string {
  return process.env.KILL_SWITCH_PATH ?? join(ROOT, "data/sessions/kill-switch.json");
}

export async function runCoinbaseLoop(cfg: CoinbaseLoopConfig): Promise<Record<string, unknown>> {
  const outDir = cfg.outDir ?? join(ROOT, "data/sessions", cfg.sessionId);
  mkdirSync(outDir, { recursive: true });

  const dryRun = process.env.COINBASE_DRY_RUN !== "false";
  const liveOrders = isLiveTrading() && !dryRun;
  const client = new CoinbaseAdvancedClient({ dryRun: !liveOrders });
  const engineSymbol = productToEngineSymbol(client.productId);
  const schemaId = resolveSchemaId({ schemaId: cfg.schemaId, productId: client.productId });

  const kill = new KillSwitch(globalKillPath());
  if (liveOrders) {
    if (kill.isBlocking()) {
      throw new Error(
        "Global kill switch armed. Disarm data/sessions/kill-switch.json (armed=false) only when ready for live orders.",
      );
    }
  }
  // Dry-run may proceed even if kill was left armed from a prior trip — but we still monitor.
  // For dry-run order sim, temporarily allow policy orders only if kill not armed OR we disarm for dry.
  if (!liveOrders && kill.isBlocking() && kill.read().reason?.startsWith("max_")) {
    // leave armed — dry loop should demonstrate blocks/flatten path
  } else if (!liveOrders) {
    kill.disarm("coinbase-dry-run");
  }

  const risk = new RiskGate(kill);
  const engine = new StateEngine({ symbol: engineSymbol, schemaId });

  const useLiveJev = Boolean(
    process.env.TYPESAFE_API_KEY?.trim() || process.env.JEV_API_KEY?.trim(),
  );
  const jev = useLiveJev
    ? new JevClient()
    : new JevClient({ mockDecide: async (state) => paperTrainerDecide(state) });

  let holds = 0;
  let orders = 0;
  let blocks = 0;
  let escalations = 0;
  let flattens = 0;
  let lastEquity = 0;
  let flattenedThisArm = false;
  const reasonCounts: Record<string, number> = {};
  const bump = (r: string) => {
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
  };

  let portfolio = await (async () => {
    const book0 = await client.getBestBidAsk();
    const mid0 = (book0.bids[0]!.price + book0.asks[0]!.price) / 2;
    return client.portfolioSnapshot(mid0);
  })();
  const startingEquity = portfolio.equity;

  for (let i = 0; i < cfg.candles; i++) {
    const book = await client.getBestBidAsk();
    const wall = Date.now();
    engine.onBook(book, wall);
    const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;

    const snapPortfolio = await client.portfolioSnapshot(mid);
    portfolio = {
      ...snapPortfolio,
      peakEquity: Math.max(portfolio.peakEquity, snapPortfolio.equity),
      dayStartEquity: portfolio.dayStartEquity || snapPortfolio.equity,
      avgEntry: portfolio.avgEntry || snapPortfolio.avgEntry,
    };
    lastEquity = portfolio.equity;

    // Continuous risk monitor (no order required)
    const mon = risk.monitor(portfolio, mid);
    if (mon.newlyArmed) {
      journal(outDir, {
        i,
        action: "kill_armed",
        reason: mon.reason,
        metrics: mon.metrics,
        mid,
        equity: portfolio.equity,
      });
      bump("kill_armed");
      flattenedThisArm = false;
    }

    // Flatten-on-kill: close inventory once per arm event
    if (kill.isBlocking() && !flattenedThisArm && Math.abs(portfolio.inventoryQty) > 1e-8) {
      const flattenIntent = buildFlattenIntent(portfolio, mid, schemaId, engineSymbol);
      if (flattenIntent) {
        const auth = risk.authorize(flattenIntent, portfolio, mid);
        if (auth.ok) {
          const fill = await client.flattenBase({
            schemaId,
            symbol: engineSymbol,
            inventoryQty: portfolio.inventoryQty,
            mid,
            tsMs: book.tsMs,
          });
          flattens++;
          flattenedThisArm = true;
          bump(liveOrders ? "flatten:live" : "flatten:dry");
          journal(outDir, {
            i,
            action: liveOrders ? "flatten_live" : "flatten_dry",
            reason: mon.reason ?? kill.read().reason,
            fill,
            mid,
            equity: portfolio.equity,
          });
          // Refresh after flatten
          const after = await client.portfolioSnapshot(mid);
          portfolio = {
            ...after,
            peakEquity: Math.max(portfolio.peakEquity, after.equity),
            dayStartEquity: portfolio.dayStartEquity,
          };
          lastEquity = portfolio.equity;
        } else {
          journal(outDir, { i, action: "flatten_blocked", reason: auth.reason, mid });
        }
      } else {
        flattenedThisArm = true; // nothing to flatten
      }
    }

    // While killed, skip Jev trading path (only flatten above)
    if (kill.isBlocking()) {
      holds++;
      bump("hold:kill_switch");
      journal(outDir, { i, action: "hold", reason: "kill_switch_armed", mid });
      if (i < cfg.candles - 1 && cfg.intervalMs > 0) await sleep(cfg.intervalMs);
      continue;
    }

    const snap = engine.snapshot(portfolio);
    const decision = await jev.decide(serializeSnapshot(snap), questionsForSchema(schemaId));
    const policy = evaluatePolicy(decision, snap);

    if (policy.action === "hold") {
      holds++;
      bump(`hold:${policy.reason.split(" ")[0]}`);
      journal(outDir, { i, action: "hold", reason: policy.reason, mid });
    } else if (policy.action === "escalate") {
      escalations++;
      bump(`escalate:${policy.reason.split(" ")[0]}`);
      escalateToBrain(policy.reason, snap, policy.decision, join(outDir, "escalations.jsonl"));
      journal(outDir, { i, action: "escalate", reason: policy.reason, mid });
    } else {
      const auth = risk.authorize(policy.intent, portfolio, mid);
      if (!auth.ok) {
        blocks++;
        bump(`block:${auth.reason.split(" ")[0]}`);
        journal(outDir, { i, action: "block", reason: auth.reason, mid });
        if (auth.kill) flattenedThisArm = false;
      } else {
        const fill = await client.placeMarket(policy.intent, book.tsMs, mid, portfolio.equity);
        orders++;
        bump(liveOrders ? "order:live" : "order:dry");
        if (fill) {
          const pred: PredictionRecord = {
            id: fill.id,
            schemaId: fill.schemaId,
            tsMs: fill.tsMs,
            p: fill.predictedP,
            outcome: null,
          };
          appendFileSync(join(outDir, "predictions.jsonl"), JSON.stringify(pred) + "\n");
        }
        journal(outDir, {
          i,
          action: liveOrders ? "order_live" : "order_dry",
          intent: policy.intent,
          fill,
          mid,
          equity: portfolio.equity,
        });
      }
    }

    if (i < cfg.candles - 1 && cfg.intervalMs > 0) {
      await sleep(cfg.intervalMs);
    }
  }

  const pnlUsd = lastEquity - startingEquity;
  const pnlPct = startingEquity > 0 ? pnlUsd / startingEquity : 0;
  return {
    mode: liveOrders ? "coinbase-live" : "coinbase-dry-run",
    jev: useLiveJev ? "live-jev" : "paper-trainer",
    productId: client.productId,
    holds,
    orders,
    blocks,
    escalations,
    flattens,
    killArmed: kill.isBlocking(),
    killReason: kill.isBlocking() ? kill.read().reason : null,
    equity: lastEquity,
    startingEquity,
    pnlUsd,
    pnlPct,
    reasonCounts,
  };
}

function journal(outDir: string, row: unknown): void {
  appendFileSync(join(outDir, "journal.jsonl"), JSON.stringify(row) + "\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
