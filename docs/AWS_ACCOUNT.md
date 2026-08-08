# Water Saver — AWS account lock

| Field                 | Value                                                  |
| --------------------- | ------------------------------------------------------ |
| Account ID            | `388691194728`                                         |
| CLI profile           | `codeplatoon`                                          |
| Default region        | `us-east-1`                                            |
| Required resource tag | `Assessment-iii` = `true` (also `Project=water-saver`) |
| Verified caller       | `arn:aws:iam::388691194728:user/Steve`                 |

## Rules

- Always confirm identity before mutate:

```bash
aws sts get-caller-identity --profile codeplatoon
# expect Account: 388691194728
```

- Terraform refuses other accounts via `allowed_account_ids` and a `check` block (`infra/terraform`).
- Use **only** profile `codeplatoon` for this repo. Never commit `*.tfvars` with secrets; `dev.tfvars.example` is the template.
- Every Terraform-managed resource must carry tag **`Assessment-iii`** (enforced via provider `default_tags`).

## Live stack (dev)

> **Re-applied 2026-08-06** after destroy prove. Old CloudFront `duqk1pqvmrsuh` / API `tz6rqlus7b` are dead.

| Resource     | Value                                                    |
| ------------ | -------------------------------------------------------- |
| Cognito pool | `us-east-1_eeMuYPlMK`                                    |
| SPA client   | `1a4ao09ljbohofa0377sm82alu`                             |
| Groups       | `operators`, `system_admins`, `crwa_admins`              |
| MFA          | per Cognito pool config                                  |
| HTTP API     | `https://uqujnhmk31.execute-api.us-east-1.amazonaws.com` |
| SPA (CDN)    | `https://d13u7fsvytjwxn.cloudfront.net`                  |
| API Gateway  | `https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com` |
| CF dist ID   | `E3QK223UFP4LZE`                                         |
| Health       | `GET …/health` (public)                                  |
| Me           | `GET …/me` (JWT)                                         |
| Uploads      | `water-saver-dev-uploads-388691194728`                   |
| SPA bucket   | `water-saver-dev-spa-388691194728`                       |
| Data table   | `water-saver-dev-data`                                   |
| AI secret    | `water-saver-dev-ai-runtime`                             |
| Review SES   | `REVIEW_NOTIFY_TO` / `REVIEW_FROM_EMAIL` → Steve Gmail (sandbox-verified) |

## MCP / CLI

- AWS profile `codeplatoon`, region `us-east-1`.
- Apply evidence: [`evidence/01-terraform-apply-codeplatoon.md`](../evidence/01-terraform-apply-codeplatoon.md).

## Historical note

An earlier personal-account (`townofwiley` / `570912405222`) stack was destroyed 2026-08-03. Do not re-apply there for this project. Teardown proof: [`evidence/07-destroy.md`](../evidence/07-destroy.md).
