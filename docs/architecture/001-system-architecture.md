# Architecture 001 — Brain / Reflex Split

**Agenkit phase:** 2 Architecture  
**Status:** READY_FOR_OPERATOR_APPROVAL  
**Gate file:** `.agenkit/gates/02-architecture.gate.json`  
**Depends on:** Spec 001 approved

## Module boundaries

```
src/
  config/        # env, constants (risk limits)
  types/         # shared types
  state/         # order book → MarketSnapshot (<400 tokens)
  jev/           # client + question schemas + parser
  policy/        # gates + Kelly sizing (code owns thresholds)
  risk/          # drawdown, daily loss, position, kill switch
  exchange/      # paper + live adapters
  loop/          # candle/block live loop
  research/      # regime helpers + finalist registry
  review/        # overnight Brier + schema ship
  brain/         # escalation stubs (deep re-read hooks)
  cli/           # paper-loop, review, research dump
```

## Data flow

1. Exchange adapter emits causal `BookTick` / fills with `ts_ms` ≤ now.
2. `StateEngine` updates mid, spread, imbalance, realized vol, inventory, drawdown.
3. Snapshot serialized to compact JSON string (token budget guard).
4. `JevClient.decide(state, questions)` — all questions parallel in one HTTP call.
5. `Policy.evaluate(answers, snapshot)` → `OrderIntent | Hold | Escalate`.
6. `RiskGate.authorize(intent, portfolio)` → allow / block / kill.
7. Exchange executes; journal records prediction for Brier.

## Failure strategy

| Failure | Behavior |
| --- | --- |
| Jev timeout / 5xx | Hold; retry with backoff; no order |
| Malformed answers | Reject; hold; alert |
| Spread > max | Hold |
| Kill switch armed | Block all orders |
| Crisis / low confidence | Escalate to Brain; flatten optional per config |
| Partial fill | Reconcile inventory from exchange truth |

## Idempotency

- Client order ids: `sha256(session_id|symbol|candle_ts|side|schema_id)`.
- Journal append-only JSONL under `data/sessions/`.

## Security

- API keys env-only; never logged.
- Paper mode default.
- Risk limits not configurable by Jev answers.
