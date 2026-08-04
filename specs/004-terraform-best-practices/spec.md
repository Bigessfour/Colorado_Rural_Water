# Feature 004: Terraform Best-Practice Bonuses

**Rubric:** 10% bonuses
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] Modules (existing cognito/storage/api + security as needed)
- [ ] Workspace or clean environment separation (dev at minimum)
- [ ] Remote state + locking
- [ ] Outputs consumable by CI/CD and docs
- [ ] No secrets in git; variables + Secrets Manager / GH secrets patterns

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `infra/terraform/backend.tf`
- `infra/terraform/modules/`
- `infra/terraform/environments/`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 004.

## Acceptance Criteria

- [ ] Resources are organized into modules (e.g. networking, compute/API, database, storage, security) rather than one flat file only.
- [ ] Environment separation exists (at least `dev` via workspace, tfvars, or equivalent).
- [ ] Remote state is configured with locking (e.g. S3 + DynamoDB) where account policy allows.
- [ ] Outputs are consumable by CI/docs (URLs, ARNs, bucket names).
- [ ] Dependencies are explicit and plan shows a sensible create order.
- [ ] README/infra docs describe module layout and how to apply per environment.
