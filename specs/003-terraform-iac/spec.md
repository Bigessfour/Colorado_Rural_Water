# Feature 003: Terraform IaC Core

**Rubric:** 10% required
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] Terraform provisions three-tier + AI path resources (API, DB/storage, IAM, Bedrock roles)
- [ ] Proper state management + backend configuration (remote state preferred)
- [ ] Clear variables, outputs, dependency ordering
- [ ] Align with existing infra/terraform; extend rather than rewrite

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `infra/terraform/`
- `infra/README.md`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 003.

## Acceptance Criteria

- [ ] Terraform provisions the resources needed to run the three-tier app + AI path (API/compute, database, storage, IAM, and any required AI-related roles/config).
- [ ] `terraform init` + `terraform plan` succeed with documented var files / examples.
- [ ] State backend is configured (local documented minimum; remote preferred).
- [ ] Variables and outputs are defined for key values (endpoints, bucket names, DB connection hints, etc.).
- [ ] Apply is documented; destroy path is documented (even if full destroy is in Feature 006).
- [ ] No secrets committed in `.tf` / `.tfvars` checked into git.
