# Plan — Feature 004: Terraform Best-Practice Bonuses

**Status:** CLOSED (verified 2026-08-03) — see `evidence/004-terraform-best-practices.md`.

## Context

Assessment III full-credit track layered on Water Saver. AWS account `388691194728` / `codeplatoon` / `us-east-1` (Assessment-iii tag required).

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
