import { describe, expect, it } from "vitest";
import { parseDecision } from "../../src/jev/client.js";
import { CORE_DECISION_QUESTIONS, questionsForSchema } from "../../src/jev/schemas.js";

describe("Jev schemas", () => {
  it("exposes required parallel questions", () => {
    const q = questionsForSchema("btc_regime_beta");
    for (const k of ["regime", "direction", "toxic_flow", "setup_quality", "risk_state"]) {
      expect(q[k]).toBeTruthy();
    }
    expect(CORE_DECISION_QUESTIONS.regime.type).toBe("choice");
    expect(CORE_DECISION_QUESTIONS.setup_quality.type).toBe("score");
    expect(CORE_DECISION_QUESTIONS.toxic_flow.type).toBe("noul");
  });

  it("parses typed answers", () => {
    const d = parseDecision({
      regime: { type: "choice", choice: "trending", confidence: 0.9, probabilities: { trending: 0.9 } },
      direction: { type: "choice", choice: "long", confidence: 0.85, probabilities: { long: 0.85 } },
      toxic_flow: { type: "noul", noul: 0.2 },
      setup_quality: { type: "score", score: 2, confidence: 1 },
      risk_state: { type: "choice", choice: "safe", confidence: 1, probabilities: { safe: 1 } },
    });
    expect(d.direction.choice).toBe("long");
    expect(d.setup_quality.score).toBe(2);
  });
});
