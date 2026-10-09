import { describe, expect, it } from "vitest";
import { StateEngine } from "../../src/state/state-engine.js";
import { estimateTokens, serializeSnapshot } from "../../src/state/snapshot.js";

const portfolio = {
  equity: 100_000,
  cash: 100_000,
  inventoryQty: 0,
  avgEntry: 0,
  peakEquity: 100_000,
  dayStartEquity: 100_000,
  realizedPnlDay: 0,
};

describe("StateEngine", () => {
  it("rejects lookahead ticks", () => {
    const eng = new StateEngine({ symbol: "BTCUSDT" });
    expect(() =>
      eng.onBook(
        {
          symbol: "BTCUSDT",
          tsMs: 1_000_000,
          bids: [{ price: 100, size: 1 }],
          asks: [{ price: 100.1, size: 1 }],
        },
        1000,
      ),
    ).toThrow(/lookahead/);
  });

  it("builds causal snapshot under token budget", () => {
    const eng = new StateEngine({ symbol: "BTCUSDT", schemaId: "btc_regime_beta" });
    const wall = 10_000;
    for (let i = 0; i < 10; i++) {
      const mid = 100 + i * 0.01;
      eng.onBook(
        {
          symbol: "BTCUSDT",
          tsMs: 1000 + i * 100,
          bids: [{ price: mid - 0.01, size: 2 }],
          asks: [{ price: mid + 0.01, size: 1 }],
        },
        wall,
      );
    }
    const snap = eng.snapshot(portfolio);
    expect(snap.asOfMs).toBe(1000 + 9 * 100);
    expect(snap.spreadBps).toBeGreaterThan(0);
    expect(snap.imbalance).toBeGreaterThan(0);
    const text = serializeSnapshot(snap);
    expect(estimateTokens(text)).toBeLessThan(400);
  });

  it("ignores out-of-order books", () => {
    const eng = new StateEngine({ symbol: "BTCUSDT" });
    eng.onBook(
      {
        symbol: "BTCUSDT",
        tsMs: 2000,
        bids: [{ price: 100, size: 1 }],
        asks: [{ price: 100.2, size: 1 }],
      },
      3000,
    );
    eng.onBook(
      {
        symbol: "BTCUSDT",
        tsMs: 1500,
        bids: [{ price: 90, size: 1 }],
        asks: [{ price: 90.2, size: 1 }],
      },
      3000,
    );
    const snap = eng.snapshot(portfolio);
    expect(snap.mid).toBeCloseTo(100.1, 5);
  });
});
