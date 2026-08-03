# Water Saver Action Items (Human + Agent Overlay)

**Generated inventory source:** [function-inventory.generated.md](./function-inventory.generated.md)
**Visual tree:** [function-tree.md](./function-tree.md)

**Update rule:** After adding or changing public handlers, pages, or shared exports:
1. Run `python3 ~/.cursor/skills/function-inventory/scripts/update-function-inventory.py --output docs/function-inventory.generated.md`
2. Check this overlay — stock scanner is C#/Blazor-oriented (0 TS functions auto-tracked). Keep this file honest.
3. Record proof (test file or manual smoke) and whether impl is minimal.
4. Update [function-tree.md](./function-tree.md) when high-level structure changes.

**Scanner note (2026-08-03):** `function-inventory.generated.md` reports **0 tracked functions** because discovery is C#-only. This overlay is the authoritative Water Saver surface until a TS pass exists. Ignore `mcp/crwa-rag/node_modules` noise in the generated UI table.

**Backend proof baseline:** `cd backend && npm test` → **71 pass** (2026-08-03).

---

## Priorities

- [x] Bootstrap inventory docs + tree for Water Saver (Angular/TS + Lambda)
- [ ] Add TypeScript discovery to function-inventory scanner (handlers `export const handler`, `export function`) — vNext
- [ ] Handler-level integration proofs for routes that only have shared-unit or auth smoke today
- [ ] Frontend page proofs beyond `app.spec.ts` (Kelly smoke / DEMO_WALKTHROUGH)

---

## API Endpoints — Status & Verification

| Route                                                                     | Handler                                | Proof                                                                           | Minimal? | Status                      |
| ------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- | -------- | --------------------------- |
| `GET /health`                                                             | `handlers/health.ts` `handler`         | Manual / smoke                                                                  | Yes      | OK                          |
| `GET /me`                                                                 | `handlers/me.ts` `handler`             | Manual smoke (`SMOKE_CHECKLIST`); auth helpers proven                           | Yes      | OK                          |
| `POST /uploads/presign`                                                   | `handlers/upload-url.ts` `handler`     | Manual smoke (upload flow)                                                      | Yes      | Needs handler test          |
| `POST /ingest`                                                            | `handlers/ingest.ts` `handler`         | Shared: `csv-parse.test.ts`, `meter-location.test.ts`                           | Yes      | Shared proven; handler thin |
| `POST /ingest/sources`                                                    | `handlers/ingest-sources.ts` `handler` | `balance-auth.test.ts` (401/403); `source-csv-parse.test.ts`                    | Yes      | Auth proven                 |
| S3 event ingest                                                           | `handlers/s3-ingest.ts` `handler`      | Shared ingest path                                                              | Yes      | Needs event test            |
| `GET/POST /alerts`                                                        | `handlers/alerts.ts` `handler`         | `alert-engine`, `alert-status`, `flagged-export`, `balance-alerts` tests        | Yes      | Shared proven               |
| `GET/POST /sources`, `PUT/DELETE /sources/{id}`                           | `handlers/sources.ts` `handler`        | `source-store.test.ts`, `water-source.test.ts`                                  | Yes      | Shared proven               |
| `GET /balance`, `PUT /balance/thresholds`                                 | `handlers/balance.ts` `handler`        | `balance-auth.test.ts`; `water-balance`, `balance-thresholds`, `balance-alerts` | Yes      | Auth + calc proven          |
| `GET /meters/{meterId}`                                                   | `handlers/meters.ts` `handler`         | `meter-history.test.ts` + `meter-location.test.ts` (PUT patch shape)            | Yes      | OK                          |
| `PUT /meters/{meterId}`                                                   | `handlers/meters.ts` `handler`         | `meter-location.test.ts` (parseMeterMetadataPatch / applyMeterMetadataPatch)    | Yes      | OK                          |
| `GET/POST /admin/tenants`, `GET /admin/users`, `POST /admin/users/invite` | `handlers/admin.ts` `handler`          | `admin-isolation.test.ts`; `auth.test.ts`                                       | Yes      | Isolation proven            |
| Agent stub (bundled, **no API route yet**)                                | `handlers/agent.ts` `handler`          | None (Epic E stub)                                                              | Yes stub | Deferred / Pilot-out        |

**Verification commands:**

```bash
cd backend && npm test
# Live smoke: docs/SMOKE_CHECKLIST.md + Bearer curls against $API
```

---

## Pages & Major Components

| Page / route  | Component                 | Proof                          | Status          |
| ------------- | ------------------------- | ------------------------------ | --------------- |
| `/login`      | `LoginPageComponent`      | Manual F2 #6                   | Needs automated |
| `/dashboard`  | `DashboardPageComponent`  | Manual F2 #2                   | Needs automated |
| `/upload`     | `UploadPageComponent`     | Manual F2 #1                   | Needs automated |
| `/sources`    | `SourcesPageComponent`    | Manual F2 #3                   | Needs automated |
| `/alerts`     | `AlertsPageComponent`     | Manual F2 / C3–C4              | Needs automated |
| `/admin`      | `AdminPageComponent`      | Manual (system/CRWA admin)     | Needs automated |
| `/crwa`       | `CrwaRollupPageComponent` | Pilot-out / stub UX            | Deferred        |
| Shell         | `ShellComponent`          | Manual nav                     | OK for Kelly    |
| App bootstrap | `app.ts`                  | `frontend/src/app/app.spec.ts` | Thin proof      |

---

## Core Services & Public Methods

| Function / surface                              | Location                       | Proof                                 | Minimal?           |
| ----------------------------------------------- | ------------------------------ | ------------------------------------- | ------------------ |
| `parseAuthFromClaims`, `requireTenantId`, roles | `shared/auth.ts`               | `auth.test.ts`                        | Yes                |
| `normalizeTenantId` / email / password          | `shared/tenant-admin.ts`       | `auth.test.ts`                        | Yes                |
| CSV customer parse + mapping                    | `shared/csv-parse.ts`          | `csv-parse.test.ts`                   | Yes                |
| Source CSV parse                                | `shared/source-csv-parse.ts`   | `source-csv-parse.test.ts`            | Yes                |
| Meter location upsert                           | `shared/meter-location.ts`     | `meter-location.test.ts`              | Yes                |
| Water balance calc                              | `shared/water-balance.ts`      | `water-balance.test.ts`               | Yes                |
| Alert engine + confidence                       | `shared/alert-engine.ts`       | `alert-engine.test.ts`                | Yes                |
| Balance alerts                                  | `shared/balance-alerts.ts`     | `balance-alerts.test.ts`              | Yes                |
| Alert status apply                              | `shared/alert-status.ts`       | `alert-status.test.ts`                | Yes                |
| Threshold merge/patch                           | `shared/balance-thresholds.ts` | `balance-thresholds.test.ts`          | Yes                |
| Flagged CSV export                              | `shared/flagged-export.ts`     | `flagged-export.test.ts`              | Yes                |
| Source normalize / slug                         | `shared/water-source.ts`       | `water-source.test.ts`                | Yes                |
| Memory/source store isolation                   | `shared/*-store` / dynamo      | `source-store.test.ts`, meter-history | Yes                |
| Dynamo factories                                | `shared/dynamo-store.ts`       | Indirect via stores                   | Thin env wiring OK |
| Cognito admin client                            | `shared/cognito-admin.ts`      | `admin-isolation.test.ts` (mock)      | Yes                |
| HTTP helpers (`ok`/`csv`/…)                     | `shared/http.ts`               | Indirect via handlers                 | Yes                |
| `AuthService` (login, `/me`, roles)             | `frontend/.../auth.service.ts` | Manual login smoke                    | Needs unit test    |

---

## AI Tools / Orchestrators

- [ ] `handlers/agent.ts` — stub only; tenant-scoped reply; **not routed in Terraform**. Epic E when wired.
- [x] MCP `crwa-rag` (`search_codebase` / `refresh_index`) — agent protocol, not product API.

---

## Key Workflows

- [x] **Auth → tenant isolation** — JWT claims → `parseAuthFromClaims` / `requireTenantId`; proven in `auth.test.ts`, `balance-auth.test.ts`, `admin-isolation.test.ts`, `source-store.test.ts`
- [x] **Customer CSV ingest path** — parse + location upsert + commit helpers; `csv-parse.test.ts`, `meter-location.test.ts`
- [x] **Source CRUD + source ingest → balance** — `water-source`, `source-store`, `source-csv-parse`, `water-balance` tests
- [x] **Alerts (usage + balance + status + CSV)** — engine / status / flagged-export / balance-alerts tests
- [ ] **Kelly F2 smoke end-to-end** — [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) boxes still open for live env
- [ ] **S3 → s3-ingest → Dynamo** — no dedicated event test yet
- [ ] **Admin invite happy path against Cognito** — isolation rules unit-tested; live invite is manual

---

## Meta

- Re-run scanner after structural changes; treat this overlay as source of truth for TS until scanner learns handlers.
- Spec layers: [SPEC.md](./SPEC.md) §0; isolation: [TENANT_ISOLATION.md](./TENANT_ISOLATION.md).
- Do not hand-edit `function-inventory.generated.md`.

---

*Water Saver / Colorado Rural Water — function-inventory overlay.*
