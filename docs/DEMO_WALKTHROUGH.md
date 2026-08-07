# F1 — Kelly demo walkthrough (scripted happy path)

**Goal:** A calm ~10–15 minute walkthrough for Kelly Stone / CRWA leadership.
**Scope:** Spec §0 Kelly Stay + §11a. Do **not** demo Pilot items (AI agent, CRWA roll-up, MFA, threshold admin).

**Fixtures:**

- Customer (preferred): [`sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx`](../sample-data/Town_of_Steve_Meter_Export_MESSY.xlsx)
- Customer (also OK): [`sample-data/messy-readings-july.csv`](../sample-data/messy-readings-july.csv)
- Sources: [`sample-data/messy-source-readings-july.csv`](../sample-data/messy-source-readings-july.csv)

**Demo tenant:** Cognito user with `custom:tenant_id` set (never pass tenant from the client).

---

## Script (operator persona)

1. **Sign in** — Open the SPA → Login with demo email/password. Confirm redirect to dashboard.
2. **Upload customer readings** — Upload the messy **Excel** export (CSV also works). Use the visual mapper if columns look odd; note Mapped vs Not used. Confirm ingest success (partial skips OK).
3. **Name sources** — Go to **Sources**. Create 2–3 named wells (e.g. Well 1 – North, Well 2 – South). Calm copy only.
4. **Ingest source readings** — On Sources (or via `kind: source` upload), load `messy-source-readings-july.csv` (or enter one manual period reading).
5. **Dashboard (full first glance)** — Return to dashboard. Point out top to bottom:
   - **Last upload** status line (date · good rows · issues) when an ingest has succeeded
   - KPI row: meters, open alerts (Watch · Actionable), balance %, Confidence
   - **System usage** chart: billed over time + typical band; optional **vs prior year** toggle (default stays “This period” so the screen stays clean)
   - **Data Confidence** doughnut + plain-language score — _not leak accuracy_
   - **Meter health** compact counts: stuck/flat, diagnostic flags (battery/tamper/reverse), older-than-15y (when install dates exist)
   - **Water balance**: In / Out / Unaccounted for the period (or calm **Need both sides** if one-sided)
   - Under balance: **Production by source** bars + **Unaccounted %** sparkline (sparkline softens/hides when Confidence is **Thin**)
   - **Top outliers** mini-list only when Confidence is **not Thin** — links to meter detail; never call it a leak
6. **Alert feed (on Dashboard)** — Show meter alerts + any **Water balance** Watch rows. Say out loud: _Watch means look when you can; Actionable stuck/diag may need a field check._
7. **Alerts page** — Open Alerts → Refresh. Confirm balance + meter rows. Optionally Acknowledge one (session-only is fine for Kelly).
8. **Isolation one-liner** — “Every API call uses the JWT `tenant_id`; the browser cannot switch municipalities.”

---

## Talking points (do use)

- Rural operators, not enterprise dashboards
- Thin history → statistical outliers and loss **claims** stay **Watch** / softened (no Top outliers; no dig-now unaccounted %)
- Hardware stuck / diagnostic bits can be **Actionable** with a clear why
- Water balance needs both sides of the same period
- Prior-year usage is optional context — leave the toggle off unless Kelly asks

## Avoid in this demo

- Claiming “we found a leak”
- CRWA roll-up, AI chat, MFA setup walkthrough (Pilot — under **More** in the nav; skip unless asked), threshold editing, multi-year bulk history

## Nav (2026-08-05)

Primary row = Kelly path: Dashboard → Upload → Meters → Sources → Alerts → Review.  
Pilot surfaces (Assistant, Onboarding, Reports, Settings, Account, Admin/CRWA) live under **More**.
