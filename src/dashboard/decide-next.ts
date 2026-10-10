import type { OpsConfig } from "./ops-config.js";
import type { RunnerState } from "./runner.js";

export interface DecisionContext {
  config: OpsConfig;
  runner: RunnerState;
  hasCoinbase: boolean;
  hasTypesafe: boolean;
  killArmed: boolean;
  killReason: string | null;
  bookOk: boolean;
  bookError: string | null;
  liveEquity: number | null;
  spreadBps: number | null;
  spreadOk: boolean | null;
  drySessionCount: number;
  productId: string;
}

export interface NextDecision {
  tone: "go" | "wait" | "warn" | "danger";
  title: string;
  detail: string;
  primaryAction: "run" | "stop" | "disarm_kill" | "arm_kill" | "fix_keys" | "none";
}

/** Operator-facing recommendation — one job: what to do next. */
export function decideNext(ctx: DecisionContext): NextDecision {
  if (!ctx.hasCoinbase) {
    return {
      tone: "warn",
      title: "Connect Coinbase keys",
      detail: "Put COINBASE_API_KEY_ID + COINBASE_API_KEY_SECRET in .env, then refresh. No trading until doctor can see balances.",
      primaryAction: "fix_keys",
    };
  }
  if (!ctx.bookOk) {
    return {
      tone: "warn",
      title: "Book not loaded",
      detail: ctx.bookError
        ? `Coinbase error: ${ctx.bookError.slice(0, 140)}`
        : "Waiting on Coinbase. Check keys / network, then refresh.",
      primaryAction: "fix_keys",
    };
  }
  if (ctx.runner.running) {
    return {
      tone: "go",
      title: "Session running — watch the tape",
      detail: `${ctx.productId} · ${ctx.config.dryRun ? "dry-run (no real orders)" : "LIVE ORDERS"} · stop anytime.`,
      primaryAction: "stop",
    };
  }
  if (ctx.config.liveTrading && !ctx.config.dryRun) {
    return {
      tone: "danger",
      title: "Live orders armed",
      detail: "Dry-run is OFF. Only Run if you intend real fills. Prefer flipping Dry-run back on.",
      primaryAction: "run",
    };
  }
  if (ctx.killArmed && ctx.killReason?.startsWith("max_")) {
    return {
      tone: "danger",
      title: "Risk kill tripped",
      detail: `Armed: ${ctx.killReason}. Review PnL, then disarm only if you accept more risk.`,
      primaryAction: "disarm_kill",
    };
  }
  if (ctx.spreadOk === false) {
    return {
      tone: "wait",
      title: "Spread too wide",
      detail: `${ctx.productId} spread ${ctx.spreadBps?.toFixed?.(1) ?? "?"} bps. Switch product or wait — don't force size.`,
      primaryAction: "none",
    };
  }
  if (ctx.liveEquity != null && ctx.liveEquity < 50) {
    return {
      tone: "warn",
      title: "Equity looks too small",
      detail: `Live equity ${ctx.liveEquity.toFixed(2)}. Fund USDC or verify balances before running.`,
      primaryAction: "none",
    };
  }
  if (ctx.drySessionCount < 3) {
    return {
      tone: "go",
      title: "Run a dry session",
      detail: `${ctx.productId} · equity ${ctx.liveEquity != null ? `$${ctx.liveEquity.toFixed(0)}` : "ready"} · build ${3 - ctx.drySessionCount} more clean dry-runs before thinking about live.`,
      primaryAction: "run",
    };
  }
  if (!ctx.hasTypesafe) {
    return {
      tone: "wait",
      title: "Dry-runs OK — add Jev key for live judgment",
      detail: "Paper-trainer can drive dry-runs. Set TYPESAFE_API_KEY for real Jev decisions.",
      primaryAction: "run",
    };
  }
  return {
    tone: "go",
    title: "Ready — keep dry-running",
    detail: `${ctx.drySessionCount} dry sessions on file. Stay on dry-run; use Stop if tape looks wrong.`,
    primaryAction: "run",
  };
}
