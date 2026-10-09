import "dotenv/config";
import { CoinbaseAdvancedClient } from "../exchange/coinbase/client.js";

/**
 * Read-only connectivity check for Coinbase Advanced.
 * Never places orders.
 */
async function main(): Promise<void> {
  const client = new CoinbaseAdvancedClient({ dryRun: true });
  console.log(
    JSON.stringify(
      {
        productId: client.productId,
        dryRun: client.dryRun,
        note: "doctor never places orders",
      },
      null,
      2,
    ),
  );

  const book = await client.getBestBidAsk();
  const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;
  const accounts = await client.listAccounts();
  const portfolio = await client.portfolioSnapshot(mid);

  const summary = {
    ok: true,
    product: client.productId,
    mid,
    spreadBps: ((book.asks[0]!.price - book.bids[0]!.price) / mid) * 10_000,
    bookTs: book.tsMs,
    accountCurrencies: accounts.filter((a) => a.available > 0).map((a) => ({
      currency: a.currency,
      available: a.available,
    })),
    portfolio: {
      equity: portfolio.equity,
      cash: portfolio.cash,
      btc: portfolio.inventoryQty,
    },
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
