import { JEV } from "../config/constants.js";
import type { ChoiceAnswer, JevDecision, NoulAnswer, ScoreAnswer } from "../types/index.js";
import type { JevQuestionMap } from "./schemas.js";

export interface JevClientOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  /** Inject answers in tests / paper without network. */
  mockDecide?: (state: string, questions: JevQuestionMap) => Promise<JevDecision>;
}

export class JevClient {
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly mockDecide?: JevClientOptions["mockDecide"];

  constructor(opts: JevClientOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.TYPESAFE_API_KEY ?? process.env.JEV_API_KEY;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.mockDecide = opts.mockDecide;
  }

  async decide(state: string, questions: JevQuestionMap): Promise<JevDecision> {
    if (this.mockDecide) {
      return this.mockDecide(state, questions);
    }
    if (!this.apiKey) {
      throw new Error("Missing TYPESAFE_API_KEY or JEV_API_KEY");
    }

    const useHosted = this.apiKey.startsWith("jv_");
    const url = useHosted ? JEV.hostedUrl : JEV.typesafeUrl;
    const body: Record<string, unknown> = { state, questions };
    if (!useHosted) body.model = JEV.model;

    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jev HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { answers: Record<string, unknown> };
    return parseDecision(json.answers);
  }
}

export function parseDecision(answers: Record<string, unknown>): JevDecision {
  return {
    regime: asChoice(answers.regime, "regime"),
    direction: asChoice(answers.direction, "direction"),
    toxic_flow: asNoul(answers.toxic_flow, "toxic_flow"),
    setup_quality: asScore(answers.setup_quality, "setup_quality"),
    risk_state: asChoice(answers.risk_state, "risk_state"),
  };
}

function asChoice(raw: unknown, name: string): ChoiceAnswer {
  if (!raw || typeof raw !== "object") throw new Error(`missing ${name}`);
  const o = raw as Record<string, unknown>;
  if (o.type !== "choice" || typeof o.choice !== "string") throw new Error(`bad choice ${name}`);
  return {
    type: "choice",
    choice: o.choice,
    confidence: Number(o.confidence ?? 0),
    probabilities: (o.probabilities as Record<string, number>) ?? {},
  };
}

function asScore(raw: unknown, name: string): ScoreAnswer {
  if (!raw || typeof raw !== "object") throw new Error(`missing ${name}`);
  const o = raw as Record<string, unknown>;
  if (o.type !== "score" || typeof o.score !== "number") throw new Error(`bad score ${name}`);
  return {
    type: "score",
    score: o.score,
    confidence: Number(o.confidence ?? 0),
    probabilities: o.probabilities as Record<string, number> | undefined,
    legend: o.legend as Record<string, string> | undefined,
  };
}

function asNoul(raw: unknown, name: string): NoulAnswer {
  if (!raw || typeof raw !== "object") throw new Error(`missing ${name}`);
  const o = raw as Record<string, unknown>;
  if (o.type !== "noul" || typeof o.noul !== "number") throw new Error(`bad noul ${name}`);
  return { type: "noul", noul: o.noul };
}
