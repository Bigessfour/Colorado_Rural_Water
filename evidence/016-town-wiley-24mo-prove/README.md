# Evidence 016 — Town of Wiley 24-month feature prove

**When:** 2026-08-04/05
**Tenant:** `town-wiley` · Cognito `demo.operator@watersaver.local`
**SPA:** `http://localhost:4200` → live API `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com`

## Dataset

- `sample-data/town-wiley-24mo/` (~319 meters, ~24 months of customer reads + source production)
- Loaded via S3 ingest after clearing stale column maps

## Live KPIs (dashboard)

| KPI           | Observed                     |
| ------------- | ---------------------------- |
| Meters        | 319                          |
| Open alerts   | 7 (1 Watch · 6 Actionable)   |
| Water balance | 42% unaccounted (July 2026)  |
| Confidence    | Solid · 24 mo · 54% coverage |

## Browser prove (Chrome DevTools)

| Surface   | Result | Notes                                                                                   |
| --------- | ------ | --------------------------------------------------------------------------------------- |
| Dashboard | pass   | Seasonal billed curve; Solid confidence; alert feed                                     |
| Alerts    | pass   | Explain notice; History M-1156 (2 canvases, 24 reads); Accept + note; Export CSV notice |
| Meters    | pass   | 319 rows; Stats M-1012 age 1y 11mo + charts; Map plotted 2/319 (317 missing coords)     |
| Sources   | pass   | 6 named wells listed (includes duplicate North/South naming)                            |
| Upload UI | pass*  | Excel-first steps visible; file picker blocked in automation — dryRun via API           |
| Assistant | pass   | Residual Q → 0.2 mg/L + CDPHE links; sources from `s3://water-saver-dev-knowledge-…`    |
| Reports   | pass   | Download work-order CSV; Recent activity “Downloaded work order CSV”                    |
| Settings  | pass   | Light ↔ Dark; `app-dark` on `<html>`                                                    |

## API prove

See `api-probes.txt`. Highlights:

- `/agent` Watch vs Actionable → `retrievalMode: bedrock-kb`, tool `list_alerts`, KB + CDPHE source URIs
- `/ingest` dryRun → `rowsSeen/Accepted 3/3`, mapping from 24mo-style headers
- `/balance`, `/alerts`, `/meters`, `/sources`, `/reports/*` previously recorded in same file

## Known caveats (data quality, not UI fails)

- Coverage ~54% → Solid not Strong (many M-* lack lat/lng; mix of legacy + new meters)
- ~42% loss inflated by duplicate/old wells splitting production
- Stuck meters from ANOMALIES on M-* mostly not in open alerts (legacy 1045 stuck is)

## Screenshots

PNG files in this folder (`page-2026-08-05T01-5*.png`).
