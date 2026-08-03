# Sample data

Messy, real-world-style meter export fixtures for demos and ingestion tests.

| File                              | Intent                                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `messy-readings-july.csv`         | Customer meters: mixed dates, **Service Address** (stable) + **Customer** name churn on meter 1042, stuck meter, spike |
| `messy-source-readings-july.csv`  | Named wells / production meters for water-balance demos                                         |

## Meter location rule (fixtures)

- **Service Address** is tied to the meter and does not change across rows for the same Meter ID.
- **Customer** (occupant name) may change when someone moves in or the property sells — same Meter ID / address.

Add Excel variants and billing-system-shaped exports as ticket B1 expands.
