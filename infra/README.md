# Water Saver infrastructure (Terraform)

Multi-tenant AWS serverless foundation + Assessment III track.

**Account (locked):** `388691194728` · profile `codeplatoon` · region `us-east-1`
**Required tag:** `Assessment-iii=true` (provider `default_tags`)
Details: [docs/AWS_ACCOUNT.md](../docs/AWS_ACCOUNT.md)

## Modules

| Module     | Purpose                                                               |
| ---------- | --------------------------------------------------------------------- |
| `cognito`  | User pool, SPA client, groups, optional MFA                           |
| `storage`  | Private uploads bucket + DynamoDB single-table                        |
| `api`      | HTTP API + JWT authorizer + Lambdas (health/me/ingest/alerts/agent/…) |
| `security` | Secrets Manager stub for AI runtime keys (Mem0/LangSmith names)       |

## Live dev outputs (codeplatoon)

| Resource   | Name / URL                                                  |
| ---------- | ----------------------------------------------------------- |
| API        | `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com`    |
| Uploads    | `water-saver-dev-uploads-388691194728`                      |
| Data table | `water-saver-dev-data`                                      |
| Cognito    | `us-east-1_oZlKJ1y39` / client `3lbh20n9383nhraaioaa5is5an` |
| Tag        | `Assessment-iii=true`                                       |

## Apply flow

```bash
npm run backend:bundle

cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars
aws sts get-caller-identity --profile codeplatoon
terraform init
terraform workspace select dev || terraform workspace new dev
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Optional remote state: copy `backend.tf.example` → `backend.tf` after creating `water-saver-tf-state-388691194728`.

Guards: `allowed_account_ids` + `check "expected_account"` + `Assessment-iii` default tag.
