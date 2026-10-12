# Ops Console — one command

Forget juggling Terminal tabs. The console is the product.

First screen is one composition: **Career Engine**, the next decision, one CTA, and live equity as the visual. Instrument / tape / sessions sit below.

## Run

```bash
cd ~/Career-Engine
git pull
npm install
npm start
```

Browser opens to **http://127.0.0.1:8787** (local only).

If the port is busy:

```bash
kill $(lsof -t -i:8787)
npm start
```

## What you can do in the UI

| Control | Does |
| --- | --- |
| **Primary CTA** | Run / Stop / Retry / Disarm — driven by the decision engine |
| **Instrument** | Product (BTC / SOL / LINK / AAVE / NEAR), dry-run, kill, candles |
| **Dry-run** | On = no real orders. Off requires typing `LIVE` |
| **Kill** | Blocks new risk; flatten path still armed in the loop |
| **Tape / Sessions** | Journal + history below the fold |

Equity, mid, spread, and tape refresh every few seconds.

## Safety

- Defaults: dry-run **on**, live trading **off**
- Enabling live requires typing **LIVE** in the dialog
- Keys stay in `.env` — never commit them
- Console binds `127.0.0.1` only

## Optional

```bash
OPS_OPEN=false npm start          # don't auto-open browser
DASHBOARD_PORT=9090 npm start     # different port
```
