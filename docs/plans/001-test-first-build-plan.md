# Plan 001 — Test-First Build

**Agenkit phase:** 3 Plan  
**Status:** READY_FOR_OPERATOR_APPROVAL  
**Gate file:** `.agenkit/gates/03-plan.gate.json`

## Work packages (exact paths)

| ID | RED test | GREEN implementation |
| --- | --- | --- |
| T1 | `tests/unit/state-engine.test.ts` | `src/state/state-engine.ts`, `src/state/snapshot.ts` |
| T2 | `tests/unit/policy.test.ts` | `src/policy/gates.ts`, `src/policy/kelly.ts` |
| T3 | `tests/unit/risk.test.ts` | `src/risk/risk-gate.ts`, `src/risk/kill-switch.ts` |
| T4 | `tests/unit/jev-schema.test.ts` | `src/jev/schemas.ts`, `src/jev/client.ts` |
| T5 | `tests/unit/brier.test.ts` | `src/review/brier.ts`, `src/review/overnight.ts` |
| T6 | `tests/integration/paper-loop.test.ts` | `src/loop/live-loop.ts`, `src/exchange/paper.ts` |

## Build order

1. Types + config  
2. State engine  
3. Risk + policy  
4. Jev schemas/client (mockable)  
5. Paper exchange + loop  
6. Overnight review  
7. Research artifacts already in `docs/research/`  
8. CLI entrypoints  

## Definition of done

`npm test` green; `npm run paper` completes one session; gates 4–6 ready for review/ship.
