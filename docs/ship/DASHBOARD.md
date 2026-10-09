# Local ops dashboard

## Run

```bash
cd ~/Career-Engine
git pull
npm install
npm run dashboard
```

Open in Safari/Chrome: **http://127.0.0.1:8787**

Listens on localhost only. Ctrl+C in Terminal to stop.

## What it shows

- Latest session mode (paper / coinbase-dry-run / …)
- **Live Coinbase equity** (USD + USDC + BTC mark) — not paper 100k
- Session P&L, orders, holds
- Live BTC mid from Coinbase (if API keys in `.env`)
- Safety gates: `LIVE_TRADING`, dry-run, kill switch, key presence
- Session list + journal tail

Auto-refreshes every 5 seconds.

### Equity shows "—"

That means **not loaded**, not $0. Doctor (`npm run coinbase:doctor`) is the source of truth until the dashboard reloads keys.

```bash
# stop anything on 8787, then:
kill $(lsof -t -i:8787) 2>/dev/null
git pull
npm run dashboard
# hard-refresh browser: ⌘⇧R
curl -s http://127.0.0.1:8787/api/book | head
```

`liveEquity` in `/api/book` should match doctor (~200 after a USDC deposit). Subtitle lists wallet balances.

## Optional port

```bash
DASHBOARD_PORT=9090 npm run dashboard
```
