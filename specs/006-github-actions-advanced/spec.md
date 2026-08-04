# Feature 006: GitHub Actions Advanced Bonuses

**Rubric:** 30% bonuses
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] Conditional workflows/jobs (plan on PR, apply/deploy on main)
- [ ] Explicit destroy workflow (workflow_dispatch) that tears down assessment resources safely
- [ ] Python unit tests integrated into the pipeline
- [ ] Ansible skipped (lightweight Compose path preferred)

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `.github/workflows/terraform.yml`
- `.github/workflows/destroy.yml`
- `.github/workflows/ci.yml`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 006.

## Acceptance Criteria

- [ ] PR workflow differs from main (e.g. plan/test on PR; deploy on main) via conditions or separate workflows.
- [ ] A **destroy** workflow exists (`workflow_dispatch` or equivalent) and is documented; it tears down assessment resources safely.
- [ ] Unit tests (Python and/or backend/frontend tests) run in CI and fail the job on failure.
- [ ] Optional extra tooling (Ansible, etc.) is only present if documented and does not block the core pipeline.
- [ ] Evidence includes at least one green CI run and one destroy (or dry-run destroy) record.
