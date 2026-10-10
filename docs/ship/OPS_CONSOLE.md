# Ops Console — one command

Forget juggling Terminal tabs. The console is the product.

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
| **Run dry session** | Starts the Coinbase loop (simulated fills while Dry-run is on) |
| **Stop** | Kills the running session |
| **Product** | BTC / SOL / LINK / AAVE / NEAR — schema maps automatically |
| **Dry-run** | On = no real orders. Off requires typing `LIVE` |
| **Kill switch** | Blocks new risk; flatten path still armed in the loop |
| **Candles** | How long each Run lasts |
| **Decision strip** | One clear next move based on keys, equity, spread, sessions |

Live equity, mid, spread, tape, and sessions refresh every few seconds.

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
