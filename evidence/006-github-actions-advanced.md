# Evidence — Feature 006 GitHub Actions Advanced

**Date:** 2026-08-04
**Status:** verified / closed (honest)
**Account:** `388691194728` · profile keys via GH secrets · region `us-east-1`

## What 006 proves (honest)

| Gate                   | Mechanism                                               | Proof                                                                                            |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Plan on PR (hard fail) | `.github/workflows/terraform.yml` job `plan`            | [run 30865855551](https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865855551) ✓ |
| Apply on main only     | job `apply` when `push` + `refs/heads/main`             | Wired; not run until merge (intentional)                                                         |
| Destroy (safe)         | `destroy.yml` workflow_dispatch; default `dry_run=true` | File on PR; same command proved locally (see below)                                              |
| Python in pipeline     | Feature 005 `ci.yml` pytest                             | Already green under 005                                                                          |
| Ansible                | Skipped — Compose path                                  | N/A                                                                                              |

## Fixes vs soft-green theater

- Removed all `continue-on-error` from terraform plan/apply
- Refreshed empty/invalid GH `AWS_*` secrets from `codeplatoon` profile
- `aws_profile=""` in `environments/ci.tfvars.example` so CI uses env credentials
- Bundle step installs **backend** deps (`npm --prefix backend ci`) before zip
- Committed remote `backend.tf` for CI `terraform init`

## Green Terraform plan (Actions)

- URL: https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865855551
- Branch: `feature/001-langchain-mem0-rag` / PR #11
- Steps: configure AWS → bundle Lambdas → fmt → init → validate → plan ✓

## Destroy dry-run

GitHub only discovers `workflow_dispatch` workflows on the **default branch**, so Actions destroy cannot run until `destroy.yml` lands on `main`.

Equivalent command (same as workflow `dry_run=true` step), local 2026-08-04:

```text
AWS_PROFILE=codeplatoon terraform plan -destroy \
  -var-file=environments/ci.tfvars.example -no-color -input=false
# Plan: 0 to add, 0 to change, 92 to destroy.
```

See also [`evidence/07-destroy.md`](07-destroy.md).

## Not claimed (superseded 2026-08-06)

~~Real `terraform destroy` / stack teardown~~ — **done** 2026-08-06 (`CONFIRM=destroy ./scripts/terraform-destroy.sh --destroy` → 124 destroyed; residual scan PASS). See [`evidence/07-destroy.md`](07-destroy.md).
