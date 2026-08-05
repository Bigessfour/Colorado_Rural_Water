# Water Saver — Spec-Kit Constitution (Assessment III pivot)

Product domain remains **Water Saver** (CRWA multi-tenant rural water tool). Assessment III constraints are **additive** — they do not replace [`docs/SPEC.md`](../../docs/SPEC.md) §0 Kelly / Pilot / vNext.

## Core Principles

### I. Rubric-Weighted Delivery (NON-NEGOTIABLE)

Ship in scoring order. Full-credit bonuses are in scope (not “vNext”).

| Weight | Area             | Definition of done                                                       |
| ------ | ---------------- | ------------------------------------------------------------------------ |
| 30%    | GitHub Actions   | Build, test, push images; secrets via GH/SM; Compose three-tier          |
| 25%    | LangChain + Mem0 | Chains, RAG (load/split/embed/store), Mem0 + session memory; tenant-safe |
| 20%    | Documentation    | Clone → secrets → up → demo; ≥2 architecture diagrams                    |
| 15%    | Integrations     | Bedrock → backend API → Angular UI; authenticated tenant                 |
| 10%    | Terraform        | Provision required cloud resources; remote state preferred               |

Bonus track: LangGraph, LangSmith, tool agent, destroy + conditional Actions, TF modules/remote state/env separation, browser system UI, setup/smoke scripts, evidence/.

### II. Domain & Isolation (NON-NEGOTIABLE)

- Multi-tenant isolation by `tenant_id` on every record and authorized request.
- Never put cross-tenant data in prompts, Mem0 keys, or LangChain memory.
- Mem0 / session keys MUST be derived server-side as `tenant_id:userId` from JWT — never trust client-supplied tenant.
- AWS account locked: `388691194728` / profile `codeplatoon` / `us-east-1` with required tag **`Assessment-iii`** ([`docs/AWS_ACCOUNT.md`](../../docs/AWS_ACCOUNT.md)).

### III. Stack Constraints

- Frontend: Angular 22+ + PrimeNG 22 (no React rewrite).
- Dual runtime: Compose three-tier (frontend + backend API + Postgres) for Assessment DoD; AWS Cognito + API Gateway + Lambda + DynamoDB + S3 + Bedrock for product path.
- Terraform under `infra/terraform`; extend modules — do not rewrite from zero.
- Prefer Bedrock + LangChain + Mem0. No Lex / Polly / Comprehend / Rekognition unless explicitly required later.
- No Kubernetes, multi-region, or Ansible for this assessment track.

### IV. Secrets Never in Source

- No API keys, AWS keys, Mem0/LangSmith tokens, or secret `.tfvars` in git.
- Runtime secrets: GitHub Actions Secrets/Variables and/or AWS Secrets Manager.
- Commit `.env.example` only.

### V. Spec-Driven Development

- Behavior for Assessment III lives under `specs/001`–`010` + [`specs/RUBRIC_COVERAGE.md`](../../specs/RUBRIC_COVERAGE.md).
- Product scope remains `docs/SPEC.md` §0.
- YAGNI: full-credit bonuses in-scope; fluff out of scope.

### VI. Observability & Evidence

- LangSmith tracing for LangChain/RAG when keys present.
- Evidence under `evidence/` (Actions runs, terraform outputs, LangSmith screenshots, destroy proof).
- Health `/health` + readiness `/ready` + `scripts/smoke.sh`.

### VII. Replicability

- Another person must reproduce from README + diagrams + listed commands.
- Helper scripts for env/secrets scaffolding and smoke tests.

## Governance

- This constitution overrides conflicting agent suggestions for Assessment III work.
- Amendments: update this file, note reason in PR / feature `plan.md`.
- Active feature path: `.specify/feature.json` → `feature_directory` (Spec Kit may overwrite; keep project metadata in `project.json` only).
- Assessment / AWS / completed features: `.specify/project.json`.

**Version:** 1.0.0 — Assessment III pivot (2026-08-03)
