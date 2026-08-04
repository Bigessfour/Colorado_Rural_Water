# IAM notes for Water Saver (Code Platoon)

**Current account:** `388691194728` · profile `codeplatoon` · region `us-east-1`
**Typical caller:** `arn:aws:iam::388691194728:user/Steve`

Terraform apply for Assessment III uses this profile. Resources are tagged `Assessment-iii=true` via provider `default_tags`.

## Least-privilege sketch (if splitting from Admin)

If the deploying user is ever narrowed from Administrator, grant at least Cognito, API Gateway, Lambda, IAM roles for Lambdas, DynamoDB, S3, Secrets Manager (AI stub), and Bedrock Invoke/Converse in `us-east-1` for Nova Lite / Titan embeddings used by the product.

Prefer attaching a managed policy to the CI/deploy principal rather than broadening root credentials. Never commit access keys.

## Historical

Earlier personal-account IAM notes for user `copilot` on `570912405222` are obsolete; that stack was destroyed. See [`AWS_ACCOUNT.md`](AWS_ACCOUNT.md) and [`evidence/07-destroy.md`](../evidence/07-destroy.md).
