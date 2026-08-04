# Evidence — Feature 003 Terraform IaC Core

**Date:** 2026-08-03
**Account:** `388691194728` / `codeplatoon` / `us-east-1`
**Status:** verified / closed
**Tag:** `Assessment-iii=true` (provider `default_tags`)

## Rubric → implementation map

| Rubric item                       | Implementation                                                               | Proof                                      |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| Three-tier + AI path resources    | Modules `cognito`, `storage`, `api`, `security`; Bedrock IAM on API Lambda   | Live outputs + `terraform plan` no changes |
| State management + backend config | Local state in use; remote S3 backend documented in `backend.tf.example`     | Example + README apply flow                |
| Variables, outputs, dependencies  | Root `variables.tf` / `outputs.tf`; modules wired in `cognito.tf` + `api.tf` | Plan refresh + output list below           |
| Extend existing infra             | Kelly slice extended (not rewrite)                                           | `infra/terraform/` layout                  |
| No secrets in git                 | `*.tfvars` gitignored; only `*.tfvars.example` committed                     | `.gitignore`                               |

## Prove commands (2026-08-03)

```bash
aws sts get-caller-identity --profile codeplatoon
# Account 388691194728 · user/Steve

cd infra/terraform
terraform init -backend=false   # plugins already present
terraform validate              # Success
terraform plan -var-file=environments/dev.tfvars -input=false
# → No changes. Your infrastructure matches the configuration.
```

## Live outputs (sanitized)

| Key                      | Value                                                        |
| ------------------------ | ------------------------------------------------------------ |
| `api_endpoint`           | `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com`     |
| `uploads_bucket`         | `water-saver-dev-uploads-388691194728`                       |
| `data_table`             | `water-saver-dev-data`                                       |
| `cognito_user_pool_id`   | `us-east-1_oZlKJ1y39`                                        |
| `cognito_spa_client_id`  | `3lbh20n9383nhraaioaa5is5an`                                 |
| `ai_runtime_secret_name` | `water-saver-dev-ai-runtime` (stub; values via CLI, not git) |
| `aws_account_id`         | `388691194728`                                               |
| `aws_region`             | `us-east-1`                                                  |

## Destroy path

Documented in [`infra/README.md`](../infra/README.md) (local `terraform destroy`) and Feature 006 workflow [`.github/workflows/destroy.yml`](../.github/workflows/destroy.yml).

## Follow-ons

- Remote state + workspace `dev` — **closed under Feature 004** (`evidence/004-terraform-best-practices.md`).
- CI AWS keys `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` as GitHub secrets — Feature **005** (see reminder in that spec).
