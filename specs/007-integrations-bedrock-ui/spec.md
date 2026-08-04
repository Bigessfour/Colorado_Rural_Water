# Feature 007: Integrations

**Rubric:** 15% required
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] AWS Bedrock for AI-powered functionality used by the product
- [ ] Backend API endpoints expose AI / RAG / agent capabilities
- [ ] Angular + PrimeNG UI for operator interaction (chat, explain alert, map columns)
- [ ] Everything scoped by authenticated tenant

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `backend/src/handlers/agent.ts`
- `backend/rag/`
- `frontend/src/app/pages/agent/`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 007.

## Acceptance Criteria

- [ ] Bedrock **or** OpenAI **or** Ollama is integrated for real AI functionality used by the product.
- [ ] Backend API exposes endpoints that invoke the AI/RAG/agent path.
- [ ] Angular + PrimeNG frontend has UI to use that functionality (chat, “explain alert”, column-mapping help, etc.).
- [ ] Auth’d requests carry tenant context; API rejects or ignores cross-tenant access.
- [ ] End-to-end path works: UI → API → AI provider → response shown in UI.
- [ ] Failure modes are handled (timeouts, missing key, model access) with clear user-facing or logged errors.
