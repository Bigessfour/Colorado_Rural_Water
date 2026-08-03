# Water Saver (working name)

CRWA-branded multi-tenant cloud tool for small rural water systems in Colorado.

Operators upload messy meter CSV/Excel files, see clear usage trends, and get practical alerts that help conserve water, catch leaks early, and protect customers from surprise high bills.

**Status:** MVP / proof-of-concept scaffolding
**Spec:** [docs/SPEC.md](docs/SPEC.md)
**Agent rules (non-negotiable):** [AGENTS.md](AGENTS.md) / [agent.md](agent.md)
**AWS account:** [docs/AWS_ACCOUNT.md](docs/AWS_ACCOUNT.md) (`570912405222` / `townofwiley`)
**Tickets:** [docs/TICKETS.md](docs/TICKETS.md) · [GitHub Issues](https://github.com/Bigessfour/Colorado_Rural_Water/issues)
**Tenant isolation:** [docs/TENANT_ISOLATION.md](docs/TENANT_ISOLATION.md)
**RAG:** [docs/codebase-rag.md](docs/codebase-rag.md)

Final product name to be chosen by Colorado Rural Water Association.

---

## Repo layout

```
docs/           Spec Kit + ticket backlog
frontend/       Angular + PrimeNG member & CRWA apps
backend/        Serverless API / ingestion / alert / AI handlers
infra/          Terraform (AWS multi-tenant)
sample-data/    Messy real-world-style fixtures for demos & tests
```

## Tech stack (MVP)

| Layer         | Choice                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| Frontend      | Angular **22+** + PrimeNG **22**                                               |
| Auth          | Amazon Cognito (email/password, optional MFA)                                  |
| API / compute | API Gateway + Lambda                                                           |
| Storage       | S3 (uploads / drop zone), tenant-scoped data store                             |
| AI            | Amazon Bedrock (explanations + conversational agent)                           |
| IaC           | Terraform                                                                      |
| Agent tooling | `crwa-rag` + Angular / PrimeNG / Terraform / AWS MCPs ([AGENTS.md](AGENTS.md)) |

Isolation key: every record and request is scoped by `tenant_id`.

## Quick start (local)

> Infra and Cognito are stubbed until Terraform modules are applied. Frontend and backend stubs are meant to grow into the first vertical slice.

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend (handlers)

```bash
cd backend
npm install
npm test   # when tests exist
```

### Infrastructure

```bash
cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars
# terraform init && terraform plan -var-file=environments/dev.tfvars
```

Use AWS profile intentionally (do not assume a single account). Confirm identity before any apply:

```bash
aws sts get-caller-identity --profile <profile>
```

## MVP vertical slice (first build target)

1. Cognito sign-in for a seeded tenant user
2. Upload a messy CSV from `sample-data/`
3. Map columns (or accept AI/heuristic suggestions)
4. See dashboard KPIs, trends, and prioritized alerts
5. Acknowledge an alert

Acceptance for Kelly Stone demo: [docs/SPEC.md §11](docs/SPEC.md).

## Security notes

- Never commit `.env`, `*.tfvars`, or secret material
- No cross-tenant data in AI prompts or APIs
- Destructive actions require multi-step explicit confirmation (see Spec §6)

## License / ownership

Built for Colorado Rural Water Association pilot discussion. Portfolio use is intended; production naming and pricing remain CRWA decisions.
