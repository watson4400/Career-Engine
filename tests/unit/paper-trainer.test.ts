import { describe, expect, it } from "vitest";
import { paperTrainerDecide } from "../../src/jev/paper-trainer.js";

describe("paperTrainerDecide", () => {
  it("emits typed answers from compact state", () => {
    const d = paperTrainerDecide(
      JSON.stringify({
        s: "BTCUSDT",
        id: "btc_regime_beta",
        t: 1,
        mid: 83000,
        spr_bps: 4,
        imb: 0.4,
        rvol: 0.001,
        inv: 0,
        inv_pct: 0,
        dd: 0,
        day_loss: 0,
      }),
    );
    expect(["trending", "mean_reverting", "high_vol", "crisis"]).toContain(d.regime.choice);
    expect(["long", "short", "neutral"]).toContain(d.direction.choice);
    expect(d.toxic_flow.noul).toBeGreaterThanOrEqual(0);
    expect(d.setup_quality.score).toBeGreaterThanOrEqual(0);
  });

  it("marks risk reduce when inventory near cap", () => {
    const d = paperTrainerDecide(
      JSON.stringify({
        mid: 83000,
        spr_bps: 4,
        imb: 0.1,
        rvol: 0.001,
        inv: 1,
        inv_pct: 0.23,
        dd: 0,
        day_loss: 0,
      }),
    );
    expect(d.risk_state.choice).toBe("reduce");
  });
});
