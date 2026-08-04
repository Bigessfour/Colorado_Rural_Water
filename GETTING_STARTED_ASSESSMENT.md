# Getting started — Assessment III (Water Saver)

Reproduce the graded path on **Code Platoon** AWS (`388691194728` / `codeplatoon` / `us-east-1`).

Required resource tag: **`Assessment-iii=true`** (Terraform `default_tags`).

## 1. Clone + env

```bash
git clone https://github.com/Bigessfour/Colorado_Rural_Water.git
cd Colorado_Rural_Water
./scripts/setup-env.sh
# Edit .env / .env.secrets for Mem0, LangSmith, AWS as needed — never commit them
```

## 2. Three-tier Compose

```bash
docker compose up --build
./scripts/smoke.sh
```

- UI: <http://localhost:8080>
- API: <http://localhost:3000> (`/health`, `/ready`, `/api/rag`)
- DB: Postgres on 5432

## 3. Terraform (codeplatoon)

```bash
aws sts get-caller-identity --profile codeplatoon   # must be 388691194728
cd infra/terraform
cp environments/dev.tfvars.example environments/dev.tfvars
npm run backend:bundle   # from repo root
terraform init
terraform workspace select dev || terraform workspace new dev
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Remote state (optional): see `backend.tf.example`.

## 4. GitHub Actions

Secrets listed in `scripts/gh-secrets-example.sh`. Workflows:

- `ci.yml` — pytest + compose build/smoke
- `terraform.yml` — plan on PR, apply on main
- `destroy.yml` — `workflow_dispatch` with `confirm=destroy`

## 5. Diagrams + rubric

- [`docs/diagrams/assessment-iii-system-architecture.mmd`](docs/diagrams/assessment-iii-system-architecture.mmd)
- [`docs/diagrams/assessment-iii-data-flow.mmd`](docs/diagrams/assessment-iii-data-flow.mmd)
- [`specs/RUBRIC_COVERAGE.md`](specs/RUBRIC_COVERAGE.md)
- Demo talk-track: [`PRESENTATION_NOTES.md`](PRESENTATION_NOTES.md)

## Account

Locked to **Code Platoon** (`388691194728` / `codeplatoon` / `us-east-1`) with required tag **`Assessment-iii`**. See [`docs/AWS_ACCOUNT.md`](docs/AWS_ACCOUNT.md).
