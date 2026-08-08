# Assessment III — Grading zap sheet (Water Saver)

**Repo:** [Bigessfour/Colorado_Rural_Water](https://github.com/Bigessfour/Colorado_Rural_Water)
**AWS:** account `388691194728` · profile `codeplatoon` · region `us-east-1` · tag `Assessment-iii`
**Master matrix:** [`specs/RUBRIC_COVERAGE.md`](../specs/RUBRIC_COVERAGE.md)
**Demo talk-track:** [`ASSESSMENT_III_DEMO.md`](./ASSESSMENT_III_DEMO.md) · [`PRESENTATION_NOTES.md`](../PRESENTATION_NOTES.md)
**Rubric dry-run:** [`evidence/013-kelly-ship-prove/assessment-iii-rubric-dryrun-2026-08-04.md`](../evidence/013-kelly-ship-prove/assessment-iii-rubric-dryrun-2026-08-04.md)

## Live AWS project (click to open)

> **Status 2026-08-06 (re-applied):** Stack recreated after destroy prove. New CloudFront/API IDs below. Cognito pool recreated — ask Steve for demo credentials.

| What                       | URL                                                           |
| -------------------------- | ------------------------------------------------------------- |
| **SPA (CloudFront HTTPS)** | https://d1gokx5wxrd4x6.cloudfront.net                         |
| **Kelly Review**           | https://d1gokx5wxrd4x6.cloudfront.net/review                  |
| **API health**             | https://uqujnhmk31.execute-api.us-east-1.amazonaws.com/health |
| **API base**               | https://uqujnhmk31.execute-api.us-east-1.amazonaws.com        |
| **Destroy evidence**       | [`evidence/07-destroy.md`](../evidence/07-destroy.md)         |

Account `388691194728` · `us-east-1` · tag `Assessment-iii`. Hardened teardown: `.github/workflows/destroy.yml` + `./scripts/terraform-destroy.sh` (`recovery_window_in_days = 0` on AI secret stub).

> **How to grade:** Prefer Compose for Assessment AI spine (`localhost:8080` / `:3000`). Live Cognito SPA is optional product proof — deploy with `./scripts/deploy-spa.sh` from repo root after apply.

Permalink base (all proof links point at `main`):

`https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/`

---

## 1. LangChain + Mem0 — 25%

| #   | Graded point                             | Type | Proof (zap here)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | LangChain chains + prompt templates      | R    | [Evidence 001](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/001-langchain-mem0-rag.md) · [`ChatPromptTemplate` in `chain.py`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/chain.py#L25-L50)                                                                                                                                                                                                                          |
| 1.2 | RAG: load, split, embed, vector store    | R    | [Evidence 001](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/001-langchain-mem0-rag.md) · [load/split `ingest.py`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/ingest.py#L5-L45) · [FAISS `store.py`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/store.py#L52-L80) · [retriever `chain.py`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/chain.py#L84-L95)  |
| 1.3 | Mem0 semantic + LangChain session memory | R    | [Evidence 001](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/001-langchain-mem0-rag.md) · [Mem0 connection](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/mem0-connection.md) · [`RunnableWithMessageHistory`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/chain.py#L109-L120) · [`MemoryClient`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/memory.py#L36-L62) |
| 1.4 | LangGraph workflows                      | B    | [Evidence 002](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/002-langgraph-langsmith-agent.md) · [`StateGraph` in `graph.py`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/graph.py#L76-L110)                                                                                                                                                                                                                          |
| 1.5 | LangSmith observability                  | B    | [Evidence 002](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/002-langgraph-langsmith-agent.md) · [LangSmith README + project URL](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/langsmith/README.md) · [Water_Saver project](https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010)                                                                           |
| 1.6 | Custom autonomous agent (tool-using)     | B    | [Evidence 002](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/002-langgraph-langsmith-agent.md) · [`StructuredTool` agent_tools.py](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/rag/agent_tools.py#L94-L130)                                                                                                                                                                                                               |

**Spec:** [Feature 001](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/001-langchain-mem0-rag) · [Feature 002](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/002-langgraph-langsmith-agent)

---

## 2. Terraform — 10%

| #   | Graded point                              | Type | Proof (zap here)                                                                                                                                                                                                                                 |
| --- | ----------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | Provision required cloud resources        | R    | [Evidence 003](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/003-terraform-iac.md) · [`infra/terraform/`](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/infra/terraform)                                  |
| 2.2 | State management + backend config         | R    | [Evidence 003](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/003-terraform-iac.md) · [`backend.tf` S3 + lockfile](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/infra/terraform/backend.tf)               |
| 2.3 | Modules, variables, outputs, dependencies | B    | [Evidence 004](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/004-terraform-best-practices.md) · [`modules/`](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/infra/terraform/modules)                       |
| 2.4 | Remote state + locking                    | B    | [Evidence 004](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/004-terraform-best-practices.md) · [`use_lockfile = true`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/infra/terraform/backend.tf#L10-L15) |
| 2.5 | Environment separation (dev)              | B    | [Evidence 004](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/004-terraform-best-practices.md) · [`environments/`](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/infra/terraform/environments)             |
| 2.6 | No secrets in git                         | B    | [Evidence 004](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/004-terraform-best-practices.md) · [`.gitignore`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.gitignore)                                  |

**Spec:** [Feature 003](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/003-terraform-iac) · [Feature 004](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/004-terraform-best-practices)

---

## 3. GitHub Actions — 30%

| #   | Graded point                     | Type | Proof (zap here)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | -------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Automate build / test / images   | R    | [Evidence 005](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/005-github-actions-compose.md) · [`ci.yml`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/ci.yml)                                                                                                                                                                                                                                                                                                                                              |
| 3.2 | Dockerfiles + Compose three-tier | R    | [Evidence 005](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/005-github-actions-compose.md) · [`docker-compose.yml`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docker-compose.yml) · [backend Dockerfile](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/backend/Dockerfile) · [frontend Dockerfile](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/frontend/Dockerfile) · [compose build job](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/ci.yml#L64-L89) |
| 3.3 | No hard-coded secrets            | R    | [Evidence 005](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/005-github-actions-compose.md) · [`.env.example`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.env.example) · [`gh-secrets-example.sh`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/scripts/gh-secrets-example.sh)                                                                                                                                                                                                                            |
| 3.4 | Testing, logging, health checks  | R    | [Evidence 005](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/005-github-actions-compose.md) · [pytest job](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/ci.yml#L45-L61) · [`scripts/smoke.sh`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/scripts/smoke.sh)                                                                                                                                                                                                                              |
| 3.5 | Conditional PR vs main           | B    | [Evidence 006](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/006-github-actions-advanced.md) · [`terraform.yml` plan/apply](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/terraform.yml) · **Green plan run:** [Actions 30865855551](https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865855551)                                                                                                                                                                                           |
| 3.6 | Destroy workflow                 | B    | [Evidence 006](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/006-github-actions-advanced.md) · [`destroy.yml` dry_run](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/destroy.yml) · [destroy notes](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/07-destroy.md)                                                                                                                                                                                                                    |
| 3.7 | Python unit tests in pipeline    | B    | [pytest in `ci.yml`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/ci.yml#L45-L61) (via Feature 005)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3.8 | Ansible                          | B    | **Skipped** — Compose path preferred ([RUBRIC_COVERAGE](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/specs/RUBRIC_COVERAGE.md))                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Spec:** [Feature 005](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/005-github-actions-compose) · [Feature 006](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/006-github-actions-advanced)

---

## 4. Integrations — 15%

| #   | Graded point                     | Type | Proof (zap here)                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Bedrock for AI                   | R    | [Evidence 007](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/007-integrations-bedrock-ui.md) · Compose ChatBedrock path in [001 evidence](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/001-langchain-mem0-rag.md)                                                                                            |
| 4.2 | Backend API for AI / RAG / agent | R    | [Evidence 007](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/007-integrations-bedrock-ui.md) · Compose `POST /api/rag`, `/api/agent`, `/api/agent/triage`                                                                                                                                                                             |
| 4.3 | Frontend UI (Angular + PrimeNG)  | R    | [Evidence 007](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/007-integrations-bedrock-ui.md) · [`/assistant` page](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/frontend/src/app/pages/agent)                                                                                                                         |
| 4.4 | Authenticated tenant scope       | R    | [Evidence 007](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/007-integrations-bedrock-ui.md) · [TENANT_ISOLATION.md](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/TENANT_ISOLATION.md) · [isolation diagram](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/diagrams/08-tenant-isolation.mmd) |
| 4.5 | System UI browser demo           | B    | [Evidence 008](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/008-system-ui-browser-demo.md) · [ASSESSMENT_III_DEMO.md](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/ASSESSMENT_III_DEMO.md)                                                                                                                      |

**Spec:** [Feature 007](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/007-integrations-bedrock-ui) · [Feature 008](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/008-system-ui-browser-demo)

---

## 5. Documentation — 20%

| #   | Graded point                        | Type | Proof (zap here)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1 | Setup / config docs                 | R    | [README](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/README.md) · [GETTING_STARTED_ASSESSMENT.md](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/GETTING_STARTED_ASSESSMENT.md)                                                                                                                                                                                                                                                                             |
| 5.2 | ≥2 architecture diagrams            | R    | [diagrams folder](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/docs/diagrams) · [demo diagram index](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/diagrams/assessment-iii-demo-diagrams.md) · [system arch](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/diagrams/assessment-iii-system-architecture.mmd) · [data flow](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/diagrams/assessment-iii-data-flow.mmd) |
| 5.3 | Deliverables in GitHub              | R    | This repository (workflows, Dockerfiles, Terraform, scripts, diagrams, evidence)                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5.4 | Presentation talk-track             | R    | [PRESENTATION_NOTES.md](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/PRESENTATION_NOTES.md) · [ASSESSMENT_III_DEMO.md](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/docs/ASSESSMENT_III_DEMO.md)                                                                                                                                                                                                                                                           |
| 5.5 | Shell scripts (setup/smoke/secrets) | B    | [`scripts/`](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/scripts) · [`smoke.sh`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/scripts/smoke.sh) · [`gh-secrets-example.sh`](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/scripts/gh-secrets-example.sh)                                                                                                                                                                                   |
| 5.6 | Early presentation + evidence       | B    | [`evidence/`](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/evidence) · [early checklist](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/00-early-presentation-checklist.md)                                                                                                                                                                                                                                                                         |

**Spec:** [Feature 009](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/009-docs-reproducibility) · [Feature 010](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/specs/010-docs-ops-bonuses)

---

## Definition of Done (quick)

| Check                       | Proof                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose three-tier healthy  | [005](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/005-github-actions-compose.md) · [008](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/008-system-ui-browser-demo.md)                                                                                                     |
| RAG + Mem0 tenant-safe      | [001](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/001-langchain-mem0-rag.md) · [mem0](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/mem0-connection.md)                                                                                                                   |
| Bedrock usable from UI      | [007](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/007-integrations-bedrock-ui.md)                                                                                                                                                                                                                 |
| Terraform + remote state    | [003](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/003-terraform-iac.md) · [004](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/004-terraform-best-practices.md) · [plan 30865855551](https://github.com/Bigessfour/Colorado_Rural_Water/actions/runs/30865855551)          |
| Actions PR + main + destroy | [ci.yml](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/ci.yml) · [terraform.yml](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/terraform.yml) · [destroy.yml](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/.github/workflows/destroy.yml) |
| Docs + diagrams             | [GETTING_STARTED](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/GETTING_STARTED_ASSESSMENT.md) · [diagrams](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/docs/diagrams)                                                                                                                      |
| Live rubric dry-run         | [dry-run 2026-08-04](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/013-kelly-ship-prove/assessment-iii-rubric-dryrun-2026-08-04.md)                                                                                                                                                                 |

---

## Reproduce locally (grader)

```bash
git clone https://github.com/Bigessfour/Colorado_Rural_Water.git
cd Colorado_Rural_Water
git checkout main
# Full steps:
# GETTING_STARTED_ASSESSMENT.md
docker compose up --build
./scripts/smoke.sh http://127.0.0.1:3000
# With Bedrock (gitignored .env from codeplatoon):
# eval "$(aws configure export-credentials --profile codeplatoon --format env)"
# unset AWS_PROFILE && docker compose up -d --force-recreate backend
```

---

## Not scored as Assessment III % (product extras)

| Item                                       | Link                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Cognito JWT / Bedrock KB Assistant (Pilot) | [014 evidence](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/014-cognito-rag-assistant.md) |
| Meter map                                  | [011 evidence](https://github.com/Bigessfour/Colorado_Rural_Water/blob/main/evidence/011-meter-map.md)             |
| Operator + CRWA user guides                | [docs/user-guide/](https://github.com/Bigessfour/Colorado_Rural_Water/tree/main/docs/user-guide) · SPA `/help`     |
| Live Cognito SPA                           | https://d1gokx5wxrd4x6.cloudfront.net                                                                              |
