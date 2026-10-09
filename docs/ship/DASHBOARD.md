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
- Equity, orders, holds
- Live BTC mid from Coinbase (if API keys in `.env`)
- Safety gates: `LIVE_TRADING`, dry-run, kill switch, key presence
- Session list + journal tail

Auto-refreshes every 5 seconds.

## Optional port

```bash
DASHBOARD_PORT=9090 npm run dashboard
```
