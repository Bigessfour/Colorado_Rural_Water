# F1 — Kelly demo walkthrough (scripted happy path)

**Goal:** A calm ~10–15 minute walkthrough for Kelly Stone / CRWA leadership.  
**Scope:** Spec §0 Kelly Stay + §11a. Do **not** demo Pilot items (AI agent, CRWA roll-up, MFA, threshold admin).

**Fixtures:**

- Customer: [`sample-data/messy-readings-july.csv`](../sample-data/messy-readings-july.csv)
- Sources: [`sample-data/messy-source-readings-july.csv`](../sample-data/messy-source-readings-july.csv)

**Demo tenant:** Cognito user with `custom:tenant_id` set (never pass tenant from the client).

---

## Script (operator persona)

1. **Sign in** — Open the SPA → Login with demo email/password. Confirm redirect to dashboard.
2. **Upload customer readings** — Upload (or S3 drop) the messy customer CSV. Use the visual mapper if columns look odd. Confirm ingest success.
3. **Name sources** — Go to **Sources**. Create 2–3 named wells (e.g. Well 1 – North, Well 2 – South). Calm copy only.
4. **Ingest source readings** — On Sources (or via `kind: source` upload), load `messy-source-readings-july.csv` (or enter one manual period reading).
5. **Dashboard water balance** — Return to dashboard. Point out:
   - **In / Out / Unaccounted** for the period (or calm **Need both sides** if one-sided)
   - Trend chart: Produced, Billed, Unaccounted
6. **Data Confidence** — Show level + display score. Emphasize: *not leak accuracy*. Read the “What would help” line. Note Watch vs Actionable per signal.
7. **Alert feed** — Show meter alerts + any **Water balance** Watch rows. Say out loud: *Watch means look when you can; Actionable stuck/diag may need a field check.*
8. **Alerts page** — Open Alerts → Refresh. Confirm balance + meter rows. Optionally Acknowledge one (session-only is fine for Kelly).
9. **Isolation one-liner** — “Every API call uses the JWT `tenant_id`; the browser cannot switch municipalities.”

---

## Talking points (do use)

- Rural operators, not enterprise dashboards
- Thin history → statistical / balance flags stay **Watch**
- Hardware stuck / diagnostic bits can be **Actionable** with a clear why
- Water balance needs both sides of the same period

## Avoid in this demo

- Claiming “we found a leak”
- CRWA roll-up, AI chat, MFA, threshold editing, multi-year bulk history
