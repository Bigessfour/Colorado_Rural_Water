# Water Saver Action Items (Human + Agent Overlay)

**Generated inventory source:** [function-inventory.generated.md](./function-inventory.generated.md)
**Visual tree:** [function-tree.md](./function-tree.md)

**Update rule:** After adding or changing public handlers, pages, or shared exports:
1. Run `python3 ~/.cursor/skills/function-inventory/scripts/update-function-inventory.py --output docs/function-inventory.generated.md`
2. Check this overlay — stock scanner is C#/Blazor-oriented (0 TS functions auto-tracked). Keep this file honest.
3. Record proof (test file or manual smoke) and whether impl is minimal.
4. Update [function-tree.md](./function-tree.md) when high-level structure changes.

**Scanner note (2026-08-03):** `function-inventory.generated.md` reports **0 tracked functions** because discovery is C#-only. This overlay is the authoritative Water Saver surface until a TS pass exists. Ignore `mcp/crwa-rag/node_modules` noise in the generated UI table.

**Backend proof baseline:** `cd backend && npm test` → **115 pass** (2026-08-03; includes meter inventory C7).

---

## Priorities

- [x] Bootstrap inventory docs + tree for Water Saver (Angular/TS + Lambda)
- [ ] Add TypeScript discovery to function-inventory scanner (handlers `export const handler`, `export function`) — vNext
- [ ] Handler-level integration proofs for routes that only have shared-unit or auth smoke today
- [ ] Frontend page proofs beyond `app.spec.ts` (Kelly smoke / DEMO_WALKTHROUGH)
- [ ] Full S3 event → parse → Dynamo proof (today: `tenantFromKey` only)

---

## API Endpoints — Status & Verification

| Route                                           | Handler                                | Proof                                                                           | Minimal? | Status                             |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `GET /health`                                   | `handlers/health.ts` `handler`         | Manual / smoke                                                                  | Yes      | OK                                 |
| `GET /me`                                       | `handlers/me.ts` `handler`             | Manual smoke (`SMOKE_CHECKLIST`); auth helpers proven                           | Yes      | OK                                 |
| `POST /uploads/presign`                         | `handlers/upload-url.ts` `handler`     | Manual smoke (upload flow)                                                      | Yes      | Needs handler test                 |
| `POST /ingest`                                  | `handlers/ingest.ts` `handler`         | Shared: `csv-parse.test.ts`, `excel-parse.test.ts`, `meter-location.test.ts`    | Yes      | Shared proven; handler thin        |
| `POST /ingest/sources`                          | `handlers/ingest-sources.ts` `handler` | `balance-auth.test.ts` (401/403); `source-csv-parse.test.ts`                    | Yes      | Auth proven                        |
| S3 event ingest                                 | `handlers/s3-ingest.ts` `handler`      | `s3-ingest.test.ts` (`tenantFromKey` only)                                      | Yes      | Partial — needs event path         |
| `GET/POST /alerts`                              | `handlers/alerts.ts` `handler`         | `alert-engine`, `alert-status`, `flagged-export`, `balance-alerts` tests        | Yes      | Shared proven                      |
| `POST /alerts/explain`                          | `handlers/alerts.ts` `handler`         | `agent-isolation.test.ts` → `explainAlertTemplate` (C6)                         | Yes      | Template proven                    |
| `GET/POST /sources`, `PUT/DELETE /sources/{id}` | `handlers/sources.ts` `handler`        | `source-store.test.ts`, `water-source.test.ts`                                  | Yes      | Shared proven                      |
| `GET /balance`, `PUT /balance/thresholds`       | `handlers/balance.ts` `handler`        | `balance-auth.test.ts`; `water-balance`, `balance-thresholds`, `balance-alerts` | Yes      | Auth + calc proven                 |
| `GET/POST /meters`, `GET/PUT/DELETE /meters/{id}` | `handlers/meters.ts` `handler`       | `meter-inventory.test.ts`, `meter-history.test.ts`, `meter-location.test.ts`    | Yes      | OK                                 |
| `GET/POST /admin/tenants`                       | `handlers/admin.ts` `handler`          | `admin-isolation.test.ts`; `auth.test.ts`; `billing.test.ts`                    | Yes      | Isolation + billing fields         |
| `GET /admin/tenants/{id}/billing`               | `handlers/admin.ts`                    | `admin-isolation.test.ts` (ledger isolation); `billing.test.ts`                 | Yes      | Isolation proven                   |
| `POST /admin/tenants/{id}/billing/{action}`     | `handlers/admin.ts`                    | `admin-isolation.test.ts` + `billing.test.ts`                                   | Yes      | Isolation proven                   |
| `GET /billing`                                  | `handlers/admin.ts`                    | `admin-isolation.test.ts` (municipality view shape)                             | Yes      | Auth proven                        |
| `GET /admin/users`, `POST /admin/users/invite`  | `handlers/admin.ts`                    | `admin-isolation.test.ts`; `auth.test.ts`                                       | Yes      | Isolation proven                   |
| `GET /admin/rollup`                             | `handlers/admin.ts`                    | `agent-isolation.test.ts` → `crwa-rollup` sanitize (D4/G6/H5)                   | Yes      | Sanitize proven                    |
| `GET/POST /agent`                               | `handlers/agent.ts` `handler`          | `agent-isolation.test.ts` (E4/E5/E6 guardrails + store)                         | Yes      | Isolation proven; Bedrock optional |

**Verification commands:**

```bash
cd backend && npm test
# Live smoke: docs/SMOKE_CHECKLIST.md + Bearer curls against $API
```

---

## Pages & Major Components

| Page / route  | Component                 | Proof                                        | Status          |
| ------------- | ------------------------- | -------------------------------------------- | --------------- |
| `/login`      | `LoginPageComponent`      | Manual F2 #6 + D5 MFA challenge              | Needs automated |
| `/account`    | `AccountPageComponent`    | Manual D5 smoke (SMOKE)                      | Needs automated |
| `/dashboard`  | `DashboardPageComponent`  | Manual F2 #2                                 | Needs automated |
| `/upload`     | `UploadPageComponent`     | Manual F2 #1 (CSV + Excel)                   | Needs automated |
| `/sources`    | `SourcesPageComponent`    | Manual F2 #3                                 | Needs automated |
| `/meters`     | `MetersPageComponent`     | Manual C7 inventory CRUD                     | Needs automated |
| `/alerts`     | `AlertsPageComponent`     | Manual F2 / C3–C4 (+ explain)                | Needs automated |
| `/assistant`  | `AgentPageComponent`      | Manual Epic E smoke                          | Needs automated |
| `/billing`    | `BillingPageComponent`    | Manual I2 smoke (system admin)               | Needs automated |
| `/admin`      | `AdminPageComponent`      | Manual (system/CRWA admin + billing actions) | Needs automated |
| `/crwa`       | `CrwaRollupPageComponent` | Roll-up via `/admin/rollup`                  | Needs automated |
| Shell         | `ShellComponent`          | Manual nav                                   | OK for Kelly    |
| App bootstrap | `app.ts`                  | `frontend/src/app/app.spec.ts`               | Thin proof      |

---

## Core Services & Public Methods

| Function / surface                              | Location                       | Proof                                              | Minimal?           |
| ----------------------------------------------- | ------------------------------ | -------------------------------------------------- | ------------------ |
| `parseAuthFromClaims`, `requireTenantId`, roles | `shared/auth.ts`               | `auth.test.ts`                                     | Yes                |
| `normalizeTenantId` / email / password          | `shared/tenant-admin.ts`       | `auth.test.ts`                                     | Yes                |
| CSV customer parse + mapping                    | `shared/csv-parse.ts`          | `csv-parse.test.ts`                                | Yes                |
| Excel → CSV path                                | `shared/excel-parse.ts`        | `excel-parse.test.ts` (Steve fixture + DoS guards) | Yes                |
| Source CSV parse                                | `shared/source-csv-parse.ts`   | `source-csv-parse.test.ts`                         | Yes                |
| Meter location upsert / metadata patch          | `shared/meter-location.ts`     | `meter-location.test.ts`                           | Yes                |
| Water balance calc                              | `shared/water-balance.ts`      | `water-balance.test.ts`                            | Yes                |
| Alert engine + confidence                       | `shared/alert-engine.ts`       | `alert-engine.test.ts`                             | Yes                |
| Balance alerts                                  | `shared/balance-alerts.ts`     | `balance-alerts.test.ts`                           | Yes                |
| Alert status apply                              | `shared/alert-status.ts`       | `alert-status.test.ts`                             | Yes                |
| Alert explain template                          | `shared/alert-explain.ts`      | `agent-isolation.test.ts` (C6)                     | Yes                |
| Threshold merge/patch                           | `shared/balance-thresholds.ts` | `balance-thresholds.test.ts`                       | Yes                |
| Flagged CSV export                              | `shared/flagged-export.ts`     | `flagged-export.test.ts`                           | Yes                |
| Source normalize / slug                         | `shared/water-source.ts`       | `water-source.test.ts`                             | Yes                |
| Billing plans/status/events                     | `shared/billing.ts`            | `billing.test.ts`                                  | Yes                |
| CRWA roll-up sanitize                           | `shared/crwa-rollup.ts`        | `agent-isolation.test.ts`                          | Yes                |
| Agent context / confirm / isolation             | `shared/agent-context.ts`      | `agent-isolation.test.ts`                          | Yes                |
| Conversation store                              | `shared/conversation.ts`       | `agent-isolation.test.ts` (memory)                 | Yes                |
| Bedrock invoke wrapper                          | `shared/bedrock.ts`            | Indirect / live only                               | Thin OK            |
| Memory/source store isolation                   | `shared/*-store` / dynamo      | `source-store.test.ts`, meter-history              | Yes                |
| Dynamo factories                                | `shared/dynamo-store.ts`       | Indirect via stores                                | Thin env wiring OK |
| Cognito admin client                            | `shared/cognito-admin.ts`      | `admin-isolation.test.ts` (mock)                   | Yes                |
| `tenantFromKey`                                 | `handlers/s3-ingest.ts`        | `s3-ingest.test.ts`                                | Yes                |
| HTTP helpers (`ok`/`csv`/…)                     | `shared/http.ts`               | Indirect via handlers                              | Yes                |
| `AuthService` (login, MFA, password, `/me`)     | `frontend/.../auth.service.ts` | Manual D5 + F2 login smoke                         | Needs unit test    |

---

## AI Tools / Orchestrators

- [x] `handlers/agent.ts` — routed `GET/POST /agent` (Terraform); tenant isolation + confirm guardrails proven; Bedrock optional fallback to templates.
- [x] `POST /alerts/explain` — template explain (C6) proven in `agent-isolation.test.ts`.
- [x] MCP `crwa-rag` (`search_codebase` / `refresh_index`) — agent protocol, not product API.

---

## Key Workflows

- [x] **Auth → tenant isolation** — JWT claims → `parseAuthFromClaims` / `requireTenantId`; proven in `auth.test.ts`, `balance-auth.test.ts`, `admin-isolation.test.ts`, `source-store.test.ts`
- [x] **Customer CSV/Excel ingest path** — parse + location upsert; `csv-parse.test.ts`, `excel-parse.test.ts`, `meter-location.test.ts`
- [x] **Source CRUD + source ingest → balance** — `water-source`, `source-store`, `source-csv-parse`, `water-balance` tests
- [x] **Alerts (usage + balance + status + CSV + explain)** — engine / status / flagged-export / balance-alerts / alert-explain
- [x] **Billing ledger + municipality view** — `billing.test.ts`, `admin-isolation.test.ts`
- [x] **Agent isolation + confirm** — `agent-isolation.test.ts` (E4/E5/E6)
- [x] **CRWA roll-up sanitize** — no PII / cross-tenant leakage in roll-up rows
- [ ] **Kelly F2 smoke end-to-end** — [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) boxes still open for live env
- [ ] **S3 → s3-ingest → Dynamo** — `tenantFromKey` proven; full event handler not yet
- [ ] **Admin invite happy path against Cognito** — isolation rules unit-tested; live invite is manual

---

## Meta

- Re-run scanner after structural changes; treat this overlay as source of truth for TS until scanner learns handlers.
- Spec layers: [SPEC.md](./SPEC.md) §0; isolation: [TENANT_ISOLATION.md](./TENANT_ISOLATION.md).
- Do not hand-edit `function-inventory.generated.md`.

---

*Water Saver / Colorado Rural Water — function-inventory overlay.*
