# Buy & go-live checklist — 2016 MacBook Pro

**As-of:** 2026-10-09  
**Honest scope:** This repo runs **paper** end-to-end today (`PaperExchange`). Buying the items below gets you research + Jev Reflex + risk gates ready. **A live venue adapter is still required before real orders** (next engineering task after you have keys). Do not fund an exchange expecting `npm run paper` to place live trades.

---

## 0. Can a 2016 MacBook Pro run this?

| Need | Verdict |
| --- | --- |
| Node.js 20 LTS | Yes, if macOS is still supported by the Node installer (ideally macOS 12+; 2016 MBP tops out around Ventura/Sonoma depending on model) |
| Paper / overnight loop | Fine |
| 24/7 unattended | **Weak** — heat, sleep, power, Wi‑Fi drops. Prefer a cheap always-on VPS for the live loop; use the MacBook as the operator console |
| Cursor / Claude Code | Works; keep one coding tool, not five |

**Recommended split:** MacBook = approve gates + research. **$5–12/mo VPS** (Linux x86_64 or ARM) = paper → later live daemon.

---

## 1. Buy / create in this exact order

### A. Free / already have

1. **GitHub account** — clone `Career-Engine` branch `cursor/autonomous-crypto-agent-19f6` (or merge PR #2).
2. **Node.js 20 LTS** — https://nodejs.org (Installer for macOS).  
   Check: `node -v` → v20.x or v22.x.
3. **Git** — Xcode CLT: `xcode-select --install`.

### B. Jev (Reflex) — required for live decisions

| Option | Where | What to buy | Env var |
| --- | --- | --- | --- |
| **Preferred** TypeSafe direct | https://console.typesafe.ai → **Keys** | Account + prepaid API balance (new signups: **no free credits** as of late Sep 2026). Budget **$10–25** to start. Price ~**$0.042 / 1M input tokens**, output free. | `TYPESAFE_API_KEY` |
| Alt hosted gateway | https://jevtypesafeai.com | Prepaid pack **$5–$100**, key starts with `jv_` | `JEV_API_KEY` |

Smoke test after key:

```bash
export TYPESAFE_API_KEY='ts_…'   # or JEV_API_KEY='jv_…'
curl -sS https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"jev-latest","state":"mid=83000 spr_bps=4 imb=0.2","questions":{"ok":{"type":"noul","instructions":"Is state numeric and usable?"}}}'
```

### C. Optional — AgenKit engineering harness

| Item | URL | Cost (site) |
| --- | --- | --- |
| AgenKit founding / sub | https://agenkit.xyz | ~$3.49/mo founding then $15/mo (verify at checkout) |

```bash
npx agenkit activate <license-key>
cd /path/to/Career-Engine
npx agenkit install engineering-kit --harness cursor
```

In-repo `.cursor/commands/agenkit.md` already mirrors the six phases **without** this purchase.

### D. Exchange — Coinbase Advanced (wired)

See **`docs/ship/COINBASE_ADVANCED_SETUP.md`**.

| Buy / create | Notes |
| --- | --- |
| Coinbase Advanced + **CDP API keys** (view + trade; **no withdraw**) | `COINBASE_API_KEY_ID` + `COINBASE_API_KEY_SECRET` |
| Start capital | **$100–500** max for first live week |
| Dry-run first | `COINBASE_DRY_RUN=true` (default) — `npm run coinbase:doctor` then `npm run coinbase:live` |

### E. Always-on host (strongly recommended)

| Item | Example | Why |
| --- | --- | --- |
| VPS | Hetzner / DigitalOcean / Fly.io / Railway | 24/7 without frying the 2016 MBP |
| Spec | 1 vCPU, 1–2 GB RAM, Ubuntu 22.04+ | Enough for Node paper/live loop |

### F. Do **not** buy yet

- Fancy GPU / “trading PC”
- Multiple exchange accounts
- Prop-firm challenges for this bot
- Extra LLM subscriptions for the Reflex path (Jev is the Reflex)

---

## 2. MacBook setup (copy-paste)

```bash
# 1) Toolchain
node -v && npm -v

# 2) Repo
git clone https://github.com/watson4400/Career-Engine.git
cd Career-Engine
git fetch origin cursor/autonomous-crypto-agent-19f6
git checkout cursor/autonomous-crypto-agent-19f6

# 3) Install + paper (no keys needed)
npm install
npm test
npm run paper

# 4) Secrets (never commit)
cp .env.example .env
# edit .env — paste TYPESAFE_API_KEY or JEV_API_KEY
# keep LIVE_TRADING=false

# 5) Approve gates only when you understand each artifact
npm run approve-gate -- 01-spec yourname
# …02-architecture … 06-ship when ready
```

---

## 3. Go-live sequence (after live adapter exists)

1. Paper ≥ one overnight; Brier in `data/sessions/*.overnight.json` (target &lt; 0.25).
2. Approve gates 01→06.
3. Kill switch stays **armed** until you explicitly disarm.
4. Wire exchange keys; run live with **tiny** `maxPositionNotionalPct` (consider temporarily lowering in `src/config/constants.ts` to `0.05`).
5. `LIVE_TRADING=true` only when supervised.
6. First week: BTC sleeve only (`btc_regime_beta`), not full finalist set.

---

## 4. Minimum wallet for day one

| Spend | Item |
| --- | --- |
| $0 | Node, Git, repo, paper trainer |
| **$10–25** | TypeSafe / Jev prepaid |
| $0–15/mo | Optional AgenKit |
| $5–12/mo | Optional VPS |
| **$100–500** | Exchange test capital (only after live adapter + gates) |

**Day-one total if disciplined:** ~$10–25 (Jev) + laptop you already have.  
**Do not** dump size into the exchange until the live adapter ships and paper Brier stays healthy.

---

## 5. Tell the agent (next build)

When keys are ready, ask for:

> Wire a Bybit (or Coinbase Advanced) `LiveExchange` adapter, keep paper default, read-only reconcile, no withdraw scope.

Until that lands, you can still run Reflex against live Jev on paper state by setting the API key and swapping the mock off in `src/cli/paper.ts` (live Jev + paper fills).
