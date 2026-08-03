# F2 — Kelly smoke checklist (Spec §11a)

Run against a signed-in demo operator on the live (or staging) SPA + API. Check each box only when verified in that environment.

| # | Spec §11a criterion | How to verify | Pass? |
| --- | --- | --- | --- |
| 1 | Non-technical user can ingest a messy **customer** file with friendly guidance | Upload `sample-data/messy-readings-july.csv`; mapper/forgiving parse; no crash | [ ] |
| 2 | Dashboard shows trends, **live water balance** (or calm `insufficient`), **Data Confidence**, prioritized alerts with Watch vs Actionable | Sign in → dashboard: KPI row, Confidence card, balance card + chart, alert feed tags | [ ] |
| 3 | Operator can name 2–3 sources, ingest source readings, see In/Out/Loss (or insufficient) | Sources CRUD + source CSV / manual reading; dashboard In/Out updates | [ ] |
| 4 | Balance / statistical alerts never read as dig-now on Thin data | Thin Confidence → usage outliers + balance alerts tagged **Watch**; copy is calm | [ ] |
| 5 | Tenant isolation demonstrable (JWT → `tenant_id`; no client override) | `/me` or network tab shows tenant from token; no tenant picker override | [ ] |
| 6 | Sign-in works for demo operator (email/password) | Cognito SPA login succeeds | [ ] |
| 7 | Critical path feels calm / rural-friendly | No confusing setup screens on the F1 path | [ ] |
| 8 | Scripted walkthrough (F1) + this checklist pass without runtime errors | Complete [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md); console clean on happy path | [ ] |

## Quick API smoke (optional)

With a Bearer token for the demo tenant:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$API/me"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/balance"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/alerts"   # includes balanceAlerts + statuses
# C3: POST acknowledge / resolve (persists ALERT#STATUS# under tenant)
# curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   -d '{"action":"acknowledge","alertId":"<id>"}' "$API/alerts"
# C4: flagged meters CSV (confidenceNote column includes Watch caveat)
# curl -sS -H "Authorization: Bearer $TOKEN" "$API/alerts?format=csv" -o flagged-meters.csv
# C5: meter history (service address + current occupant + readings)
# curl -sS -H "Authorization: Bearer $TOKEN" "$API/meters/<meterId>"
# G4: optional PUT tenant thresholds (defaults remain Spec §7a if unset)
# curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   -d '{"lossPct":18}' "$API/balance/thresholds"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/sources"
```

Expect: `200`, JSON scoped to one tenant; `balanceAlerts` present (may be `[]`); no cross-tenant fields.

## Not required for Kelly (Pilot)

Persisted ack audit (C3 — shipped), export (C4 — shipped), meter history (C5 — shipped), CRWA roll-up, AI agent, MFA UX, bulk multi-year history.
