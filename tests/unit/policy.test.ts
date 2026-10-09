import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "../../src/policy/gates.js";
import { kellyFraction, sizedNotionalPct } from "../../src/policy/kelly.js";
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
    setup_quality: { type: "score", score: over.setup ?? 2.6, confidence: 0.8 },
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

  it("holds at position cap instead of oversizing", () => {
    const r = evaluatePolicy(
      decision(),
      { ...baseSnap, inventoryQty: 1, inventoryNotionalPct: 0.249 },
    );
    expect(r.action).toBe("hold");
    if (r.action === "hold") expect(r.reason).toMatch(/at_position_cap/);
  });

  it("sizes residual capacity when partially filled", () => {
    const r = evaluatePolicy(
      decision(),
      { ...baseSnap, inventoryQty: 0.1, inventoryNotionalPct: 0.2 },
    );
    expect(r.action).toBe("order");
    if (r.action === "order") {
      expect(r.intent.notionalPct).toBeLessThanOrEqual(0.05 + 1e-9);
    }
  });

  it("holds when setup_quality < 2.5", () => {
    expect(evaluatePolicy(decision({ setup: 2.1 }), baseSnap).action).toBe("hold");
  });

  it("allows wider spreads on alt sleeves than BTC", () => {
    const altSnap = { ...baseSnap, symbol: "SOLUSDT", schemaId: "sol_fee_beta", mid: 150, spreadBps: 40 };
    expect(evaluatePolicy(decision(), altSnap).action).toBe("order");
    expect(evaluatePolicy(decision(), { ...baseSnap, spreadBps: 40 }).action).toBe("hold");
  });

  it("escalates on crisis", () => {
    expect(evaluatePolicy(decision({ regime: "crisis" }), baseSnap).action).toBe("escalate");
  });

  it("escalates when directional confidence < 0.60", () => {
    expect(evaluatePolicy(decision({ conf: 0.55 }), baseSnap).action).toBe("escalate");
  });

  it("holds on neutral instead of escalating", () => {
    const r = evaluatePolicy(decision({ direction: "neutral", conf: 0.5 }), baseSnap);
    expect(r.action).toBe("hold");
  });

  it("holds when risk_state != safe and would add", () => {
    expect(evaluatePolicy(decision({ risk: "near_limit" }), baseSnap).action).toBe("hold");
  });

  it("allows flatten when risk_state=reduce", () => {
    const d = decision({ direction: "short", conf: 0.85, risk: "reduce", setup: 2.6 });
    d.direction.probabilities = { long: 0.05, short: 0.85, neutral: 0.1 };
    const r = evaluatePolicy(d, {
      ...baseSnap,
      inventoryQty: 1,
      inventoryNotionalPct: 0.2,
    });
    expect(r.action).toBe("order");
    if (r.action === "order") expect(r.intent.side).toBe("sell");
  });
});

describe("kelly", () => {
  it("caps at quarter Kelly after cost haircut", () => {
    expect(kellyFraction(0.99)).toBeLessThanOrEqual(0.25);
    expect(kellyFraction(0.85)).toBeCloseTo(0.25, 5); // 0.7 * 0.5 = 0.35 → cap 0.25
  });

  it("returns 0 when residual capacity is dust", () => {
    expect(sizedNotionalPct(0.9, 0.001)).toBe(0);
  });
});
