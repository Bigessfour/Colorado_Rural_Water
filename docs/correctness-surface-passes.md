# Correctness surface passes

Register for the curated queue in [`.function-inventory.json`](../.function-inventory.json) (`tracking_mode: surfaces`).

**Legend:** Unit = co-located `*.test.ts` / `*.spec.ts` · Integration = cross-module / isolation · E2E = [`PROVE_FEATURES.md`](./PROVE_FEATURES.md) browser prove.

| Tier | Surface | Unit | Integration | E2E / Prove | Config notes | Pass date |
| ---- | ------- | ---- | ----------- | ----------- | ------------ | --------- |
| P1 | `auth.service.ts` | yes | JWT/`auth.test.ts` | Sign-in pass | Cognito pool matches `AWS_ACCOUNT` | 2026-08-08 |
| P1 | `login-page` | yes | — | Sign-in pass | `/login` route | 2026-08-08 |
| P1 | `upload-page` | yes | ingest dryRun | Upload pass | Excel-first | 2026-08-08 |
| P1 | `dashboard-page` | yes | balance/alerts shared | Dashboard pass | Thin softens | 2026-08-08 |
| P1 | `alerts-page` | yes | `alerts.test.ts` | Alerts + C3 pass | — | 2026-08-08 |
| P1 | `review.service` | yes | `review.test.ts` | Kelly Review pass | — | 2026-08-08 |
| P1 | `me.ts` | yes | — | Sign-in /me | — | 2026-08-08 |
| P1 | `ingest.ts` | **added** `ingest.test.ts` | csv/excel parse | Upload pass | JWT tenant only; dryRun | 2026-08-08 |
| P1 | `alerts.ts` | **added** `alerts.test.ts` | alert-engine/status | Alerts pass | — | 2026-08-08 |
| P1 | `review.ts` | yes | SES path | Kelly Review pass | — | 2026-08-08 |
| P2 | `review-panel` / howto | yes | — | Kelly Review pass | `/review` | 2026-08-08 |
| P2 | `upload-url` / `s3-ingest` | yes | memory S3 event | Upload path | key tenant prefix | 2026-08-08 |
| P2 | `balance.ts` | **added** + `balance-auth` | water-balance | Dashboard | — | 2026-08-08 |
| P2 | `shared/auth` / alert-engine / water-balance | yes | isolation suites | — | — | 2026-08-08 |
| P2 | meters/sources/agent/admin/reports/onboarding pages | yes (smokes) | — | see PROVE matrix | Sources/Reports **partial** prove | 2026-08-08 |
| P2 | `meters`/`sources`/`ingest-sources`/`agent`/`admin`/`onboarding` handlers | **added** auth tests | admin-isolation, agent-isolation | matching prove rows | Admin creates stores before role check | 2026-08-08 |
| P2 | `reports.ts` | **added** `reports.test.ts` | work-order-export | Reports **partial** | TF routes `/reports/work-orders`+`/summary` | 2026-08-08 |
| P2 | `health.ts` | **added** `health.test.ts` | smoke.sh | live `/health` 200 | — | 2026-08-08 |
| P2 | `dynamo-store` | `dynamo-store-env.test.ts` | memory CRUD tests | — | requires `DATA_TABLE` in AWS | 2026-08-08 |
| P2 | `kb-retrieve` | yes | — | Cognito JWT RAG pass | — | 2026-08-08 |

## Misconfigurations found & fixed (2026-08-08)

1. **Cognito `ragPath: '/api/rag'`** in `environment.ts` / `environment.development.ts` — API Gateway has no `/api/rag` (Compose-only). Cleared to `''`; product chat uses `agentPath: '/agent'` gated by `composeDemo`.
2. **Missing co-located handler tests** for ingest/alerts/balance/meters/sources/ingest-sources/agent/admin/reports/onboarding/health — inventory claimed proof via unrelated files. Added auth (+ ingest dryRun, reports path) tests.
3. **Admin handler** creates Dynamo/Cognito clients before role checks — unit tests cannot assert 403 without `DATA_TABLE`; rely on `admin-isolation.test.ts` for role gates (improvement opportunity: gate role before store construction).

## Still open (not blockers for Assessment)

- Sources map pin / Reports printable sheet live poke → `partial` in PROVE_FEATURES.
- Account MFA live enrollment → deferred Pilot.
- Help / Billing pages → unit smoke only; no dedicated prove row (acceptable P2).

## How to re-verify

```bash
cd backend && npm test
cd frontend && npm test   # Vitest page specs
npm run inventory
# Browser prove: docs/PROVE_FEATURES.md + Chrome DevTools
```
