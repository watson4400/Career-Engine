import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import dotenv from "dotenv";
import { maxSpreadBpsForSymbol } from "../config/constants.js";
import { schemaForProduct } from "../jev/schemas.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { decideNext } from "./decide-next.js";
import {
  PRODUCT_OPTIONS,
  envForOps,
  loadOpsConfig,
  saveOpsConfig,
  type OpsConfig,
} from "./ops-config.js";
import { SessionRunner } from "./runner.js";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
dotenv.config({ path: join(ROOT, ".env") });

const PUBLIC = join(ROOT, "dashboard/public");
const SESSIONS = join(ROOT, "data/sessions");
const PORT = Number(process.env.DASHBOARD_PORT ?? 8787);
const OPEN = process.env.OPS_OPEN !== "false";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const runner = new SessionRunner(ROOT);

function send(res: ServerResponse, status: number, body: string, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
  });
  res.end(body);
}

function json(res: ServerResponse, data: unknown, status = 200) {
  send(res, status, JSON.stringify(data, null, 2));
}

function readJson(path: string): unknown | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function killPath(): string {
  return process.env.KILL_SWITCH_PATH ?? join(SESSIONS, "kill-switch.json");
}

function listSessions() {
  if (!existsSync(SESSIONS)) return [];
  return readdirSync(SESSIONS)
    .filter((name) => {
      const p = join(SESSIONS, name);
      return statSync(p).isDirectory();
    })
    .map((id) => {
      const dir = join(SESSIONS, id);
      const summary = readJson(join(dir, "summary.json")) as Record<string, unknown> | null;
      const overnight = readJson(join(dir, `${id}.overnight.json`)) as Record<string, unknown> | null;
      const mtime = statSync(dir).mtimeMs;
      return {
        id,
        mtime,
        mode: summary?.mode ?? null,
        jev: summary?.jev ?? null,
        productId: summary?.productId ?? null,
        holds:
          summary?.holds ??
          ((summary?.result as Record<string, unknown> | undefined)?.holds as number | undefined),
        orders:
          summary?.orders ??
          ((summary?.result as Record<string, unknown> | undefined)?.orders as number | undefined),
        blocks:
          summary?.blocks ??
          ((summary?.result as Record<string, unknown> | undefined)?.blocks as number | undefined),
        escalations:
          summary?.escalations ??
          ((summary?.result as Record<string, unknown> | undefined)?.escalations as
            | number
            | undefined),
        equity:
          summary?.equity ??
          ((summary?.result as Record<string, unknown> | undefined)?.equity as number | undefined),
        pnlPct:
          (summary?.pnlPct as number | undefined) ??
          ((summary?.result as Record<string, unknown> | undefined)?.pnlPct as number | undefined),
        pnlUsd:
          (summary?.pnlUsd as number | undefined) ??
          ((summary?.result as Record<string, unknown> | undefined)?.pnlUsd as number | undefined),
        startingEquity:
          (summary?.startingEquity as number | undefined) ??
          ((summary?.result as Record<string, unknown> | undefined)?.startingEquity as
            | number
            | undefined),
        brier: overnight?.brier ?? (summary?.overnight as Record<string, unknown> | undefined)?.brier,
        summary,
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function journalTail(sessionId: string, limit = 40) {
  const path = join(SESSIONS, sessionId, "journal.jsonl");
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });
}

function flagsFrom(cfg: OpsConfig) {
  return {
    liveTrading: cfg.liveTrading && !cfg.dryRun,
    coinbaseDryRun: cfg.dryRun,
    hasTypesafe: Boolean(process.env.TYPESAFE_API_KEY?.trim()),
    hasCoinbase: Boolean(
      (process.env.COINBASE_API_KEY_ID ?? process.env.COINBASE_KEY_NAME)?.trim() &&
        (process.env.COINBASE_API_KEY_SECRET ?? process.env.COINBASE_PRIVATE_KEY)?.trim(),
    ),
    productId: cfg.productId,
    schemaId: cfg.schemaId,
  };
}

async function liveBookPayload(cfg: OpsConfig): Promise<Record<string, unknown>> {
  try {
    const { CoinbaseAdvancedClient } = await import("../exchange/coinbase/client.js");
    const client = new CoinbaseAdvancedClient({
      dryRun: true,
      productId: cfg.productId,
    });
    const book = await client.getBestBidAsk();
    const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;
    const accounts = await client.listAccounts();
    const cash = accounts
      .filter((a) => a.currency === "USD" || a.currency === "USDC")
      .reduce((s, a) => s + a.total, 0);
    const base = client.baseCurrency();
    const liveInventory = accounts
      .filter((a) => a.currency === base)
      .reduce((s, a) => s + a.total, 0);
    const liveEquity = cash + liveInventory * mid;
    const spreadBps = ((book.asks[0]!.price - book.bids[0]!.price) / mid) * 10_000;
    const maxSpread = maxSpreadBpsForSymbol(cfg.productId);
    return {
      ok: true,
      productId: client.productId,
      base,
      mid,
      bid: book.bids[0]!.price,
      ask: book.asks[0]!.price,
      spreadBps,
      maxSpreadBps: maxSpread,
      spreadOk: spreadBps <= maxSpread,
      tsMs: book.tsMs,
      liveEquity,
      liveCash: cash,
      liveInventory,
      liveBtc: base === "BTC" ? liveInventory : 0,
      balances: accounts
        .filter((a) => a.total > 0)
        .map((a) => ({
          currency: a.currency,
          available: a.available,
          hold: a.hold,
          total: a.total,
        })),
      envLoaded: Boolean(
        (process.env.COINBASE_API_KEY_ID ?? process.env.COINBASE_KEY_NAME)?.trim(),
      ),
    };
  } catch (e) {
    return {
      ok: false,
      error: String((e as Error)?.message ?? e),
      liveEquity: null,
      productId: cfg.productId,
      envLoaded: Boolean(
        (process.env.COINBASE_API_KEY_ID ?? process.env.COINBASE_KEY_NAME)?.trim(),
      ),
    };
  }
}

async function consolePayload() {
  const config = loadOpsConfig(ROOT);
  // Apply product to process env so nested helpers see it
  Object.assign(process.env, envForOps(config));
  const sessions = listSessions();
  const latestCb = sessions.find((s) => String(s.mode ?? "").includes("coinbase"));
  const latest = latestCb ?? sessions[0] ?? null;
  const kill = new KillSwitch(killPath()).read();
  const book = await liveBookPayload(config);
  const flags = flagsFrom(config);
  const drySessionCount = sessions.filter((s) => String(s.mode ?? "").includes("dry")).length;
  const decision = decideNext({
    config,
    runner: runner.state(),
    hasCoinbase: flags.hasCoinbase,
    hasTypesafe: flags.hasTypesafe,
    killArmed: Boolean(kill.armed),
    killReason: kill.reason ?? null,
    bookOk: book.ok === true,
    bookError: typeof book.error === "string" ? book.error : null,
    liveEquity: typeof book.liveEquity === "number" ? book.liveEquity : null,
    spreadBps: typeof book.spreadBps === "number" ? book.spreadBps : null,
    spreadOk: typeof book.spreadOk === "boolean" ? book.spreadOk : null,
    drySessionCount,
    productId: config.productId,
  });

  return {
    now: new Date().toISOString(),
    brand: "Career Engine",
    config,
    products: PRODUCT_OPTIONS.map((p) => ({
      ...p,
      schemaId: schemaForProduct(p.id).id,
      thesis: schemaForProduct(p.id).thesis,
    })),
    flags,
    killSwitch: { armed: Boolean(kill.armed), reason: kill.reason ?? null },
    runner: runner.state(),
    book,
    decision,
    latest,
    sessions: sessions.slice(0, 30),
    sessionCount: sessions.length,
    drySessionCount,
  };
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  const method = (req.method ?? "GET").toUpperCase();

  if (url.pathname === "/api/console" && method === "GET") {
    return json(res, await consolePayload());
  }

  // Back-compat for older UI / curls
  if (url.pathname === "/api/status" && method === "GET") {
    const c = await consolePayload();
    return json(res, {
      now: c.now,
      flags: c.flags,
      killSwitch: c.killSwitch,
      latest: c.latest,
      sessionCount: c.sessionCount,
      book: c.book,
      decision: c.decision,
      runner: c.runner,
      config: c.config,
    });
  }
  if (url.pathname === "/api/sessions" && method === "GET") {
    return json(res, { sessions: listSessions() });
  }
  const one = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (one && method === "GET") {
    const id = decodeURIComponent(one[1]!);
    const dir = join(SESSIONS, id);
    if (!existsSync(dir)) return json(res, { error: "not found" }, 404);
    const summary = readJson(join(dir, "summary.json"));
    const overnight =
      readJson(join(dir, `${id}.overnight.json`)) ?? readJson(join(dir, "overnight.json"));
    const limit = Number(url.searchParams.get("limit") ?? 50);
    return json(res, { id, summary, overnight, journal: journalTail(id, limit) });
  }
  if (url.pathname === "/api/book" && method === "GET") {
    const config = loadOpsConfig(ROOT);
    return json(res, await liveBookPayload(config));
  }

  if (url.pathname === "/api/control/config" && method === "POST") {
    const body = (await readBody(req)) as Partial<OpsConfig> & { confirmLive?: string };
    if (body.dryRun === false || body.liveTrading === true) {
      if (body.confirmLive !== "LIVE") {
        return json(
          res,
          { ok: false, error: 'Type confirmLive: "LIVE" to disable dry-run / enable live orders' },
          400,
        );
      }
      body.dryRun = false;
      body.liveTrading = true;
    }
    if (body.productId) {
      body.schemaId = schemaForProduct(body.productId).id;
    }
    const config = saveOpsConfig(ROOT, body);
    Object.assign(process.env, envForOps(config));
    return json(res, { ok: true, config, console: await consolePayload() });
  }

  if (url.pathname === "/api/control/kill" && method === "POST") {
    const body = (await readBody(req)) as { armed?: boolean; reason?: string };
    const ks = new KillSwitch(killPath());
    if (body.armed) ks.arm(body.reason?.trim() || "operator-armed");
    else ks.disarm(body.reason?.trim() || "operator-disarmed");
    return json(res, { ok: true, killSwitch: ks.read(), console: await consolePayload() });
  }

  if (url.pathname === "/api/control/run" && method === "POST") {
    const body = (await readBody(req)) as Partial<OpsConfig> & { confirmLive?: string };
    let config = loadOpsConfig(ROOT);
    if (body.productId || body.candles || body.intervalMs) {
      config = saveOpsConfig(ROOT, body);
    }
    if (!config.dryRun && config.liveTrading && body.confirmLive !== "LIVE") {
      return json(res, { ok: false, error: 'Live run requires confirmLive: "LIVE"' }, 400);
    }
    // Ensure kill file exists
    mkdirSync(dirname(killPath()), { recursive: true });
    if (!existsSync(killPath())) {
      writeFileSync(
        killPath(),
        JSON.stringify(
          { armed: false, reason: "ops-console-ready", updatedAt: new Date().toISOString() },
          null,
          2,
        ),
      );
    }
    const state = runner.start(config);
    return json(res, { ok: state.running, runner: state, console: await consolePayload() });
  }

  if (url.pathname === "/api/control/stop" && method === "POST") {
    const state = runner.stop();
    return json(res, { ok: true, runner: state, console: await consolePayload() });
  }

  return json(res, { error: "not found" }, 404);
}

function serveStatic(res: ServerResponse, pathname: string) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  if (rel.includes("..")) return send(res, 400, "bad path", "text/plain");
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !existsSync(file)) {
    return send(res, 404, "not found", "text/plain");
  }
  const type = MIME[extname(file)] ?? "application/octet-stream";
  send(res, 200, readFileSync(file, "utf8"), type);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (e) {
    send(res, 500, String((e as Error)?.message ?? e), "text/plain");
  }
});

function openBrowser(url: string) {
  if (!OPEN) return;
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => undefined);
}

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${PORT} is busy. Run:\n  kill $(lsof -t -i:${PORT})\n  npm start\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}`;
  // Seed ops config once
  loadOpsConfig(ROOT);
  saveOpsConfig(ROOT, loadOpsConfig(ROOT));
  console.log("");
  console.log("  Career Engine — Ops Console");
  console.log(`  ${url}`);
  console.log("  Local only · Ctrl+C to stop");
  console.log("");
  openBrowser(url);
});
