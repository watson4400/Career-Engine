import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FINALISTS, resolveSchemaId, schemaForProduct } from "../jev/schemas.js";

export interface OpsConfig {
  productId: string;
  schemaId: string;
  dryRun: boolean;
  /** Real orders — default false; UI requires typed confirm. */
  liveTrading: boolean;
  candles: number;
  intervalMs: number;
}

export const PRODUCT_OPTIONS = [
  { id: "BTC-USD", label: "BTC", blurb: "Tight book · baseline" },
  { id: "SOL-USD", label: "SOL", blurb: "Liquid alt · first sleeve" },
  { id: "LINK-USD", label: "LINK", blurb: "Infra beta" },
  { id: "AAVE-USD", label: "AAVE", blurb: "DeFi TVL" },
  { id: "NEAR-USD", label: "NEAR", blurb: "Momentum fade" },
] as const;

export function defaultOpsConfig(): OpsConfig {
  const productId = process.env.COINBASE_PRODUCT_ID?.trim() || "BTC-USD";
  return {
    productId,
    schemaId: resolveSchemaId({ productId }),
    dryRun: process.env.COINBASE_DRY_RUN !== "false",
    liveTrading: false,
    candles: Number(process.env.LIVE_CANDLES ?? 8) || 8,
    intervalMs: Number(process.env.LIVE_INTERVAL_MS ?? 12_000) || 12_000,
  };
}

export function opsConfigPath(root: string): string {
  return join(root, "data/ops-config.json");
}

export function loadOpsConfig(root: string): OpsConfig {
  const path = opsConfigPath(root);
  const base = defaultOpsConfig();
  if (!existsSync(path)) return base;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<OpsConfig>;
    return normalizeOpsConfig({ ...base, ...raw });
  } catch {
    return base;
  }
}

export function saveOpsConfig(root: string, patch: Partial<OpsConfig>): OpsConfig {
  const current = loadOpsConfig(root);
  const next = normalizeOpsConfig({ ...current, ...patch });
  const path = opsConfigPath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2));
  return next;
}

export function normalizeOpsConfig(cfg: OpsConfig): OpsConfig {
  const productId = (cfg.productId || "BTC-USD").trim();
  const known = FINALISTS.some((f) => f.id === cfg.schemaId);
  const schemaId = known ? cfg.schemaId : schemaForProduct(productId).id;
  // Safety rail: live orders only when dryRun explicitly false AND liveTrading true
  const liveTrading = cfg.liveTrading === true && cfg.dryRun === false;
  const dryRun = !liveTrading;
  return {
    productId,
    schemaId,
    dryRun,
    liveTrading,
    candles: clampInt(cfg.candles, 1, 60),
    intervalMs: clampInt(cfg.intervalMs, 3_000, 120_000),
  };
}

export function envForOps(cfg: OpsConfig): NodeJS.ProcessEnv {
  return {
    ...process.env,
    COINBASE_PRODUCT_ID: cfg.productId,
    COINBASE_SCHEMA_ID: cfg.schemaId,
    COINBASE_DRY_RUN: cfg.dryRun ? "true" : "false",
    LIVE_TRADING: cfg.liveTrading && !cfg.dryRun ? "true" : "false",
    LIVE_CANDLES: String(cfg.candles),
    LIVE_INTERVAL_MS: String(cfg.intervalMs),
  };
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.round(v)));
}
