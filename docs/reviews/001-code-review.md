# Review 001 — Spec compliance + code quality

**Agenkit phase:** 5 Review  
**Gate:** `.agenkit/gates/05-review.gate.json`

## Spec compliance

| Requirement | Status |
| --- | --- |
| Brain / Reflex split | Pass — research in docs; Jev in `src/jev`; code owns thresholds |
| Snapshot <400 tokens, causal | Pass — `StateEngine` + budget assert |
| Parallel Jev schema | Pass — `CORE_DECISION_QUESTIONS` |
| Gates: setup≥2, conf>0.80, risk safe | Pass — `evaluatePolicy` |
| Quarter Kelly cap | Pass — `kelly.ts` + `RiskGate` |
| Hard risk DD 15% / daily / position / kill | Pass — `RiskGate` + `KillSwitch` |
| Escalate crisis / conf<0.60 | Pass — policy + `escalateToBrain` |
| Overnight Brier + schema ship | Pass — `runOvernightReview` |
| Agenkit phases + gates | Pass — docs + `.agenkit/gates` (operator approval pending) |

## Code quality

- Typed boundaries; no model-authored limit mutation.
- Paper default; keys from env only.
- Tests cover state causality, policy, risk, brier, paper loop.

## Residual risks

- No live exchange adapter yet (paper only) — intentional until ship gate.
- Binance futures geo-blocked in this environment; configure alternate venue for live funding/OI.
- AgenKit proprietary kit not installed (license required at agenkit.xyz); in-repo harness mirrors phases.
