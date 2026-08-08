# Correctness surface passes

Register for the curated queue in [`.function-inventory.json`](../.function-inventory.json) (`tracking_mode: surfaces`). **One row per surface** — 42 total (2026-08-08 gap-closure pass).

**Legend:** Unit = co-located `*.test.ts` / `*.spec.ts` · Integration = cross-module / isolation / live API script · E2E = [`PROVE_FEATURES.md`](./PROVE_FEATURES.md) browser prove.

| Tier | Surface              | Unit                                  | Integration               | E2E / Prove                                                                                                   | Config notes                                               | Pass date  |
| ---- | -------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| P1   | `auth.service.ts`    | yes `auth.service.spec.ts`            | `auth.test.ts` JWT claims | **pass** 2026-08-08 — Sign out → `/login` + Sign in shell cleared (localhost + hosted)                        | Cognito pool `us-east-1_bCzPVJFN2`                         | 2026-08-08 |
| P1   | `login-page`         | yes expanded spec                     | Cognito live              | **pass** 2026-08-08 — widgets + sign-in + bad-password                                                        | Password `pInputText`; client `6l2345lb7npfku66v80j0r6qek` | 2026-08-08 |
| P1   | `upload-page`        | yes spec                              | ingest dryRun             | **pass** 2026-08-08 — Practice CSV → Check first “10 rows would import”; hosted CloudFront same               | Excel-first; async job poll when large                     | 2026-08-08 |
| P1   | `dashboard-page`     | yes spec                              | balance/alerts shared     | **pass** 2026-08-08 — KPIs Refresh; In 620k / Out 2.2M / unaccounted trend; hosted dashboard OK               | Calm KPI softener                                          | 2026-08-08 |
| P1   | `alerts-page`        | yes spec                              | `alerts.test.ts`          | **pass** 2026-08-08 — Act→Accept+note committed; History shows accepted timeline; hosted Refresh              | Explain prose shortened 2026-08-08                         | 2026-08-08 |
| P1   | `review.service`     | yes spec                              | `review.test.ts`          | **pass** 2026-08-08 — Start→rate→Skip→Submit visible (send skipped)                                           | Submit emails Steve when live                              | 2026-08-08 |
| P1   | `me.ts`              | yes expanded `me.test.ts`             | live GET /me tenant+roles | **pass** 2026-08-08 — Sign-in returns town-wiley + operator roles + mapTown                                   | Null tenant 200 documented in test                         | 2026-08-08 |
| P1   | `ingest.ts`          | yes `ingest.test.ts`                  | sync commit API           | **pass** 2026-08-08 — POST /ingest dryRun + real commit (unique meter); practice re-import dup guard expected | JWT tenant only                                            | 2026-08-08 |
| P1   | `ingest-jobs.ts`     | yes `ingest-jobs.test.ts`             | POST 202 + poll           | **pass** 2026-08-08 — queue job → poll succeeded (live API)                                                   | Routes `/ingest/jobs`                                      | 2026-08-08 |
| P1   | `ingest-worker.ts`   | yes `ingest-worker.test.ts`           | async Lambda invoke       | **pass** 2026-08-08 — job marks succeeded (live worker + unit guards)                                         | Invoked by ingest-jobs                                     | 2026-08-08 |
| P2   | `alerts.ts`          | yes `alerts.test.ts`                  | alert-engine/status       | **pass** 2026-08-08 — Accept action persisted (browser + handler auth)                                        | Tenant isolation                                           | 2026-08-08 |
| P2   | `review.ts`          | yes                                   | SES path                  | **pass** 2026-08-08 — panel; prior SES submit 2026-08-04                                                      | —                                                          | 2026-08-08 |
| P2   | `review-panel`       | yes spec                              | —                         | **pass** 2026-08-08 — `/review` panel                                                                         | —                                                          | 2026-08-08 |
| P2   | `review-howto`       | yes spec                              | —                         | **pass** 2026-08-08 — how-to page                                                                             | —                                                          | 2026-08-08 |
| P2   | `upload-url`         | yes `upload-url.test.ts`              | presign script            | **pass** 2026-08-08 — `smoke-presign-ingest.sh` presign→S3 Put 200                                            | key tenant prefix                                          | 2026-08-08 |
| P2   | `s3-ingest`          | yes `s3-ingest.test.ts`               | presign→S3 event          | **pass** 2026-08-08 — PutObject triggers ingest path (script + unit event)                                    | `tenants/{tenantId}/uploads/`                              | 2026-08-08 |
| P2   | `balance.ts`         | yes + balance-auth                    | water-balance             | **pass** 2026-08-08 — Dashboard Produced 620,000 gal / Billed 2,219,431 gal / unaccounted % panel             | GET /balance live                                          | 2026-08-08 |
| P2   | `shared/auth`        | yes `auth.test.ts`                    | isolation                 | —                                                                                                             | JWT parse + role helpers                                   | 2026-08-08 |
| P2   | `alert-engine`       | yes                                   | isolation                 | — (engine exercised via alerts E2E)                                                                           | —                                                          | 2026-08-08 |
| P2   | `water-balance`      | yes                                   | isolation                 | — (exercised via dashboard balance E2E)                                                                       | —                                                          | 2026-08-08 |
| P2   | `meters-page`        | yes spec                              | —                         | **pass** 2026-08-08 — list 302; Map 177/318; search wired                                                     | CRUD mutate skipped                                        | 2026-08-08 |
| P2   | `sources-page`       | yes spec                              | sources handler           | **pass** 2026-08-08 — Add North Well #1 + Save 620k gal; map pin; dashboard In moves                          | Manual lat/lng when geocode misses                         | 2026-08-08 |
| P2   | `agent-page`         | yes spec                              | agent.test.ts             | **pass** 2026-08-08 — Hi Demo + coaching reply                                                                | Bedrock KB path                                            | 2026-08-08 |
| P2   | `reports-page`       | yes spec                              | reports.test.ts           | **pass** 2026-08-08 — CSV download + printable sheets                                                         | TF routes wired                                            | 2026-08-08 |
| P2   | `onboarding-page`    | yes spec                              | onboarding.test.ts        | **pass** 2026-08-08 — Step 6/6 complete banner                                                                | Path A downstream                                          | 2026-08-08 |
| P2   | `admin-page`         | yes spec                              | operator gate             | **pass** 2026-08-08 — calm deny for operator                                                                  | not in More nav                                            | 2026-08-08 |
| P2   | `crwa-rollup-page`   | yes spec                              | —                         | **pass** 2026-08-08 — operator calm deny                                                                      | CRWA Admin role info                                       | 2026-08-08 |
| P2   | `billing-page`       | yes spec                              | —                         | **pass** 2026-08-08 — operator calm deny                                                                      | System Admin only                                          | 2026-08-08 |
| P2   | `account-page`       | yes spec                              | —                         | **pass** 2026-08-08 — password + MFA widgets; enroll deferred                                                 | Pilot MFA                                                  | 2026-08-08 |
| P2   | `settings-page`      | yes spec                              | —                         | **pass** 2026-08-08 — Light/Dark + profile links                                                              | `app-dark` verified                                        | 2026-08-08 |
| P2   | `help-page`          | yes spec                              | —                         | **pass** 2026-08-08 — Operator + CRWA guides markdown                                                         | read-only                                                  | 2026-08-08 |
| P2   | `shell.component.ts` | yes theme spec                        | —                         | **pass** 2026-08-08 — header Light/Dark sync                                                                  | CSS vars                                                   | 2026-08-08 |
| P2   | `meters.ts`          | yes `meters.test.ts`                  | auth gates                | matching meters-page prove                                                                                    | tenant isolation                                           | 2026-08-08 |
| P2   | `sources.ts`         | yes `sources.test.ts`                 | auth gates                | matching sources-page prove                                                                                   | tenant isolation                                           | 2026-08-08 |
| P2   | `ingest-sources.ts`  | yes `ingest-sources.test.ts`          | parse path                | sources import path (manual reading prove)                                                                    | JWT tenant                                                 | 2026-08-08 |
| P2   | `agent.ts`           | yes `agent.test.ts`                   | agent-isolation           | matching agent-page prove                                                                                     | no cross-tenant RAG                                        | 2026-08-08 |
| P2   | `admin.ts`           | yes `admin.test.ts` gate before store | admin-isolation           | operator 403 without DATA_TABLE                                                                               | **fixed** role gate before Dynamo                          | 2026-08-08 |
| P2   | `reports.ts`         | yes `reports.test.ts`                 | work-order-export         | matching reports-page prove                                                                                   | signed downloads                                           | 2026-08-08 |
| P2   | `onboarding.ts`      | yes `onboarding.test.ts`              | intake persist            | matching onboarding-page prove                                                                                | —                                                          | 2026-08-08 |
| P2   | `health.ts`          | yes `health.test.ts`                  | curl /health 200          | **pass** 2026-08-08 — live API + hosted smoke                                                                 | public endpoint                                            | 2026-08-08 |
| P2   | `dynamo-store`       | `dynamo-store-env.test.ts`            | memory CRUD               | —                                                                                                             | requires `DATA_TABLE` in AWS                               | 2026-08-08 |
| P2   | `kb-retrieve`        | yes                                   | Bedrock KB                | **pass** 2026-08-05 — Cognito JWT RAG cites CDPHE                                                             | —                                                          | 2026-08-08 |

## Hosted prod smoke (subset)

CloudFront `https://d13u7fsvytjwxn.cloudfront.net` · API `https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com` · **pass** 2026-08-08:

| Check                   | Result                                        |
| ----------------------- | --------------------------------------------- |
| Sign-in (demo.operator) | pass → dashboard Demo · Town of Wiley         |
| Dashboard KPIs          | pass — 302 meters, 620k gal In, balance panel |
| GET /health             | pass — `{"status":"ok"}`                      |
| Upload Check first      | pass — “Looks good — 10 rows would import”    |
| Alerts Refresh          | pass — 7+ rows loaded                         |

## Misconfigurations found & fixed (2026-08-08)

1. **Cognito `ragPath: '/api/rag'`** — cleared; product chat uses `/agent` only.
2. **Missing co-located handler tests** — added ingest-jobs/worker + expanded me/admin tests.
3. **Admin handler** — **fixed:** `gateAdminRoute()` before `createTenantStoreFromEnv()`; unit 403 without `DATA_TABLE`.
4. **Terraform Apply CI** — demo-access Dynamo upsert idempotent.
5. **smoke-presign-ingest.sh defaults** — updated API + Cognito client to post-recreate stack.

## Still open

**None at Pilot close (2026-08-08).** Accepted deferrals → [PILOT_DONE.md](./PILOT_DONE.md#accepted-deferrals-honest--not-pilot-blockers).

## How to re-verify

```bash
cd backend && npm test
cd frontend && npm test
npm run inventory
DEMO_USER='demo.operator@watersaver.local' DEMO_PASS='…' ./scripts/smoke-presign-ingest.sh
# Browser: docs/PROVE_FEATURES.md + cursor-ide-browser / Chrome DevTools
```
