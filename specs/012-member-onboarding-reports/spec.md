# Feature 012: Member Onboarding Intake & Reports

**Rubric:** Pilot product (Epic E2 + Reports extension)
**Status:** verified (MVP shipped 2026-08-04)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all intake, report, and export paths
**Depends on:** D3 tenant provision, Epic B ingest, C4 export, Feature 011 map coords

## User value

| Actor | Value |
| ----- | ----- |
| New municipality operator | Guided intake collects system parameters before first upload; Q&A sets Confidence expectations |
| City clerk | Download work-order spreadsheets/PDF-ready summary for flagged meters with addresses and map links |
| CRWA Admin | Member provision (D3) remains separate; intake completes what CRWA cannot know at signup |
| Rural operator | Reports package dashboard KPIs + alerts for sharing with water superintendent |

## Acceptance criteria

- [x] **Intake wizard** (`/onboarding`): multi-step form saves tenant-scoped profile (town, contacts, meters/wells, municipal CIS/export habits, Path A–D inventory)
- [x] **Assistant alignment**: onboarding keywords route to structured intake + Confidence coaching (Epic E2 thin → structured)
- [x] **Work orders**: `GET /reports/work-orders?format=csv|xlsx` — flagged meters with lat/lng, map deep link, confidence note, recommended action
- [x] **Operations summary**: `GET /reports/summary?format=html` — printable HTML (browser → PDF) with KPIs, balance, confidence, top alerts
- [x] **Reports UI** (`/reports`): download CSV/XLS work orders; open/print summary
- [x] **Nav**: Shell links to Onboarding and Reports for logged-in operators
- [x] Tenant isolation on all APIs; no cross-tenant intake or report data

## Non-goals (this feature)

- Payment processor / membership invoice PDFs (Epic I)
- Direct write-back to municipal CIS
- Server-side PDF engine (use print-friendly HTML for MVP)
- Full Bedrock conversational interview (structured wizard + Assistant stub)

## Primary paths

- `backend/src/shared/onboarding-intake.ts`, `handlers/onboarding.ts`
- `backend/src/shared/work-order-export.ts`, `report-summary.ts`, `handlers/reports.ts`
- `frontend/src/app/pages/onboarding/`, `frontend/src/app/pages/reports/`
- `docs/onboarding-reports.md`

## Intake fields (locked MVP)

System identity, contacts (incl. phone), meter/source counts, read schedule, units, billing cycle note, **municipal export system** (not CRWA dues), export format, Path A–D, history notes.

## Report types (locked MVP)

1. Flagged meters work order (CSV + XLS)
2. Monthly operations summary (HTML → print PDF)
