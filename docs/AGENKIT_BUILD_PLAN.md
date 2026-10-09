# Full Agenkit Build Plan — Exact Paths

| Phase | Specialist | Artifact | Gate |
| --- | --- | --- | --- |
| 0 Orient | Context Engineer | `.agenkit/memory/MEMORY.md` | n/a |
| 1 Spec | Conductor | `docs/specs/001-autonomous-crypto-agent.md` | `.agenkit/gates/01-spec.gate.json` |
| 2 Architecture | Backend Architect | `docs/architecture/001-system-architecture.md` | `.agenkit/gates/02-architecture.gate.json` |
| 3 Plan | Conductor | `docs/plans/001-test-first-build-plan.md` | `.agenkit/gates/03-plan.gate.json` |
| 4 Build | Test + Backend | `src/**`, `tests/**` | `.agenkit/gates/04-build.gate.json` |
| 5 Review | Code Reviewer | `docs/reviews/001-code-review.md` | `.agenkit/gates/05-review.gate.json` |
| 6 Ship | Infra/Security | `docs/ship/001-ship-checklist.md` | `.agenkit/gates/06-ship.gate.json` |

## Implementation file map

| Concern | Path |
| --- | --- |
| Risk constants | `src/config/constants.ts` |
| State engine | `src/state/state-engine.ts`, `src/state/snapshot.ts` |
| Jev client | `src/jev/client.ts` |
| Jev schemas | `src/jev/schemas.ts`, `schemas/jev_core_decision.json` |
| Policy / Kelly | `src/policy/gates.ts`, `src/policy/kelly.ts` |
| Risk / kill | `src/risk/risk-gate.ts`, `src/risk/kill-switch.ts` |
| Paper exchange | `src/exchange/paper.ts` |
| Live loop | `src/loop/live-loop.ts` |
| Brain escalate | `src/brain/escalate.ts` |
| Overnight / Brier | `src/review/overnight.ts`, `src/review/brier.ts` |
| Regime helper | `src/research/regime.ts` |
| CLI | `src/cli/paper.ts`, `src/cli/approve-gate.ts` |
| Research | `docs/research/MARKET_REGIME_2026-10-09.md`, `docs/research/ASYMMETRIC_FINALISTS_2026-10-09.md` |
| Premortem | `docs/research/WHAT_COULD_I_BE_WRONG_ABOUT.md` |

## Operator commands

```bash
npm test
npm run paper
npm run approve-gate -- 01-spec <name>
# optional license:
npx agenkit activate <key> && npx agenkit install engineering-kit --harness cursor
```
