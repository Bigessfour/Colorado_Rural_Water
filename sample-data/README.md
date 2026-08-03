# Sample data

Messy, real-world-style meter export fixtures for demos and ingestion tests.

| File | Intent |
| ---- | ------ |
| `Town_of_Steve_Meter_Export_MESSY.xlsx` | **Primary stress fixture** — 3 sheets (Meter Reads July 2026 / Older Reads archive / Clerk Notes). Title rows, awkward headers (`Meter #`, `Acct`, `Read Dt`, `Flag / Alarm`), blank mid-rows, mixed dates, comma readings, CF unit, leak/stuck/low-battery anomalies (STEVE-004/005/012), footer noise. Clerk Notes is ignored by the importer. |
| `messy-readings-july.csv` | Customer meters CSV: mixed dates, **Service Address** (stable) + **Customer** name churn on meter 1042, stuck meter, spike |
| `messy-source-readings-july.csv` | Named wells / production meters for water-balance demos |

## Excel upload (Town of Steve)

1. Open Upload in the SPA (or `POST /ingest` with `excelBase64` + optional `sheetName` / `mergeArchive`).
2. Choose `Town_of_Steve_Meter_Export_MESSY.xlsx` — sheet picker defaults to **Meter Reads July 2026**.
3. Optionally check “Also merge Older Reads / archive sheet”.
4. Dry run → Ingest. S3 drop-zone uploads of `.xlsx` auto-parse with archive merge.

**Size limit:** API + S3 Excel/CSV ingest cap is **5 MiB** decoded. Larger multi-year dumps wait on ticket **H2** (bulk history).

## Meter location rule (fixtures)

- **Service Address** / **Location / Address** is tied to the meter and should not change across rows for the same Meter ID.
- **Customer** (occupant name) may change when someone moves in or the property sells — same Meter ID / address.

## Anomaly meters (Excel)

| Meter | Pattern |
| ----- | ------- |
| STEVE-004 | Leak flags (`LEAK` / `Leak indicator` / `leak`) then repaired |
| STEVE-005 | Stuck at 4200 gal across many months |
| STEVE-012 | Collapsing usage + `Low battery` flag |
