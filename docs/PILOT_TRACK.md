# Pilot track — closed 2026-08-08

> **This file is frozen.** Active status lives in **[PILOT_DONE.md](./PILOT_DONE.md)**.

Assessment III closed 2026-08-06. Pilot P1/P2 closed 2026-08-08 with accepted deferrals documented in PILOT_DONE.

## Final P0

| #   | Item                       | Status     |
| --- | -------------------------- | ---------- |
| 1   | Terraform Apply CI         | done       |
| 2   | Post-apply SPA sync        | done       |
| 3   | Cognito demo + Kelly users | done (ops) |
| 4   | Surface prove register     | done       |

## Final P1

| Item                                      | Status                                                             |
| ----------------------------------------- | ------------------------------------------------------------------ |
| C3 persistence                            | done                                                               |
| H3 Confidence store                       | done                                                               |
| D1–D3 roles                               | done                                                               |
| G4 tenant thresholds                      | done                                                               |
| E Epic (Path A–D, cost confirm, coaching) | done                                                               |
| D5 MFA                                    | **accepted deferral** — UI shipped; live TOTP = ops when requested |
| D4 + H5 CRWA roll-up                      | done                                                               |

## Final P2

| Item                       | Status                                          |
| -------------------------- | ----------------------------------------------- |
| G5/G6 balance viz + rollup | done                                            |
| C4/C5 export + history     | done                                            |
| Per-meter Confidence       | done                                            |
| Reading cycles             | done                                            |
| Sources geocode            | done                                            |
| A6 full session-tag ABAC   | **accepted deferral** — see TENANT_ISOLATION.md |

## Blocked / external

| Item                        | Status                                               |
| --------------------------- | ---------------------------------------------------- |
| H8 Kelly threshold defaults | **accepted deferral** — awaiting Kelly review submit |
| Epic I3–I8 payment          | vNext — CRWA discovery                               |
