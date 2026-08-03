# Water Saver infrastructure (Terraform)

Multi-tenant AWS serverless foundation.

**Account (locked):** `570912405222` · profile `townofwiley` · region `us-east-2`
Details: [docs/AWS_ACCOUNT.md](../docs/AWS_ACCOUNT.md)

## Modules (planned)

| Module          | Purpose                                                               |
| --------------- | --------------------------------------------------------------------- |
| `cognito`       | User pool, app client, groups, optional MFA                           |
| `api`           | HTTP API Gateway + JWT authorizer + Lambda routes                     |
| `storage`       | Per-env upload bucket, drop prefixes `tenants/{id}/uploads/`          |
| `data`          | Tenant-scoped reading/alert store (DynamoDB or Aurora — decide in A4) |
| `ai`            | Bedrock access + least-privilege IAM for agent Lambdas                |
| `observability` | Log groups, alarms, basic dashboards                                  |

## Environments

```bash
cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars

aws sts get-caller-identity --profile townofwiley
# expect Account: 570912405222

terraform init
terraform plan -var-file=environments/dev.tfvars
```

Do **not** apply until Cognito + naming + tags are reviewed (tickets A3+). Plan is safe.

Guards: `allowed_account_ids` on the provider + `check "expected_account"` in `checks.tf`.
