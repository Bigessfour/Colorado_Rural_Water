# Feature 014: Production Cognito RAG Assistant

**Status:** implemented in repo (Pilot — apply + Chrome prove pending)
**Product:** Water Saver (Colorado Rural Water)
**Depends on:** Epic E shell (E1/E4/E5/E6), Feature 001 Compose RAG (Assessment spine remains)

## User value

Signed-in municipal operators get document-grounded Assistant answers (Colorado CDPHE guidance + tenant SOPs) on the **same Cognito JWT SPA** they already use for upload/alerts — without Compose demo headers. Retrieval is tenant-filtered; chat history persists in Dynamo.

## Acceptance criteria

- [ ] Cognito JWT `POST /agent` retrieves from Bedrock Knowledge Base with metadata filter `scope=shared OR tenant_id=<jwt>`
- [ ] Residual / treatment answers cite live CDPHE URLs from corpus (or refuse dosing when context missing)
- [ ] Watch vs Actionable answers can use live tenant alerts/confidence (tools)
- [ ] SPA `/assistant` shows `sources[]` on Cognito path; no client tenant override
- [ ] Dynamo `CONV#` history loads across browser sessions
- [ ] Cross-tenant negative test: tenant A cannot retrieve tenant B SOP chunks
- [ ] Compose LangChain/FAISS path remains green for Assessment Features 001/002

## Non-goals

- FAISS on ECS
- Replacing Compose rubric evidence with AWS-only path
- Bedrock Agents / AgentCore multi-agent orchestration
- Mutating tools (ingest/threshold) without confirm gates

## Primary paths

- `backend/src/handlers/agent.ts`, `backend/src/shared/kb-retrieve.ts`, `backend/src/shared/agent-tools.ts`
- `infra/terraform/modules/bedrock-kb/`
- `backend/knowledge/colorado-ops/`
- `frontend/src/app/pages/agent/`

## Demo evidence

[`../../evidence/014-cognito-rag-assistant.md`](../../evidence/014-cognito-rag-assistant.md)
