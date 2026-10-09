import { RISK, isLiveTrading } from "../config/constants.js";
import type { OrderIntent, PortfolioState } from "../types/index.js";
import { KillSwitch } from "./kill-switch.js";
import { monitorAndMaybeKill } from "./monitor.js";

export type RiskDecision =
  | { ok: true }
  | { ok: false; reason: string; kill?: boolean };

/**
 * Hard deterministic risk layer. Model answers cannot widen these limits.
 */
export class RiskGate {
  constructor(private readonly kill = new KillSwitch()) {}

  /**
   * Continuous check (no order required). Arms kill on DD / daily loss.
   */
  monitor(portfolio: PortfolioState, mid: number) {
    return monitorAndMaybeKill(portfolio, mid, this.kill);
  }

  authorize(intent: OrderIntent, portfolio: PortfolioState, mid: number): RiskDecision {
    // Re-check portfolio limits every authorize
    const mon = this.monitor(portfolio, mid);
    if (mon.tripped && this.kill.isBlocking()) {
      // Allow only emergency flatten through a dedicated path
      if (intent.reason === "emergency_flatten") {
        return this.authorizeEmergencyFlatten(intent, portfolio, mid);
      }
      return { ok: false, reason: mon.reason ?? "kill_switch_armed", kill: true };
    }

    if (this.kill.isBlocking()) {
      if (intent.reason === "emergency_flatten") {
        return this.authorizeEmergencyFlatten(intent, portfolio, mid);
      }
      return { ok: false, reason: "kill_switch_armed", kill: true };
    }

    if (isLiveTrading() === false && process.env.ALLOW_PAPER_ORDERS === "false") {
      return { ok: false, reason: "orders_disabled" };
    }

    if (intent.notionalPct > RISK.kellyFractionCap + 1e-9) {
      return { ok: false, reason: "notional_exceeds_quarter_kelly" };
    }

    if (intent.notionalPct > 0 && intent.notionalPct < RISK.minOrderNotionalPct) {
      return { ok: false, reason: "dust_order" };
    }

    const currentNotional = portfolio.inventoryQty * mid;
    const delta = (intent.side === "buy" ? 1 : -1) * intent.notionalPct * portfolio.equity;
    const projectedAbs = Math.abs(currentNotional + delta);
    const projectedPct = portfolio.equity > 0 ? projectedAbs / portfolio.equity : 1;
    if (projectedPct > RISK.maxPositionNotionalPct + 1e-9) {
      return { ok: false, reason: `max_position ${projectedPct}` };
    }

    return { ok: true };
  }

  /** Reduce-only escape hatch while kill is armed. */
  authorizeEmergencyFlatten(
    intent: OrderIntent,
    portfolio: PortfolioState,
    mid: number,
  ): RiskDecision {
    if (intent.reason !== "emergency_flatten") {
      return { ok: false, reason: "not_emergency_flatten" };
    }
    const reducing =
      (intent.side === "sell" && portfolio.inventoryQty > 0) ||
      (intent.side === "buy" && portfolio.inventoryQty < 0);
    if (!reducing) {
      return { ok: false, reason: "flatten_not_reducing" };
    }
    if (intent.notionalPct > RISK.kellyFractionCap + 1e-9) {
      return { ok: false, reason: "notional_exceeds_quarter_kelly" };
    }
    void mid;
    return { ok: true };
  }

  getKillSwitch(): KillSwitch {
    return this.kill;
  }
}
