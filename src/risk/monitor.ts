import { RISK } from "../config/constants.js";
import type { PortfolioState } from "../types/index.js";
import type { KillSwitch } from "./kill-switch.js";

export interface RiskSnapshot {
  drawdownPct: number;
  dailyLossPct: number;
  inventoryNotionalPct: number;
}

export interface MonitorResult {
  tripped: boolean;
  reason: string | null;
  metrics: RiskSnapshot;
  /** True if this call newly armed the kill switch. */
  newlyArmed: boolean;
}

export function portfolioRiskMetrics(portfolio: PortfolioState, mid: number): RiskSnapshot {
  const drawdownPct =
    portfolio.peakEquity > 0
      ? Math.max(0, (portfolio.peakEquity - portfolio.equity) / portfolio.peakEquity)
      : 0;
  const dailyLossPct =
    portfolio.dayStartEquity > 0
      ? Math.max(0, (portfolio.dayStartEquity - portfolio.equity) / portfolio.dayStartEquity)
      : 0;
  const invNotional = Math.abs(portfolio.inventoryQty * mid);
  const inventoryNotionalPct = portfolio.equity > 0 ? invNotional / portfolio.equity : 0;
  return { drawdownPct, dailyLossPct, inventoryNotionalPct };
}

/**
 * Continuous risk check — runs every candle, even with no order intent.
 * Arms kill switch on max drawdown / max daily loss.
 */
export function monitorAndMaybeKill(
  portfolio: PortfolioState,
  mid: number,
  kill: KillSwitch,
): MonitorResult {
  const metrics = portfolioRiskMetrics(portfolio, mid);
  const already = kill.isBlocking();

  if (metrics.drawdownPct >= RISK.maxDrawdownPct) {
    const reason = `max_drawdown ${metrics.drawdownPct.toFixed(4)}`;
    if (!already) kill.arm(reason);
    return { tripped: true, reason, metrics, newlyArmed: !already };
  }

  if (metrics.dailyLossPct >= RISK.maxDailyLossPct) {
    const reason = `max_daily_loss ${metrics.dailyLossPct.toFixed(4)}`;
    if (!already) kill.arm(reason);
    return { tripped: true, reason, metrics, newlyArmed: !already };
  }

  return { tripped: already, reason: already ? kill.read().reason : null, metrics, newlyArmed: false };
}
