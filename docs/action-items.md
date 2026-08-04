# Water Saver Action Items (Human + Agent Overlay)

**Generated inventory source:** [function-inventory.generated.md](./function-inventory.generated.md)
**Visual tree:** [function-tree.md](./function-tree.md)

**Update rule:** After adding or changing public handlers, pages, or shared exports:
1. Run `npm run inventory` (or `python3 ~/.cursor/skills/function-inventory/scripts/update-function-inventory.py --root . --output docs/function-inventory.generated.md`)
2. Check this overlay against the regenerated table — keep verification notes honest.
3. Record proof (test file, smoke script, or acceptance checklist item) and whether impl is minimal.
4. Update [function-tree.md](./function-tree.md) when high-level structure changes.

**Scanner diagnosis → fix (2026-08-03):**

| Item         | Was (broken)                                                               | Now (Water Saver)                                                                 |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Scanner      | `~/.cursor/skills/function-inventory/scripts/update-function-inventory.py` | Same script; dual-stack                                                           |
| Language     | C# / Blazor only                                                           | TypeScript forced via `.function-inventory.json`                                  |
| Roots        | Whole repo                                                                 | `frontend/src`, `backend/src`                                                     |
| Excludes     | Weak → scanned `mcp/crwa-rag/node_modules`                                 | `node_modules`, `mcp`, `dist`, `.angular`, `infra`, …                             |
| Theme oracle | `sf_blazor_style` (TIKR)                                                   | **`primeng`** MCP (not Syncfusion Blazor)                                         |
| Result       | **0 tracked**, noise UI table                                              | **206 tracked** \| **182 with proof** \| **24 without proof** (2026-08-04 rescan) |

**Without proof is not “missing feature.”** Remaining gaps are Wave 3 deferred AWS wrappers + some SPA pages — browser prove now covers several (see Assessment features below).

**Proof baselines (2026-08-04 Assessment closeout refresh):**
- Backend: `cd backend && npm test` (unit)
- Frontend: Vitest smokes + chart/meter-usage specs
- Inventory: `npm run inventory` → **209 / 184 with proof**
- Assessment Spec-Kit **001–008** verified (see table below) · evidence under `evidence/` · **011** meter map verified (optional product)
- Live F5: review API + SES (earlier); Feature **008** Cognito demo operator `demo.operator@watersaver.local`
- Engineering closeout: [CLOSEOUT.md](./CLOSEOUT.md) — code Done; ops = Kelly invite + F2 smoke

---

## Assessment Spec-Kit features (inventory map)

| ID      | Feature               | Status          | Primary surfaces                            | Evidence                                                                                                                              |
| ------- | --------------------- | --------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 001     | LangChain + Mem0 RAG  | done (verified) | `backend/rag/*`, `POST /api/rag`            | [`evidence/001-langchain-mem0-rag.md`](../evidence/001-langchain-mem0-rag.md), [`mem0-connection.md`](../evidence/mem0-connection.md) |
| 002     | LangGraph + LangSmith | done (verified) | `backend/rag/graph.py`, agent tools         | [`evidence/002-langgraph-langsmith-agent.md`](../evidence/002-langgraph-langsmith-agent.md)                                           |
| 003     | Terraform IaC         | done (verified) | `infra/terraform`                           | [`evidence/003-terraform-iac.md`](../evidence/003-terraform-iac.md)                                                                   |
| 004     | TF best practices     | done (verified) | remote state S3 + modules                   | [`evidence/004-terraform-best-practices.md`](../evidence/004-terraform-best-practices.md)                                             |
| 005     | GHA + Compose         | done (verified) | `.github/workflows/ci.yml`, Compose         | [`evidence/005-github-actions-compose.md`](../evidence/005-github-actions-compose.md)                                                 |
| 006     | GHA advanced          | done (verified) | `terraform.yml`, `destroy.yml`              | [`evidence/006-github-actions-advanced.md`](../evidence/006-github-actions-advanced.md)                                               |
| 007     | Bedrock + UI          | done (verified) | `/assistant`, `/api/rag`, `/agent`, Bedrock | [`evidence/007-integrations-bedrock-ui.md`](../evidence/007-integrations-bedrock-ui.md)                                               |
| 008     | System UI browser     | done (verified) | shell, dashboard, alerts ack, Compose AI    | [`evidence/008-system-ui-browser-demo.md`](../evidence/008-system-ui-browser-demo.md)                                                 |
| 009–010 | Docs / ops bonuses    | done (matrix)   | README, diagrams, scripts                   | [`specs/RUBRIC_COVERAGE.md`](../specs/RUBRIC_COVERAGE.md)                                                                             |
| 011     | Meter map             | done (verified) | Leaflet/OSM on `/meters` Table\|Map\|Both   | [`evidence/011-meter-map.md`](../evidence/011-meter-map.md)                                                                           |

Rubric matrix: [`specs/RUBRIC_COVERAGE.md`](../specs/RUBRIC_COVERAGE.md). Browser matrix: [`PROVE_FEATURES.md`](./PROVE_FEATURES.md).

---

## Inventory proof waves

| Wave  | Status  | What                                                                                                                                                                              |
| ----- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | done    | `ReviewService`, `AuthService`, `app.routes` smoke, s3-ingest synthetic event → memory commit                                                                                     |
| **2** | done    | Vitest smokes: ReviewHowto, ReviewPanel, Dashboard, Upload, Alerts                                                                                                                |
| **3** | partial | Browser prove (008): Shell Compose banner, Agent `/assistant`, Bedrock/RAG live, Cognito dashboard + alert Accept; Dynamo factories / Cognito admin SDK still deferred unit-proof |

---

## Priorities

- [x] Bootstrap inventory docs + tree for Water Saver (Angular/TS + Lambda)
- [x] TypeScript discovery in function-inventory scanner (handlers, exports, Angular routes/components)
- [x] Wave 1 inventory proofs (services + routes + s3-ingest event)
- [x] Wave 2 Kelly page smokes (Review / Dashboard / Upload / Alerts)
- [x] Handler-level proof for `POST /uploads/presign` (`upload-url.test.ts`)
- [x] F5 deploy (SES vars, review Lambda, Cognito Kelly user, live API smoke + SES)
- [ ] Full live Kelly F2 smoke end-to-end (product walkthrough — separate from F5 API smoke) — **ops**
- [ ] Admin invite happy path against live Cognito (manual) — **ops**
- [ ] Send Kelly the `/review` invite (ops; not code) — **next human step**

---

## API Endpoints — Status & Verification

| Route                                             | Handler                                | Proof                                                                           | Minimal? | Status                             |
| ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `GET /health`                                     | `handlers/health.ts` `handler`         | Manual / smoke                                                                  | Yes      | OK                                 |
| `GET /me`                                         | `handlers/me.ts` `handler`             | Manual smoke (`SMOKE_CHECKLIST`); auth helpers proven                           | Yes      | OK                                 |
| `POST /uploads/presign`                           | `handlers/upload-url.ts` `handler`     | `upload-url.test.ts` (auth + key sanitize)                                      | Yes      | OK                                 |
| `POST /ingest`                                    | `handlers/ingest.ts` `handler`         | Shared: `csv-parse.test.ts`, `excel-parse.test.ts`, `meter-location.test.ts`    | Yes      | Shared proven; handler thin        |
| `POST /ingest/sources`                            | `handlers/ingest-sources.ts` `handler` | `balance-auth.test.ts` (401/403); `source-csv-parse.test.ts`                    | Yes      | Auth proven                        |
| S3 event ingest                                   | `handlers/s3-ingest.ts` `handler`      | `s3-ingest.test.ts` (`tenantFromKey` + `handleS3IngestEvent` memory commit)     | Yes      | OK                                 |
| `GET/POST /alerts`                                | `handlers/alerts.ts` `handler`         | `alert-engine`, `alert-status`, `flagged-export`, `balance-alerts` tests        | Yes      | Shared proven                      |
| `POST /alerts/explain`                            | `handlers/alerts.ts` `handler`         | `agent-isolation.test.ts` → `explainAlertTemplate` (C6)                         | Yes      | Template proven                    |
| `GET/POST /sources`, `PUT/DELETE /sources/{id}`   | `handlers/sources.ts` `handler`        | `source-store.test.ts`, `water-source.test.ts`                                  | Yes      | Shared proven                      |
| `GET /balance`, `PUT /balance/thresholds`         | `handlers/balance.ts` `handler`        | `balance-auth.test.ts`; `water-balance`, `balance-thresholds`, `balance-alerts` | Yes      | Auth + calc proven                 |
| `GET/POST /meters`, `GET/PUT/DELETE /meters/{id}` | `handlers/meters.ts` `handler`         | `meter-inventory.test.ts`, `meter-history.test.ts`, `meter-location.test.ts`    | Yes      | OK                                 |
| `GET/POST /admin/tenants`                         | `handlers/admin.ts` `handler`          | `admin-isolation.test.ts`; `auth.test.ts`; `billing.test.ts`                    | Yes      | Isolation + billing fields         |
| `GET /admin/tenants/{id}/billing`                 | `handlers/admin.ts`                    | `admin-isolation.test.ts` (ledger isolation); `billing.test.ts`                 | Yes      | Isolation proven                   |
| `POST /admin/tenants/{id}/billing/{action}`       | `handlers/admin.ts`                    | `admin-isolation.test.ts` + `billing.test.ts`                                   | Yes      | Isolation proven                   |
| `GET /billing`                                    | `handlers/admin.ts`                    | `admin-isolation.test.ts` (municipality view shape)                             | Yes      | Auth proven                        |
| `GET /admin/users`, `POST /admin/users/invite`    | `handlers/admin.ts`                    | `admin-isolation.test.ts`; `auth.test.ts`                                       | Yes      | Isolation proven                   |
| `GET /admin/rollup`                               | `handlers/admin.ts`                    | `agent-isolation.test.ts` → `crwa-rollup` sanitize (D4/G6/H5)                   | Yes      | Sanitize proven                    |
| `GET/POST /agent`                                 | `handlers/agent.ts` `handler`          | `agent-isolation.test.ts` (E4/E5/E6 guardrails + store)                         | Yes      | Isolation proven; Bedrock optional |
| `POST /review/sessions` (+ get/step/submit)       | `handlers/review.ts` `handler`         | `review.test.ts` + live smoke (SES `emailSent`, Dynamo completed)               | Yes      | OK (F5 live)                       |

**Verification commands:**

```bash
cd backend && npm test
cd frontend && npm test -- --watch=false
npm run inventory
# Live smoke: docs/SMOKE_CHECKLIST.md + Bearer curls against $API
# Kelly review: docs/KELLY_REVIEW.md
```

---

## Pages & Major Components

| Page / route  | Component                                           | Proof                                                             | Status           |
| ------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| `/login`      | `LoginPageComponent`                                | Feature 008 Cognito SPA session + `AuthService` unit tests        | Browser pass 008 |
| `/account`    | `AccountPageComponent`                              | Manual D5 smoke (SMOKE)                                           | Deferred W3      |
| `/dashboard`  | `DashboardPageComponent`                            | Spec + Feature **008** live Refresh (5 meters / alerts / balance) | OK + browser 008 |
| `/upload`     | `UploadPageComponent`                               | Spec + 008 API ingest of sample CSV + signed-in UI                | OK (API prove)   |
| `/sources`    | `SourcesPageComponent`                              | 008 API seed (wells + source CSV)                                 | API prove 008    |
| `/meters`     | `MetersPageComponent` + `MeterMapComponent`         | Feature **011** map (5/6 pins) + Stats/History prove              | Browser pass 011 |
| `/alerts`     | `AlertsPageComponent`                               | Spec + Feature **008** Accept on balance alert                    | OK + browser 008 |
| `/assistant`  | `AgentPageComponent` + `SafeMarkdownPipe`           | Feature **007/008** Compose RAG + markdown; Cognito `/agent` path | Browser pass     |
| `/billing`    | `BillingPageComponent`                              | Manual I2 smoke (system admin)                                    | Deferred W3      |
| `/admin`      | `AdminPageComponent`                                | Manual (system/CRWA admin + billing actions)                      | Deferred W3      |
| `/crwa`       | `CrwaRollupPageComponent`                           | Roll-up via `/admin/rollup`                                       | Deferred W3      |
| `/review`     | `ReviewHowtoPageComponent` + `ReviewPanelComponent` | `review-howto-page` + `review-panel` specs; `ReviewService` spec  | OK               |
| Shell         | `ShellComponent`                                    | Feature **008** Compose banner + Assistant nav                    | Browser pass 008 |
| App bootstrap | `app.ts` (hosts review panel)                       | `frontend/src/app/app.spec.ts`                                    | Thin proof       |
| Routes table  | `app.routes.ts`                                     | `app.routes.spec.ts`                                              | OK               |

---

## Core Services & Public Methods

| Function / surface                              | Location                             | Proof                                                                   | Minimal?           |
| ----------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------- | ------------------ |
| `parseAuthFromClaims`, `requireTenantId`, roles | `shared/auth.ts`                     | `auth.test.ts`                                                          | Yes                |
| `parseStepFeedbackBody`, `buildReviewEmailBody` | `shared/review.ts`                   | `handlers/review.test.ts`                                               | Yes                |
| Review store (`TENANT#_review`)                 | `shared/review-store.ts`             | `handlers/review.test.ts` (MemoryReviewStore)                           | Yes                |
| `DynamoReviewStore`                             | `shared/review-store.ts`             | Deferred W3 (no Dynamo in CI)                                           | Env wiring         |
| `normalizeTenantId` / email / password          | `shared/tenant-admin.ts`             | `auth.test.ts`                                                          | Yes                |
| CSV customer parse + mapping                    | `shared/csv-parse.ts`                | `csv-parse.test.ts`                                                     | Yes                |
| Excel → CSV path                                | `shared/excel-parse.ts`              | `excel-parse.test.ts` (Steve fixture + DoS guards)                      | Yes                |
| Source CSV parse                                | `shared/source-csv-parse.ts`         | `source-csv-parse.test.ts`                                              | Yes                |
| Meter location upsert / metadata patch          | `shared/meter-location.ts`           | `meter-location.test.ts`                                                | Yes                |
| Water balance calc                              | `shared/water-balance.ts`            | `water-balance.test.ts`                                                 | Yes                |
| Alert engine + confidence                       | `shared/alert-engine.ts`             | `alert-engine.test.ts`                                                  | Yes                |
| Balance alerts                                  | `shared/balance-alerts.ts`           | `balance-alerts.test.ts`                                                | Yes                |
| Alert status apply                              | `shared/alert-status.ts`             | `alert-status.test.ts`                                                  | Yes                |
| Alert explain template                          | `shared/alert-explain.ts`            | `agent-isolation.test.ts` (C6)                                          | Yes                |
| Threshold merge/patch                           | `shared/balance-thresholds.ts`       | `balance-thresholds.test.ts`                                            | Yes                |
| Flagged CSV export                              | `shared/flagged-export.ts`           | `flagged-export.test.ts`                                                | Yes                |
| Source normalize / slug                         | `shared/water-source.ts`             | `water-source.test.ts`                                                  | Yes                |
| Billing plans/status/events                     | `shared/billing.ts`                  | `billing.test.ts`                                                       | Yes                |
| CRWA roll-up sanitize                           | `shared/crwa-rollup.ts`              | `agent-isolation.test.ts`                                               | Yes                |
| Agent context / confirm / isolation             | `shared/agent-context.ts`            | `agent-isolation.test.ts`                                               | Yes                |
| Conversation store                              | `shared/conversation.ts`             | `agent-isolation.test.ts` (memory)                                      | Yes                |
| Bedrock invoke wrapper                          | `shared/bedrock.ts`                  | Live Compose RAG + agent polish (007); unit still “NO PROOF” in scanner | Thin OK            |
| `SafeMarkdownPipe`                              | `frontend/.../safe-markdown.pipe.ts` | Feature 008 browser — assistant bubbles render `<strong>`               | Yes                |
| Memory/source store isolation                   | `shared/*-store` / dynamo            | `source-store.test.ts`, meter-history                                   | Yes                |
| Dynamo factories / `DynamoMeterStore`           | `shared/dynamo-store.ts`             | Deferred W3                                                             | Thin env wiring OK |
| Cognito admin client                            | `shared/cognito-admin.ts`            | `admin-isolation.test.ts` (mock); real SDK deferred                     | Yes                |
| `tenantFromKey` + `handleS3IngestEvent`         | `handlers/s3-ingest.ts`              | `s3-ingest.test.ts`                                                     | Yes                |
| HTTP helpers (`ok`/`csv`/…)                     | `shared/http.ts`                     | Indirect via handlers                                                   | Yes                |
| `AuthService` (login, MFA, password, `/me`)     | `frontend/.../auth.service.ts`       | `auth.service.spec.ts`                                                  | Yes                |
| `ReviewService`                                 | `frontend/.../review.service.ts`     | `review.service.spec.ts`                                                | Yes                |

---

## AI Tools / Orchestrators

- [x] `handlers/agent.ts` — routed `GET/POST /agent` (Terraform); tenant isolation + confirm guardrails proven; Bedrock optional fallback to templates.
- [x] `POST /alerts/explain` — template explain (C6) proven in `agent-isolation.test.ts`.
- [x] Compose `POST /api/rag` — LangChain `ChatBedrock` + Mem0 (`evidence/001`, `mem0-connection`, `007`).
- [x] MCP `crwa-rag` (`search_codebase` / `refresh_index`) — agent protocol, not product API.

---

## Key Workflows

- [x] **Auth → tenant isolation** — JWT claims → `parseAuthFromClaims` / `requireTenantId`; proven in `auth.test.ts`, `balance-auth.test.ts`, `admin-isolation.test.ts`, `source-store.test.ts`
- [x] **Customer CSV/Excel ingest path** — parse + location upsert; `csv-parse.test.ts`, `excel-parse.test.ts`, `meter-location.test.ts`
- [x] **S3 → s3-ingest → memory commit** — `handleS3IngestEvent` with memory stores (`s3-ingest.test.ts`)
- [x] **Source CRUD + source ingest → balance** — `water-source`, `source-store`, `source-csv-parse`, `water-balance` tests
- [x] **Alerts (usage + balance + status + CSV + explain)** — engine / status / flagged-export / balance-alerts / alert-explain; accept/dispatch/resolve + meter `ALERT#EVT#` timeline (C3)
- [x] **Browser prove (Chrome DevTools)** — [PROVE_FEATURES.md](./PROVE_FEATURES.md): Dashboard / Alerts Accept / Assistant / Sign-in **pass** 2026-08-04 (Feature 008); DataViz + Meter History/Stats earlier
- [x] **Billing ledger + municipality view** — `billing.test.ts`, `admin-isolation.test.ts`
- [x] **Agent isolation + confirm** — `agent-isolation.test.ts` (E4/E5/E6)
- [x] **CRWA roll-up sanitize** — no PII / cross-tenant leakage in roll-up rows
- [x] **Kelly Review API + SPA services/pages** — `review.test.ts` + frontend Review/Auth/panel/howto specs
- [x] **F5 live deploy** — Terraform apply + SES + Cognito Kelly user; API smoke submit emailed Steve
- [x] **Assessment 001–008** — Spec-Kit closed with evidence (Compose CI, TF plan Actions, Bedrock/Mem0, system UI demo)
- [ ] **Kelly F2 smoke end-to-end** — [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) boxes still open for live env
- [ ] **Admin invite happy path against Cognito** — isolation rules unit-tested; live invite is manual
- [ ] **Send Kelly F5 invite** — share `/review` + creds from local secrets (ops)

---

## Meta

- Re-run `npm run inventory` after structural changes (handlers, routes, shared exports).
- Config: [`.function-inventory.json`](../.function-inventory.json) (stack + roots + excludes).
- Ship gate: Spec §0 + [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md) — inventory is engineering hygiene, not the only “done” signal.
- Spec layers: [SPEC.md](./SPEC.md) §0; isolation: [TENANT_ISOLATION.md](./TENANT_ISOLATION.md).
- Do not hand-edit `function-inventory.generated.md`.

---

*Water Saver / Colorado Rural Water — function-inventory overlay.*
