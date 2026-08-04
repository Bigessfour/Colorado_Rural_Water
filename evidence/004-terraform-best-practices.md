# Evidence — Feature 004 Terraform Best-Practice Bonuses

**Date:** 2026-08-03
**Account:** `388691194728` / `codeplatoon` / `us-east-1`
**Status:** verified / closed
**Tag:** `Assessment-iii=true`

## Rubric → implementation map

| Rubric item                    | Implementation                                                        | Proof                                |
| ------------------------------ | --------------------------------------------------------------------- | ------------------------------------ |
| Modules                        | `cognito`, `storage`, `api`, `security`                               | `infra/terraform/modules/`           |
| Environment separation (`dev`) | Workspace **`dev`** + `environments/dev.tfvars(.example)`             | `terraform workspace list` → `* dev` |
| Remote state + locking         | S3 backend `water-saver-tf-state-388691194728`, `use_lockfile = true` | Migrated state; plan no-diff         |
| Outputs for CI/docs            | API URL, buckets, Cognito IDs, AI secret name/ARN                     | 27 outputs; README table             |
| No secrets in git              | `*.tfvars` gitignored; Secrets Manager stub; GH secrets pattern       | `.gitignore`, `security` module      |

## Prove (2026-08-03)

```bash
# State bucket bootstrapped (versioning, SSE-S3, public access block, Assessment-iii tag)
aws s3api head-bucket --bucket water-saver-tf-state-388691194728 --profile codeplatoon

cd infra/terraform
export AWS_PROFILE=codeplatoon
terraform init -migrate-state -force-copy   # local → S3
# State moved into workspace `dev` (CI-aligned)
terraform workspace select dev
terraform plan -var-file=environments/dev.tfvars -input=false
# → No changes. Your infrastructure matches the configuration.

aws s3 ls s3://water-saver-tf-state-388691194728/ --recursive
# env:/dev/water-saver/terraform.tfstate
```

## Notes

- `backend.tf` is committed **without** `profile` so GitHub Actions env credentials work; local uses `AWS_PROFILE=codeplatoon`.
- Default workspace remote state emptied after copy to `dev` (avoid dual ownership).
- Feature 003 closed first; this feature owns remote/locking/module polish.
