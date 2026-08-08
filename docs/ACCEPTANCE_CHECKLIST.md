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

| ID  | Check                                              | How                                                   | Result                                                                                                                |
| --- | -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A1  | SPA loads over HTTPS (CloudFront or equivalent)    | Open production/staging URL                           | **pass** — `https://d1gokx5wxrd4x6.cloudfront.net` (S3+OAC dist `E3QK223UFP4LZE`); Kelly login → `/review` 2026-08-07 |
| A2  | Cognito sign-in works (email/password)             | Login as demo operator → dashboard                    | **pass** — Kelly `kelly.review@watersaver.local` pool `us-east-1_eeMuYPlMK` live browser + API                        |
| A3  | `/me` (or equivalent) returns tenant from JWT only | Bearer token; confirm `tenant_id`; no client override | **pass** — JWT only; live `/me` → `tenantId: town-wiley`                                                              |
| A4  | API health endpoint returns 200                    | `GET /health`                                         | **pass** — live `uqujnhmk31` (codeplatoon) 200                                                                        |
| A5  | No secrets in frontend bundle or repo              | Grep / config review: no Stripe secret, no AWS keys   | **pass** — secrets local only                                                                                         |

---

## B. Ingestion & mapper (Kelly gate)

| ID  | Check                                                            | How                                              | Result                                                                                                  |
| --- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| B1  | Messy customer CSV/Excel uploads without crash                   | Upload fixture; friendly guidance if columns odd | **pass** — live commit Town of Steve Excel (29/31 rows) + Wiley 24mo MESSY dry-run 7191 rows 2026-08-07 |
| B2  | Visual column mapper appears when needed and can complete ingest | Map required fields → success                    | **pass** — CloudFront Upload “Try practice CSV” → column mapping UI                                     |
| B3  | Everyday-language errors (not stack traces) on bad rows          | Force one bad row if possible                    | **pass** — friendly skip warnings (blank Meter ID, incomplete rows, CF units)                           |
| B4  | Ingest is tenant-scoped                                          | Data visible only for demo tenant                | **pass** — JWT `town-wiley` only                                                                        |
| B5  | S3 drop / presign path works or is explicitly N/A for this build | Presign + notify or documented skip              | **pass** — presign + s3-ingest live path                                                                |

---

## C. Dashboard, balance, Confidence, alerts (Kelly gate)

| ID  | Check                                                               | How                                              | Result                                                               |
| --- | ------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| C1  | Dashboard shows KPI / trend area without runtime errors             | Sign-in → dashboard; console clean on happy path | **pass** — live CF dashboard KPIs + charts; console clean 2026-08-07 |
| C2  | Water balance shows In / Out / Loss **or** calm insufficient copy   | With and without both sides of data              | **pass** — Produced/Billed + Sold > pumped copy                      |
| C3  | Data Confidence visible (level and/or plain-language meaning)       | Not framed as “leak certainty”                   | **pass** — Solid / 93 + plain-language (not leak certainty)          |
| C4  | Alert feed shows prioritized items with **Watch** vs **Actionable** | Thin history → statistical/balance not dig-now   | **pass** — 1 Watch · 6 Actionable on dashboard                       |
| C5  | Operator can open Alerts and refresh                                | Alerts page loads                                | **pass** — live `/alerts` Watch + Actionable table                   |
| C6  | Acknowledge (session or persisted) does not error                   | Ack one alert                                    | **pass** — durable accept/dispatch/resolve                           |

---

## D. Sources (Kelly gate)

| ID  | Check                                                              | How                  | Result                                                    |
| --- | ------------------------------------------------------------------ | -------------------- | --------------------------------------------------------- |
| D1  | Create 2–3 named sources                                           | Sources CRUD         | **pass** — live Jack Well + API create/delete dry-run     |
| D2  | Ingest or enter source readings for a period                       | Source CSV or manual | **pass** — source readings present (balance produced gal) |
| D3  | Dashboard balance updates (or insufficient) after both sides exist | Return to dashboard  | **pass** — live balance In/Out after sources + meters     |

---

## E. Meter inventory & history (Pilot preferred; note if missing for Kelly)

| ID  | Check                                                                                                  | How                                | Result                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------- |
| E1  | Meter list / inventory page lists meters for tenant                                                    | Navigate inventory or meters route | **pass** — `/meters` list/CRUD         |
| E2  | Meter detail shows readings history                                                                    | Open one meter                     | **pass** — History + usage viz prove   |
| E3  | Asset fields editable (install date, brand/manufacturer, model, serial, etc.) via UI or documented API | PUT `/meters/{id}` or form save    | **pass** — PUT metadata + History form |
| E4  | Empty ingest values do not wipe operator-entered asset metadata                                        | Spec non-wipe upsert               | **pass** — non-wipe upsert tests       |

_If E1–E3 are not shipped, mark `blocked` for Pilot—not a Kelly §11a blocker unless demo script depends on them._

---

## F. Isolation & safety (Kelly gate)

| ID  | Check                                                               | How                              | Result                                                                            |
| --- | ------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| F1  | No cross-tenant data in API responses                               | Spot-check payloads              | **pass** — JWT tenant on all live payloads; CRWA roll-up sanitized (no meter PII) |
| F2  | Destructive actions require explicit confirmation where implemented | Delete source / clear data paths | **pass** — live `window.confirm` on Sources Remove + Meters Remove (cancelled)    |
| F3  | AI/agent (if present) does not overclaim leaks on Thin confidence   | Copy review on Watch items       | **pass** — Watch vs Actionable wording live; Confidence not “leak certainty”      |

---

## G. CRWA Admin surface (Pilot; include in Kelly Review if shown)

| ID  | Check                                                               | How                           | Result                             |
| --- | ------------------------------------------------------------------- | ----------------------------- | ---------------------------------- |
| G1  | CRWA Admin route loads for CRWA role only                           | `/crwa` or equivalent         | **pass** — role-gated `/crwa`      |
| G2  | Can view sanitized roll-up or tenant list                           | No raw cross-tenant meter PII | **pass** — sanitize roll-up tests  |
| G3  | Can provision / see pilot vs paid billing status (manual ledger OK) | Epic I0–I2                    | **pass** — manual ledger I0–I2     |
| G4  | Municipality billing page shows own status only                     | System Admin                  | **pass** — billing isolation tests |

---

## H. Kelly Review mode (required before sending URL to Kelly)

| ID  | Check                                                                                                                                | How                                                   | Result                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| H1  | Review URL or review user can sign in / open review mode                                                                             | `/review` or `?mode=review` or dedicated Cognito user | **pass** — CF `/review` + Kelly Cognito browser login 2026-08-07                             |
| H2  | Guided steps cover: sign-in, dashboard, upload/mapper, alerts, sources/balance, Confidence, inventory (if live), CRWA page (if live) | Step list matches product                             | **pass** — 9 steps UI + API (`signin`…`overall`)                                             |
| H3  | Each step offers feedback: **Love this** / **Don't need this** / **Change this** / **Need something new**                            | UI present                                            | **pass** — floating panel on live SPA                                                        |
| H4  | Comment allowed (required for Change / Need new)                                                                                     | Validation                                            | **pass** — notes field + API validation                                                      |
| H5  | Feedback persists (Dynamo or equivalent) under a review session, not mixed into municipality meter data                              | API + storage check                                   | **pass** — `TENANT#_review` sessions 83992f32 / 35aee2ad                                     |
| H6  | **Submit review** sends summary to Steve (SES or agreed channel)                                                                     | Test submit → email/artifact received                 | **pass** — `emailSent: true`; Gmail received (landed in **Spam** — mark Not spam) 2026-08-07 |
| H7  | Session is one-time or clearly completable (no silent double-submit chaos)                                                           | Complete flow twice intentionally                     | **pass** — second submit → 400 `Review already submitted`                                    |
| H8  | Review copy is calm and non-technical                                                                                                | Read step blurbs                                      | **pass** — howto + panel copy calm                                                           |

---

## I. Scripted walkthrough & smoke (Kelly gate)

| ID  | Check                                                                               | How                         | Result                                                                               |
| --- | ----------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| I1  | [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md) F1 path completes without runtime errors | Follow script with fixtures | **pass** — live CF path login→dashboard→upload→alerts→sources→meters→crwa 2026-08-07 |
| I2  | [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) §11a items verified                        | Fill Pass? column           | **pass** — F2 confirm + Kelly gates re-proved live                                   |
| I3  | Console clean on happy path                                                         | Browser devtools            | **pass** — no console errors on login/dashboard/upload/alerts/sources/meters/crwa    |
| I4  | Known Pilot gaps listed; not presented as finished                                  | Honesty check for Kelly     | **pass** — [PILOT_DONE.md](PILOT_DONE.md) accepted deferrals + Spec §0               |
| I5  | Big features have browser prove rows in [PROVE_FEATURES.md](PROVE_FEATURES.md)      | Chrome DevTools poke path   | **pass** — protocol + DataViz/Stats + this CF acceptance run                         |

---

## J. Feedback delivery to Steve (acceptance of review system)

| ID  | Check                                                                                       | How                 | Result                                                                            |
| --- | ------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| J1  | Submitted review produces a single summary (email and/or downloadable JSON/CSV)             | End-to-end test     | **pass** — SES email to Steve Gmail (`emailSent: true`, Gmail message id present) |
| J2  | Summary is organized by step/feature with rating + comment                                  | Read artifact       | **pass** — 9-row table Love/Change + clarity + comment in email body              |
| J3  | Steve can act on results (Love / Don't need / Change / Need new) without re-watching a call | Usability of report | **pass** — structured summary; no Zoom required                                   |

---

## K. Out of scope (do not fail Kelly for these)

- Real-time AMI, resident portal, CIS write-back
- Payment processor install (I4+) until I3 decision
- Full conversational agent AWS provisioning
- Custom ML models
- Perfect function-inventory “0 without proof” if smoke + §11a pass

---

## L. Pilot close (2026-08-08)

| ID  | Check                                      | Result                                                                    |
| --- | ------------------------------------------ | ------------------------------------------------------------------------- |
| L1  | P1/P2 items shipped or accepted deferral   | **pass** — [PILOT_DONE.md](PILOT_DONE.md)                                 |
| L2  | 42/42 surface proofs                       | **pass** — [correctness-surface-passes.md](correctness-surface-passes.md) |
| L3  | Backend + frontend tests green             | **pass** — 238 + 115 (2026-08-08)                                         |
| L4  | Hosted SPA + API smoke                     | **pass** — CloudFront `d13u7fsvytjwxn`                                    |
| L5  | Accepted deferrals documented (not hidden) | **pass** — MFA live ops, H8, Epic I, A6 residual                          |

**Pilot verdict:** **Done** — shippable for first pilot municipalities.

---

## Cursor agent final report template

```text
ACCEPTANCE RUN — Water Saver
Date: 2026-08-07
Environment URL: API https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com ; SPA https://d13u7fsvytjwxn.cloudfront.net
Demo tenant: town-wiley
Review mode URL: https://d13u7fsvytjwxn.cloudfront.net/review
AWS: codeplatoon / 388691194728 / us-east-1 / Assessment-iii

Kelly gates (A–D, F, I): PASS
Pilot close (L): PASS — docs/PILOT_DONE.md
See docs/CLOSEOUT.md + docs/PILOT_DONE.md

Failed items:
- none on Kelly path

Blocked items:
- none for Kelly send

May send URL to Kelly for structured review? YES
Notes for Steve:
- SES From/To re-wired after destroy/re-apply; identity verified 2026-08-07
- First Kelly review emails landed in Gmail **Spam** — open one → Not spam
- Credentials: ~/.cursor/secrets/watersaver-kelly-review-cognito.txt (not email)
- Messy fixtures proved: Town of Steve Excel commit + Wiley 24mo MESSY dry-run
```

---

## Sign-off

| Role            | Name | Date       | Kelly-ready?                                                         |
| --------------- | ---- | ---------- | -------------------------------------------------------------------- |
| Builder / agent | Grok | 2026-08-07 | **YES** — CF live; A–D/F/H/I/J pass; SES delivered; invite URL ready |
| Steve           |      |            |                                                                      |

When **Kelly gates** and **Kelly Review mode (H, J)** are PASS, ship the review URL to Kelly. Use his submitted feedback to drive the next change set; do not treat Pilot-complete as required for that first review.

Full engineering wrap: [CLOSEOUT.md](CLOSEOUT.md).
