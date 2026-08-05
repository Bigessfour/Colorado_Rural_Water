# Water Saver infrastructure (Terraform)

Multi-tenant AWS serverless foundation + Assessment III track.

**Account (locked):** `388691194728` · profile `codeplatoon` · region `us-east-1`
**Required tag:** `Assessment-iii=true` (provider `default_tags`)
Details: [docs/AWS_ACCOUNT.md](../docs/AWS_ACCOUNT.md)

## Modules

| Module       | Purpose                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `cognito`    | User pool, SPA client, groups, optional MFA                                                     |
| `storage`    | Private uploads bucket + DynamoDB single-table                                                  |
| `api`        | HTTP API + JWT authorizer + Lambdas; Bedrock Nova Lite/Micro (FM + US inference profiles)       |
| `bedrock-kb` | Feature 014: knowledge S3 + S3 Vectors + Bedrock KB + Lambda Retrieve IAM (`enable_bedrock_kb`) |
| `spa`        | Private S3 + CloudFront (OAC) for Angular SPA                                                   |
| `security`   | Secrets Manager stub for AI runtime keys (Mem0/LangSmith names)                                 |

## Remote state (Feature 004)

| Item        | Value                                                    |
| ----------- | -------------------------------------------------------- |
| Backend     | S3 `water-saver-tf-state-388691194728`                   |
| Key         | `water-saver/terraform.tfstate` (+ `env:/dev/…`)         |
| Locking     | Native S3 lockfile (`use_lockfile = true`)               |
| Workspace   | **`dev`** (CI + local)                                   |
| Config file | Committed [`terraform/backend.tf`](terraform/backend.tf) |

Local auth for backend + provider:

```bash
export AWS_PROFILE=codeplatoon
```

CI uses GH secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (no `profile` in `backend.tf`).

State bucket is **bootstrap-only** (outside this root module). Re-create steps: comments in `backend.tf.example`.

## Live dev outputs (codeplatoon)

| Resource   | Name / URL                                                         |
| ---------- | ------------------------------------------------------------------ |
| API        | `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com`           |
| SPA        | `https://duqk1pqvmrsuh.cloudfront.net` (`./scripts/deploy-spa.sh`) |
| Uploads    | `water-saver-dev-uploads-388691194728`                             |
| Data table | `water-saver-dev-data`                                             |
| Cognito    | `us-east-1_oZlKJ1y39` / client `3lbh20n9383nhraaioaa5is5an`        |
| AI secret  | `water-saver-dev-ai-runtime` (stub; put values via CLI)            |
| Tag        | `Assessment-iii=true`                                              |

## Apply flow

```bash
# Always run Terraform from infra/terraform (not the monorepo root).
npm run backend:bundle

cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars   # gitignored; set aws_profile=codeplatoon
export AWS_PROFILE=codeplatoon
aws sts get-caller-identity
# Feature 014 uses S3 Vectors (no AOSS / pip bootstrap)
terraform init
terraform workspace select dev || terraform workspace new dev
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

CI uses `environments/ci.tfvars.example` (`aws_profile=""`) with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from GitHub secrets.

## Destroy

Local teardown (same account/profile guards as apply):

```bash
cd infra/terraform
export AWS_PROFILE=codeplatoon
terraform workspace select dev
terraform plan -destroy -var-file=environments/dev.tfvars
terraform destroy -var-file=environments/dev.tfvars
```

CI teardown (Feature 006): workflow_dispatch on [`.github/workflows/destroy.yml`](../.github/workflows/destroy.yml) with `confirm=destroy`. Requires GH secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (Feature 005).

Guards: `allowed_account_ids` + `check "expected_account"` + `Assessment-iii` default tag.

## Secrets

- Never commit `*.tfvars` with secrets (gitignored). Use `*.tfvars.example` only.
- AI keys: Secrets Manager stub `water-saver-dev-ai-runtime` + GH secrets (`scripts/gh-secrets-example.sh`).
