# Assessment III demo path (browser)

System UI bonus (Feature 008): prove the stack end-to-end.

## Compose path (graded)

1. `docker compose up --build`
2. Open <http://localhost:8080>
3. Go to **Assistant** — ask “What is Watch vs Actionable?” (Compose RAG, tenant `town-wiley`)
4. Optional: POST `/api/ingest` with runbook text; re-ask
5. Screenshot → `evidence/08-compose-ui.md`

## AWS product path (after apply on codeplatoon)

1. Sign in (Cognito)
2. **Upload** sample CSV from `sample-data/`
3. **Dashboard / Alerts** — Watch vs Actionable
4. **Acknowledge** an alert
5. **Assistant** — explain alert / onboarding

See also [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) and [PRESENTATION_NOTES.md](../PRESENTATION_NOTES.md).
