# Plan — Feature 006: GitHub Actions Advanced Bonuses

**Status:** implementing — remove soft-fail; CI uses env AWS keys + `environments/ci.tfvars.example`.

## Context

Assessment III full-credit track layered on Water Saver. AWS account `388691194728` / `codeplatoon` / `us-east-1` (Assessment-iii tag required).

## Approach

1. Conditional Terraform: plan on PR / dispatch; apply only on `main`.
2. Destroy via workflow_dispatch with `confirm=destroy` and default `dry_run=true`.
3. Never `continue-on-error` on plan/apply/destroy auth or terraform steps.
4. Empty `aws_profile` in CI tfvars so GH secrets drive the credential chain.

## Approach

1. Keep Kelly vertical slice (Cognito, upload, dashboard, alerts, tenant isolation).
2. Deliver this feature's acceptance criteria without breaking dual-runtime (Compose + AWS serverless).
3. Port patterns from `aico-assessment-iii` where they fit; never port Code Platoon account wiring.

## Technical notes

- Frontend: Angular 22 + PrimeNG
- AI: Bedrock + LangChain + Mem0 (tenant-keyed)
- IaC: `infra/terraform`
- Compose: frontend + backend + Postgres

## Dependencies

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) and constitution `.specify/memory/constitution.md`.
