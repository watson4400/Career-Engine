# Coinbase Advanced Trade — Mac setup

Wired as of 2026-10-09. **Default is dry-run** (reads live book + balances, does not place real orders).

## 1. Create CDP API keys

1. Open Coinbase Advanced / Developer Platform and create an **API key** (CDP style: key name + secret).
2. Permissions: **View** + **Trade**. Prefer **no transfer/withdraw** if the UI allows.
3. Save the key name and secret once — secret is not shown again.
4. Prefer **Ed25519** keys when offered.

Docs: https://docs.cdp.coinbase.com/get-started/authentication/jwt-authentication

## 2. Put secrets in `.env`

```bash
cd ~/Career-Engine
open -e .env
```

Add (keep your existing `TYPESAFE_API_KEY`):

```
COINBASE_API_KEY_ID=organizations/.../apiKeys/...
COINBASE_API_KEY_SECRET=paste_secret_here
COINBASE_PRODUCT_ID=BTC-USD
# First alt dry-run (liquid only — see ALT_SLEEVE_DRY_RUN.md):
# COINBASE_PRODUCT_ID=SOL-USD
COINBASE_DRY_RUN=true
LIVE_TRADING=false
```

If the secret is a PEM with newlines, either keep real newlines in the file or use `\n` escapes.

Save (⌘S).

## 3. Pull latest code + install

```bash
cd ~/Career-Engine
git pull
npm install
```

## 4. Doctor (read-only)

```bash
npm run coinbase:doctor
```

Expect JSON with `ok: true`, a `mid` price, and your non-zero balances.  
If you see `401` / JWT errors, the key name/secret is wrong or permissions lack **view**.

## 5. Dry-run loop (still no real orders)

```bash
npm run coinbase:live
```

Uses live Coinbase book + Jev (if key set). Orders are **simulated** while `COINBASE_DRY_RUN=true`.

Optional:

```bash
LIVE_CANDLES=3 LIVE_INTERVAL_MS=10000 npm run coinbase:live
```

## 6. Real orders (only when you mean it)

Triple gate — all required:

1. `COINBASE_DRY_RUN=false`
2. `LIVE_TRADING=true`
3. Kill switch **disarmed** for that session (default is armed)

Start tiny. Fund only what you can lose. First week: `BTC-USD` or liquid `SOL-USD` dry-run only — not micros (see `ALT_SLEEVE_DRY_RUN.md`).

```bash
# NOT recommended until you’ve watched dry-runs
# COINBASE_DRY_RUN=false LIVE_TRADING=true npm run coinbase:live
```

## Safety

| Control | Default |
| --- | --- |
| `COINBASE_DRY_RUN` | `true` |
| `LIVE_TRADING` | `false` |
| Kill switch | armed by default; file `data/sessions/kill-switch.json` |
| Max position | 25% equity (code) |
| Max drawdown | **15%** → auto-arms kill |
| Max daily loss | **3%** → auto-arms kill |
| Flatten-on-kill | Closes BTC inventory once when kill arms (dry or live) |

Continuous monitor runs **every candle**, even if Jev says hold.

Never commit `.env`. Never enable withdraw on the API key.

## Suggested starting capital

| Amount | Use |
| --- | --- |
| **$200–500** | Recommended first live bankroll |
| $100 | Absolute minimum (fees hurt more) |
| >$1,000 | Only after several clean supervised live weeks |

You are learning the system, not maximizing return. Fund small.
