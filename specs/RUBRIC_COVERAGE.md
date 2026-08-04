# Rubric coverage matrix — Assessment III full credit (Water Saver)

Maps official Assessment III brief items → Spec-Kit features → status → demo evidence.

**AWS account:** `388691194728` / `codeplatoon` / `us-east-1` · required tag `Assessment-iii`.

Legend: **R** = required core | **B** = brief-listed bonus | Status: `planned` | `implementing` | `done` | `blocked`

---

## 1. LangChain + Mem0 (25%)

| Brief item                               | Type | Feature                               | Status          | Evidence                                                                                                                              |
| ---------------------------------------- | ---- | ------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| LangChain chains + prompt templates      | R    | [001](001-langchain-mem0-rag/)        | done (verified) | [`evidence/001-langchain-mem0-rag.md`](../evidence/001-langchain-mem0-rag.md) · `ChatPromptTemplate` + LCEL in `backend/rag/chain.py` |
| RAG: load, split, embed, vector store    | R    | [001](001-langchain-mem0-rag/)        | done (verified) | same evidence · `ingest.py`, `store.py`, `FAISS.as_retriever`                                                                         |
| Mem0 semantic + LangChain session memory | R    | [001](001-langchain-mem0-rag/)        | done (verified) | same evidence · `RunnableWithMessageHistory` + `MemoryClient`                                                                         |
| LangGraph workflows                      | B    | [002](002-langgraph-langsmith-agent/) | done (verified) | [`evidence/002-langgraph-langsmith-agent.md`](../evidence/002-langgraph-langsmith-agent.md) · `graph.py`                              |
| LangSmith observability                  | B    | [002](002-langgraph-langsmith-agent/) | done (verified) | same evidence · Water_Saver LangSmith run URLs · [`evidence/langsmith/`](../evidence/langsmith/)                                      |
| Custom autonomous agent (tool-using)     | B    | [002](002-langgraph-langsmith-agent/) | done (verified) | same evidence · `agent_tools.py` (`StructuredTool`)                                                                                   |

## 2. Terraform (10%)

| Brief item                                | Type | Feature                              | Status          | Evidence                                                                                             |
| ----------------------------------------- | ---- | ------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------- |
| Provision required cloud resources        | R    | [003](003-terraform-iac/)            | done (verified) | [`evidence/003-terraform-iac.md`](../evidence/003-terraform-iac.md) · live plan no-diff              |
| State management + backend config         | R    | [003](003-terraform-iac/)            | done (verified) | remote completed under 004 · `backend.tf`                                                            |
| Modules, variables, outputs, dependencies | B    | [004](004-terraform-best-practices/) | done (verified) | [`evidence/004-terraform-best-practices.md`](../evidence/004-terraform-best-practices.md) · modules/ |
| Remote state + locking                    | B    | [004](004-terraform-best-practices/) | done (verified) | S3 `water-saver-tf-state-388691194728` + `use_lockfile` · `backend.tf`                               |
| Environment separation (dev)              | B    | [004](004-terraform-best-practices/) | done (verified) | workspace `dev` + `environments/dev.tfvars.example`                                                  |
| No secrets in git                         | B    | [004](004-terraform-best-practices/) | done (verified) | `.gitignore`, Secrets Manager stub, GH secrets pattern                                               |

## 3. GitHub Actions (30%)

| Brief item                       | Type | Feature                             | Status          | Evidence                                                                                         |
| -------------------------------- | ---- | ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| Automate build / test / images   | R    | [005](005-github-actions-compose/)  | done (verified) | [`evidence/005-github-actions-compose.md`](../evidence/005-github-actions-compose.md) — compose build/test; **no ECR**; RAG not a CI gate |
| Dockerfiles + Compose three-tier | R    | [005](005-github-actions-compose/)  | done (verified) | same — `--wait` + hard `/health` `/ready` + frontend                                                     |
| No hard-coded secrets            | R    | [005](005-github-actions-compose/)  | done (verified) | `.env.example`, GH secret names, `gh-secrets-example.sh`                                                 |
| Testing, logging, health checks  | R    | [005](005-github-actions-compose/)  | done (verified) | node + pytest + `scripts/smoke.sh` (`SMOKE_REQUIRE_RAG` opt-in)                                          |
| Conditional PR vs main           | B    | [006](006-github-actions-advanced/) | implementing    | [`evidence/006-github-actions-advanced.md`](../evidence/006-github-actions-advanced.md) · hard-fail `terraform.yml` |
| Destroy workflow                 | B    | [006](006-github-actions-advanced/) | implementing    | `destroy.yml` dry_run default · confirm=destroy                                                                      |
| Python unit tests in pipeline    | B    | [006](006-github-actions-advanced/) | done (via 005)  | `ci.yml` pytest job                                                                                                  |
| Ansible                          | B    | —                                   | **skip**        | Compose path preferred                                                                           |

## 4. Integrations (15%)

| Brief item                      | Type | Feature                             | Status | Evidence                                 |
| ------------------------------- | ---- | ----------------------------------- | ------ | ---------------------------------------- |
| Bedrock for AI                  | R    | [007](007-integrations-bedrock-ui/) | done   | `backend/rag/llm.py`, Lambda Bedrock IAM |
| Backend API for AI/RAG/agent    | R    | [007](007-integrations-bedrock-ui/) | done   | `/api/rag`, `/agent`                     |
| Frontend UI (Angular + PrimeNG) | R    | [007](007-integrations-bedrock-ui/) | done   | `/assistant`                             |
| Authenticated tenant scope      | R    | [007](007-integrations-bedrock-ui/) | done   | JWT `tenant_id`                          |
| System UI browser demo          | B    | [008](008-system-ui-browser-demo/)  | done   | `docs/ASSESSMENT_III_DEMO.md`            |

## 5. Documentation (20%)

| Brief item                          | Type | Feature                          | Status | Evidence                                     |
| ----------------------------------- | ---- | -------------------------------- | ------ | -------------------------------------------- |
| Setup / config docs                 | R    | [009](009-docs-reproducibility/) | done   | `README.md`, `GETTING_STARTED_ASSESSMENT.md` |
| ≥2 architecture diagrams            | R    | [009](009-docs-reproducibility/) | done   | `docs/diagrams/*.mmd`                        |
| Deliverables in GitHub              | R    | [009](009-docs-reproducibility/) | done   | this repo                                    |
| Presentation talk-track             | R    | [009](009-docs-reproducibility/) | done   | `PRESENTATION_NOTES.md`                      |
| Shell scripts (setup/smoke/secrets) | B    | [010](010-docs-ops-bonuses/)     | done   | `scripts/*.sh`                               |
| Early presentation + evidence       | B    | [010](010-docs-ops-bonuses/)     | done   | `evidence/`, checklist                       |

---

## Definition of Done checklist

- [ ] `docker compose up` brings up healthy three-tier stack
- [x] RAG + Mem0 path works and is tenant-safe
- [ ] Bedrock reachable from backend and usable from frontend
- [ ] Terraform plan/apply + remote state documented
- [ ] GitHub Actions: PR path + main path; destroy workflow exists
- [ ] ≥2 diagrams + reproducible README
- [ ] This matrix shows every required line and claimed bonus with evidence links
- [ ] 1-on-1 demo script walks rubric then Water Saver product value

---

## Cross-cutting (applies to all features)

**Acceptance criteria**

- [ ] Multi-tenant isolation preserved: no cross-tenant data in DB queries, S3 paths, memory, or prompts.
- [ ] No secrets in git (`.env`, real `*.tfvars`, API keys, tokens).
- [ ] RUBRIC_COVERAGE.md maps each official rubric line → feature ID → status → evidence path.
- [ ] Water Saver domain remains primary; Assessment III capabilities are enhancements, not a separate toy app.

Per-feature grading checklists live at the bottom of each `specs/00X-.../spec.md` under **Acceptance Criteria**.

---

## Optional product (not Assessment III %)

| Item                      | Feature               | Status  | Notes                                                     |
| ------------------------- | --------------------- | ------- | --------------------------------------------------------- |
| Meter map (Leaflet + OSM) | [011](011-meter-map/) | planned | Deferred until 001–010 smoke green; does not block rubric |
