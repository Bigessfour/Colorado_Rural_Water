# Feature 005: GitHub Actions CI/CD Core

**Rubric:** 30% required
**Status:** CLOSED (honest verify 2026-08-04 — CI run https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865517129)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## Honest scope

**In:** PR/main CI that builds Compose images, runs Node + pytest, brings up fe/be/db, hard-checks `/health` + `/ready` (+ frontend), keeps secrets out of git.

**Out (do not claim under 005):** ECR push, live Bedrock/Mem0 in Actions, Terraform plan/apply (Feature **006**).

## Secrets note

GH secret *names* present: `AWS_*`, `MEM0_*`, `LANGCHAIN_*`, `LANGSMITH_*`. Checklist: `scripts/gh-secrets-example.sh`. Compose CI forwards them optionally; default smoke does **not** require Bedrock.

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] Workflows that build, test, and push/build container images *(build artifacts via Compose — no ECR push)*
- [x] Dockerfiles + Docker Compose for three-tier stack (frontend, backend API, database)
- [x] No hard-coded secrets/keys in application code
- [x] Secrets via GitHub Actions secrets and/or AWS Secrets Manager
- [x] Jobs/steps for testing, logging, and health/readiness checks
- [x] Ability to release with minimal manual intervention (main/PR flows)

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React
- Guaranteeing live Bedrock answers inside CI runners

## Primary paths

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `.github/workflows/ci.yml`
- `scripts/smoke.sh` / `scripts/ci-local.sh`

## Demo evidence

[`evidence/005-github-actions-compose.md`](../../evidence/005-github-actions-compose.md) · [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md)

## Acceptance Criteria

- [x] Dockerfiles exist for frontend and backend (and DB is handled via Compose image or equivalent).
- [x] `docker-compose.yml` (or prod compose) brings up a three-tier stack: frontend + backend API + database.
- [x] GitHub Actions workflow builds images/artifacts on PR (and main path filters).
- [x] Secrets/keys are not hard-coded in app code; GH Actions secrets and/or AWS Secrets Manager are used.
- [x] Workflow includes test steps (Node + pytest) and logging.
- [x] Health/readiness endpoints are hard-gated (`/health`, `/ready`; frontend URL in compose job).
- [x] A teammate can run `npm run ci:local:fast` / open a PR and get CI without secret values in git.
