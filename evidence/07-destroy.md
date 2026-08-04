# Destroy evidence — townofwiley teardown

**Date:** 2026-08-03  
**Profile:** `townofwiley` (account `570912405222`)  
**Action:** `terraform destroy -var-file=environments/dev.tfvars -auto-approve`  
**Result:** Destroy complete — **92 resources** destroyed (API Gateway, Lambdas, Cognito, DynamoDB, S3, IAM).  
**State:** empty (`terraform state list` → 0).

Assessment III work continues on **codeplatoon** account `388691194728` / region `us-east-1` with required tag `Assessment-iii`.
