import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JevClient } from "../../src/jev/client.js";
import { runPaperLoop } from "../../src/loop/live-loop.js";
import type { JevDecision } from "../../src/types/index.js";

const ok: JevDecision = {
  regime: { type: "choice", choice: "trending", confidence: 0.9, probabilities: { trending: 0.9 } },
  direction: {
    type: "choice",
    choice: "long",
    confidence: 0.88,
    probabilities: { long: 0.88, short: 0.02, neutral: 0.1 },
  },
  toxic_flow: { type: "noul", noul: 0.15 },
  setup_quality: { type: "score", score: 2.4, confidence: 0.9 },
  risk_state: { type: "choice", choice: "safe", confidence: 0.9, probabilities: { safe: 0.9 } },
};

describe("paper loop", () => {
  it("runs end-to-end with mocked Jev", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "sess-"));
    const jev = new JevClient({ mockDecide: async () => ok });
    const result = await runPaperLoop(
      {
        sessionId: "test",
        schemaId: "btc_regime_beta",
        symbol: "BTCUSDT",
        candles: 12,
        outDir,
      },
      jev,
    );
    expect(result.orders).toBeGreaterThan(0);
    expect(result.equity).toBeGreaterThan(0);
  });
});
