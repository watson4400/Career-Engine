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

  if (regime === "crisis") {
    return {
      action: "escalate",
      reason: "regime=crisis → Brain re-read",
      decision,
    };
  }

  // Neutral is a hold, not an escalation — low conf on "no trade" is expected.
  if (direction === "neutral") {
    return { action: "hold", reason: "direction=neutral" };
  }

  // Low confidence on a directional call → Brain, not a silent hold.
  if (dirConf < RISK.escalateConfidenceBelow) {
    return {
      action: "escalate",
      reason: `direction.confidence ${dirConf} < ${RISK.escalateConfidenceBelow}`,
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

  const side = direction === "long" ? "buy" : "sell";
  const invSign = Math.sign(snapshot.inventoryQty);
  const reducing =
    invSign !== 0 &&
    ((side === "sell" && invSign > 0) || (side === "buy" && invSign < 0));
  const adding = !reducing;

  // risk_state gate: only allow reduce/flatten when not safe; never add risk.
  if (riskState !== "safe") {
    if (!reducing) {
      return { action: "hold", reason: `risk_state=${riskState}` };
    }
    // Flatten path: allow through with residual inventory capacity
  }

  const remainingCapacityPct = adding
    ? RISK.maxPositionNotionalPct - snapshot.inventoryNotionalPct
    : snapshot.inventoryNotionalPct; // can only flatten existing inventory in reduce mode; when safe, allow reverse up to max below

  const capacity =
    riskState === "safe" && reducing
      ? snapshot.inventoryNotionalPct + RISK.maxPositionNotionalPct
      : remainingCapacityPct;

  if (adding && capacity < RISK.minOrderNotionalPct) {
    return {
      action: "hold",
      reason: `at_position_cap inv_pct=${snapshot.inventoryNotionalPct.toFixed(4)}`,
    };
  }

  if (reducing && snapshot.inventoryNotionalPct < RISK.minOrderNotionalPct) {
    return { action: "hold", reason: "nothing_to_reduce" };
  }

  const rawP = directionProbability(decision);
  const calibratedP = shrinkProbability(rawP);
  const notionalPct = sizedNotionalPct(calibratedP, capacity);
  if (notionalPct <= 0) {
    return { action: "hold", reason: "kelly_or_capacity<=0" };
  }

  return {
    action: "order",
    intent: {
      schemaId: snapshot.schemaId,
      symbol: snapshot.symbol,
      side,
      notionalPct,
      reason: `gated ok setup=${setup} conf=${dirConf} p=${calibratedP.toFixed(3)} size=${notionalPct.toFixed(4)}${reducing ? " reduce" : ""}`,
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

/** Evidence tweak: paper Brier was ~0.38 with raw probs — shrink toward 0.5. */
export function shrinkProbability(p: number, shrink: number = RISK.probabilityShrink): number {
  return 0.5 + (p - 0.5) * shrink;
}
