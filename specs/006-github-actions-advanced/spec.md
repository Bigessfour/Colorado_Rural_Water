# Feature 006: GitHub Actions Advanced Bonuses

**Rubric:** 30% bonuses
**Status:** implementing (honest hard-fail workflows 2026-08-04)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] Conditional workflows/jobs (plan on PR, apply/deploy on main) — wired; prove green plan on PR
- [x] Explicit destroy workflow (workflow_dispatch) that tears down assessment resources safely — dry_run default
- [x] Python unit tests integrated into the pipeline — via Feature 005 `ci.yml` pytest
- [x] Ansible skipped (lightweight Compose path preferred)

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React
- Soft-passing Terraform with `continue-on-error`

## Primary paths

- `.github/workflows/terraform.yml`
- `.github/workflows/destroy.yml`
- `.github/workflows/ci.yml` (pytest)

## Demo evidence

[`evidence/006-github-actions-advanced.md`](../../evidence/006-github-actions-advanced.md)

## Acceptance Criteria

- [x] PR workflow differs from main (plan on PR; apply on main) via conditions.
- [x] A **destroy** workflow exists (`workflow_dispatch`) with confirm + dry_run; documented.
- [x] Unit tests (Python) run in CI and fail the job on failure.
- [x] Ansible skipped / not blocking.
- [ ] Evidence includes at least one green Terraform plan CI run and one destroy dry-run record.
