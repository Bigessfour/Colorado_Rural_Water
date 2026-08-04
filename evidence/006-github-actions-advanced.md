# Evidence — Feature 006 GitHub Actions Advanced

**Date:** 2026-08-04
**Status:** implementing → verify via PR Terraform plan (hard fail)

## What 006 proves (honest)

| Gate | Mechanism |
| --- | --- |
| Plan on PR | `.github/workflows/terraform.yml` job `plan` when `pull_request` |
| Apply on main only | job `apply` when `push` + `refs/heads/main` |
| Destroy (safe) | `destroy.yml` workflow_dispatch; default `dry_run=true` → `plan -destroy` |
| Python in pipeline | Already in Feature 005 `ci.yml` pytest job (no soft-fail) |
| Ansible | Skipped — Compose path |

## Fixes vs soft-green theater

- Removed all `continue-on-error` from terraform plan/apply steps
- `aws_profile` empty in `environments/ci.tfvars` so CI uses GH env credentials (not missing `codeplatoon` profile)
- Plan/apply/destroy bundle Lambdas first (zip hash required)
- Committed remote `backend.tf` for CI `terraform init`

## Not claimed until run links filled

- Green Terraform **plan** on this PR (fill URL after Actions)
- Destroy **dry-run** workflow_dispatch evidence line in `evidence/07-destroy.md`
