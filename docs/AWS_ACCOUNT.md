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

| Resource     | Value                                                    |
| ------------ | -------------------------------------------------------- |
| Cognito pool | `us-east-1_oZlKJ1y39`                                    |
| SPA client   | `3lbh20n9383nhraaioaa5is5an`                             |
| Groups       | `operators`, `system_admins`, `crwa_admins`              |
| MFA          | per Cognito pool config                                  |
| HTTP API     | `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com` |
| Health       | `GET …/health` (public)                                  |
| Me           | `GET …/me` (JWT)                                         |
| Uploads      | `water-saver-dev-uploads-388691194728`                   |
| Data table   | `water-saver-dev-data`                                   |
| AI secret    | `water-saver-dev-ai-runtime`                             |

## MCP / CLI

- AWS profile `codeplatoon`, region `us-east-1`.
- Apply evidence: [`evidence/01-terraform-apply-codeplatoon.md`](../evidence/01-terraform-apply-codeplatoon.md).

## Historical note

An earlier personal-account (`townofwiley` / `570912405222`) stack was destroyed 2026-08-03. Do not re-apply there for this project. Teardown proof: [`evidence/07-destroy.md`](../evidence/07-destroy.md).
