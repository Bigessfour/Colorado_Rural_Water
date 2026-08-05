# Water Saver (working name)

CRWA-branded multi-tenant cloud tool for small rural water systems in Colorado.

Operators upload messy meter CSV/Excel files, see clear usage trends, and get practical alerts that help conserve water, catch leaks early, and protect customers from surprise high bills.

**Status:** MVP + Assessment III full-credit track (Compose / Actions / LangChain+Mem0)
**Spec:** [docs/SPEC.md](docs/SPEC.md) · Assessment Spec-Kit: [specs/RUBRIC_COVERAGE.md](specs/RUBRIC_COVERAGE.md)
**Agent rules (non-negotiable):** [AGENTS.md](AGENTS.md) / [agent.md](agent.md)
**Spec Kit (SDD):** [docs/spec-kit.md](docs/spec-kit.md) · workspace: [docs/spec-kit-workspace.md](docs/spec-kit-workspace.md)
**AWS account:** [docs/AWS_ACCOUNT.md](docs/AWS_ACCOUNT.md) (`388691194728` / `codeplatoon` / `us-east-1`, tag `Assessment-iii`)
**Tickets:** [docs/TICKETS.md](docs/TICKETS.md) · [GitHub Issues](https://github.com/Bigessfour/Colorado_Rural_Water/issues)
**Tenant isolation:** [docs/TENANT_ISOLATION.md](docs/TENANT_ISOLATION.md)
**Codebase RAG (IDE):** [docs/codebase-rag.md](docs/codebase-rag.md)
**Assessment setup:** [GETTING_STARTED_ASSESSMENT.md](GETTING_STARTED_ASSESSMENT.md) · Demo: [docs/ASSESSMENT_III_DEMO.md](docs/ASSESSMENT_III_DEMO.md)

Final product name to be chosen by Colorado Rural Water Association.

---

## Repo layout

```text
docs/           Product Spec Kit + ticket backlog + diagrams
specs/          Assessment III Spec-Kit features 001–010 + optional 011 + RUBRIC_COVERAGE
frontend/       Angular + PrimeNG member & CRWA apps
backend/        Lambda handlers + Compose Express + Python LangChain/Mem0 RAG
infra/          Terraform (AWS multi-tenant)
sample-data/    Messy real-world-style fixtures for demos & tests
evidence/       Assessment evidence artifacts
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

### Assessment three-tier (Docker Compose)

```bash
cp .env.example .env          # add Mem0/LangSmith/AWS as needed — never commit secrets
./scripts/setup-env.sh        # optional scaffolding
docker compose up --build
./scripts/smoke.sh            # health + ready (+ frontend if set); RAG only with SMOKE_REQUIRE_RAG=1
npm run ci:local:fast         # mirror Actions tests before push
```

- Frontend: <http://localhost:8080>
- Backend API: <http://localhost:3000> (`/health`, `/ready`, `/api/rag`)
- Postgres: localhost:5432

Full Assessment repro: [GETTING_STARTED_ASSESSMENT.md](GETTING_STARTED_ASSESSMENT.md).

### Frontend (dev server → live API Gateway)

```bash
cd frontend
npm install
npm start
```

### Backend (Lambda handlers)

```bash
cd backend
npm install
npm test
```

### Infrastructure

```bash
cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars
aws sts get-caller-identity --profile codeplatoon
terraform init
terraform workspace select dev || terraform workspace new dev
terraform plan -var-file=environments/dev.tfvars
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
