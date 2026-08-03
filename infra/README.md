# Water Saver infrastructure (Terraform)

Multi-tenant AWS serverless foundation.

**Account (locked):** `570912405222` · profile `townofwiley` · region `us-east-2`
Details: [docs/AWS_ACCOUNT.md](../docs/AWS_ACCOUNT.md)

## Modules

| Module    | Purpose                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `cognito` | User pool, SPA client, groups, optional MFA                               |
| `storage` | Private uploads bucket + DynamoDB single-table (`LOC#` / `RDG#` / `MAP#`) |
| `api`     | HTTP API + JWT authorizer + health/me/presign/ingest + S3→ingest          |

## Live dev outputs (typical)

| Resource   | Name / URL                                               |
| ---------- | -------------------------------------------------------- |
| API        | `https://14jxov7h72.execute-api.us-east-2.amazonaws.com` |
| Uploads    | `water-saver-dev-uploads-570912405222`                   |
| Data table | `water-saver-dev-data`                                   |
| Ingest     | `POST /ingest` (JWT)                                     |
| Presign    | `POST /uploads/presign` (JWT)                            |

## Apply flow

```bash
# from repo root — rebuild Lambda zip first
npm run backend:bundle

cd infra/terraform
aws sts get-caller-identity --profile townofwiley
terraform init
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Guards: `allowed_account_ids` on the provider + `check "expected_account"` in `checks.tf`.
