import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PUBLIC = join(ROOT, "dashboard/public");
const SESSIONS = join(ROOT, "data/sessions");
const PORT = Number(process.env.DASHBOARD_PORT ?? 8787);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function send(res: ServerResponse, status: number, body: string, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
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

function statusPayload() {
  const sessions = listSessions();
  const latest = sessions[0] ?? null;
  const killPath = process.env.KILL_SWITCH_PATH ?? join(SESSIONS, "kill-switch.json");
  const kill = (readJson(killPath) as { armed?: boolean; reason?: string } | null) ?? {
    armed: true,
    reason: "default",
  };

  return {
    now: new Date().toISOString(),
    flags: {
      liveTrading: process.env.LIVE_TRADING === "true",
      coinbaseDryRun: process.env.COINBASE_DRY_RUN !== "false",
      hasTypesafe: Boolean(process.env.TYPESAFE_API_KEY?.trim()),
      hasCoinbase: Boolean(
        (process.env.COINBASE_API_KEY_ID ?? process.env.COINBASE_KEY_NAME)?.trim() &&
          (process.env.COINBASE_API_KEY_SECRET ?? process.env.COINBASE_PRIVATE_KEY)?.trim(),
      ),
      productId: process.env.COINBASE_PRODUCT_ID ?? "BTC-USD",
    },
    killSwitch: {
      armed: Boolean(kill.armed),
      reason: kill.reason ?? null,
    },
    latest,
    sessionCount: sessions.length,
  };
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (url.pathname === "/api/status") {
    return json(res, statusPayload());
  }
  if (url.pathname === "/api/sessions") {
    return json(res, { sessions: listSessions() });
  }
  const one = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (one) {
    const id = decodeURIComponent(one[1]!);
    const dir = join(SESSIONS, id);
    if (!existsSync(dir)) return json(res, { error: "not found" }, 404);
    const summary = readJson(join(dir, "summary.json"));
    const overnight =
      readJson(join(dir, `${id}.overnight.json`)) ??
      readJson(join(dir, "overnight.json"));
    const limit = Number(url.searchParams.get("limit") ?? 50);
    return json(res, {
      id,
      summary,
      overnight,
      journal: journalTail(id, limit),
    });
  }
  if (url.pathname === "/api/book") {
    try {
      const { CoinbaseAdvancedClient } = await import("../exchange/coinbase/client.js");
      const client = new CoinbaseAdvancedClient({ dryRun: true });
      const book = await client.getBestBidAsk();
      const mid = (book.bids[0]!.price + book.asks[0]!.price) / 2;
      const portfolio = await client.portfolioSnapshot(mid);
      const accounts = await client.listAccounts();
      return json(res, {
        ok: true,
        productId: client.productId,
        mid,
        bid: book.bids[0]!.price,
        ask: book.asks[0]!.price,
        spreadBps: ((book.asks[0]!.price - book.bids[0]!.price) / mid) * 10_000,
        tsMs: book.tsMs,
        liveEquity: portfolio.equity,
        liveCash: portfolio.cash,
        liveBtc: portfolio.inventoryQty,
        balances: accounts
          .filter((a) => a.available > 0)
          .map((a) => ({ currency: a.currency, available: a.available })),
      });
    } catch (e) {
      return json(res, { ok: false, error: String((e as Error)?.message ?? e) });
    }
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

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Dashboard → http://127.0.0.1:${PORT}`);
  console.log("Local only. Ctrl+C to stop.");
});
