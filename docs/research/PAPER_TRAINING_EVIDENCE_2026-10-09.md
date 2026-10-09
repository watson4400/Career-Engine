# Paper Training Evidence — 2026-10-09

## Baseline (constant mock Jev)

| Metric | Value |
| --- | --- |
| Candles | 48 |
| Orders / fills | 1 |
| Blocks | 47 (`max_position`) |
| Root cause | Always-long p=0.85 → quarter-Kelly 25% → every later add blocked |

## After inventory-aware sizing + paper trainer v1

| Metric | Value |
| --- | --- |
| Blocks | 0 |
| Escalations | 130 (`direction.confidence` on neutrals) |
| Orders | 1 |
| Root cause | Neutral conf=0.5 hit escalate gate; `risk_state=reduce` blocked flatten |

## After escalate/flatten fixes (v2)

| Metric | Value |
| --- | --- |
| Candles | 240 |
| Orders | 98 |
| Blocks / escalations | 0 / 0 |
| Max DD | 0.87% |
| Labeled preds | 93 |
| Brier | **0.384** (bad) |
| Overnight tune | `minSetupQuality → 2.5` |

## Applied tweaks (v3)

1. `minSetupQuality = 2.5` (from overnight evidence)
2. Probability shrink 0.65 toward 0.5 before Kelly / labels
3. Trainer: coast band 5–18% inventory; flatten only >18%; stronger setup bar
4. Policy: allow reduce-only when `risk_state != safe`; neutrals hold not escalate
5. Cost haircut 0.5 on Kelly; residual capacity sizing

## v3 (setup 2.5 + shrink) — still weak world model

| Metric | Value |
| --- | --- |
| Orders | 146 (over-trading) |
| Brier | 0.312 |
| Root cause | Book imbalance uncorrelated with synthetic mid path |

## v4 (causal AR(1) world + cooldown + shrink 0.55) — kept

| Metric | 240 bars | 480 bars |
| --- | --- | --- |
| Orders | 8 | 12 |
| Blocks / escalations | 0 / 0 | 0 / 0 |
| PnL | **+4.28%** | **+8.66%** |
| Max DD | **0.017%** | **0.017%** |
| Brier | **0.188** | **0.160** |
| Overnight | selective holds OK; keep setup 2.5 | same |

### Code changes locked in from evidence

- Residual Kelly + `at_position_cap` holds (no max_position thrash)
- Neutral → hold (not escalate); reduce-only when `risk_state != safe`
- `minSetupQuality = 2.5`, `kellyCostHaircut = 0.5`, `probabilityShrink = 0.55`
- `paperTrainerDecide` + `synthesizeWorld` causal signal
- 3-bar add cooldown; session-local kill switch
- Outcome labels from mid path at horizon=5
