/**
 * Compiled Jev question maps — evaluated in parallel in one call.
 * Code owns thresholds; Jev only judges.
 */

export type JevQuestion =
  | {
      type: "choice";
      instructions: string;
      criteria: Record<string, string>;
    }
  | {
      type: "score";
      instructions: string;
      criteria: string[];
    }
  | {
      type: "noul";
      instructions: string;
    };

export type JevQuestionMap = Record<string, JevQuestion>;

/** Shared decision surface for every finalist. */
export const CORE_DECISION_QUESTIONS: JevQuestionMap = {
  regime: {
    type: "choice",
    instructions:
      "Given only the numeric market snapshot, classify the live regime. Prefer crisis only for systemic stress (depeg, cascading liquidations, broken markets).",
    criteria: {
      trending: "Clear directional drift with orderly microstructure",
      mean_reverting: "Oscillatory / range-bound mean reversion",
      high_vol: "Elevated realized vol / unstable spreads without full crisis",
      crisis: "Systemic stress; flatten and escalate",
    },
  },
  direction: {
    type: "choice",
    instructions:
      "Directional bias for this schema_id over the next candle given snapshot inventory and microstructure. Neutral if edge unclear.",
    criteria: {
      long: "Expected up-move edge after costs",
      short: "Expected down-move edge after costs",
      neutral: "No tradeable edge",
    },
  },
  toxic_flow: {
    type: "noul",
    instructions:
      "Is flow toxic for taking liquidity here (adverse selection, one-sided liquidation cascade, spoofy imbalance)?",
  },
  setup_quality: {
    type: "score",
    instructions:
      "Quality of the asymmetric setup vs costs/slippage for this schema. 0=none, 1=weak, 2=actionable, 3=strong.",
    criteria: [
      "0 no setup",
      "1 weak / noisy",
      "2 actionable after costs",
      "3 strong asymmetric",
    ],
  },
  risk_state: {
    type: "choice",
    instructions:
      "Portfolio risk posture implied by drawdown, daily loss, inventory in the snapshot. Never invent limits — only classify.",
    criteria: {
      safe: "Room to act within coded limits",
      near_limit: "Approaching limits; prefer hold",
      reduce: "Should reduce risk / flatten",
    },
  },
};

export interface FinalistSchema {
  id: string;
  symbol: string;
  thesis: string;
  priority: number;
  autoSize: boolean;
}

export const FINALISTS: FinalistSchema[] = [
  { id: "btc_regime_beta", symbol: "BTCUSDT", thesis: "BTC liquidity + ETF tape beta", priority: 1, autoSize: true },
  { id: "hype_fee_reconnect", symbol: "HYPEUSDT", thesis: "Perps fees vs unlock overhang", priority: 2, autoSize: true },
  { id: "aave_tvl_fees", symbol: "AAVEUSDT", thesis: "TVL/fees vs drawdown", priority: 3, autoSize: true },
  { id: "sol_fee_beta", symbol: "SOLUSDT", thesis: "Solana fee economy pullback", priority: 4, autoSize: true },
  { id: "link_infra_fees", symbol: "LINKUSDT", thesis: "Infra fees vs price lag", priority: 5, autoSize: true },
  { id: "pendle_rates_stack", symbol: "PENDLEUSDT", thesis: "Rates PMF / PT stacking", priority: 6, autoSize: true },
  { id: "ena_usde_basis", symbol: "ENAUSDT", thesis: "USDe scale vs weak accrual", priority: 7, autoSize: true },
  { id: "near_momentum_fade", symbol: "NEARUSDT", thesis: "Priced-in momentum fade sleeve", priority: 8, autoSize: true },
  { id: "uni_fee_switch_option", symbol: "UNIUSDT", thesis: "Fee engine without switch", priority: 9, autoSize: false },
  { id: "ldo_accrual_watch", symbol: "LDOUSDT", thesis: "TVL giant weak claim — watch", priority: 10, autoSize: false },
];

/** Map Coinbase product (SOL-USD) or engine symbol (SOLUSDT) → finalist schema. */
export function schemaForProduct(productOrSymbol: string): FinalistSchema {
  const raw = productOrSymbol.trim().toUpperCase();
  const engine = raw.includes("-")
    ? `${raw.split("-")[0]}USDT`
    : raw.endsWith("USDT")
      ? raw
      : `${raw}USDT`;
  const hit = FINALISTS.find((f) => f.symbol === engine);
  if (hit) return hit;
  return FINALISTS[0]!;
}

export function resolveSchemaId(opts?: {
  schemaId?: string;
  productId?: string;
}): string {
  const fromEnv = process.env.COINBASE_SCHEMA_ID?.trim();
  if (opts?.schemaId?.trim()) return opts.schemaId.trim();
  if (fromEnv) return fromEnv;
  const product = opts?.productId ?? process.env.COINBASE_PRODUCT_ID ?? "BTC-USD";
  return schemaForProduct(product).id;
}

export function questionsForSchema(schemaId: string): JevQuestionMap {
  return {
    ...CORE_DECISION_QUESTIONS,
    // Schema identity is in state; keep question map typed identically for parallel eval.
    _schema: {
      type: "noul",
      instructions: `Confirm evaluation is for schema_id=${schemaId} only; answer noul=1 if state matches that setup context.`,
    },
  };
}
