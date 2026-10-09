import { RISK } from "../config/constants.js";
import type { JevDecision, MarketSnapshot, PolicyResult } from "../types/index.js";
import { sizedNotionalPct } from "./kelly.js";

export function evaluatePolicy(decision: JevDecision, snapshot: MarketSnapshot): PolicyResult {
  const regime = decision.regime.choice;
  const direction = decision.direction.choice;
  const dirConf = decision.direction.confidence;
  const setup = decision.setup_quality.score;
  const riskState = decision.risk_state.choice;
  const toxic = decision.toxic_flow.noul;

  if (regime === "crisis" || dirConf < RISK.escalateConfidenceBelow) {
    return {
      action: "escalate",
      reason:
        regime === "crisis"
          ? "regime=crisis → Brain re-read"
          : `direction.confidence ${dirConf} < ${RISK.escalateConfidenceBelow}`,
      decision,
    };
  }

  if (snapshot.spreadBps > RISK.maxSpreadBps) {
    return { action: "hold", reason: `spread ${snapshot.spreadBps}bps > max` };
  }

  if (toxic >= 0.55) {
    return { action: "hold", reason: `toxic_flow=${toxic}` };
  }

  if (setup < RISK.minSetupQuality) {
    return { action: "hold", reason: `setup_quality ${setup} < ${RISK.minSetupQuality}` };
  }

  if (dirConf <= RISK.minDirectionConfidence) {
    return { action: "hold", reason: `direction.confidence ${dirConf} <= ${RISK.minDirectionConfidence}` };
  }

  if (riskState !== "safe") {
    return { action: "hold", reason: `risk_state=${riskState}` };
  }

  if (direction === "neutral") {
    return { action: "hold", reason: "direction=neutral" };
  }

  const calibratedP = directionProbability(decision);
  const notionalPct = sizedNotionalPct(calibratedP);
  if (notionalPct <= 0) {
    return { action: "hold", reason: "kelly<=0" };
  }

  return {
    action: "order",
    intent: {
      schemaId: snapshot.schemaId,
      symbol: snapshot.symbol,
      side: direction === "long" ? "buy" : "sell",
      notionalPct,
      reason: `gated ok setup=${setup} conf=${dirConf} p=${calibratedP.toFixed(3)}`,
      directionConfidence: dirConf,
      setupQuality: setup,
      calibratedP,
    },
    decision,
  };
}

function directionProbability(d: JevDecision): number {
  const probs = d.direction.probabilities ?? {};
  const choice = d.direction.choice;
  if (choice === "long") return probs.long ?? d.direction.confidence;
  if (choice === "short") return probs.short ?? d.direction.confidence;
  return 0.5;
}
