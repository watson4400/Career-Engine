import { RISK, isLiveTrading } from "../config/constants.js";
import type { OrderIntent, PortfolioState } from "../types/index.js";
import { KillSwitch } from "./kill-switch.js";

export type RiskDecision =
  | { ok: true }
  | { ok: false; reason: string; kill?: boolean };

/**
 * Hard deterministic risk layer. Model answers cannot widen these limits.
 */
export class RiskGate {
  constructor(private readonly kill = new KillSwitch()) {}

  authorize(intent: OrderIntent, portfolio: PortfolioState, mid: number): RiskDecision {
    if (this.kill.isBlocking()) {
      return { ok: false, reason: "kill_switch_armed", kill: true };
    }

    if (isLiveTrading() === false && process.env.ALLOW_PAPER_ORDERS === "false") {
      return { ok: false, reason: "orders_disabled" };
    }

    const dd =
      portfolio.peakEquity > 0
        ? Math.max(0, (portfolio.peakEquity - portfolio.equity) / portfolio.peakEquity)
        : 0;
    if (dd >= RISK.maxDrawdownPct) {
      this.kill.arm(`max_drawdown ${dd}`);
      return { ok: false, reason: `max_drawdown ${dd}`, kill: true };
    }

    const dayLoss =
      portfolio.dayStartEquity > 0
        ? Math.max(0, (portfolio.dayStartEquity - portfolio.equity) / portfolio.dayStartEquity)
        : 0;
    if (dayLoss >= RISK.maxDailyLossPct) {
      this.kill.arm(`max_daily_loss ${dayLoss}`);
      return { ok: false, reason: `max_daily_loss ${dayLoss}`, kill: true };
    }

    if (intent.notionalPct > RISK.kellyFractionCap + 1e-9) {
      return { ok: false, reason: "notional_exceeds_quarter_kelly" };
    }

    if (intent.notionalPct > 0 && intent.notionalPct < RISK.minOrderNotionalPct) {
      return { ok: false, reason: "dust_order" };
    }

    // Signed projection: reducing inventory must not be blocked as "adding"
    const currentNotional = portfolio.inventoryQty * mid;
    const delta = (intent.side === "buy" ? 1 : -1) * intent.notionalPct * portfolio.equity;
    const projectedAbs = Math.abs(currentNotional + delta);
    const projectedPct = portfolio.equity > 0 ? projectedAbs / portfolio.equity : 1;
    if (projectedPct > RISK.maxPositionNotionalPct + 1e-9) {
      return { ok: false, reason: `max_position ${projectedPct}` };
    }

    return { ok: true };
  }

  getKillSwitch(): KillSwitch {
    return this.kill;
  }
}
