# Feature 007: Integrations

**Rubric:** 15% required
**Status:** CLOSED (honest verify 2026-08-04 — Compose `/assistant` → Bedrock RAG)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] AWS Bedrock for AI-powered functionality used by the product
- [x] Backend API endpoints expose AI / RAG / agent capabilities
- [x] Angular + PrimeNG UI for operator interaction (chat, explain alert, map columns)
- [x] Everything scoped by authenticated tenant

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `backend/src/handlers/agent.ts`
- `backend/rag/`
- `frontend/src/app/pages/agent/`

## Demo evidence

[`evidence/007-integrations-bedrock-ui.md`](../../evidence/007-integrations-bedrock-ui.md)

## Acceptance Criteria

- [x] Bedrock **or** OpenAI **or** Ollama is integrated for real AI functionality used by the product.
- [x] Backend API exposes endpoints that invoke the AI/RAG/agent path.
- [x] Angular + PrimeNG frontend has UI to use that functionality (chat, “explain alert”, column-mapping help, etc.).
- [x] Auth’d requests carry tenant context; API rejects or ignores cross-tenant access.
- [x] End-to-end path works: UI → API → AI provider → response shown in UI.
- [x] Failure modes are handled (timeouts, missing key, model access) with clear user-facing or logged errors.
