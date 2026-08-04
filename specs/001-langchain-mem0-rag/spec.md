# Feature 001: LangChain + Mem0 RAG Core

**Rubric:** 25% required
**Status:** done (verified 2026-08-03; LangChain documented APIs re-proven same day)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] LangChain chains with prompt templates for multi-step Water Saver AI workflows
- [x] Full RAG pipeline: document loading, text splitting, embeddings, vector store (FAISS)
- [x] Mem0 API for semantic / long-term memory keyed by tenant_id:userId
- [x] LangChain conversation memory for session-level context
- [x] Domain: explain alerts, tenant meter/runbook Q&A, CSV column mapping help
- [x] Tenant isolation: never leak cross-tenant data into prompts or memory

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `backend/rag/`
- `backend/knowledge/`
- `backend/tests/test_isolation.py`

## Demo evidence

See [`../../evidence/001-langchain-mem0-rag.md`](../../evidence/001-langchain-mem0-rag.md) and [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 001.

## Acceptance Criteria

- [x] At least one LangChain chain exists with explicit prompt template(s) (not ad-hoc string concat only).
- [x] RAG pipeline is implemented end-to-end: load documents → split text → create embeddings → store/retrieve from a vector store.
- [x] Mem0 is integrated for semantic/long-term memory (store + retrieve by user/session or tenant-scoped id).
- [x] LangChain conversation/session memory is used for short-term multi-turn context.
- [x] RAG/AI path is reachable via backend API and returns grounded answers (not only raw LLM chat).
- [x] Domain fit: AI can help with Water Saver tasks (e.g. explain an alert, help map messy CSV columns, answer from tenant runbooks/docs).
- [x] Tenant isolation: prompts, memory, and retrieval never mix data across `tenant_id`s.
- [x] Local or deployed smoke test proves: ingest sample doc → ask question → get answer that references retrieved context.

**Proof:** [`../../evidence/001-langchain-mem0-rag.md`](../../evidence/001-langchain-mem0-rag.md) (Compose `POST /api/rag` 200 + sources; pytest isolation + LangChain API tests).
