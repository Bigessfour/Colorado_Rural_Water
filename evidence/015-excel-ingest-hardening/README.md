2026-08-05T01:38:52Z

# 015 — Excel-first ingest hardening (Kelly-safe)

## UI prove (localhost:4200/upload)

- Excel-first heading, Choose Excel or CSV, drag-zone Excel-first, 12-month guidance
- Screenshot: [upload-excel-first-2026-08-04.png](./upload-excel-first-2026-08-04.png)

## API prove (live /ingest)

- Fixture: `sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx`
- dryRun: 29 of 31 rows would import; 2 skipped
- commit: Imported 29 of 31 rows; 29 readings written

## S3 ops

- `scripts/smoke-presign-ingest.sh` — presign + PutObject HTTP 200
- IAM: added `s3:ListBucket` with `tenants/*` prefix (Terraform applied)
