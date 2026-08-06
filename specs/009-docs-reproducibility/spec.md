# Feature 009: Documentation & Reproducibility

**Rubric:** 20% required
**Status:** CLOSED (verified — see RUBRIC_COVERAGE.md)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] README + setup docs so another person can reproduce the full flow
- [x] At least two architecture / component / data-flow diagrams
- [x] All deliverables visible in the GitHub repo
- [x] Code comments where non-obvious (IAM, tenant isolation, RAG, Actions secrets)
- [x] Presentation readiness: talk-track mapping rubric lines to live demo steps

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `README.md`
- `docs/diagrams/`
- `PRESENTATION_NOTES.md`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 009.

## Acceptance Criteria

- [x] README (or linked docs) lists setup steps another person can follow: secrets, Compose, Terraform, Actions, AI keys.
- [x] At least **two** diagrams exist in-repo (architecture, CI/CD flow, data/RAG flow, or DB schema).
- [x] All assessment deliverables are in the GitHub repo (workflows, Docker files, Terraform, scripts, diagrams).
- [x] Non-obvious code (IAM, tenant isolation, RAG ingest, Actions secrets mapping) has brief comments or doc pointers.
- [x] Presentation talk-track exists (short markdown or notes) mapping rubric lines → demo steps.
- [x] A peer can reproduce the core happy path from docs alone.
