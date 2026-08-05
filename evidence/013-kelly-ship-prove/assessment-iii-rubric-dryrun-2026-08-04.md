# Assessment III rubric dry-run — 2026-08-04

Walked [`PRESENTATION_NOTES.md`](../../PRESENTATION_NOTES.md) in rubric order against live Compose + Cognito SPA.

| #   | Slice                          | Result   | Evidence                                                                                                                                                                                                                                            |
| --- | ------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | GitHub Actions + Compose (30%) | **pass** | `.github/workflows/ci.yml` has pytest + `docker compose build` + smoke; local `docker compose up` → db/backend/frontend healthy; `./scripts/smoke.sh http://127.0.0.1:3000` → **smoke ok**                                                          |
| 2   | LangChain + Mem0 (25%)         | **pass** | `backend/rag/chain.py` + tenant Mem0; `PYTHONPATH=. pytest tests/ -q` → **17 passed**; live `POST /api/rag` 200 after exporting `codeplatoon` creds into Compose `.env`                                                                             |
| 3   | LangGraph / LangSmith / agent  | **pass** | `POST /api/agent/triage` → LangGraph steps + `langsmith.enabled=true` project `Water_Saver`; `POST /api/agent` tool `list_alerts` 200. Screenshot LangSmith UI still optional (traces enabled — open project URL in `evidence/langsmith/README.md`) |
| 4   | Integrations + UI              | **pass** | Compose UI `:8080` Assistant shell; Cognito SPA product beat on `:4200` (F1 evidence screenshots)                                                                                                                                                   |
| 5   | Docs + diagrams                | **pass** | `GETTING_STARTED_ASSESSMENT.md` + `specs/RUBRIC_COVERAGE.md`                                                                                                                                                                                        |
| 6   | Terraform                      | **pass** | Modules + default tag `Assessment-iii`; `.github/workflows/destroy.yml` present                                                                                                                                                                     |

## Ops note for Compose Bedrock

Compose backend needs fresh AWS keys in gitignored `.env` (from `aws configure export-credentials --profile codeplatoon --format env`). Without them, `/api/rag` returns “RAG processing failed” / `NoCredentialsError`. Recreate backend after refreshing session tokens.

**Re-proved 2026-08-04 after Steve AWS login:** account `388691194728` / profile `codeplatoon` → refreshed `.env` → `docker compose up -d --force-recreate backend` → `./scripts/smoke.sh` ok → `POST /api/rag` **200** (Watch vs Actionable) → `POST /api/agent/triage` **200** with LangSmith enabled (`Water_Saver`).

## Product close beat

Messy CSV → dashboard / Watch vs Actionable → acknowledge — proven in F1 dry-run (`f1-*.png`).

## Screenshots

- Compose Assistant UI: temp `assessment-iii-compose-assistant-ui-2026-08-04.png` (copy into `evidence/screenshots/` if desired)
- Cognito product: `f1-dashboard-2026-08-04.png`, `f1-alerts-2026-08-04.png`
