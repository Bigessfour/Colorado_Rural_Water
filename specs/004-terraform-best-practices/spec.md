# Feature 004: Terraform Best-Practice Bonuses

**Rubric:** 10% bonuses
**Status:** CLOSED (verified 2026-08-03)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] Modules (existing cognito/storage/api + security as needed)
- [x] Workspace or clean environment separation (dev at minimum)
- [x] Remote state + locking
- [x] Outputs consumable by CI/CD and docs
- [x] No secrets in git; variables + Secrets Manager / GH secrets patterns

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `infra/terraform/backend.tf`
- `infra/terraform/modules/`
- `infra/terraform/environments/`

## Demo evidence

[`evidence/004-terraform-best-practices.md`](../../evidence/004-terraform-best-practices.md) · [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 004.

## Acceptance Criteria

- [x] Resources are organized into modules (e.g. networking, compute/API, database, storage, security) rather than one flat file only.
- [x] Environment separation exists (at least `dev` via workspace, tfvars, or equivalent).
- [x] Remote state is configured with locking (e.g. S3 + DynamoDB) where account policy allows.
- [x] Outputs are consumable by CI/docs (URLs, ARNs, bucket names).
- [x] Dependencies are explicit and plan shows a sensible create order.
- [x] README/infra docs describe module layout and how to apply per environment.

## Notes

- Locking uses Terraform S3 native `use_lockfile` (no DynamoDB lock table required on TF 1.10+).
- Workspace **`dev`** is authoritative; do not apply from `default`.
