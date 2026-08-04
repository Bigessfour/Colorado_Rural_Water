# Member onboarding intake & reports (Feature 012)

Pilot product feature: guided member intake Q&A and clerk-ready reports.

## Onboarding (`/onboarding`)

Six-step wizard saves tenant-scoped intake at `META#onboarding`:

- System & map town
- Operator / billing clerk contacts (incl. phone)
- Meter and well counts, units, read schedule
- **Municipal export system** (CSV/XLS habits — not CRWA membership billing)
- Data inventory Path A–D

API: `GET /onboarding`, `PUT /onboarding` (?complete=1 to finish)

The Assistant still answers inventory questions; it now points operators to the wizard.

## Reports (`/reports`)

| Report | Format | API |
| ------ | ------ | --- |
| Flagged meters work order | CSV, XLSX | `GET /reports/work-orders?format=csv\|xlsx` |
| Operations summary | HTML (Print → PDF) | `GET /reports/summary?format=html` |

Work orders include meter ID, address, alert summary, Confidence note, recommended field action, lat/lng when known, and a `/meters?selected=` map link.

## Deploy notes

- Rebuild Lambda zip: `node scripts/build-lambda-zip.mjs`
- Terraform adds `onboarding` and `reports` handlers + routes
- Optional: set `APP_BASE_URL` on reports Lambda for absolute map links in exports

## Spec Kit

- Feature dir: `specs/012-member-onboarding-reports/`
- Active pointer: `.specify/feature.json`
