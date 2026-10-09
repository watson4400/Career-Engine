import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JevClient } from "../../src/jev/client.js";
import { paperTrainerDecide } from "../../src/jev/paper-trainer.js";
import { runPaperLoop, synthesizeWorld } from "../../src/loop/live-loop.js";
import { brierScore } from "../../src/review/brier.js";

describe("paper loop", () => {
  it("runs paper trainer with causal edge and controlled risk", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "sess-"));
    const jev = new JevClient({
      mockDecide: async (state) => paperTrainerDecide(state),
    });
    const world = synthesizeWorld(180, 83_000, 42);
    const result = await runPaperLoop(
      {
        sessionId: "test",
        schemaId: "btc_regime_beta",
        symbol: "BTCUSDT",
        candles: 180,
        outDir,
      },
      jev,
      world.mids,
      world.signals,
    );
    expect(result.equity).toBeGreaterThan(0);
    expect(result.maxDrawdownPct).toBeLessThan(0.15);
    expect(result.reasonCounts["block:max_position"] ?? 0).toBeLessThan(10);
    expect(result.escalations).toBe(0);
    expect(result.holds + result.orders + result.blocks + result.escalations).toBe(180);
    if (result.labeledPredictions >= 10) {
      const brier = brierScore(result.brierReady);
      expect(brier).toBeLessThan(0.3);
    }
  });
});
