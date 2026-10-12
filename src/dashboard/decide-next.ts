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
      title: "Add Coinbase keys",
      detail: "Drop API id + secret into .env, then retry. Balances unlock the desk.",
      primaryAction: "fix_keys",
    };
  }
  if (!ctx.bookOk) {
    return {
      tone: "warn",
      title: "Book unreachable",
      detail: ctx.bookError
        ? ctx.bookError.slice(0, 120)
        : "Check keys and network, then retry.",
      primaryAction: "fix_keys",
    };
  }
  if (ctx.runner.running) {
    return {
      tone: "go",
      title: "Session live",
      detail: `${ctx.productId} · ${ctx.config.dryRun ? "dry-run" : "LIVE ORDERS"} · watch the tape.`,
      primaryAction: "stop",
    };
  }
  if (ctx.config.liveTrading && !ctx.config.dryRun) {
    return {
      tone: "danger",
      title: "Live orders on",
      detail: "Dry-run is off. Run only if you want real fills.",
      primaryAction: "run",
    };
  }
  if (ctx.killArmed && ctx.killReason?.startsWith("max_")) {
    return {
      tone: "danger",
      title: "Kill tripped",
      detail: ctx.killReason + ". Review, then disarm if you accept more risk.",
      primaryAction: "disarm_kill",
    };
  }
  if (ctx.spreadOk === false) {
    return {
      tone: "wait",
      title: "Spread too wide",
      detail: `${ctx.productId} at ${ctx.spreadBps?.toFixed?.(1) ?? "?"} bps. Switch product or wait.`,
      primaryAction: "none",
    };
  }
  if (ctx.liveEquity != null && ctx.liveEquity < 50) {
    return {
      tone: "warn",
      title: "Equity too thin",
      detail: `Showing $${ctx.liveEquity.toFixed(2)}. Fund USDC before you run.`,
      primaryAction: "none",
    };
  }
  if (ctx.drySessionCount < 3) {
    return {
      tone: "go",
      title: "Run a dry session",
      detail: `${ctx.productId}${ctx.liveEquity != null ? ` · $${ctx.liveEquity.toFixed(0)}` : ""} · ${3 - ctx.drySessionCount} more dry-runs before live.`,
      primaryAction: "run",
    };
  }
  if (!ctx.hasTypesafe) {
    return {
      tone: "wait",
      title: "Add Jev key",
      detail: "Dry-runs work on paper-trainer. Set TYPESAFE_API_KEY for live judgment.",
      primaryAction: "run",
    };
  }
  return {
    tone: "go",
    title: "Keep dry-running",
    detail: `${ctx.drySessionCount} dry sessions logged. Stay dry; stop if tape looks wrong.`,
    primaryAction: "run",
  };
}
