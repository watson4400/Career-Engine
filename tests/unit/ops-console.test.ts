import { describe, expect, it } from "vitest";
import { decideNext } from "../../src/dashboard/decide-next.js";
import { normalizeOpsConfig } from "../../src/dashboard/ops-config.js";

describe("normalizeOpsConfig", () => {
  it("keeps dry-run on unless live is explicitly confirmed", () => {
    const dry = normalizeOpsConfig({
      productId: "SOL-USD",
      schemaId: "sol_fee_beta",
      dryRun: true,
      liveTrading: false,
      candles: 8,
      intervalMs: 12_000,
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.liveTrading).toBe(false);
    expect(dry.schemaId).toBe("sol_fee_beta");
  });

  it("allows live only when dryRun false and liveTrading true", () => {
    const live = normalizeOpsConfig({
      productId: "BTC-USD",
      schemaId: "btc_regime_beta",
      dryRun: false,
      liveTrading: true,
      candles: 5,
      intervalMs: 10_000,
    });
    expect(live.dryRun).toBe(false);
    expect(live.liveTrading).toBe(true);
  });
});

describe("decideNext", () => {
  const base = {
    config: {
      productId: "SOL-USD",
      schemaId: "sol_fee_beta",
      dryRun: true,
      liveTrading: false,
      candles: 8,
      intervalMs: 12_000,
    },
    runner: {
      running: false,
      sessionId: null,
      startedAt: null,
      pid: null,
      lastExitCode: null,
      lastError: null,
      log: [],
    },
    hasCoinbase: true,
    hasTypesafe: true,
    killArmed: false,
    killReason: null,
    bookOk: true,
    bookError: null,
    liveEquity: 200,
    spreadBps: 8,
    spreadOk: true,
    drySessionCount: 0,
    productId: "SOL-USD",
  };

  it("asks for keys when Coinbase missing", () => {
    const d = decideNext({ ...base, hasCoinbase: false });
    expect(d.primaryAction).toBe("fix_keys");
  });

  it("recommends run dry when ready", () => {
    const d = decideNext(base);
    expect(d.primaryAction).toBe("run");
    expect(d.tone).toBe("go");
  });

  it("switches to stop while running", () => {
    const d = decideNext({
      ...base,
      runner: { ...base.runner, running: true },
    });
    expect(d.primaryAction).toBe("stop");
  });
});
