# Presentation notes — Assessment III (Water Saver)

Walk **rubric order**, then show product value for rural operators.

## 1. GitHub Actions + Compose (30%)

- Open `.github/workflows/ci.yml` — pytest + `docker compose build`
- `docker compose up` → healthy `db` / `backend` / `frontend`
- `./scripts/smoke.sh` → `/health` + tenant-scoped `/api/rag`

## 2. LangChain + Mem0 (25%)

- `backend/rag/chain.py` prompt templates + FAISS retrieve
- Mem0 + session memory keyed `tenant_id:userId` (`backend/rag/tenant.py`)
- Isolation tests: `cd backend && PYTHONPATH=. pytest tests/ -q`

## 3. Bonuses — LangGraph / LangSmith / agent (25% B)

- `/api/agent/triage` LangGraph path (`backend/rag/graph.py`)
- `/api/agent` tool agent (`list_alerts`, `usage_summary`, `suggest_column_map`)
- LangSmith: set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY`; screenshot → `evidence/langsmith/`

## 4. Integrations + UI (15%)

- Browser <http://localhost:8080> → Assistant uses Compose RAG
- AWS path: Cognito + `/agent` Lambda + Bedrock (after `terraform apply` on codeplatoon)

## 5. Docs (20%)

- `GETTING_STARTED_ASSESSMENT.md` + two Mermaid diagrams
- `specs/RUBRIC_COVERAGE.md`

## 6. Terraform (10%)

- Modules cognito/storage/api/security; `Assessment-iii` default tag
- Remote state example; destroy workflow

## Water Saver product beat (close)

Upload messy CSV → dashboard/alerts → acknowledge — calm rural-operator UX, tenant isolation.

## AWS

Profile **`codeplatoon`** / account **`388691194728`** / **`us-east-1`**. Tag **`Assessment-iii`**.

**Live Cognito SPA:** https://d1gokx5wxrd4x6.cloudfront.net · **API:** https://uqujnhmk31.execute-api.us-east-1.amazonaws.com/health · Zap sheet: [`docs/ASSESSMENT_III_SUBMISSION.md`](docs/ASSESSMENT_III_SUBMISSION.md)
