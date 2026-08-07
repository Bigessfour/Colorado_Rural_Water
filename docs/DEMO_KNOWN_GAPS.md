# Known Pilot gaps (honest list for Kelly / Assessment III)

Use this if Kelly or a grader asks what’s unfinished. Do **not** present these as Kelly Stay blockers.

| Gap                           | Status                 | Notes                                                                                     |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| Public HTTPS SPA (CloudFront) | **Live** (2026-08-07)  | `https://d1gokx5wxrd4x6.cloudfront.net` — redeploy via `./scripts/deploy-spa.sh`          |
| Reports hub downloads         | **Live** (2026-08-04)  | Terraform applied: `water-saver-dev-reports` + API routes                                 |
| Account MFA live prove        | Partial / Pilot        | Template + Vitest; skip in F1 unless asked                                                |
| Cognito JWT RAG (Feature 014) | **Live** (2026-08-05)  | Product: Bedrock KB + Dynamo tools + CONV#; Compose FAISS/stub tools = Assessment-only (`composeDemo: true`) |
| CRWA payment processor        | Externally blocked     | Manual ledger / offline billing only                                                      |
| Tenant map center + meter pins | **Live** (2026-08-05) | Wiley map center on `/me`; 319/320 meters pinned (1099 left unmapped on purpose)          |
| Member intake (town-wiley)    | **Complete** (2026-08-05) | Path D + CIS/column hints; dashboard nudge cleared                                     |
| Multi-year bulk history UX    | Out of scope for Kelly | Spec §0 (24mo already loaded for demo)                                                    |

## Fixed during 2026-08-04 demo prep (no longer gaps)

- Kelly Cognito user missing from us-east-1 SPA pool → recreated
- Multi-group Cognito JWT role parsing (`crwa_admins` + `operators`) → deployed
- Compose Bedrock `NoCredentialsError` → export `codeplatoon` creds into gitignored `.env` and `docker compose up -d --force-recreate backend` before Assessment spine B

## Before Assessment III live

```bash
eval "$(aws configure export-credentials --profile codeplatoon --format env)"
# refresh AWS_* in .env, then:
docker compose up -d --force-recreate backend
./scripts/smoke.sh http://127.0.0.1:3000
```
