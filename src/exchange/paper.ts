import { createHash } from "node:crypto";
import type { Fill, OrderIntent, PortfolioState } from "../types/index.js";

export class PaperExchange {
  portfolio: PortfolioState;
  fills: Fill[] = [];
  private mid = 100;

  constructor(startingEquity = 100_000) {
    this.portfolio = {
      equity: startingEquity,
      cash: startingEquity,
      inventoryQty: 0,
      avgEntry: 0,
      peakEquity: startingEquity,
      dayStartEquity: startingEquity,
      realizedPnlDay: 0,
    };
  }

  setMid(mid: number): void {
    this.mid = mid;
    this.mark();
  }

  place(intent: OrderIntent, tsMs: number): Fill | null {
    const notional = intent.notionalPct * this.portfolio.equity;
    if (notional <= 0 || this.mid <= 0) return null;
    const slip = intent.side === "buy" ? 1.0002 : 0.9998;
    const price = this.mid * slip;
    const qty = notional / price;
    const signed = intent.side === "buy" ? qty : -qty;

    // Realize PnL on reducing trades
    if (this.portfolio.inventoryQty !== 0 && Math.sign(signed) !== Math.sign(this.portfolio.inventoryQty)) {
      const closed = Math.min(Math.abs(signed), Math.abs(this.portfolio.inventoryQty));
      const pnl = closed * (price - this.portfolio.avgEntry) * Math.sign(this.portfolio.inventoryQty);
      this.portfolio.cash += pnl;
      this.portfolio.realizedPnlDay += pnl;
    }

    const newQty = this.portfolio.inventoryQty + signed;
    if (this.portfolio.inventoryQty === 0 || Math.sign(newQty) === Math.sign(this.portfolio.inventoryQty)) {
      const oldAbs = Math.abs(this.portfolio.inventoryQty);
      const addAbs = Math.abs(signed);
      this.portfolio.avgEntry =
        addAbs + oldAbs > 0
          ? (this.portfolio.avgEntry * oldAbs + price * addAbs) / (oldAbs + addAbs)
          : price;
    } else if (newQty === 0) {
      this.portfolio.avgEntry = 0;
    } else {
      this.portfolio.avgEntry = price;
    }
    this.portfolio.inventoryQty = newQty;
    this.portfolio.cash -= signed * price;
    this.mark();

    const fill: Fill = {
      id: clientOrderId(intent, tsMs),
      schemaId: intent.schemaId,
      symbol: intent.symbol,
      side: intent.side,
      qty,
      price,
      tsMs,
      predictedP: intent.calibratedP,
    };
    this.fills.push(fill);
    return fill;
  }

  private mark(): void {
    const upnl = this.portfolio.inventoryQty * (this.mid - (this.portfolio.avgEntry || this.mid));
    // cash already reflects entries; equity = cash + inventory*mid with cash model that subtracted cost
    this.portfolio.equity = this.portfolio.cash + this.portfolio.inventoryQty * this.mid;
    // Correct double-count: when we subtract signed*price from cash and hold inventory, equity = cash + inv*mid is mark-to-market.
    void upnl;
    this.portfolio.peakEquity = Math.max(this.portfolio.peakEquity, this.portfolio.equity);
  }
}

export function clientOrderId(intent: OrderIntent, candleTs: number): string {
  const raw = `${intent.schemaId}|${intent.symbol}|${candleTs}|${intent.side}|${intent.notionalPct.toFixed(6)}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}
