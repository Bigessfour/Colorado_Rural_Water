# F2 — Kelly smoke checklist (Spec §11a)

Run against a signed-in demo operator on the live (or staging) SPA + API. Check each box only when verified in that environment.

| #   | Spec §11a criterion                                                                                                                       | How to verify                                                                        | Pass?                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Non-technical user can ingest a messy **customer** file with friendly guidance                                                            | Upload `sample-data/messy-readings-july.csv`; mapper/forgiving parse; no crash       | [x] 2026-08-04 Steve F1 — `POST /ingest` dryRun+commit friendly mapping/warnings; Upload UI shown (file picker blocked in automation)                                  |
| 2   | Dashboard shows trends, **live water balance** (or calm `insufficient`), **Data Confidence**, prioritized alerts with Watch vs Actionable | Sign in → dashboard: KPI row, Confidence card, balance card + chart, alert feed tags | [x] 2026-08-04 — 6 meters · 3 alerts · 88.7% · Thin · Watch/Actionable ([evidence/013-kelly-ship-prove](../evidence/013-kelly-ship-prove/f1-dashboard-2026-08-04.png)) |
| 3   | Operator can name 2–3 sources, ingest source readings, see In/Out/Loss (or insufficient)                                                  | Sources CRUD + source CSV / manual reading; dashboard In/Out updates                 | [x] 2026-08-04 — 5 named sources UI + `POST /ingest/sources` commit 6 readings ([f1-sources](../evidence/013-kelly-ship-prove/f1-sources-2026-08-04.png))              |
| 4   | Balance / statistical alerts never read as dig-now on Thin data                                                                           | Thin Confidence → usage outliers + balance alerts tagged **Watch**; copy is calm     | [x] 2026-08-04 — balance Watch + Thin banner; Actionable reserved for stuck/diag meters ([f1-alerts](../evidence/013-kelly-ship-prove/f1-alerts-2026-08-04.png))       |
| 5   | Tenant isolation demonstrable (JWT → `tenant_id`; no client override)                                                                     | `/me` or network tab shows tenant from token; no tenant picker override              | [x] 2026-08-04 `GET /me` + Cognito JWT town-wiley                                                                                                                      |
| 6   | Sign-in works for demo operator (email/password)                                                                                          | Cognito SPA login succeeds                                                           | [x] 2026-08-04 Feature 013 prove session + F1 dry-run                                                                                                                  |
| 7   | Critical path feels calm / rural-friendly                                                                                                 | No confusing setup screens on the F1 path                                            | [x] 2026-08-04 — calm Confidence/Watch copy; no setup wizard on F1 path                                                                                                |
| 8   | Scripted walkthrough (F1) + this checklist pass without runtime errors                                                                    | Complete [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md); console clean on happy path     | [x] 2026-08-04 Steve timed F1 (~12 min); friction log in [evidence/013](../evidence/013-kelly-ship-prove/f1-friction-log.md)                                           |

## Quick API smoke (optional)

With a Bearer token for the demo tenant:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" "$API/me"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/balance"
curl -sS -H "Authorization: Bearer $TOKEN" "$API/alerts"   # includes balanceAlerts + statuses
# C3: POST accept / dispatch / resolve (persists ALERT#STATUS# + ALERT#EVT# under tenant)
# curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   -d '{"action":"accept","alertId":"<id>","meterId":"<meter>","note":"looking tomorrow","summary":"..."}' "$API/alerts"
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

CRWA roll-up, AI agent, bulk multi-year history. **Do** still browser-prove Pilot UI in [PROVE_FEATURES.md](PROVE_FEATURES.md) (alert actions, export, meter history) before calling those Done.

## Pilot smoke — D5 password + MFA (optional)

Pool: Cognito `OPTIONAL` + software token (no SMS). Client-side Cognito APIs only (no Admin MFA IAM).

1. Sign in → **Account** → Change password (current + new; policy ≥12 with upper/lower/number/symbol).
2. **Account** → Set up authenticator → copy secret / open otpauth link → enter 6-digit code → status **On**.
3. Sign out → sign in → enter TOTP on login challenge → land on dashboard.
4. Invited users with temp password: login shows permanent-password step (`NEW_PASSWORD_REQUIRED`).
5. If Account MFA says access token missing: sign out and sign in once (access token now stored in sessionStorage).
