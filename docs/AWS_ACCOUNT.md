# Water Saver — AWS account lock

| Field                 | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| Account ID            | `570912405222`                                                 |
| CLI profile           | `townofwiley`                                                  |
| Default region        | `us-east-2`                                                    |
| Verified caller (dev) | `arn:aws:iam::570912405222:user/copilot` (Administrator group) |

## Rules

- Always confirm identity before mutate:

```bash
aws sts get-caller-identity --profile townofwiley
```

- Terraform refuses other accounts via `allowed_account_ids` and a `check` block (`infra/terraform`).
- Do **not** use `codeplatoon` (388691194728) or other profiles for this project.
- Never commit `*.tfvars` with secrets; `dev.tfvars.example` is the template.

## Live stack (dev)

| Resource     | Value                                                           |
| ------------ | --------------------------------------------------------------- |
| Cognito pool | `us-east-2_oHpsTZZAN`                                           |
| SPA client   | `5fd9gii0m2aaibpn1j261pmfo9`                                    |
| MFA          | `OPTIONAL` + software token                                     |
| Groups       | `operators`, `system_admins`, `crwa_admins` (Terraform-managed) |
| HTTP API     | `https://14jxov7h72.execute-api.us-east-2.amazonaws.com`        |
| Health       | `GET …/health` (public)                                         |
| Me           | `GET …/me` (JWT)                                                |

## MCP

- AWS profile `townofwiley`, region `us-east-2`.
- Optional IAM notes: [IAM_COPILOT_WATER_SAVER.md](IAM_COPILOT_WATER_SAVER.md) (largely superseded now that `copilot` is in Administrator).
