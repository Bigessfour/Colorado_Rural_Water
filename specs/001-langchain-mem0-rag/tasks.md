# Tasks — Feature 001: LangChain + Mem0 RAG Core

## Implementation checklist

- [x] T001-01: LangChain chains with prompt templates for multi-step Water Saver AI workflows
- [x] T001-02: Full RAG pipeline: document loading, text splitting, embeddings, vector store (FAISS)
- [x] T001-03: Mem0 API for semantic / long-term memory keyed by tenant_id:userId
- [x] T001-04: LangChain conversation memory for session-level context
- [x] T001-05: Domain: explain alerts, tenant meter/runbook Q&A, CSV column mapping help
- [x] T001-06: Tenant isolation: never leak cross-tenant data into prompts or memory

- [x] T001-EV: Record evidence path in RUBRIC_COVERAGE.md → `evidence/001-langchain-mem0-rag.md`
- [x] T001-DOC: Compose Bedrock auth notes in `.env.example` + this feature plan

## Verification (2026-08-03 — LangChain API proof)

- Isolation + LangChain API tests: `pytest tests/test_isolation.py tests/test_langchain_apis.py` → **13 passed**
- Compose: `db` + `backend` healthy; `GET /health`, `GET /ready` ok
- RAG: `POST /api/rag` → **HTTP 200** with knowledge sources (`runbook.md`, `alerts.md`)
- Documented session memory: `RunnableWithMessageHistory` multi-turn Cedar Fork / Route 3 recall
- Response fingerprint: `langchain.prompt|chain|history|retriever` keys present
- Mem0: platform `MemoryClient` via `.env` `MEM0_API_KEY`

## Close-out

**Status: CLOSED for Feature 001.** CI/CD (`.github/workflows/ci.yml`) is tracked under Feature **005**, not a 001 acceptance gate.
