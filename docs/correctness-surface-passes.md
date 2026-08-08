# Correctness surface passes

Register for the curated queue in [`.function-inventory.json`](../.function-inventory.json) (`tracking_mode: surfaces`).

**Legend:** Unit = co-located `*.test.ts` / `*.spec.ts` · Integration = cross-module / isolation · E2E = [`PROVE_FEATURES.md`](./PROVE_FEATURES.md) browser prove.

| Tier | Surface                                                                   | Unit                        | Integration                      | E2E / Prove                                         | Config notes                                                | Pass date  |
| ---- | ------------------------------------------------------------------------- | --------------------------- | -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| P1   | `auth.service.ts`                                                         | yes                         | JWT/`auth.test.ts`               | Sign-in pass                                        | Cognito pool matches `AWS_ACCOUNT`                          | 2026-08-08 |
| P1   | `login-page`                                                              | yes (expanded)              | Cognito live                     | **pass** 2026-08-08 widgets+sign-in+bad-password    | Password fields use `pInputText`; Cognito IDs match secrets | 2026-08-08 |
| P1   | `upload-page`                                                             | yes                         | ingest dryRun                    | **pass** 2026-08-08 Practice CSV→Check              | Excel-first; Ask Assistant map; file picker auto-blocked    | 2026-08-08 |
| P1   | `dashboard-page`                                                          | yes                         | balance/alerts shared            | **pass** 2026-08-08 widgets+Refresh+compare         | Calm KPI softener; lastIngest gap noted                     | 2026-08-08 |
| P1   | `alerts-page`                                                             | yes                         | `alerts.test.ts`                 | **pass** 2026-08-08 Refresh/Explain/Act/Hist/Export | Explain letter-prose + Act no Cancel → DEMO_KNOWN_GAPS      | 2026-08-08 |
| P1   | `review.service`                                                          | yes                         | `review.test.ts`                 | **pass** 2026-08-08 Start→rate→Skip→Submit visible  | Submit skipped (emails Steve); prior 2026-08-04 submit      | 2026-08-08 |
| P1   | `me.ts`                                                                   | yes                         | —                                | Sign-in /me                                         | —                                                           | 2026-08-08 |
| P1   | `ingest.ts`                                                               | **added** `ingest.test.ts`  | csv/excel parse                  | Upload pass                                         | JWT tenant only; dryRun                                     | 2026-08-08 |
| P1   | `alerts.ts`                                                               | **added** `alerts.test.ts`  | alert-engine/status              | Alerts pass                                         | —                                                           | 2026-08-08 |
| P1   | `review.ts`                                                               | yes                         | SES path                         | **pass** 2026-08-08 (panel; prior SES submit)       | —                                                           | 2026-08-08 |
| P2   | `review-panel` / howto                                                    | yes                         | —                                | **pass** 2026-08-08                                 | `/review`                                                   | 2026-08-08 |
| P2   | `upload-url` / `s3-ingest`                                                | yes                         | memory S3 event                  | Upload path                                         | key tenant prefix                                           | 2026-08-08 |
| P2   | `balance.ts`                                                              | **added** + `balance-auth`  | water-balance                    | Dashboard                                           | —                                                           | 2026-08-08 |
| P2   | `shared/auth` / alert-engine / water-balance                              | yes                         | isolation suites                 | —                                                   | —                                                           | 2026-08-08 |
| P2   | `help-page`                                                               | yes (smokes)                | —                                | **pass** 2026-08-08 Operator + CRWA guides          | `/help/tenant` + `/help/crwa` `.guide-body` markdown        | 2026-08-08 |
| P2   | `settings-page`                                                           | yes (smokes)                | —                                | **pass** 2026-08-08 Light/Dark + profile links      | Settings Display SelectButton toggles `html.app-dark`       | 2026-08-08 |
| P2   | `shell.component.ts`                                                      | yes (theme service)         | —                                | **pass** 2026-08-08 header Light/Dark               | Shell + Settings both drive theme; `app-dark` verified      | 2026-08-08 |
| P2   | `account-page`                                                            | yes (smokes)                | —                                | **pass** 2026-08-08 UI poke; MFA enroll deferred    | password fields + MFA Off + Set up authenticator; no submit | 2026-08-08 |
| P2   | `billing-page` (operator gate)                                            | yes (smokes)                | —                                | **pass** 2026-08-08 calm deny                       | not in More nav; System Admin-only info message             | 2026-08-08 |
| P2   | `admin-page` (operator gate)                                              | yes (smokes)                | admin-isolation                  | **pass** 2026-08-08 calm deny                       | not in More nav; Operator-only info; no invite form         | 2026-08-08 |
| P2   | `crwa-rollup-page` (operator gate)                                        | yes (smokes)                | —                                | **pass** 2026-08-08 calm deny                       | not in More nav; CRWA Admin role required info              | 2026-08-08 |
| P2   | meters/sources/agent/admin/reports/onboarding pages                       | yes (smokes)                | —                                | Meters+Sources+Reports **pass** 2026-08-08          | Sources Suggest pin calm miss OK; Reports CSV+print blob OK | 2026-08-08 |
| P2   | `meters`/`sources`/`ingest-sources`/`agent`/`admin`/`onboarding` handlers | **added** auth tests        | admin-isolation, agent-isolation | matching prove rows                                 | Admin creates stores before role check                      | 2026-08-08 |
| P2   | `reports.ts`                                                              | **added** `reports.test.ts` | work-order-export                | Reports **pass** 2026-08-08                         | TF routes `/reports/work-orders`+`/summary`                 | 2026-08-08 |
| P2   | `health.ts`                                                               | **added** `health.test.ts`  | smoke.sh                         | live `/health` 200                                  | —                                                           | 2026-08-08 |
| P2   | `dynamo-store`                                                            | `dynamo-store-env.test.ts`  | memory CRUD tests                | —                                                   | requires `DATA_TABLE` in AWS                                | 2026-08-08 |
| P2   | `kb-retrieve`                                                             | yes                         | —                                | Cognito JWT RAG pass                                | —                                                           | 2026-08-08 |

## Misconfigurations found & fixed (2026-08-08)

1. **Cognito `ragPath: '/api/rag'`** in `environment.ts` / `environment.development.ts` — API Gateway has no `/api/rag` (Compose-only). Cleared to `''`; product chat uses `agentPath: '/agent'` gated by `composeDemo`.
2. **Missing co-located handler tests** for ingest/alerts/balance/meters/sources/ingest-sources/agent/admin/reports/onboarding/health — inventory claimed proof via unrelated files. Added auth (+ ingest dryRun, reports path) tests.
3. **Admin handler** creates Dynamo/Cognito clients before role checks — unit tests cannot assert 403 without `DATA_TABLE`; rely on `admin-isolation.test.ts` for role gates (improvement opportunity: gate role before store construction).
4. **Terraform Apply CI (2026-08-08)** — `demo-access` `aws_dynamodb_table_item` Create failed with `ConditionalCheckFailedException` when town-wiley registry/profile already existed (seeded by admin/onboarding). Replaced with idempotent `terraform_data` + `aws dynamodb put-item` upsert in `modules/demo-access/main.tf`.

## Still open (not blockers for Assessment)

- Account MFA live enrollment → deferred Pilot (UI poke only).
- Sources geocode label quality → fuller place strings improve Suggest pin hits (calm miss message verified 2026-08-08).
- Reports printable blob tab → opens in operator browser; automation may land on blob/Google redirect (API + notice path verified 2026-08-08).

## How to re-verify

```bash
cd backend && npm test
cd frontend && npm test   # Vitest page specs
npm run inventory
# Browser prove: docs/PROVE_FEATURES.md + Chrome DevTools
```
