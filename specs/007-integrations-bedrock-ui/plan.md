# Plan — Feature 007: Integrations

**Status:** CLOSED 2026-08-04 — honest Compose Bedrock + `/assistant` prove.

## Context

Assessment III full-credit track layered on Water Saver. AWS account `388691194728` / `codeplatoon` / `us-east-1` (Assessment-iii tag required).

## Approach (as executed)

1. Gap-audit existing Bedrock / `/api/rag` / `/agent` / `/assistant` / alerts explain — no rebuild.
2. Live prove Compose with AWS credentials + `SMOKE_REQUIRE_RAG=1`.
3. Fix Compose UI auth gate blocking chat without Cognito.
4. Evidence + Spec-Kit closeout; Cognito `/agent` and alerts Explain left as secondary (wired, not re-proven in browser this closeout).

## Technical notes

- Frontend: Angular 22 + PrimeNG
- AI: Bedrock + LangChain + Mem0 (tenant-keyed)
- IaC: `infra/terraform`
- Compose: frontend + backend + Postgres

## Dependencies

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) and constitution `.specify/memory/constitution.md`.
