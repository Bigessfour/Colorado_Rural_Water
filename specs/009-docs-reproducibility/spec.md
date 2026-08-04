# Feature 009: Documentation & Reproducibility

**Rubric:** 20% required
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] README + setup docs so another person can reproduce the full flow
- [ ] At least two architecture / component / data-flow diagrams
- [ ] All deliverables visible in the GitHub repo
- [ ] Code comments where non-obvious (IAM, tenant isolation, RAG, Actions secrets)
- [ ] Presentation readiness: talk-track mapping rubric lines to live demo steps

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

- [ ] README (or linked docs) lists setup steps another person can follow: secrets, Compose, Terraform, Actions, AI keys.
- [ ] At least **two** diagrams exist in-repo (architecture, CI/CD flow, data/RAG flow, or DB schema).
- [ ] All assessment deliverables are in the GitHub repo (workflows, Docker files, Terraform, scripts, diagrams).
- [ ] Non-obvious code (IAM, tenant isolation, RAG ingest, Actions secrets mapping) has brief comments or doc pointers.
- [ ] Presentation talk-track exists (short markdown or notes) mapping rubric lines → demo steps.
- [ ] A peer can reproduce the core happy path from docs alone.
