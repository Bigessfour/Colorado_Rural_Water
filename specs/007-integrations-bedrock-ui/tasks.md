# Tasks — Feature 007: Integrations

## Implementation checklist

- [x] T007-01: AWS Bedrock for AI-powered functionality used by the product
- [x] T007-02: Backend API endpoints expose AI / RAG / agent capabilities
- [x] T007-03: Angular + PrimeNG UI for operator interaction (chat, explain alert, map columns)
- [x] T007-04: Everything scoped by authenticated tenant

- [x] T007-EV: Record evidence path in RUBRIC_COVERAGE.md
- [x] T007-DOC: Update README / quickstart if operator-facing

## Prove notes

- Compose chat gate fixed (`canChat` for `composeDemo`) so Assessment UI can call `/api/rag` without Cognito.
- Live prove: `SMOKE_REQUIRE_RAG=1` + Chrome `/assistant` (tenant `town-wiley`).
