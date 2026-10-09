import type { BookTick, MarketSnapshot, PortfolioState } from "../types/index.js";
import { assertSnapshotBudget, serializeSnapshot } from "./snapshot.js";

export interface StateEngineOptions {
  symbol: string;
  schemaId: string;
  volWindow: number;
  /** Reject ticks with tsMs > wall + skewMs (lookahead guard). */
  maxFutureSkewMs: number;
}

const DEFAULTS: StateEngineOptions = {
  symbol: "BTCUSDT",
  schemaId: "btc_regime_beta",
  volWindow: 32,
  maxFutureSkewMs: 250,
};

/**
 * Deterministic state engine: order book → compact numeric snapshot.
 * All features computed in code; Jev never sees raw book or future fields.
 */
export class StateEngine {
  private readonly opts: StateEngineOptions;
  private mids: { tsMs: number; mid: number }[] = [];
  private lastAsOf = 0;
  private lastSpreadBps = 0;
  private lastImbalance = 0;
  private fundingRatePa: number | null = null;
  private openInterest: number | null = null;

  constructor(opts: Partial<StateEngineOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  setDerivatives(fundingRatePa: number | null, openInterest: number | null, asOfMs: number): void {
    if (asOfMs < this.lastAsOf) {
      throw new Error(`non-causal derivatives update ${asOfMs} < ${this.lastAsOf}`);
    }
    this.fundingRatePa = fundingRatePa;
    this.openInterest = openInterest;
    this.lastAsOf = asOfMs;
  }

  onBook(tick: BookTick, wallClockMs: number = Date.now()): void {
    if (tick.symbol !== this.opts.symbol) {
      throw new Error(`symbol mismatch: ${tick.symbol} != ${this.opts.symbol}`);
    }
    if (tick.tsMs > wallClockMs + this.opts.maxFutureSkewMs) {
      throw new Error(`lookahead rejected: tick ${tick.tsMs} > wall ${wallClockMs}`);
    }
    if (tick.tsMs < this.lastAsOf) {
      return; // ignore stale / out-of-order
    }
    if (!tick.bids.length || !tick.asks.length) {
      throw new Error("empty book side");
    }
    const bestBid = tick.bids[0]!;
    const bestAsk = tick.asks[0]!;
    if (!(bestAsk.price > bestBid.price) || bestBid.price <= 0) {
      throw new Error("crossed or invalid book");
    }
    const mid = (bestBid.price + bestAsk.price) / 2;
    this.lastSpreadBps = ((bestAsk.price - bestBid.price) / mid) * 10_000;
    const bidSz = tick.bids.slice(0, 5).reduce((a, l) => a + l.size, 0);
    const askSz = tick.asks.slice(0, 5).reduce((a, l) => a + l.size, 0);
    const denom = bidSz + askSz;
    this.lastImbalance = denom > 0 ? (bidSz - askSz) / denom : 0;
    this.mids.push({ tsMs: tick.tsMs, mid });
    if (this.mids.length > this.opts.volWindow * 4) {
      this.mids = this.mids.slice(-this.opts.volWindow * 4);
    }
    this.lastAsOf = tick.tsMs;
  }

  snapshot(portfolio: PortfolioState): MarketSnapshot {
    if (!this.mids.length) {
      throw new Error("no book yet");
    }
    const mid = this.mids[this.mids.length - 1]!.mid;
    const invNotional = Math.abs(portfolio.inventoryQty * mid);
    const inventoryNotionalPct = portfolio.equity > 0 ? invNotional / portfolio.equity : 0;
    const drawdownPct =
      portfolio.peakEquity > 0
        ? Math.max(0, (portfolio.peakEquity - portfolio.equity) / portfolio.peakEquity)
        : 0;
    const dailyLossPct =
      portfolio.dayStartEquity > 0
        ? Math.max(0, (portfolio.dayStartEquity - portfolio.equity) / portfolio.dayStartEquity)
        : 0;

    const snap: MarketSnapshot = {
      symbol: this.opts.symbol,
      schemaId: this.opts.schemaId,
      asOfMs: this.lastAsOf,
      mid,
      spreadBps: this.lastSpreadBps,
      imbalance: this.lastImbalance,
      realizedVol: this.computeRealizedVol(),
      inventoryQty: portfolio.inventoryQty,
      inventoryNotionalPct,
      drawdownPct,
      dailyLossPct,
      fundingRatePa: this.fundingRatePa,
      openInterest: this.openInterest,
    };
    assertSnapshotBudget(serializeSnapshot(snap));
    return snap;
  }

  private computeRealizedVol(): number {
    const window = this.mids.slice(-this.opts.volWindow);
    if (window.length < 3) return 0;
    const rets: number[] = [];
    for (let i = 1; i < window.length; i++) {
      const a = window[i - 1]!.mid;
      const b = window[i]!.mid;
      if (a > 0) rets.push(Math.log(b / a));
    }
    const mean = rets.reduce((x, y) => x + y, 0) / rets.length;
    const var_ = rets.reduce((x, y) => x + (y - mean) ** 2, 0) / rets.length;
    return Math.sqrt(var_);
  }
}
