import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy/gates.js";
import { kellyFraction } from "../../src/policy/kelly.js";
import type { JevDecision, MarketSnapshot } from "../../src/types/index.js";

const baseSnap: MarketSnapshot = {
  symbol: "BTCUSDT",
  schemaId: "btc_regime_beta",
  asOfMs: 1,
  mid: 80_000,
  spreadBps: 5,
  imbalance: 0.1,
  realizedVol: 0.001,
  inventoryQty: 0,
  inventoryNotionalPct: 0,
  drawdownPct: 0,
  dailyLossPct: 0,
};

function decision(over: Partial<{
  regime: string;
  direction: string;
  conf: number;
  setup: number;
  risk: string;
  toxic: number;
  longP: number;
}> = {}): JevDecision {
  const direction = over.direction ?? "long";
  const longP = over.longP ?? 0.85;
  return {
    regime: {
      type: "choice",
      choice: over.regime ?? "trending",
      confidence: 0.9,
      probabilities: {},
    },
    direction: {
      type: "choice",
      choice: direction,
      confidence: over.conf ?? 0.85,
      probabilities: { long: longP, short: 0.05, neutral: 0.1 },
    },
    toxic_flow: { type: "noul", noul: over.toxic ?? 0.1 },
    setup_quality: { type: "score", score: over.setup ?? 2.1, confidence: 0.8 },
    risk_state: {
      type: "choice",
      choice: over.risk ?? "safe",
      confidence: 0.9,
      probabilities: {},
    },
  };
}

describe("policy gates", () => {
  it("fires order only when all gates pass", () => {
    const r = evaluatePolicy(decision(), baseSnap);
    expect(r.action).toBe("order");
    if (r.action === "order") {
      expect(r.intent.notionalPct).toBeLessThanOrEqual(0.25);
      expect(r.intent.side).toBe("buy");
    }
  });

  it("holds when setup_quality < 2", () => {
    expect(evaluatePolicy(decision({ setup: 1.5 }), baseSnap).action).toBe("hold");
  });

  it("escalates on crisis", () => {
    expect(evaluatePolicy(decision({ regime: "crisis" }), baseSnap).action).toBe("escalate");
  });

  it("escalates when confidence < 0.60", () => {
    expect(evaluatePolicy(decision({ conf: 0.55 }), baseSnap).action).toBe("escalate");
  });

  it("holds when risk_state != safe", () => {
    expect(evaluatePolicy(decision({ risk: "near_limit" }), baseSnap).action).toBe("hold");
  });
});

describe("kelly", () => {
  it("caps at quarter Kelly", () => {
    expect(kellyFraction(0.99)).toBeLessThanOrEqual(0.25);
  });
});
