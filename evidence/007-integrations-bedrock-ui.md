# Evidence — Feature 007 Integrations (Bedrock + UI)

**Date:** 2026-08-04
**Status:** verified / closed (honest)
**Account:** `388691194728` · `us-east-1` · Compose + Bedrock Nova Lite
**Tenant proved:** `town-wiley` (Compose headers `X-Tenant-Id` / body `tenant_id`)

## What 007 proves

| Gate                   | Result                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Bedrock for product AI | Live Compose RAG — `ChatBedrock` / `LCEL prompt\|ChatBedrock\|StrOutputParser`                                   |
| Backend AI APIs        | `POST /api/rag` HTTP **200**; also wired: `GET/POST /agent`, `POST /alerts/explain`                              |
| Angular + PrimeNG UI   | Compose `/assistant` chat (send + onboarding) shows Bedrock answers                                              |
| Tenant scope           | Responses scoped to `town-wiley`; UI tag “Tenant-scoped”; no cross-tenant copy in replies                        |
| E2E UI → API → AI → UI | Chrome DevTools prove on `http://127.0.0.1:8080/assistant`                                                       |
| Failure modes          | UI surfaces RAG errors; Bedrock off/missing keys → templates / RAG fail loudly (smoke expects 200 when required) |

## Smoke (API)

```bash
# Host shell must export AWS keys into Compose (keys not committed):
eval "$(aws configure export-credentials --profile codeplatoon --format env)"
unset AWS_PROFILE
docker compose up -d --force-recreate backend
SMOKE_REQUIRE_RAG=1 SMOKE_FRONTEND_URL=http://127.0.0.1:8080 ./scripts/smoke.sh
# → smoke ok · HTTP 200 · tenant_id=town-wiley · ChatBedrock
```

## Browser prove

- Navigate `/assistant` (Compose demo — no Cognito)
- Send: “What is the difference between Watch and Actionable alerts for town-wiley?”
- Onboarding button: “Help me get started — what history do I need?”
- Visible Water Saver replies citing Watch / Actionable / onboarding history
- Screenshot: [`screenshots/007-assistant-compose.png`](screenshots/007-assistant-compose.png)

## Fix required for honest prove

Compose UI previously disabled chat unless Cognito `isLoggedIn()`, blocking Assessment Compose path even though `send()` already used `/api/rag`. Enabled via `canChat()` = `composeDemo \|\| isLoggedIn()` in:

- `frontend/src/app/pages/agent/agent-page.component.ts`
- `frontend/src/app/pages/agent/agent-page.component.html`

## Not claimed under 007

- Cognito JWT `/agent` live browser session (Compose path was the Assessment prove)
- `POST /alerts/explain` browser poke (needs Cognito SPA against live API — still unit-proven)
- Live Bedrock as default CI gate (opt-in `SMOKE_REQUIRE_RAG=1` only)
- PrimeUI license toast in Compose image (pre-existing; does not block chat)

## Rubric map

See [`specs/RUBRIC_COVERAGE.md`](../specs/RUBRIC_COVERAGE.md) §4 Integrations → Feature 007.
