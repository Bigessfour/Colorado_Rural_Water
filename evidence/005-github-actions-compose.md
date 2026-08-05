# Evidence — Feature 005 GitHub Actions + Compose CI

**Date:** 2026-08-03 (honest closeout 2026-08-04)
**Status:** verified / closed (scoped)
**Account:** `388691194728` (Compose core CI does **not** require Bedrock)

## What Feature 005 honestly proves

| Gate                                     | Proved                                      | Not proved (out of 005 / deferred)     |
| ---------------------------------------- | ------------------------------------------- | -------------------------------------- |
| Node unit tests on GH                    | Yes                                         | —                                      |
| Pytest RAG _isolation_ (no live Bedrock) | Yes                                         | Live Mem0/Bedrock answers in CI        |
| `docker compose build` on GH             | Yes                                         | Push images to ECR/registry            |
| Three-tier up + health                   | Yes — `/health`, `/ready`, frontend `:8080` | Operator Cognito SPA walkthrough       |
| Secrets not in git                       | Yes                                         | Terraform plan/apply (Feature **006**) |
| PR triggers CI                           | Yes                                         | Auto-deploy to AWS on merge            |

## Rubric → implementation

| Rubric item                      | Implementation                                                    | Proof                                           |
| -------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Build / test / images            | `.github/workflows/ci.yml` — node, pytest, compose **build**      | GH Actions CI on PR #11                         |
| Dockerfiles + Compose three-tier | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` | Compose job `--wait` + smoke                    |
| No hard-coded secrets            | `.env.example`, gitignored `.env`                                 | `scripts/gh-secrets-example.sh`                 |
| Secrets via GH / ASM             | GH secret _names_ present; ASM stub from Terraform                | Values never printed                            |
| Testing + health                 | `npm test`, pytest, hard `/health`+`/ready` (+ frontend)          | `scripts/smoke.sh` (RAG opt-in)                 |
| Minimal-manual release           | PR → CI; docs in README                                           | Path-filtered `pull_request` / `push` to `main` |

## Smoke contract (anti-flake)

Default CI/local smoke (**hard**):

1. Wait until `GET /health` → 200
2. Wait until `GET /ready` → `status=ready`
3. Optional `SMOKE_FRONTEND_URL` → 200
4. **Does not** call `/api/rag` (Bedrock missing → 500 would flake)

Opt-in live AI prove:

```bash
SMOKE_REQUIRE_RAG=1 ./scripts/smoke.sh   # expects HTTP 200; needs AWS in container
```

Local mirror of Actions:

```bash
npm run ci:local:fast    # tests + compose config
npm run ci:local         # + compose build/up/smoke
```

## Local three-tier (2026-08-03 / re-checked 2026-08-04)

| Service  | Status  | Port |
| -------- | ------- | ---- |
| Postgres | healthy | 5432 |
| Backend  | healthy | 3000 |
| Frontend | healthy | 8080 |

```bash
docker compose up -d --wait
SMOKE_FRONTEND_URL=http://127.0.0.1:8080 ./scripts/smoke.sh
# → smoke ok (RAG skipped)
```

## GitHub Actions

- Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- Honest green (post–harden + secret-safe Compose): https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865517129
  - backend node tests ✓ · pytest ✓ · docker compose build + health/ready/frontend smoke ✓
- Earlier mid-fix run was cancelled by force-push after GitGuardian remediation (not a product failure).

## Explicit non-claims

- **Terraform workflow “success” on PR #11 is not Feature 005 proof** — those jobs use `continue-on-error` and failed AWS profile/`codeplatoon` in logs. That is Feature **006** debt.
- **ECR image push** is not implemented; AC allows “build artifacts” via Compose build.
- **Live Bedrock in CI** is not a Feature 005 gate.
