# Feature 003: Terraform IaC Core

**Rubric:** 10% required
**Status:** CLOSED (verified 2026-08-03)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] Terraform provisions three-tier + AI path resources (API, DB/storage, IAM, Bedrock roles)
- [x] Proper state management + backend configuration (remote state preferred)
- [x] Clear variables, outputs, dependency ordering
- [x] Align with existing infra/terraform; extend rather than rewrite

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `infra/terraform/`
- `infra/README.md`

## Demo evidence

[`evidence/003-terraform-iac.md`](../../evidence/003-terraform-iac.md) · [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 003.

## Acceptance Criteria

- [x] Terraform provisions the resources needed to run the three-tier app + AI path (API/compute, database, storage, IAM, and any required AI-related roles/config).
- [x] `terraform init` + `terraform plan` succeed with documented var files / examples.
- [x] State backend is configured (local documented minimum; remote preferred).
- [x] Variables and outputs are defined for key values (endpoints, bucket names, DB connection hints, etc.).
- [x] Apply is documented; destroy path is documented (even if full destroy is in Feature 006).
- [x] No secrets committed in `.tf` / `.tfvars` checked into git.

## Notes

- Live stack already applied in account `388691194728`; `terraform plan` = no changes (2026-08-03).
- Remote S3 backend remains **optional** via `backend.tf.example` → Feature **004**.
