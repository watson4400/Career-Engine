import { coinbaseJwt, loadCoinbaseCredentials, type CoinbaseCredentials } from "./auth.js";
import type { BookLevel, BookTick, Fill, OrderIntent, PortfolioState } from "../../types/index.js";
import { clientOrderId } from "../paper.js";

const HOST = "api.coinbase.com";
const BASE = `https://${HOST}`;

export interface CoinbaseClientOptions {
  creds?: CoinbaseCredentials;
  fetchImpl?: typeof fetch;
  /** When true, never POST orders — simulate fills at mid. */
  dryRun?: boolean;
  productId?: string;
  /** Test seam — skip real CDP JWT. */
  jwtFn?: (method: string, path: string) => Promise<string>;
}

interface PriceBook {
  product_id: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  time?: string;
}

/**
 * Thin Advanced Trade REST client (spot).
 * Auth: CDP JWT via @coinbase/cdp-sdk.
 */
export class CoinbaseAdvancedClient {
  private readonly creds: CoinbaseCredentials | null;
  private readonly fetchImpl: typeof fetch;
  private readonly jwtFn?: CoinbaseClientOptions["jwtFn"];
  readonly dryRun: boolean;
  readonly productId: string;

  constructor(opts: CoinbaseClientOptions = {}) {
    this.creds = opts.creds ?? (opts.jwtFn ? null : loadCoinbaseCredentials());
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.jwtFn = opts.jwtFn;
    this.dryRun = opts.dryRun ?? process.env.COINBASE_DRY_RUN !== "false";
    this.productId = opts.productId ?? process.env.COINBASE_PRODUCT_ID ?? "BTC-USD";
  }

  async getBestBidAsk(productId: string = this.productId): Promise<BookTick> {
    const path = `/api/v3/brokerage/best_bid_ask?product_ids=${encodeURIComponent(productId)}`;
    const json = await this.request<{ pricebooks: PriceBook[] }>("GET", path);
    const book = json.pricebooks?.find((p) => p.product_id === productId) ?? json.pricebooks?.[0];
    if (!book?.bids?.length || !book?.asks?.length) {
      throw new Error(`empty book for ${productId}`);
    }
    const tsMs = book.time ? Date.parse(book.time) : Date.now();
    return {
      symbol: productToEngineSymbol(productId),
      tsMs: Number.isFinite(tsMs) ? tsMs : Date.now(),
      bids: book.bids.slice(0, 5).map(level),
      asks: book.asks.slice(0, 5).map(level),
    };
  }

  async listAccounts(): Promise<{ uuid: string; currency: string; available: number }[]> {
    const path = "/api/v3/brokerage/accounts";
    const json = await this.request<{
      accounts: { uuid: string; currency: string; available_balance: { value: string } }[];
    }>("GET", path);
    return (json.accounts ?? []).map((a) => ({
      uuid: a.uuid,
      currency: a.currency,
      available: Number(a.available_balance?.value ?? 0),
    }));
  }

  async portfolioSnapshot(btcPrice: number): Promise<PortfolioState> {
    const accounts = await this.listAccounts();
    const usd = accounts.find((a) => a.currency === "USD") ?? accounts.find((a) => a.currency === "USDC");
    const btc = accounts.find((a) => a.currency === "BTC");
    const cash = usd?.available ?? 0;
    const inventoryQty = btc?.available ?? 0;
    const equity = cash + inventoryQty * btcPrice;
    return {
      equity: Math.max(equity, 1),
      cash,
      inventoryQty,
      avgEntry: inventoryQty !== 0 ? btcPrice : 0,
      peakEquity: Math.max(equity, 1),
      dayStartEquity: Math.max(equity, 1),
      realizedPnlDay: 0,
    };
  }

  async placeMarket(intent: OrderIntent, tsMs: number, mid: number, equity: number): Promise<Fill | null> {
    const notional = intent.notionalPct * equity;
    if (notional <= 0 || !(mid > 0)) return null;
    const side = intent.side;
    const qty = notional / mid;
    if (intent.reason === "emergency_flatten") {
      return this.submitMarket({
        intent,
        tsMs,
        mid,
        side,
        baseSize: qty,
        quoteSize: side === "buy" ? notional : undefined,
      });
    }
    return this.submitMarket({
      intent,
      tsMs,
      mid,
      side,
      quoteSize: side === "buy" ? notional : undefined,
      baseSize: side === "sell" ? qty : undefined,
    });
  }

  /**
   * Close inventory by base size (preferred for emergency flatten).
   */
  async flattenBase(opts: {
    schemaId: string;
    symbol: string;
    inventoryQty: number;
    mid: number;
    tsMs: number;
    calibratedP?: number;
  }): Promise<Fill | null> {
    const qty = Math.abs(opts.inventoryQty);
    if (qty < 1e-8 || !(opts.mid > 0)) return null;
    const side = opts.inventoryQty > 0 ? "sell" : "buy";
    const intent: OrderIntent = {
      schemaId: opts.schemaId,
      symbol: opts.symbol,
      side,
      notionalPct: Math.min(1, (qty * opts.mid) / Math.max(qty * opts.mid, 1)),
      reason: "emergency_flatten",
      directionConfidence: 1,
      setupQuality: 3,
      calibratedP: opts.calibratedP ?? 0.5,
    };
    return this.submitMarket({
      intent,
      tsMs: opts.tsMs,
      mid: opts.mid,
      side,
      baseSize: qty,
      quoteSize: side === "buy" ? qty * opts.mid : undefined,
    });
  }

  private async submitMarket(opts: {
    intent: OrderIntent;
    tsMs: number;
    mid: number;
    side: "buy" | "sell";
    quoteSize?: number;
    baseSize?: number;
  }): Promise<Fill | null> {
    const productId = toCoinbaseProduct(opts.intent.symbol);
    const side = opts.side.toUpperCase() as "BUY" | "SELL";
    const client_order_id = clientOrderId(opts.intent, opts.tsMs);
    const qty =
      opts.baseSize ??
      (opts.quoteSize && opts.mid > 0 ? opts.quoteSize / opts.mid : 0);
    if (qty <= 0 && !(opts.quoteSize && opts.quoteSize > 0)) return null;

    if (this.dryRun) {
      const price = opts.mid * (side === "BUY" ? 1.0002 : 0.9998);
      return {
        id: `dry-${client_order_id}`,
        schemaId: opts.intent.schemaId,
        symbol: opts.intent.symbol,
        side: opts.side,
        qty: qty || (opts.quoteSize! / price),
        price,
        tsMs: opts.tsMs,
        predictedP: opts.intent.calibratedP,
      };
    }

    let order_configuration: Record<string, unknown>;
    if (opts.baseSize != null && opts.baseSize > 0) {
      order_configuration = { market_market_ioc: { base_size: opts.baseSize.toFixed(8) } };
    } else {
      order_configuration = {
        market_market_ioc: { quote_size: Math.max(1, opts.quoteSize ?? 0).toFixed(2) },
      };
    }

    const json = await this.request<{
      success: boolean;
      success_response?: { order_id: string };
      error_response?: { message?: string; error?: string };
      failure_reason?: string;
    }>("POST", "/api/v3/brokerage/orders", {
      client_order_id,
      product_id: productId,
      side,
      order_configuration,
    });

    if (!json.success) {
      const msg =
        json.error_response?.message ||
        json.error_response?.error ||
        json.failure_reason ||
        "order rejected";
      throw new Error(`Coinbase order failed: ${msg}`);
    }

    return {
      id: json.success_response?.order_id ?? client_order_id,
      schemaId: opts.intent.schemaId,
      symbol: opts.intent.symbol,
      side: opts.side,
      qty: qty || 0,
      price: opts.mid,
      tsMs: opts.tsMs,
      predictedP: opts.intent.calibratedP,
    };
  }

  private async request<T>(method: string, pathWithQuery: string, body?: unknown): Promise<T> {
    const pathOnly = pathWithQuery.split("?")[0]!;
    const jwt = this.jwtFn
      ? await this.jwtFn(method, pathOnly)
      : await coinbaseJwt(this.creds!, method, HOST, pathOnly);
    const res = await this.fetchImpl(`${BASE}${pathWithQuery}`, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Coinbase HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return text ? (JSON.parse(text) as T) : ({} as T);
  }
}

function level(l: { price: string; size: string }): BookLevel {
  return { price: Number(l.price), size: Number(l.size) };
}

export function toCoinbaseProduct(symbol: string): string {
  if (symbol.includes("-")) return symbol;
  if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}-USD`;
  if (symbol.endsWith("USD")) return `${symbol.slice(0, -3)}-USD`;
  return symbol;
}

/** BTC-USD → BTCUSDT for the state engine. */
export function productToEngineSymbol(productId: string): string {
  const [base, quote] = productId.split("-");
  if (!base || !quote) return productId;
  if (quote === "USD" || quote === "USDC") return `${base}USDT`;
  return `${base}${quote}`;
}
