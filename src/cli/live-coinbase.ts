import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { isLiveTrading } from "../config/constants.js";
import { resolveSchemaId, schemaForProduct } from "../jev/schemas.js";
import { runCoinbaseLoop } from "../loop/coinbase-loop.js";

async function main(): Promise<void> {
  const dryRun = process.env.COINBASE_DRY_RUN !== "false";
  const candles = Number(process.env.LIVE_CANDLES ?? 5);
  const intervalMs = Number(process.env.LIVE_INTERVAL_MS ?? 15_000);
  const productId = process.env.COINBASE_PRODUCT_ID ?? "BTC-USD";
  const schemaId = resolveSchemaId({ productId });
  const sessionId = `cb-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log(
    JSON.stringify(
      {
        productId,
        schemaId,
        thesis: schemaForProduct(productId).thesis,
        dryRun,
        note: "Keep COINBASE_DRY_RUN=true for alt dry-runs. Prefer SOL/LINK over micros.",
      },
      null,
      2,
    ),
  );

  if (isLiveTrading() && !dryRun) {
    console.error(
      JSON.stringify({
        warning: "LIVE ORDERS ENABLED",
        require: "Kill switch must be disarmed for this session. Start with COINBASE_DRY_RUN=true.",
      }),
    );
  }

  const result = await runCoinbaseLoop({
    sessionId,
    candles,
    intervalMs,
    schemaId,
  });

  const outDir = join("data/sessions", sessionId);
  mkdirSync(outDir, { recursive: true });
  const summary = { sessionId, ...result };
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
