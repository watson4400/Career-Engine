import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { escalateToBrain } from "../brain/escalate.js";
import { CoinbaseAdvancedClient, productToEngineSymbol } from "../exchange/coinbase/client.js";
import { JevClient } from "../jev/client.js";
import { questionsForSchema } from "../jev/schemas.js";
import { paperTrainerDecide } from "../jev/paper-trainer.js";
import { evaluatePolicy } from "../policy/gates.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { RiskGate } from "../risk/risk-gate.js";
import { serializeSnapshot } from "../state/snapshot.js";
import { StateEngine } from "../state/state-engine.js";
import { isLiveTrading } from "../config/constants.js";
import type { PredictionRecord } from "../types/index.js";

export interface CoinbaseLoopConfig {
  sessionId: string;
  candles: number;
  /** ms between candles */
  intervalMs: number;
  schemaId?: string;
  outDir?: string;
}

export async function runCoinbaseLoop(cfg: CoinbaseLoopConfig): Promise<Record<string, unknown>> {
  const outDir = cfg.outDir ?? join("data/sessions", cfg.sessionId);
  mkdirSync(outDir, { recursive: true });

  const dryRun = process.env.COINBASE_DRY_RUN !== "false";
  const liveOrders = isLiveTrading() && !dryRun;
  const client = new CoinbaseAdvancedClient({ dryRun: !liveOrders });
  const engineSymbol = productToEngineSymbol(client.productId);
  const schemaId = cfg.schemaId ?? "btc_regime_beta";

  const kill = new KillSwitch(join(outDir, "kill-switch.json"));
  if (liveOrders) {
    // Live orders require explicit disarm in this session folder
    if (kill.isBlocking()) {
      throw new Error(
        "Kill switch armed. Disarm only when ready: set kill-switch.json armed=false for this session.",
      );
    }
  } else {
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
  let lastEquity = 0;
  const reasonCounts: Record<string, number> = {};
  const bump = (r: string) => {
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
  };

  // Seed portfolio peak from first book
  let portfolio = await (async () => {
    const book0 = await client.getBestBidAsk();
    const mid0 = (book0.bids[0]!.price + book0.asks[0]!.price) / 2;
    return client.portfolioSnapshot(mid0);
  })();

  for (let i = 0; i < cfg.candles; i++) {
    const book = await client.getBestBidAsk();
    const wall = Date.now();
    engine.onBook(book, wall);
    const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;

    // Refresh balances periodically (every candle is fine for slow loop)
    const snapPortfolio = await client.portfolioSnapshot(mid);
    portfolio = {
      ...snapPortfolio,
      peakEquity: Math.max(portfolio.peakEquity, snapPortfolio.equity),
      dayStartEquity: portfolio.dayStartEquity || snapPortfolio.equity,
      avgEntry: portfolio.avgEntry || snapPortfolio.avgEntry,
    };
    lastEquity = portfolio.equity;

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

  return {
    mode: liveOrders ? "coinbase-live" : "coinbase-dry-run",
    jev: useLiveJev ? "live-jev" : "paper-trainer",
    productId: client.productId,
    holds,
    orders,
    blocks,
    escalations,
    equity: lastEquity,
    reasonCounts,
  };
}

function journal(outDir: string, row: unknown): void {
  appendFileSync(join(outDir, "journal.jsonl"), JSON.stringify(row) + "\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
