import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFlattenIntent } from "../../src/risk/flatten.js";
import { KillSwitch } from "../../src/risk/kill-switch.js";
import { monitorAndMaybeKill } from "../../src/risk/monitor.js";
import { RiskGate } from "../../src/risk/risk-gate.js";
import type { PortfolioState } from "../../src/types/index.js";

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

describe("monitorAndMaybeKill", () => {
  let path: string;
  beforeEach(() => {
    path = join(mkdtempSync(join(tmpdir(), "mon-")), "kill.json");
  });

  it("arms kill on drawdown without an order", () => {
    const kill = new KillSwitch(path);
    kill.disarm("test");
    const r = monitorAndMaybeKill(pf({ equity: 84_000, peakEquity: 100_000 }), 80_000, kill);
    expect(r.tripped).toBe(true);
    expect(r.newlyArmed).toBe(true);
    expect(kill.isBlocking()).toBe(true);
    expect(r.reason).toMatch(/max_drawdown/);
  });

  it("arms kill on daily loss", () => {
    const kill = new KillSwitch(path);
    kill.disarm("test");
    const r = monitorAndMaybeKill(
      pf({ equity: 96_000, dayStartEquity: 100_000, peakEquity: 100_000 }),
      80_000,
      kill,
    );
    expect(r.tripped).toBe(true);
    expect(r.reason).toMatch(/max_daily_loss/);
  });
});

describe("flatten-on-kill", () => {
  let path: string;
  beforeEach(() => {
    path = join(mkdtempSync(join(tmpdir(), "flat-")), "kill.json");
  });

  it("builds a reducing flatten intent", () => {
    const intent = buildFlattenIntent(
      pf({ inventoryQty: 0.5, cash: 60_000, equity: 100_000 }),
      80_000,
      "btc_regime_beta",
      "BTCUSDT",
    );
    expect(intent).not.toBeNull();
    expect(intent!.side).toBe("sell");
    expect(intent!.reason).toBe("emergency_flatten");
  });

  it("allows emergency flatten while kill is armed", () => {
    const kill = new KillSwitch(path);
    kill.arm("max_drawdown 0.16");
    const gate = new RiskGate(kill);
    const portfolio = pf({ inventoryQty: 0.5, equity: 84_000, peakEquity: 100_000 });
    const intent = buildFlattenIntent(portfolio, 80_000, "btc_regime_beta", "BTCUSDT")!;
    const auth = gate.authorize(intent, portfolio, 80_000);
    expect(auth.ok).toBe(true);
  });

  it("blocks normal buys while kill is armed", () => {
    const kill = new KillSwitch(path);
    kill.arm("max_drawdown 0.16");
    const gate = new RiskGate(kill);
    const auth = gate.authorize(
      {
        schemaId: "btc_regime_beta",
        symbol: "BTCUSDT",
        side: "buy",
        notionalPct: 0.05,
        reason: "gated ok",
        directionConfidence: 0.9,
        setupQuality: 2.6,
        calibratedP: 0.7,
      },
      pf({ equity: 84_000, peakEquity: 100_000 }),
      80_000,
    );
    expect(auth.ok).toBe(false);
  });
});
