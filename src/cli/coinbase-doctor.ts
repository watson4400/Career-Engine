import "dotenv/config";
import { maxSpreadBpsForSymbol } from "../config/constants.js";
import { CoinbaseAdvancedClient } from "../exchange/coinbase/client.js";
import { resolveSchemaId, schemaForProduct } from "../jev/schemas.js";

/**
 * Read-only connectivity check for Coinbase Advanced.
 * Never places orders.
 */
async function main(): Promise<void> {
  const client = new CoinbaseAdvancedClient({ dryRun: true });
  const schemaId = resolveSchemaId({ productId: client.productId });
  console.log(
    JSON.stringify(
      {
        productId: client.productId,
        base: client.baseCurrency(),
        schemaId,
        thesis: schemaForProduct(client.productId).thesis,
        maxSpreadBps: maxSpreadBpsForSymbol(client.productId),
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
  const spreadBps = ((book.asks[0]!.price - book.bids[0]!.price) / mid) * 10_000;
  const maxSpread = maxSpreadBpsForSymbol(client.productId);

  const summary = {
    ok: true,
    product: client.productId,
    mid,
    spreadBps,
    spreadOk: spreadBps <= maxSpread,
    maxSpreadBps: maxSpread,
    bookTs: book.tsMs,
    accountCurrencies: accounts.filter((a) => a.total > 0).map((a) => ({
      currency: a.currency,
      available: a.available,
      total: a.total,
    })),
    portfolio: {
      equity: portfolio.equity,
      cash: portfolio.cash,
      base: client.baseCurrency(),
      inventoryQty: portfolio.inventoryQty,
    },
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
