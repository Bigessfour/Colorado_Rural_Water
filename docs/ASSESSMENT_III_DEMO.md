# Assessment III demo path (browser) — Feature 008

System UI bonus: prove the stack end-to-end with a calm operator walk (~12–15 min).

**AWS:** `388691194728` / `codeplatoon` / `us-east-1` · tag `Assessment-iii`
**Do not claim leaks** from Thin Watch flags.

---

## A) Cognito product spine (upload → alert → acknowledge)

**URL:** <http://localhost:4200> (`cd frontend && npm start` — use **localhost**, not `127.0.0.1`, for API CORS)

1. **Sign in** — Login as demo operator for tenant `town-wiley` (Cognito pool from Terraform outputs). Confirm shell shows email + **Sign out**.
2. **Upload / seed** — Prefer UI Upload with `sample-data/messy-readings-july.csv` (map → dry run → import). If short on time, seed once via `POST /ingest` with the same CSV (Bearer JWT), then show Upload page signed-in.
3. **Sources (optional 1 min)** — Name wells / ingest `messy-source-readings-july.csv` so dashboard balance is live.
4. **Dashboard** — Click **Refresh**. Point to meters monitored, Open alerts (Watch / Actionable), water balance %, Data Confidence Thin/Building, charts.
5. **Alerts → Act** — Open **Alerts** → **Act on alert** → note → **Accept**. Confirm status **accepted** and success notice.
6. **Explain (optional)** — **Explain** on a meter row for plain-language copy (template ± Bedrock).

Talk track: *Watch = look when you can; Actionable stuck/diagnostic may need a field check. Confidence is history depth, not leak accuracy.*

---

## B) Compose AI spine (LangChain + Bedrock + Mem0)

**URL:** <http://localhost:8080> (`docker compose up --build`)

Export AWS keys into Compose for Bedrock (do not commit):

```bash
eval "$(aws configure export-credentials --profile codeplatoon --format env)"
unset AWS_PROFILE
docker compose up -d --force-recreate backend
```

1. Open **Assistant** (nav visible in Compose without Cognito).
2. Ask: “What is Watch vs Actionable for town-wiley?”
3. Optional: onboarding inventory button; Mem0 cross-session recall (see [`evidence/mem0-connection.md`](../evidence/mem0-connection.md)).
4. Note banner: Compose uses tenant headers; Cognito SPA is for upload/alerts.

Screenshots → [`evidence/008-system-ui-browser-demo.md`](../evidence/008-system-ui-browser-demo.md).

---

## C) One-liner for graders

Compose proves **three-tier + Bedrock RAG**. Cognito SPA proves **operator ingest → dashboard → alert acknowledge** with tenant JWT isolation.
