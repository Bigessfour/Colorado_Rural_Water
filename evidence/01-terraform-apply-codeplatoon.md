# Terraform apply evidence — codeplatoon

**Date:** 2026-08-03
**Profile:** `codeplatoon` (account `388691194728`, region `us-east-1`)
**Action:** `terraform apply -var-file=environments/dev.tfvars -auto-approve`
**Result:** Apply complete — **92 resources** added.
**Tag check:** DynamoDB `water-saver-dev-data` has `Assessment-iii=true`.
**Health:** `GET https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com/health` → `status: ok`

| Output                | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| api_endpoint          | `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com` |
| cognito_user_pool_id  | `us-east-1_oZlKJ1y39`                                    |
| cognito_spa_client_id | `3lbh20n9383nhraaioaa5is5an`                             |
| uploads_bucket        | `water-saver-dev-uploads-388691194728`                   |
| assessment_tag        | `true`                                                   |
