# Feature 010: Docs & Ops Bonuses

**Rubric:** 20% bonuses
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] Shell scripts for env/secrets scaffolding, smoke tests, common setup
- [ ] Early-presentation readiness checklist + evidence folder
- [ ] Smoke / prove scripts hitting health, API, and one AI path
- [ ] Evidence artifacts under evidence/

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `scripts/setup-env.sh`
- `scripts/smoke.sh`
- `scripts/gh-secrets-example.sh`
- `evidence/`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 010.

## Acceptance Criteria

- [ ] Shell script(s) exist for env/secrets scaffolding and/or common setup.
- [ ] Smoke script hits health + at least one API + one AI path and exits non-zero on failure.
- [ ] `evidence/` (or equivalent) holds artifacts: Terraform plan snippet, Actions run link/screenshot, LangSmith trace proof, destroy proof.
- [ ] Early-presentation checklist exists and is checked off before the 1-on-1.
- [ ] Scripts are referenced from the main README (not orphaned).
