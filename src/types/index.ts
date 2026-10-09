export type Regime = "trending" | "mean_reverting" | "high_vol" | "crisis";
export type Direction = "long" | "short" | "neutral";
export type RiskState = "safe" | "near_limit" | "reduce";
export type Side = "buy" | "sell" | "hold";

export interface BookLevel {
  price: number;
  size: number;
}

export interface BookTick {
  symbol: string;
  /** Exchange event time — must be <= wall clock; no lookahead. */
  tsMs: number;
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface PortfolioState {
  equity: number;
  cash: number;
  inventoryQty: number;
  avgEntry: number;
  peakEquity: number;
  dayStartEquity: number;
  realizedPnlDay: number;
}

export interface MarketSnapshot {
  symbol: string;
  schemaId: string;
  /** Causal watermark: max ts of inputs used. */
  asOfMs: number;
  mid: number;
  spreadBps: number;
  imbalance: number;
  realizedVol: number;
  inventoryQty: number;
  inventoryNotionalPct: number;
  drawdownPct: number;
  dailyLossPct: number;
  fundingRatePa?: number | null;
  openInterest?: number | null;
}

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  probabilities?: Record<string, number>;
  legend?: Record<string, string>;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export type JevAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export interface JevDecision {
  regime: ChoiceAnswer;
  direction: ChoiceAnswer;
  toxic_flow: NoulAnswer;
  setup_quality: ScoreAnswer;
  risk_state: ChoiceAnswer;
}

export interface OrderIntent {
  schemaId: string;
  symbol: string;
  side: Exclude<Side, "hold">;
  notionalPct: number;
  reason: string;
  directionConfidence: number;
  setupQuality: number;
  calibratedP: number;
}

export type PolicyResult =
  | { action: "hold"; reason: string }
  | { action: "escalate"; reason: string; decision: JevDecision }
  | { action: "order"; intent: OrderIntent; decision: JevDecision };

export interface Fill {
  id: string;
  schemaId: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  tsMs: number;
  predictedP: number;
  realized?: boolean;
  outcomeWin?: boolean;
}

export interface PredictionRecord {
  id: string;
  schemaId: string;
  tsMs: number;
  p: number;
  outcome: 0 | 1 | null;
}
