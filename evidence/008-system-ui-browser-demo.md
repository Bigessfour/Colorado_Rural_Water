# Evidence — Feature 008 System UI / Browser Demo

**Date:** 2026-08-04
**Status:** verified / closed (honest)
**Account:** `388691194728` · `us-east-1` · tenant `town-wiley`

## What was polished (demo spine)

| Item                            | Change                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PrimeUI license toast (Compose) | Compose `fileReplacements` → `primeng-license.local.ts`; Dockerfile fallback; CSS hide on `body.compose-demo` |
| Assistant markdown              | `SafeMarkdownPipe` — bold/lists/headers rendered in bubbles                                                   |
| Compose shell                   | Assessment banner; **Assistant** nav without Cognito; “Compose demo” auth chip                                |
| Spine UX                        | Shared page tokens; login/dashboard/upload/alerts/assistant headers; dashboard Refresh CTA                    |

## Live prove

### Compose AI (`http://localhost:8080`)

- Banner + Assistant nav present; license toast not dominating
- Onboarding / Watch vs Actionable replies with **rendered** `<strong>` markdown
- Screenshot: [`screenshots/008-compose-assistant-polished.png`](screenshots/008-compose-assistant-polished.png)
- Baseline (before): [`screenshots/008-baseline-assistant-compose.png`](screenshots/008-baseline-assistant-compose.png)

### Cognito SPA (`http://localhost:4200`)

Created Assessment demo user `demo.operator@watersaver.local` in pool `us-east-1_oZlKJ1y39` (operators, `custom:tenant_id=town-wiley`). Seeded `sample-data/messy-readings-july.csv` via `POST /ingest` + sources ingest.

| Step               | Result                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in session    | Shell shows email + Sign out                                                                                                                                                                                       |
| Dashboard          | Meters **5**, alerts **3** (1 Watch · 2 Actionable), balance **88.7%**, Confidence Thin — screenshot [`008-dashboard-cognito.png`](screenshots/008-dashboard-cognito.png)                                          |
| Alerts Acknowledge | Balance alert **accepted** with note — screenshot [`008-alerts-ack.png`](screenshots/008-alerts-ack.png)                                                                                                           |
| Upload page        | Signed-in Upload UI shown — [`008-upload-signed-in.png`](screenshots/008-upload-signed-in.png); full mapper poke blocked on synthetic File (stuck “Reading…”); **ingest path proved via API** with same sample CSV |

**CORS note:** API allows `http://localhost:4200` — use hostname `localhost`, not `127.0.0.1`.

## Demo script

[`docs/ASSESSMENT_III_DEMO.md`](../docs/ASSESSMENT_III_DEMO.md)

## Not claimed

- Full admin/billing/CRWA visual redesign
- Kelly Zoom user from us-east-2 secret pool (wrong account) — Water Saver pool user created for this prove
- Synthetic File upload mapper completing in Chrome automation
