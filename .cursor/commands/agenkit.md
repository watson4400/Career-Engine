# /agenkit — Autonomous Crypto Agent pipeline

Mirrors [AgenKit](https://agenkit.xyz) six phases for this repo.

**Note:** Proprietary `npx agenkit install engineering-kit` requires a license key from agenkit.xyz. This command drives the same phases using in-repo artifacts.

## Phases

0. **Orient** — read `.agenkit/memory/MEMORY.md`
1. **Spec** — `docs/specs/` → approve `.agenkit/gates/01-spec.gate.json`
2. **Architecture** — `docs/architecture/` → gate 02
3. **Plan** — `docs/plans/` → gate 03
4. **Build test-first** — `tests/` then `src/` → gate 04
5. **Review** — `docs/reviews/` → gate 05
6. **Ship** — `docs/ship/` → gate 06

## Task (this project)

Build the 24/7 Brain/Reflex crypto agent per `docs/specs/001-autonomous-crypto-agent.md`.

Never let Jev override hard risk. Paper mode until ship gate + `LIVE_TRADING`.
