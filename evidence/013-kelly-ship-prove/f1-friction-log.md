# F1 dry-run friction log — 2026-08-04

**Timed Steve dry-run** of [`docs/DEMO_WALKTHROUGH.md`](../../docs/DEMO_WALKTHROUGH.md) against live API + `localhost:4200`.

**Elapsed:** ~12 min for happy path (sign-in → dashboard → upload UI → sources → alerts Accept).
**Fixtures:** `sample-data/messy-readings-july.csv`, `messy-source-readings-july.csv`.
**Operator:** `demo.operator@watersaver.local` (F1); `kelly.review@watersaver.local` (review prove).

## What worked

- Cognito sign-in → dashboard KPIs (6 meters, 3 alerts, 88.7% unaccounted, Confidence **Thin**)
- Calm Confidence copy (“not a leak model”; Watch vs Actionable)
- Sources page: 5 named wells; manual add form + CSV guidance
- Alerts: Watch balance row + Actionable meter rows; Accept persists with note
- Messy CSV ingest via `POST /ingest` / `POST /ingest/sources` with friendly mapping + footer/comment skip warnings
- Isolation: `/me` returns JWT `tenant_id=town-wiley` only

## Friction found (and disposition)

| #   | Friction                                                                                                  | Severity | Disposition                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Kelly secrets pointed at deleted **us-east-2** Cognito pool; no `kelly.review` in live us-east-1 SPA pool | **P0**   | **Fixed** — recreated user in `us-east-1_oZlKJ1y39` + updated `~/.cursor/secrets/watersaver-kelly-review-cognito.txt` |
| 2   | Multi-group JWT (`crwa_admins operators`) → `/me` **roles: []** (API GW space-joins groups)               | **P0**   | **Fixed** — `parseCognitoGroups` splits whitespace; redeployed Lambdas                                                |
| 3   | Chrome automation cannot set file inputs; Upload mapper synthetic File stuck at “Reading…”                | Medium   | Documented; prove ingest via API + show Upload UI in screen-share (same as Feature 008)                               |
| 4   | Nav is dense (Pilot: Onboarding/Reports/Assistant)                                                        | Low      | Skip in F1 talk track; do not demo Pilot unless asked                                                                 |
| 5   | Usage chart Aug–Jun flat zero then July spike                                                             | Low      | Matches Thin history story — call it out (“early data”)                                                               |
| 6   | Sources form left with typed-but-unadded “Well North — F1 dry-run” during dry-run                         | Low      | Clear field / Refresh before Kelly session                                                                            |
| 7   | Docker daemon was down mid-session (Compose Assessment spine)                                             | Ops      | Start Docker before Wed Assessment dry-run                                                                            |

## Screenshots

- `f1-dashboard-2026-08-04.png`
- `f1-sources-2026-08-04.png`
- `f1-alerts-2026-08-04.png`
- `f1-kelly-review-submit-2026-08-04.png`
- `f1-admin-kelly-2026-08-04.png`

## Talk track (practice)

1. **Isolation:** “Every API call uses the JWT `tenant_id`; the browser cannot switch municipalities.”
2. **Watch vs Actionable:** “Watch means look when you can (thin history / balance). Actionable stuck/diag may need a field check.”
3. **Confidence:** “Data Confidence is history coverage — not leak accuracy.”
