# Known Pilot gaps (honest list for Kelly / Assessment III)

Use this if Kelly or a grader asks what’s unfinished. Do **not** present these as Kelly Stay blockers.

| Gap                            | Status                    | Notes                                                                                                        |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public HTTPS SPA (CloudFront)  | **Live** (2026-08-07)     | `https://d1gokx5wxrd4x6.cloudfront.net` — redeploy via `./scripts/deploy-spa.sh`                             |
| Reports hub downloads          | **Live** (2026-08-04)     | Terraform applied: `water-saver-dev-reports` + API routes                                                    |
| Account MFA live prove         | Partial / Pilot           | Template + Vitest; skip in F1 unless asked                                                                   |
| Cognito JWT RAG (Feature 014)  | **Live** (2026-08-05)     | Product: Bedrock KB + Dynamo tools + CONV#; Compose FAISS/stub tools = Assessment-only (`composeDemo: true`) |
| CRWA payment processor         | Externally blocked        | Manual ledger / offline billing only                                                                         |
| Tenant map center + meter pins | **Live** (2026-08-05)     | Wiley map center on `/me`; 319/320 meters pinned (1099 left unmapped on purpose)                             |
| Member intake (town-wiley)     | **Complete** (2026-08-05) | Path D + CIS/column hints; dashboard nudge cleared                                                           |
| Multi-year bulk history UX     | Out of scope for Kelly    | Spec §0 (24mo already loaded for demo)                                                                       |

## Later cleanup (surface audit — non-blocking)

| Gap                                                            | Surface             | Notes                                                                                                                                          |
| -------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Logged-in visit to `/login` still shows the form               | Login               | Soft redirect to `/dashboard` (or `/review` for Kelly) when session already valid — recorded 2026-08-08                                        |
| Admin handler builds Dynamo/Cognito clients before role checks | `handlers/admin.ts` | Makes unit-testing 403 harder without `DATA_TABLE` — gate `requireAnyRole` earlier                                                             |
| Dashboard `lastIngest` line empty for Demo/Wiley               | Dashboard           | Widget wired (`data-testid="last-ingest"`); API/session may omit `lastIngest` — confirm ingest metadata on next upload prove                   |
| Alerts Explain sometimes returns letter-template prose         | Alerts              | Bedrock plainLanguage can look like a clerk memo (“Attention…”, “[Your Name]”) instead of a short field note — tighten explain prompt/template |
| Act on alert dialog has no Cancel button                       | Alerts              | Close via header X only; Accept/Dispatch/Mark resolved are the only footer actions                                                             |
| Meters can flash empty during Review navigation                | Meters / Review     | Walkthrough route change can show “No meters yet” until Refresh/load finishes — soft UX race, not data loss                                    |
| Sources Suggest pin misses sparse labels                       | Sources             | Demo source → “No nearby match — try a fuller place label…”; Fine-tune / hand pin still work                                                   |
| CloudFront SPA may lag localhost proves                        | Deploy              | CF object Last-Modified 2026-08-07; prefer `localhost:4200` for instructor UI or run `./scripts/deploy-spa.sh` before public walkthrough        |

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
