import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KillSwitch } from "../../src/risk/kill-switch.js";
import { RiskGate } from "../../src/risk/risk-gate.js";
import type { OrderIntent, PortfolioState } from "../../src/types/index.js";

const intent: OrderIntent = {
  schemaId: "btc_regime_beta",
  symbol: "BTCUSDT",
  side: "buy",
  notionalPct: 0.1,
  reason: "test",
  directionConfidence: 0.9,
  setupQuality: 2,
  calibratedP: 0.85,
};

function pf(over: Partial<PortfolioState> = {}): PortfolioState {
  return {
    equity: 100_000,
    cash: 100_000,
    inventoryQty: 0,
    avgEntry: 0,
    peakEquity: 100_000,
    dayStartEquity: 100_000,
    realizedPnlDay: 0,
    ...over,
  };
}

describe("RiskGate", () => {
  let path: string;
  beforeEach(() => {
    path = join(mkdtempSync(join(tmpdir(), "kill-")), "kill.json");
  });

  it("blocks when kill switch armed", () => {
    const kill = new KillSwitch(path);
    kill.arm("test");
    const gate = new RiskGate(kill);
    const r = gate.authorize(intent, pf(), 80_000);
    expect(r.ok).toBe(false);
  });

  it("arms kill on max drawdown", () => {
    const kill = new KillSwitch(path);
    kill.disarm("test");
    const gate = new RiskGate(kill);
    const r = gate.authorize(intent, pf({ equity: 80_000, peakEquity: 100_000 }), 80_000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kill).toBe(true);
    expect(kill.isBlocking()).toBe(true);
  });

  it("rejects notional above quarter Kelly", () => {
    const kill = new KillSwitch(path);
    kill.disarm("test");
    const gate = new RiskGate(kill);
    const r = gate.authorize({ ...intent, notionalPct: 0.5 }, pf(), 80_000);
    expect(r.ok).toBe(false);
  });
});
