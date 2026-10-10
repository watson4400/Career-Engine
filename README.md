# Autonomous Crypto Trading Agent

24/7 **Brain (Opus research)** + **Reflex (Jev)** crypto agent, built with [AgenKit](https://agenkit.xyz)-style six-phase discipline.

> Paper trading by default. Hard risk limits live in code. Operator approves gates only.

## Quick start

```bash
npm install
npm start          # Ops Console → http://127.0.0.1:8787
```

One command: live equity, product toggles, dry-run / kill switch, **Run / Stop** sessions, and a decision strip that tells you what to do next.  
See `docs/ship/OPS_CONSOLE.md`.

```bash
npm test
npm run paper      # offline paper trainer (optional)
```

### Coinbase Advanced (dry-run by default)

Put keys in `.env`, then use the console — or CLI:

```bash
npm run coinbase:doctor   # read-only
npm run coinbase:live     # same loop the console Run button starts
```

See `docs/ship/COINBASE_ADVANCED_SETUP.md` and `docs/ship/ALT_SLEEVE_DRY_RUN.md`.

## Architecture

| Layer | Role |
| --- | --- |
| Brain | Research + overnight review (`docs/research/`, `src/review/`) |
| Reflex | Jev typed decisions (`src/jev/`) ~parallel choice/score/noul |
| Code | State engine, policy gates, Kelly cap, risk kill switch |
| Operator | `.agenkit/gates/*.gate.json` approvals |

## AgenKit phases

1. Spec → `docs/specs/001-autonomous-crypto-agent.md`
2. Architecture → `docs/architecture/001-system-architecture.md`
3. Plan → `docs/plans/001-test-first-build-plan.md`
4. Build → `src/` + `tests/`
5. Review → `docs/reviews/001-code-review.md`
6. Ship → `docs/ship/001-ship-checklist.md`

Approve a gate:

```bash
npm run approve-gate -- 01-spec yourname
```

Optional proprietary kit (license from agenkit.xyz):

```bash
npx agenkit activate <license-key>
npx agenkit install engineering-kit --harness cursor
```

## Jev

Keys from [console.typesafe.ai](https://console.typesafe.ai) (`TYPESAFE_API_KEY`) or hosted `JEV_API_KEY`.  
Schema: `schemas/jev_core_decision.json` + `src/jev/schemas.ts`.

## Research (as-of 2026-10-09)

- Regime: `docs/research/MARKET_REGIME_2026-10-09.md`
- Finalists: `docs/research/ASYMMETRIC_FINALISTS_2026-10-09.md`
- Pre-mortem: `docs/research/WHAT_COULD_I_BE_WRONG_ABOUT.md`

## Risk (non-negotiable)

- Max drawdown 15%
- Max daily loss 3%
- Max position 25% equity
- Kelly capped at 0.25
- Kill switch checked before every order
- Escalate to Brain if confidence `< 0.60` or regime `crisis`
