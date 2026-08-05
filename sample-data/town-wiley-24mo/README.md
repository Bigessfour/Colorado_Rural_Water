# Town of Wiley — 24-month demo dataset (300 meters, 2 wells)

**Purpose:** Realistic multi-year fixture to exercise Water Saver end-to-end:
Data Confidence (Strong), water balance trends, Watch vs Actionable alerts, bulk ingest, and mapper tolerance.

**Tenant suggestion:** `town-wiley` (existing demo tenant)

---

## Files

| File                                          | Rows           | Role                                                        |
| --------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `customer_readings_2024H2.csv` … `2026H1.csv` | ~1.5–2.1k each | **Prefer for ingest** — clean, ~141–198 KiB                 |
| `customer_readings_MESSY_*.csv`               | same           | Messy-header chunks (2 bad dates omitted)                   |
| `customer_readings_24mo.csv`                  | ~7,191         | Full clean monolith (reference; avoid for live ingest)      |
| `customer_readings_24mo_MESSY.csv`            | ~7,193         | Full messy monolith                                         |
| `source_readings_24mo.csv`                    | 47             | Well production for **Well 1 - North** / **Well 2 - South** |
| `meters_inventory.csv`                        | 300            | Asset metadata                                              |
| `ANOMALIES.json`                              | —              | Stuck / high / gap / diagnostic manifest                    |
| `validate_and_log.py` / `split_readings.py`   | —              | Validate; regenerate half-year chunks                       |
| `validation_report.json`                      | —              | Last validation output                                      |

**Period:** 2024-08 → 2026-07 (24 months)

---

## What this dataset is designed to prove

| Feature             | What you should see                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Data Confidence** | Strong (12+ months + seasonality)                                                              |
| **Seasonality**     | Higher summer usage, lower winter                                                              |
| **Stuck meters**    | M-1012, M-1047, M-1118, M-1203, M-1271 — flat cumulative last ~5 months → Actionable           |
| **High usage**      | M-1033, M-1089, M-1156, M-1244 — chronic high baselines                                        |
| **Gaps**            | M-1055, M-1170, M-1288 — missing months mid-series                                             |
| **Name change**     | M-1076, M-1191 — occupant changes mid-history (same meter + address)                           |
| **Diagnostics**     | M-1022, M-1140, M-1260 — LOW_BATTERY / TAMPER / REVERSE_FLOW in later months                   |
| **Water balance**   | Most months both wells present; **2025-07** missing South → `insufficient` / one-sided warning |
| **Loss band**       | Production ~12–20% above billed (typical rural unaccounted range)                              |

---

## How to use in demo / Assessment

1. **Validate first** (logging for misconfig / bad rows):

```bash
cd sample-data/town-wiley-24mo
python3 validate_and_log.py -v
# or
python3 validate_and_log.py --customer customer_readings_24mo_MESSY.csv --json-out /tmp/messy-report.json
```

2. **Ingest customer chunks** (chronological order) via **S3 drop-zone** (preferred) or Upload:

   ```text
   customer_readings_2024H2.csv   # 2024-08 → 2024-12
   customer_readings_2025H1.csv
   customer_readings_2025H2.csv
   customer_readings_2026H1.csv   # through 2026-07
   ```

   Wait for each `s3-ingest` to finish before the next. Use `customer_readings_MESSY_*.csv` only to demo mapper / bad rows.

   Regenerate splits: `python3 split_readings.py`

3. **Create sources** if not present:
   - Well 1 - North
   - Well 2 - South

4. **Ingest** `source_readings_24mo.csv`.

5. **Dashboard:** Confidence Strong, balance bars populated, alert feed with stuck = Actionable and statistical items appropriately gated.

6. **Optional:** Load `meters_inventory.csv` concepts via Meters page / metadata fields (install date, manufacturer, etc.).

---

## Logging / runtime checks

`validate_and_log.py` logs:

- Missing required column mappings (ingest config / mapper failures)
- Bad dates and non-numeric readings
- Empty meter IDs
- Unexpected units
- Flat cumulative sequences (stuck candidates)
- Source months with only one well (balance insufficient risk)
- Inventory vs readings meter-count mismatch

Exit code **1** if errors (not just warnings). Use before a live Kelly or Assessment dry-run so surprises show up in the log, not mid-demo.

---

## Notes

- Cumulative readings are strictly non-decreasing except intentional stuck freezes.
- Units are gallons throughout the clean files.
- No real PII — synthetic rural Wiley-style addresses and names.
- Reproducible: generator used `random.seed(42)`.
