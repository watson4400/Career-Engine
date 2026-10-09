import { describe, expect, it, vi } from "vitest";
import {
  CoinbaseAdvancedClient,
  productToEngineSymbol,
  toCoinbaseProduct,
} from "../../src/exchange/coinbase/client.js";

describe("coinbase product mapping", () => {
  it("maps engine symbols to Coinbase products", () => {
    expect(toCoinbaseProduct("BTCUSDT")).toBe("BTC-USD");
    expect(toCoinbaseProduct("BTC-USD")).toBe("BTC-USD");
    expect(productToEngineSymbol("BTC-USD")).toBe("BTCUSDT");
    expect(toCoinbaseProduct("ETHUSDT")).toBe("ETH-USD");
  });
});

describe("CoinbaseAdvancedClient", () => {
  it("parses best bid/ask, portfolio, and dry-run fills", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes("best_bid_ask")) {
        return new Response(
          JSON.stringify({
            pricebooks: [
              {
                product_id: "BTC-USD",
                time: "2026-10-09T12:00:00.000Z",
                bids: [{ price: "100", size: "1" }],
                asks: [{ price: "100.2", size: "1" }],
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (String(url).includes("/accounts")) {
        return new Response(
          JSON.stringify({
            accounts: [
              { uuid: "1", currency: "USD", available_balance: { value: "1000" } },
              { uuid: "2", currency: "BTC", available_balance: { value: "0.01" } },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected ${url}`);
    }) as unknown as typeof fetch;

    const client = new CoinbaseAdvancedClient({
      jwtFn: async () => "test.jwt",
      fetchImpl,
      dryRun: true,
      productId: "BTC-USD",
    });

    const book = await client.getBestBidAsk();
    expect(book.symbol).toBe("BTCUSDT");
    expect(book.bids[0]!.price).toBe(100);

    const mid = 100.1;
    const pf = await client.portfolioSnapshot(mid);
    expect(pf.cash).toBe(1000);
    expect(pf.inventoryQty).toBe(0.01);
    expect(pf.equity).toBeCloseTo(1000 + 0.01 * mid, 5);

    const fill = await client.placeMarket(
      {
        schemaId: "btc_regime_beta",
        symbol: "BTCUSDT",
        side: "buy",
        notionalPct: 0.05,
        reason: "test",
        directionConfidence: 0.9,
        setupQuality: 2.6,
        calibratedP: 0.7,
      },
      1,
      mid,
      pf.equity,
    );
    expect(fill?.id.startsWith("dry-")).toBe(true);
    expect(String(fetchImpl.mock.calls.map((c) => c[0])).includes("/orders")).toBe(false);
  });
});
