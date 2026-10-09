import type { JevDecision } from "../types/index.js";

/**
 * Deterministic paper-training Reflex stand-in.
 * Reads the compact snapshot JSON Jev would see and emits typed answers.
 * Used when TYPESAFE_API_KEY is absent so we can train the code loop on evidence.
 */
export function paperTrainerDecide(state: string): JevDecision {
  const s = safeParse(state);
  const imb = num(s.imb);
  const spr = num(s.spr_bps);
  const rvol = num(s.rvol);
  const invPct = num(s.inv_pct);
  const dd = num(s.dd);
  const dayLoss = num(s.day_loss);
  const mid = num(s.mid);

  // Pseudo-momentum from mid hash + imbalance (stable, no future leak)
  const mom = Math.tanh(imb * 2 + Math.sin(mid / 1000) * 0.15);

  let regime: JevDecision["regime"]["choice"] = "trending";
  if (dd >= 0.12 || dayLoss >= 0.025) regime = "crisis";
  else if (rvol > 0.004) regime = "high_vol";
  else if (Math.abs(mom) < 0.08 && rvol < 0.0015) regime = "mean_reverting";

  let risk_state: JevDecision["risk_state"]["choice"] = "safe";
  if (dd >= 0.1 || dayLoss >= 0.02 || invPct >= 0.22) risk_state = "reduce";
  else if (dd >= 0.05 || dayLoss >= 0.01 || invPct >= 0.18) risk_state = "near_limit";

  const toxic = clamp01(0.15 + Math.abs(imb) * 0.5 + (spr > 12 ? 0.2 : 0) + rvol * 40);

  let direction: JevDecision["direction"]["choice"] = "neutral";
  let longP = 0.33;
  let shortP = 0.33;
  if (regime === "mean_reverting") {
    // Fade imbalance
    if (imb > 0.25) {
      direction = "short";
      shortP = 0.55 + Math.min(0.3, imb);
    } else if (imb < -0.25) {
      direction = "long";
      longP = 0.55 + Math.min(0.3, -imb);
    }
  } else if (regime !== "crisis") {
    if (mom > 0.12) {
      direction = "long";
      longP = 0.55 + Math.min(0.35, mom);
    } else if (mom < -0.12) {
      direction = "short";
      shortP = 0.55 + Math.min(0.35, -mom);
    }
  }

  const invQty = num(s.inv);
  // Flatten only when inventory is material — avoids nothing_to_reduce spam on dust
  if (invPct > 0.18 && invQty > 0) {
    direction = "short";
    shortP = 0.84;
    longP = 0.06;
  } else if (invPct > 0.18 && invQty < 0) {
    direction = "long";
    longP = 0.84;
    shortP = 0.06;
  } else if (invPct > 0.05 && invPct <= 0.18) {
    // Coast — do not add; prefer neutral unless strong opposite mom
    if ((invQty > 0 && direction === "long") || (invQty < 0 && direction === "short")) {
      direction = "neutral";
      longP = 0.3;
      shortP = 0.3;
    }
  }

  const neutralP = clamp01(1 - longP - shortP);
  const conf =
    direction === "neutral"
      ? 0.55
      : clamp01(direction === "long" ? longP : shortP);

  // Map edge strength → setup quality 0–3 (gate is 2.5 after Brier evidence)
  const flattening = invPct > 0.18 && direction !== "neutral";
  const edge = direction === "neutral" ? 0 : Math.abs(conf - 0.5) * 2;
  let setup = 0;
  if (flattening) setup = 2.6;
  else if (edge > 0.65 && toxic < 0.4 && spr < 12) setup = 2.7;
  else if (edge > 0.55 && toxic < 0.45 && spr < 15) setup = 2.55;
  else if (edge > 0.4 && toxic < 0.5) setup = 2.1;
  else if (edge > 0.25) setup = 1.4;
  else setup = 0.6;
  if (regime === "crisis") setup = Math.min(setup, 1);

  return {
    regime: {
      type: "choice",
      choice: regime,
      confidence: regime === "crisis" ? 0.85 : 0.75 + Math.min(0.2, rvol * 20),
      probabilities: softChoice(regime, ["trending", "mean_reverting", "high_vol", "crisis"]),
    },
    direction: {
      type: "choice",
      choice: direction,
      confidence: conf,
      probabilities: {
        long: direction === "long" ? longP : longP * 0.5,
        short: direction === "short" ? shortP : shortP * 0.5,
        neutral: direction === "neutral" ? Math.max(neutralP, 0.5) : neutralP,
      },
    },
    toxic_flow: { type: "noul", noul: toxic },
    setup_quality: { type: "score", score: setup, confidence: 0.7 + edge * 0.2 },
    risk_state: {
      type: "choice",
      choice: risk_state,
      confidence: 0.8,
      probabilities: softChoice(risk_state, ["safe", "near_limit", "reduce"]),
    },
  };
}

function safeParse(state: string): Record<string, unknown> {
  try {
    return JSON.parse(state) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function softChoice(winner: string, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const rest = (1 - 0.7) / (keys.length - 1);
  for (const k of keys) out[k] = k === winner ? 0.7 : rest;
  return out;
}
