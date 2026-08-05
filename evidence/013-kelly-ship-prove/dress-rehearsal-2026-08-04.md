# Dress rehearsal checklist — 2026-08-04

Executed same day as F1 + Assessment III dry-runs (compressed Mon–Fri plan).

| Check                                            | Result                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| Timed F1 (~10–15 min)                            | **pass** (~12 min) — see `f1-friction-log.md`                           |
| Assessment III rubric order                      | **pass** — `assessment-iii-rubric-dryrun-2026-08-04.md`                 |
| SPA `localhost:4200`                             | **up**                                                                  |
| Live API `/health`                               | **up**                                                                  |
| Compose `:3000` + `:8080`                        | **up** (after AWS creds in `.env`)                                      |
| Do not claim Reports/Admin/MFA as Kelly blockers | **ok** — Admin proven with Kelly; Reports still Pilot 404; MFA deferred |
| Kelly invite pre-send                            | **green** — Steve sends when scheduling                                 |

## 30 minutes before any live session

1. `cd frontend && npm start` (hostname `localhost`, not `127.0.0.1`)
2. `curl` live API `/health`
3. Confirm Kelly password file: `~/.cursor/secrets/watersaver-kelly-review-cognito.txt` (us-east-1 pool)
4. If showing Compose AI: refresh AWS session into `.env` + recreate backend
5. Clear Sources form leftover text; stay on demo tenant `town-wiley`
