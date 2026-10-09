# Alt sleeve dry-run (not true micros)

With ~$200 USDC, skip illiquid microcaps. Spreads, min notionals, and thin books will chew the edge. Use a **liquid mid-cap** already in the finalist roster.

## Recommended first alt

| Product | Schema | Why |
| --- | --- | --- |
| **SOL-USD** | `sol_fee_beta` | Liquid on Coinbase Advanced; schema already tuned |
| **LINK-USD** | `link_infra_fees` | Same; usually tighter than smaller alts |

Avoid for now: random memes / true micros not in `FINALISTS`, anything with doctor `spreadOk: false`.

## `.env`

```
COINBASE_PRODUCT_ID=SOL-USD
# optional override — defaults from product:
# COINBASE_SCHEMA_ID=sol_fee_beta
COINBASE_DRY_RUN=true
LIVE_TRADING=false
# optional: tighten/loosen alt spread gate (default alts 60 bps, BTC 25)
# MAX_SPREAD_BPS=60
```

## Run

```bash
cd ~/Career-Engine
git pull
# edit .env as above
npm run coinbase:doctor
# expect product SOL-USD, spreadOk true, equity ~200
npm run coinbase:live
npm run dashboard
```

Doctor prints `schemaId`, `maxSpreadBps`, and `spreadOk`. If `spreadOk` is false, pick another product or raise `MAX_SPREAD_BPS` carefully.

## Safety

- Stay on **dry-run** until several SOL/LINK sessions look sane (holds vs thrash, no surprise flatten).
- Kill + 15% DD / 3% daily still apply.
- Flatten closes the **product base** (SOL inventory if on SOL-USD), not only BTC.
- Do not enable live orders for alts until BTC dry-runs were clean too.
