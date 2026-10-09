# Ship 001 — Checklist

**Agenkit phase:** 6 Ship  
**Gate:** `.agenkit/gates/06-ship.gate.json`

## Before merge

- [ ] Operator approved gates 01–05
- [ ] `npm test` green
- [ ] `npm run paper` produces session + overnight report
- [ ] `TYPESAFE_API_KEY` or `JEV_API_KEY` available for live Reflex
- [ ] Kill switch understood: default **armed**; disarm only when ready
- [ ] `LIVE_TRADING` remains `false` until first supervised session
- [ ] Venue for funding/OI chosen (Binance may geo-block)

## Deploy shape

1. Run paper for ≥1 overnight cycle; inspect Brier in `data/sessions/*.overnight.json`.
2. Approve ship gate.
3. Disarm kill switch with explicit reason.
4. Set `LIVE_TRADING=true` only with tiny max position.
5. Keep Brain overnight review shipping schema rewrites before next open.

## Optional AgenKit license

```bash
npx agenkit activate <license-key>
npx agenkit install engineering-kit --harness cursor
```

In-repo `/agenkit` command already mirrors the six phases without the proprietary kit.
