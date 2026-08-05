# Water Saver – Implementation Tickets

Ordered for a vertical slice first (messy file → dashboard + alerts), then multi-tenant hardening and AI polish.

Statuses: `todo` | `in_progress` | `done` | `blocked`

**Scope authority:** [docs/SPEC.md](SPEC.md) **§0** (Kelly vs Pilot vs vNext). Prefer §0 over older “everything is MVP” wording.

**Engineering closeout (2026-08-03):** [CLOSEOUT.md](CLOSEOUT.md) — shippable Kelly + finishable Pilot on `main`. Remaining open work is **ops** (Kelly invite / F2 smoke), **H8** (blocked on Kelly submit), **E2/E3** polish, and **I3+** payment (external).

---

## Kelly critical path (closed)

**Kelly path closed** (`e0bfd92` on main). Remaining work is **Pilot hardening** (Spec §0).

| Focus               | Tickets                   | Notes                                                                   |
| ------------------- | ------------------------- | ----------------------------------------------------------------------- |
| Dashboard polish    | C2                        | Usage+band, balance bars, Confidence/health donuts, alert sparklines    |
| Balance alerts feed | G4 (thin), G5             | Defaults frozen; UI feed done; **tenant threshold store shipped Pilot** |
| Confidence UX       | H3 stub→heuristic, H4, H6 | §7b freeze in engine + dashboard card + Watch gating                    |
| Demo packaging      | F1, F2                    | docs/DEMO_WALKTHROUGH.md + docs/SMOKE_CHECKLIST.md                      |
| Ack persistence     | C3                        | **Pilot: durable ack/resolve + audit under TENANT#**                    |
| Export + history    | C4, C5                    | **Pilot: CSV export + meter history drill-down**                        |
| Roles + onboarding  | D1, D2, D3                | **Pilot: Cognito roles + CRWA provision + System Admin invite**         |

---

## Epic A — Foundation

| ID  | Title                                         | Priority | Status | Layer | Notes                                                                                                                               |
| --- | --------------------------------------------- | -------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Repo bootstrap & README                       | P0       | done   | Kelly | Monorepo layout, Spec Kit, this backlog                                                                                             |
| A2  | Terraform skeleton (accounts, naming, tags)   | P0       | done   | Kelly | Account **388691194728** / profile **codeplatoon** / `us-east-1`; tag `Assessment-iii`; provider ~> 6.0                             |
| A3  | Cognito user pool + app client (MFA optional) | P0       | done   | Kelly | Live pool `us-east-1_oZlKJ1y39` (codeplatoon)                                                                                       |
| A4  | Tenant model + isolation strategy doc         | P0       | done   | Kelly | DynamoDB single-table + S3 uploads; see TENANT_ISOLATION.md                                                                         |
| A5  | API Gateway + Lambda stub (health + me)       | P0       | done   | Kelly | Live API tz6rqlus7b (us-east-1); /health 200, /me JWT 401 without token                                                             |
| A6  | Per-tenant IAM ABAC / session tags            | P1       | done   | Pilot | Thin: `tenants/*` S3 + LeadingKeys `TENANT#*` + **Deny Scan** + Bedrock model ARNs; residual = no session-tag ABAC yet (documented) |

## Epic B — Ingestion (critical path)

| ID  | Title                                         | Priority | Status | Layer | Notes                                                                                                                                                                             |
| --- | --------------------------------------------- | -------- | ------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Sample messy CSV/Excel fixtures               | P0       | done   | Kelly | Customer + source CSVs; **Town_of_Steve_Meter_Export_MESSY.xlsx** primary Excel stress fixture                                                                                    |
| B2  | Presigned upload + S3 drop zone per tenant    | P0       | done   | Kelly | Presign + S3 notify → s3-ingest; `kind:source` path                                                                                                                               |
| B3  | Parse CSV/Excel with forgiving heuristics     | P0       | done   | Kelly | `csv-parse.ts` + `excel-parse.ts` (xlsx); header detect, footers, aliases, CF warn; **size/DoS caps + tenantFromKey harden** (post-review); tests on Town of Steve workbook       |
| B4  | Visual column mapper UI + saved mapping       | P0       | done   | Kelly | Upload mapper UI + Dynamo `MAP#customer_readings`                                                                                                                                 |
| B5  | Canonical reading + meter-location store      | P0       | done   | Kelly | Dynamo LOC#/RDG#; POST /ingest smoked with sample CSV; optional asset metadata (manufacturer/model/serial/size/install/type/location/radio/lastTested/notes) with non-wipe upsert |
| B6  | Ingestion status UX (progress / failures)     | P1       | done   | Pilot | Phase list + friendly `status` from API + warnings panel                                                                                                                          |
| B7  | Occupant-name update without relocating meter | P1       | done   | Kelly | Covered by meter-location upsert + ingest commit                                                                                                                                  |
| B8  | Operator meter asset metadata edit            | P1       | done   | Pilot | `PUT /meters/{id}` partial metadata; Alerts History form; CSV aliases for common asset headers                                                                                    |
| B9  | Meter inventory CRUD (list/create/delete)     | P1       | done   | Pilot | `GET/POST /meters` + `DELETE /meters/{id}` cascade RDG#; SPA `/meters`; address stable on PUT                                                                                     |

## Epic C — Alerts & Dashboard

| ID  | Title                                                       | Priority | Status | Layer | Notes                                                                                                        |
| --- | ----------------------------------------------------------- | -------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------ |
| C1  | Alert engine v1 (high usage, stuck, drops, flags, outliers) | P0       | done   | Kelly | Deterministic rules + Confidence Watch/Actionable; GET /alerts                                               |
| C2  | Member dashboard (KPIs, trends, alert feed)                 | P0       | done   | Kelly | Usage trend + typical band; balance grouped bars; Confidence + health donuts; alert feed → History sparkline |
| C3  | Acknowledge / resolve alerts                                | P0       | done   | Pilot | Dynamo `ALERT#STATUS#` + `ALERT#EVT#` meter timeline; accept/dispatch/resolve + note; audit who/when         |
| C4  | Export flagged meters                                       | P1       | done   | Pilot | `GET /alerts?format=csv` + Alerts “Export flagged CSV”; confidenceNote on Watch rows                         |
| C5  | Basic meter history view                                    | P1       | done   | Pilot | `GET/PUT /meters/{meterId}`; History + reusable usage viz (age/cycle/YTD/lifetime/YoY)                       |
| C6  | AI plain-language alert explanations                        | P1       | done   | Pilot | Templates always; Bedrock Nova Lite polish when available (`?explain=1` / `POST /alerts/explain`)            |
| C7  | Meter inventory CRUD                                        | P1       | done   | Pilot | List/add/edit/delete on `/meters`; Stats button → usage viz; POST without reading; DELETE cascades           |

## Epic D — Auth, roles & CRWA roll-up

| ID  | Title                                       | Priority | Status | Layer       | Notes                                                                       |
| --- | ------------------------------------------- | -------- | ------ | ----------- | --------------------------------------------------------------------------- |
| D1  | Roles: Operator / System Admin / CRWA Admin | P0       | done   | Pilot       | Cognito groups → AuthContext; `/me` roles; Admin nav gated                  |
| D2  | System Admin: invite users within tenant    | P1       | done   | Pilot       | `POST /admin/users/invite`; JWT tenant only; temp password once             |
| D3  | CRWA Admin: provision tenant + initial user | P0       | done   | Pilot       | `POST /admin/tenants`; META#profile + Cognito AdminCreateUser               |
| D4  | CRWA enterprise roll-up (sanitized)         | P1       | done   | Pilot       | Live `GET /admin/rollup` — balance % + Confidence; no customer PII          |
| D5  | Self-service password + MFA UX              | P1       | done   | Kelly/Pilot | Password change + TOTP; disable MFA requires password step-up (post-review) |

## Epic G — Water balance (production in vs billed out)

Named source/well meters vs aggregated customer usage — Spec §7a. Goal: surface unexplained loss (leaks) and the reverse (billed > pumped).

| ID  | Title                                                     | Priority | Status | Layer       | Notes                                                                                |
| --- | --------------------------------------------------------- | -------- | ------ | ----------- | ------------------------------------------------------------------------------------ |
| G1  | Named sources CRUD (tenant-scoped)                        | P0       | done   | Kelly       | GET/POST/PUT/DELETE /sources; Dynamo SRC#; DELETE cascades SRD#                      |
| G2  | Source reading ingest (manual + CSV/S3, forgiving mapper) | P0       | done   | Kelly       | POST /ingest/sources; SRD#; S3 `uploads/sources/` via `kind:source`                  |
| G3  | Balance calculator for billing period                     | P0       | done   | Kelly       | GET /balance; one-sided=insufficient; period dedupe; UTC YYYY-MM                     |
| G4  | Water-balance alerts (high loss + sold > pumped)          | P0       | done   | Kelly/Pilot | Feed + UI (Kelly); tenant `CFG#balance_thresholds` + PUT /balance/thresholds (Pilot) |
| G5  | Operator dashboard viz (In / Out / Loss trend)            | P0       | done   | Kelly       | KPI + In/Out/Unaccounted chart; insufficient calm copy                               |
| G6  | CRWA roll-up water-balance summary                        | P1       | done   | Pilot       | Shipped with D4 (`unaccountedPct` + balanceStatus per system)                        |
| G7  | Sample source + customer fixtures for demo balance        | P0       | done   | Kelly       | `messy-source-readings-july.csv` + customer CSV; GH #9                               |

## Epic E — Conversational AI

| ID  | Title                                              | Priority | Status | Layer | Notes                                                            |
| --- | -------------------------------------------------- | -------- | ------ | ----- | ---------------------------------------------------------------- |
| E1  | Agent shell + conversation history (tenant-scoped) | P1       | done   | Pilot | `GET/POST /agent`; Dynamo `CONV#`; SPA `/assistant`              |
| E2  | Onboarding interview flow                          | P1       | done   | Pilot | Form is primary (Feature 012); Assistant helper + Path A–D wired to Dashboard/Upload/agent |
| E3  | Mapping assistance + config help                   | P1       | todo   | Pilot | Feature 014 live `suggest_column_map` tool                       |
| E4  | Cost-transparency + confirmation guardrails        | P0       | done   | Pilot | Cost note + CONFIRM DELETE/CHANGE; cheapest-first                |
| E5  | Tenant isolation tests for AI context              | P0       | done   | Pilot | `agent-isolation.test.ts` + assertNoCrossTenantContext           |
| E6  | Confidence coaching copy in agent                  | P1       | done   | Pilot | Watch vs Actionable; never-overclaim; with H7                    |
| E7  | Cognito JWT RAG + Bedrock KB (Feature 014)         | P0       | wip    | Pilot | KB Retrieve filter + Converse; colorado-ops; live tools          |

## Epic F — Polish for Kelly Stone demo

| ID  | Title                                                                      | Priority | Status | Layer | Notes                                                                                                     |
| --- | -------------------------------------------------------------------------- | -------- | ------ | ----- | --------------------------------------------------------------------------------------------------------- |
| F1  | Seed demo tenant + guided walkthrough                                      | P0       | done   | Kelly | docs/DEMO_WALKTHROUGH.md + sample-data CSVs                                                               |
| F2  | End-to-end smoke test checklist                                            | P0       | done   | Kelly | docs/SMOKE_CHECKLIST.md ↔ Spec §11a                                                                       |
| F3  | Cost/usage transparency copy in UI                                         | P2       | done   | Pilot | Shell footer + Assistant cost note                                                                        |
| F4  | Branding placeholder (CRWA + working name)                                 | P2       | done   | Pilot | WS mark + CRWA working-name subtitle                                                                      |
| F5  | Kelly Review mode — guided walkthrough + structured feedback → email Steve | P0       | done   | Pilot | Live API + SES + Cognito `kelly.review@…`; SPA `/review` via `npm start`. Unblocks H8 after Kelly submit. |

### F5 — Kelly Review mode (detail)

**Goal:** Ship one private URL on the existing AWS SPA so Kelly Stone can walk each feature async, leave structured feedback, and submit once — Steve gets one SES summary email + a Dynamo record. No Zoom required.

**Out of scope (YAGNI):** Spotlight/coach-mark overlays, Maze/UserTesting, magic-link auth (Cognito user is enough), separate review product, multi-reviewer dashboards.

#### Acceptance criteria

- [x] Cognito user for Kelly (e.g. `kelly.review@…`) with access to demo tenant **and** CRWA Admin paths needed for roll-up/billing steps (or two short sessions / role switch documented in the 1-pager).
- [x] Review mode entered via `/review` (and/or `?mode=review`); floating panel always visible in review mode.
- [x] Fixed step list (9 steps below) with short “what to look at” copy; Progress “Step N of 9”; Skip allowed; Next advances.
- [x] Per step feedback: exactly **Love this** | **Don't need this** | **Change this** | **Need something new**; optional free-text always; **comment required** for Change / Need something new.
- [x] Optional 1–5 “clarity / usefulness” score per step (nice-to-have in same payload).
- [x] `POST /review/feedback` (or session/step routes below) saves ratings under `TENANT#_review` partition (not mixed with live municipality `TENANT#` data).
- [x] Final **Submit review** → SES email to Steve with summary table + all comments; mark session `completed` (idempotent — no double-submit).
- [x] Session expires after 14 days **or** on submit (whichever first); calm rural copy; 1-page “how to use this review” note for Kelly (~20–30 min).
- [x] Does **not** break normal operator UX when review mode is off.

#### Step list → current screens

| #   | Step id              | What to look at                                            | Route / surface                  |
| --- | -------------------- | ---------------------------------------------------------- | -------------------------------- |
| 1   | `signin`             | First impression, calm login                               | `/login`                         |
| 2   | `dashboard`          | KPIs, In/Out/Loss, Confidence card, alert feed             | `/dashboard`                     |
| 3   | `upload_mapper`      | Messy file + column mapper (Town of Steve / sample CSV OK) | `/upload`                        |
| 4   | `alerts`             | Watch vs Actionable; ack if comfortable                    | `/alerts`                        |
| 5   | `sources_balance`    | Named sources + balance story                              | `/sources` (+ dashboard balance) |
| 6   | `meter_inventory`    | List + asset fields                                        | `/meters`                        |
| 7   | `ack_history_export` | Ack persistence, history drill-down, CSV export            | `/alerts` (History / Export)     |
| 8   | `crwa_admin`         | Provision, roll-up, billing status                         | `/admin`, `/crwa`                |
| 9   | `overall`            | Missing features / anything else                           | Review panel only                |

Align copy with [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md); Pilot surfaces (CRWA, export, durable ack) **are** in scope for this review (unlike the original Kelly-only demo script).

#### Data shape

```ts
// Session — synthetic partition (LeadingKeys TENANT#*), not a municipality
pk: "TENANT#_review";
sk: "SESSION#{sessionId}";
// { sessionId, reviewerUserId, reviewerEmail, createdAt, expiresAt, status: "open"|"completed", submittedAt? }

// Per-step feedback (upsert)
pk: "TENANT#_review";
sk: "SESSION#{sessionId}#STEP#{stepId}";
// {
//   stepId, rating: "love"|"dont_need"|"change"|"need_new"|null,
//   clarity?: 1|2|3|4|5, comment?: string, skipped?: boolean,
//   updatedAt
// }
```

See also [KELLY_REVIEW.md](KELLY_REVIEW.md).

API (sketch):

- `POST /review/sessions` → create/open session (auth: review user)
- `PUT /review/sessions/{id}/steps/{stepId}` → save feedback
- `POST /review/sessions/{id}/submit` → SES + mark completed

#### SES email template (to Steve)

**Subject:** `Water Saver — Kelly review submitted ({date})`

**Body:**

```text
Kelly Review — Water Saver
Session: {sessionId}
Submitted: {submittedAt}

Summary
-------
Step | Rating | Clarity | Comment
signin | love | 5 | …
dashboard | change | 4 | Confidence label is confusing
…

Skipped: {list or none}
Overall / need_new themes: {bullets from step 9 + any need_new}

JSON attachment or inline block optional for archive.
```

#### Ops checklist (ship week)

1. [x] Cognito `kelly.review@watersaver.local` — groups `operators` + `crwa_admins`, tenant `town-wiley` (creds in local secrets, not git).
2. [x] Deploy F5 API (`POST /review/sessions` live) + SES from/to verified; SPA `/review` on CloudFront `https://duqk1pqvmrsuh.cloudfront.net/review`.
3. [ ] Send Kelly: app URL (`/review`), credentials / [KELLY_REVIEW.md](KELLY_REVIEW.md), “~20–30 minutes, Submit at the end.”
4. [ ] After Kelly submit: file feedback → Spec §7b / H8 (Confidence) and product backlog cuts.

**Unblocks:** H8 (Confidence threshold defaults).

## Epic H — Onboarding agility & Data Confidence

Work with any amount of history (none → years); never treat thin-data flags as dig-now alarms. Spec §5 paths + §7b. Heuristics only (no custom ML). Tracking: [GH #10](https://github.com/Bigessfour/Colorado_Rural_Water/issues/10).

| ID  | Title                                                           | Priority | Status  | Layer       | Notes                                                                           |
| --- | --------------------------------------------------------------- | -------- | ------- | ----------- | ------------------------------------------------------------------------------- |
| H1  | Onboarding data-inventory interview                             | P0       | done    | Pilot       | Thin stub: Assistant onboarding inventory (paths A–D); full E2 interview later  |
| H2  | Historical bulk ingest UX                                       | P0       | done    | Pilot       | Multi-file upload queue + “what we loaded” summary (5 MB/file)                  |
| H3  | Confidence calculator (tenant + per-signal; optional per-meter) | P0       | done    | Kelly/Pilot | Heuristic §7b freeze (months + coverage + seasonality); store/per-meter = Pilot |
| H4  | Operator dashboard Confidence card                              | P0       | done    | Kelly       | Level + display score + improve hint + per-signal Watch/Actionable              |
| H5  | CRWA roll-up Confidence column / card                           | P1       | done    | Pilot       | Live with D4 / G6                                                               |
| H6  | Alert UX gating: Watch vs Actionable by Confidence              | P0       | done    | Kelly       | Statistical Watch until Solid; stuck/diag Actionable; balance Watch (§7a)       |
| H7  | Agent Confidence copy + never-overclaim guardrails              | P1       | done    | Pilot       | Shipped with E6                                                                 |
| H8  | Kelly review: Confidence threshold defaults                     | P1       | blocked | Pilot       | **Blocked** on F5 submit — apply Kelly feedback to Spec §7b freeze              |

## Epic I — CRWA membership billing (processor-agnostic)

Water Saver as a **CRWA member service** (dues / pilot status) — not municipal CIS write-back (vNext). Spec §9; living notes [docs/BILLING.md](BILLING.md).

**Do not** add a payment-processor SDK, webhooks, or secrets until **I3** is written with a decision. I0–I2 ship without a processor.

| ID  | Title                                                                                      | Priority | Status  | Layer              | Notes                                                                             |
| --- | ------------------------------------------------------------------------------------------ | -------- | ------- | ------------------ | --------------------------------------------------------------------------------- |
| I0  | Tenant billing fields + status on CRWA tenant list; provision form plan + pilot/paid       | P1       | done    | Early pilot        | `billingStatus`, plan, meter estimate; extend D3 profile; no processor            |
| I1  | Admin: Record external payment, Extend pilot, Mark past due / Suspend / Reactivate + audit | P1       | done    | Early pilot        | Internal `BILL#EVENT` ledger; offline check/ACH; no processor                     |
| I2  | Municipality Billing page (status + plain-language plan; history from our ledger)          | P1       | done    | Early pilot / near | System Admin only; no “update card” until I4–I6                                   |
| I3  | **Due-out:** Payment processor discovery with CRWA                                         | P1       | blocked | Discovery          | **Blocked** awaiting CRWA discovery conversation; outcome → Spec §12 / BILLING.md |
| I4  | **Install:** Processor adapter (Stripe recommended if greenfield)                          | P1       | blocked | After I3           | Blocked on I3                                                                     |
| I5  | Webhooks / sync → auto `billingStatus`                                                     | P0       | blocked | After I4           | Blocked on I3 → I4                                                                |
| I6  | Self-serve payment-method update (portal or vendor equivalent)                             | P1       | blocked | After I4           | Blocked on I3 → I4                                                                |
| I7  | Subscriptions + dunning automation                                                         | P2       | blocked | Later              | Blocked on I3                                                                     |
| I8  | Usage band suggestion polish + basic revenue export                                        | P2       | blocked | Later              | Blocked on I3                                                                     |

---

## Suggested next sprint (Pilot)

1. **Ship E7 / Feature 014** — Cognito JWT RAG (Bedrock KB) + prove residual + Watch on SPA `/assistant`
2. **Send Kelly** F5 invite (`/review` + creds + [KELLY_REVIEW.md](KELLY_REVIEW.md)); wait for real submit
3. Smoke live **D4 roll-up** (CRWA Admin → `/crwa`) and **Assistant** (JWT RAG path)
4. Smoke **B6** upload status + **H2** multi-file; confirm archive merge no longer wipes occupant names
5. Finish **E2** onboarding interview depth (H1 thin stub already live)
6. **I3** CRWA processor discovery conversation (blocks I4–I8)
7. **H8** after Kelly Confidence-threshold feedback from F5
8. True session-tag ABAC when multi-municipality scale demands it (A6 residual)

Do **not** start vNext (AMI, resident portal, **municipal CIS** billing write-back, custom ML, formal address parse, **agent-driven AWS resource provisioning** beyond Feature 014 RAG).

Do **not** start membership payment-processor code (I4+) until I3 is closed with a written decision.
