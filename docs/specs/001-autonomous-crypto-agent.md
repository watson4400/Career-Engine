# Spec 001 — 24/7 Autonomous Crypto Trading Agent

**Agenkit phase:** 1 Brainstorm / Spec  
**Status:** READY_FOR_OPERATOR_APPROVAL  
**Gate file:** `.agenkit/gates/01-spec.gate.json`

## Problem

Need a production-disciplined crypto agent that researches asymmetric setups (Brain / Opus) and executes live candle decisions (Reflex / Jev) without letting the model override hard risk.

## Non-goals

- No unsupervised mainnet trading until operator clears gates and sets `LIVE_TRADING=true`.
- No free-form LLM order generation.
- No future-leaking features in the state snapshot.

## Actors

| Layer | Owner | Cadence |
| --- | --- | --- |
| Brain | Opus 5.5 (offline research + overnight review) | Session / nightly |
| Reflex | Jev (`jev-latest` or pinned) | Every candle / block snapshot |
| Code | This repo | Always — thresholds, sizing, side effects |
| Operator | Human | Approval gates only |

## Functional requirements

1. Deterministic state engine compresses order book + account into `<400` token numeric snapshot with causal timestamps.
2. Jev scores all finalist schemas in one parallel call: `regime`, `direction`, `toxic_flow`, `setup_quality`, `risk_state`.
3. Policy fires only if `setup_quality >= 2`, direction confidence `> 0.80`, `risk_state == safe`, and risk layer armed-OK.
4. Size with fractional Kelly from calibrated probability, **capped at 0.25 Kelly**.
5. Hard risk: max drawdown 15%, max position, max daily loss, kill switch before every order.
6. Escalate to Brain if Jev confidence `< 0.60` or `regime == crisis`.
7. Nightly review: fills/misses, Brier score, schema rewrite, ship via Agenkit process.

## Acceptance criteria

- [ ] Unit tests cover state causality, policy gates, Kelly cap, risk kill switch.
- [ ] Paper loop runs end-to-end without API keys (mocked Jev + synthetic book).
- [ ] Live Jev path reads `TYPESAFE_API_KEY` or `JEV_API_KEY` only from env.
- [ ] Research docs cite dated primary sources; estimates labeled.
- [ ] No hard limit implemented inside the model prompt — only in code.

## Approval

Operator sets `"approved": true` in the gate file to unlock Architecture.
