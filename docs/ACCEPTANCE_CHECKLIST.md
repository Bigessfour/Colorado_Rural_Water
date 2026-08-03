# Water Saver — Project Acceptance Checklist (Cursor-runnable)

**Purpose:** Single checklist for agents (Cursor) and humans to verify the product is ready to ship a URL to Kelly Stone, capture structured feedback, and deliver that feedback to Steve.

**Authority:** Prefer [SPEC.md](SPEC.md) §0 (Kelly vs Pilot vs vNext) and §11. This file operationalizes those criteria; it does not expand scope.

**How to use (Cursor):**
1. Run sections in order. Mark each item `pass` / `fail` / `blocked` with a one-line note.
2. Prefer live SPA + API (or staging) with a demo tenant JWT. Never invent tenant_id from the client.
3. On any `fail` on a **Kelly gate**, stop and fix before claiming “ready for Kelly.”
4. Produce a short summary at the end: overall status, failed items, and whether the Kelly Review URL may be sent.

**Fixtures:**
- Customer messy file: `sample-data/` (messy readings / Town of Steve export as available)
- Source messy file: source readings sample as available
- Demo operator Cognito user with `custom:tenant_id`
- Optional: Kelly review user or `/review` session

---

## A. Environment & access (Kelly gate)

| ID  | Check                                              | How                                                   | Result |
| --- | -------------------------------------------------- | ----------------------------------------------------- | ------ |
| A1  | SPA loads over HTTPS (CloudFront or equivalent)    | Open production/staging URL                           |        |
| A2  | Cognito sign-in works (email/password)             | Login as demo operator → dashboard                    |        |
| A3  | `/me` (or equivalent) returns tenant from JWT only | Bearer token; confirm `tenant_id`; no client override |        |
| A4  | API health endpoint returns 200                    | `GET /health`                                         |        |
| A5  | No secrets in frontend bundle or repo              | Grep / config review: no Stripe secret, no AWS keys   |        |

---

## B. Ingestion & mapper (Kelly gate)

| ID  | Check                                                            | How                                              | Result |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ | ------ |
| B1  | Messy customer CSV/Excel uploads without crash                   | Upload fixture; friendly guidance if columns odd |        |
| B2  | Visual column mapper appears when needed and can complete ingest | Map required fields → success                    |        |
| B3  | Everyday-language errors (not stack traces) on bad rows          | Force one bad row if possible                    |        |
| B4  | Ingest is tenant-scoped                                          | Data visible only for demo tenant                |        |
| B5  | S3 drop / presign path works or is explicitly N/A for this build | Presign + notify or documented skip              |        |

---

## C. Dashboard, balance, Confidence, alerts (Kelly gate)

| ID  | Check                                                               | How                                              | Result |
| --- | ------------------------------------------------------------------- | ------------------------------------------------ | ------ |
| C1  | Dashboard shows KPI / trend area without runtime errors             | Sign-in → dashboard; console clean on happy path |        |
| C2  | Water balance shows In / Out / Loss **or** calm insufficient copy   | With and without both sides of data              |        |
| C3  | Data Confidence visible (level and/or plain-language meaning)       | Not framed as “leak certainty”                   |        |
| C4  | Alert feed shows prioritized items with **Watch** vs **Actionable** | Thin history → statistical/balance not dig-now   |        |
| C5  | Operator can open Alerts and refresh                                | Alerts page loads                                |        |
| C6  | Acknowledge (session or persisted) does not error                   | Ack one alert                                    |        |

---

## D. Sources (Kelly gate)

| ID  | Check                                                              | How                  | Result |
| --- | ------------------------------------------------------------------ | -------------------- | ------ |
| D1  | Create 2–3 named sources                                           | Sources CRUD         |        |
| D2  | Ingest or enter source readings for a period                       | Source CSV or manual |        |
| D3  | Dashboard balance updates (or insufficient) after both sides exist | Return to dashboard  |        |

---

## E. Meter inventory & history (Pilot preferred; note if missing for Kelly)

| ID  | Check                                                                                                  | How                                | Result |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------ |
| E1  | Meter list / inventory page lists meters for tenant                                                    | Navigate inventory or meters route |        |
| E2  | Meter detail shows readings history                                                                    | Open one meter                     |        |
| E3  | Asset fields editable (install date, brand/manufacturer, model, serial, etc.) via UI or documented API | PUT `/meters/{id}` or form save    |        |
| E4  | Empty ingest values do not wipe operator-entered asset metadata                                        | Spec non-wipe upsert               |        |

*If E1–E3 are not shipped, mark `blocked` for Pilot—not a Kelly §11a blocker unless demo script depends on them.*

---

## F. Isolation & safety (Kelly gate)

| ID  | Check                                                               | How                              | Result |
| --- | ------------------------------------------------------------------- | -------------------------------- | ------ |
| F1  | No cross-tenant data in API responses                               | Spot-check payloads              |        |
| F2  | Destructive actions require explicit confirmation where implemented | Delete source / clear data paths |        |
| F3  | AI/agent (if present) does not overclaim leaks on Thin confidence   | Copy review on Watch items       |        |

---

## G. CRWA Admin surface (Pilot; include in Kelly Review if shown)

| ID  | Check                                                               | How                           | Result |
| --- | ------------------------------------------------------------------- | ----------------------------- | ------ |
| G1  | CRWA Admin route loads for CRWA role only                           | `/crwa` or equivalent         |        |
| G2  | Can view sanitized roll-up or tenant list                           | No raw cross-tenant meter PII |        |
| G3  | Can provision / see pilot vs paid billing status (manual ledger OK) | Epic I0–I2                    |        |
| G4  | Municipality billing page shows own status only                     | System Admin                  |        |

---

## H. Kelly Review mode (required before sending URL to Kelly)

| ID  | Check                                                                                                                                | How                                                   | Result                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------- |
| H1  | Review URL or review user can sign in / open review mode                                                                             | `/review` or `?mode=review` or dedicated Cognito user | **pass** — `kelly.review@watersaver.local`; SPA `/review`        |
| H2  | Guided steps cover: sign-in, dashboard, upload/mapper, alerts, sources/balance, Confidence, inventory (if live), CRWA page (if live) | Step list matches product                             | **pass** — 9 steps in panel + [KELLY_REVIEW.md](KELLY_REVIEW.md) |
| H3  | Each step offers feedback: **Love this** / **Don't need this** / **Change this** / **Need something new**                            | UI present                                            | **pass**                                                         |
| H4  | Comment allowed (required for Change / Need new)                                                                                     | Validation                                            | **pass** — API + unit tests                                      |
| H5  | Feedback persists (Dynamo or equivalent) under a review session, not mixed into municipality meter data                              | API + storage check                                   | **pass** — `TENANT#_review`                                      |
| H6  | **Submit review** sends summary to Steve (SES or agreed channel)                                                                     | Test submit → email/artifact received                 | **pass** — live `emailSent: true` (2026-08-03)                   |
| H7  | Session is one-time or clearly completable (no silent double-submit chaos)                                                           | Complete flow twice intentionally                     | **pass** — second submit → 400                                   |
| H8  | Review copy is calm and non-technical                                                                                                | Read step blurbs                                      | **pass**                                                         |

---

## I. Scripted walkthrough & smoke (Kelly gate)

| ID  | Check                                                                               | How                         | Result |
| --- | ----------------------------------------------------------------------------------- | --------------------------- | ------ |
| I1  | [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) F1 path completes without runtime errors | Follow script with fixtures |        |
| I2  | [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) §11a items verified                        | Fill Pass? column           |        |
| I3  | Console clean on happy path                                                         | Browser devtools            |        |
| I4  | Known Pilot gaps listed; not presented as finished                                  | Honesty check for Kelly     |        |
| I5  | Big features have browser prove rows in [PROVE_FEATURES.md](PROVE_FEATURES.md)      | Chrome DevTools poke path   |        |

---

## J. Feedback delivery to Steve (acceptance of review system)

| ID  | Check                                                                                       | How                 | Result                                          |
| --- | ------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------- |
| J1  | Submitted review produces a single summary (email and/or downloadable JSON/CSV)             | End-to-end test     | **pass** — SES to `REVIEW_NOTIFY_TO`            |
| J2  | Summary is organized by step/feature with rating + comment                                  | Read artifact       | **pass** — `buildReviewEmailBody` + live submit |
| J3  | Steve can act on results (Love / Don't need / Change / Need new) without re-watching a call | Usability of report | **pass** — structured table in email            |

---

## K. Out of scope (do not fail Kelly for these)

- Real-time AMI, resident portal, CIS write-back
- Payment processor install (I4+) until I3 decision
- Full conversational agent AWS provisioning
- Custom ML models
- Perfect function-inventory “0 without proof” if smoke + §11a pass

---

## Cursor agent final report template

```text
ACCEPTANCE RUN — Water Saver
Date:
Environment URL:
Demo tenant:
Review mode URL:

Kelly gates (A–D, F, I): PASS / FAIL
Pilot surfaces (E, G): PASS / FAIL / PARTIAL
Kelly Review mode (H, J): PASS / FAIL

Failed items:
- ...

Blocked items:
- ...

May send URL to Kelly for structured review? YES / NO
Notes for Steve:
- ...
```

---

## Sign-off

| Role            | Name | Date | Kelly-ready? |
| --------------- | ---- | ---- | ------------ |
| Builder / agent |      |      |              |
| Steve           |      |      |              |

When **Kelly gates** and **Kelly Review mode (H, J)** are PASS, ship the review URL to Kelly. Use his submitted feedback to drive the next change set; do not treat Pilot-complete as required for that first review.
