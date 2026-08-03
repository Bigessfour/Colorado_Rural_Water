# Water Saver MVP – Implementation Tickets

Ordered for a vertical slice first (messy file → dashboard + alerts), then multi-tenant hardening and AI polish.

Statuses: `todo` | `in_progress` | `done` | `blocked`

---

## Epic A — Foundation

| ID  | Title                                         | Priority | Status | Notes                                                                                           |
| --- | --------------------------------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------- |
| A1  | Repo bootstrap & README                       | P0       | done   | Monorepo layout, Spec Kit, this backlog                                                         |
| A2  | Terraform skeleton (accounts, naming, tags)   | P0       | done   | Account 570912405222 / profile townofwiley; provider ~> 6.0                                     |
| A3  | Cognito user pool + app client (MFA optional) | P0       | done   | Live pool us-east-2_oHpsTZZAN; MFA/groups IAM workarounds                                       |
| A4  | Tenant model + isolation strategy doc         | P0       | done   | DynamoDB single-table + S3 uploads; see TENANT_ISOLATION.md                                     |
| A5  | API Gateway + Lambda stub (health + me)       | P0       | done   | Live API 14jxov7h72; /health 200, /me JWT 401 without token                                     |
| A6  | Per-tenant IAM ABAC / session tags            | P1       | todo   | Shared role hardened to tenants/* + LeadingKeys TENANT#*; true cross-tenant IAM deny still open |

## Epic B — Ingestion (critical path)

| ID  | Title                                         | Priority | Status | Notes                                                  |
| --- | --------------------------------------------- | -------- | ------ | ------------------------------------------------------ |
| B1  | Sample messy CSV/Excel fixtures               | P0       | done   | Customer + source CSVs; address + name churn           |
| B2  | Presigned upload + S3 drop zone per tenant    | P0       | done   | Presign + S3 notify → s3-ingest; bucket live           |
| B3  | Parse CSV/Excel with forgiving heuristics     | P0       | done   | `csv-parse.ts` + tests on sample fixture (Excel later) |
| B4  | Visual column mapper UI + saved mapping       | P0       | done   | Upload mapper UI + Dynamo `MAP#customer_readings`      |
| B5  | Canonical reading + meter-location store      | P0       | done   | Dynamo LOC#/RDG#; POST /ingest smoked with sample CSV  |
| B6  | Ingestion status UX (progress / failures)     | P1       | todo   | Non-technical friendly                                 |
| B7  | Occupant-name update without relocating meter | P1       | done   | Covered by meter-location upsert + ingest commit       |

## Epic C — Alerts & Dashboard

| ID  | Title                                                       | Priority | Status | Notes                                                                                               |
| --- | ----------------------------------------------------------- | -------- | ------ | --------------------------------------------------------------------------------------------------- |
| C1  | Alert engine v1 (high usage, stuck, drops, flags, outliers) | P0       | done   | Deterministic rules + Confidence Watch/Actionable; GET /alerts |
| C2  | Member dashboard (KPIs, trends, alert feed)                 | P0       | todo   | Angular + PrimeNG; include water-balance panel (G5) + Confidence card (H4)                          |
| C3  | Acknowledge / resolve alerts                                | P0       | todo   | Session ack wired; persist audit who/when                       |
| C4  | Export flagged meters                                       | P1       | todo   | CSV download; include Confidence note on Watch rows                                                 |
| C5  | Basic meter history view                                    | P1       | todo   | Drill-down shows service address + current occupant name                                            |
| C6  | AI plain-language alert explanations                        | P1       | todo   | Bedrock; tenant-scoped context only; explain loss/gain + Confidence in plain language               |

## Epic D — Auth, roles & CRWA roll-up

| ID  | Title                                       | Priority | Status | Notes                                                                          |
| --- | ------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------ |
| D1  | Roles: Operator / System Admin / CRWA Admin | P0       | todo   | Cognito groups or custom claims                                                |
| D2  | System Admin: invite users within tenant    | P1       | todo   |                                                                                |
| D3  | CRWA Admin: provision tenant + initial user | P0       | todo   | Onboarding entry point                                                         |
| D4  | CRWA enterprise roll-up (sanitized)         | P1       | todo   | No cross-tenant PII leakage; include water-balance KPIs (G6) + Confidence (H5) |
| D5  | Self-service password + MFA UX              | P1       | todo   | Cognito hosted or custom                                                       |

## Epic G — Water balance (production in vs billed out)

Named source/well meters vs aggregated customer usage — Spec §7a. Goal: surface unexplained loss (leaks) and the reverse (billed > pumped).

| ID  | Title                                                     | Priority | Status | Notes                                                           |
| --- | --------------------------------------------------------- | -------- | ------ | --------------------------------------------------------------- |
| G1  | Named sources CRUD (tenant-scoped)                        | P0       | todo   | Well 1 / Well 2 naming; type well/spring/purchase/other         |
| G2  | Source reading ingest (manual + CSV/S3, forgiving mapper) | P0       | todo   | Same UX bar as Epic B; period or cumulative                     |
| G3  | Balance calculator for billing period                     | P0       | todo   | In − Out, unaccounted %; align period with reading cycle        |
| G4  | Water-balance alerts (high loss + sold > pumped)          | P0       | todo   | Tenant thresholds; tolerance for small timing mismatch          |
| G5  | Operator dashboard viz (In / Out / Loss trend)            | P0       | todo   | KPI + simple chart; stub already on member dashboard            |
| G6  | CRWA roll-up water-balance summary                        | P1       | todo   | Sanitized per-municipality KPI/trend; wire with D4              |
| G7  | Sample source + customer fixtures for demo balance        | P0       | done   | `messy-source-readings-july.csv` + existing customer CSV; GH #9 |

## Epic E — Conversational AI

| ID  | Title                                              | Priority | Status | Notes                                                            |
| --- | -------------------------------------------------- | -------- | ------ | ---------------------------------------------------------------- |
| E1  | Agent shell + conversation history (tenant-scoped) | P1       | todo   | Bedrock                                                          |
| E2  | Onboarding interview flow                          | P1       | todo   | Per Spec §5; include data-inventory questions (extend with H1)   |
| E3  | Mapping assistance + config help                   | P1       | todo   |                                                                  |
| E4  | Cost-transparency + confirmation guardrails        | P0       | todo   | Cheapest option first; no delete without multi-step confirm      |
| E5  | Tenant isolation tests for AI context              | P0       | todo   | Hard safety rule                                                 |
| E6  | Confidence coaching copy in agent                  | P1       | todo   | Watch vs Actionable; never overclaim; Spec §5 / §7b (same as H6) |

## Epic F — Polish for Kelly Stone demo

| ID  | Title                                      | Priority | Status | Notes               |
| --- | ------------------------------------------ | -------- | ------ | ------------------- |
| F1  | Seed demo tenant + guided walkthrough      | P0       | todo   | Scripted happy path |
| F2  | End-to-end smoke test checklist            | P0       | todo   | Maps to Spec §11    |
| F3  | Cost/usage transparency copy in UI         | P2       | todo   |                     |
| F4  | Branding placeholder (CRWA + working name) | P2       | todo   | Final name TBD      |

## Epic H — Onboarding agility & Data Confidence

Work with any amount of history (none → years); never treat thin-data flags as dig-now alarms. Spec §5 paths + §7b. Heuristics only in MVP (no custom ML). Tracking: [GH #10](https://github.com/Bigessfour/Colorado_Rural_Water/issues/10).

| ID  | Title                                                           | Priority | Status | Notes                                                                                        |
| --- | --------------------------------------------------------------- | -------- | ------ | -------------------------------------------------------------------------------------------- |
| H1  | Onboarding data-inventory interview                             | P0       | todo   | Extend E2: ask what history they have; set Confidence expectations; paths A–D                |
| H2  | Historical bulk ingest UX                                       | P0       | todo   | Multi-file / multi-year load on top of Epic B; post-load “what we loaded” summary            |
| H3  | Confidence calculator (tenant + per-signal; optional per-meter) | P0       | todo   | Months + coverage % + seasonality heuristics; store on tenant; thresholds = open decisions   |
| H4  | Operator dashboard Confidence card                              | P0       | todo   | Level + plain-language meaning + “what improves it”; stub on member dashboard                |
| H5  | CRWA roll-up Confidence column / card                           | P1       | todo   | Sanitized per-municipality; wire with D4 / G6; stub on `/crwa`                               |
| H6  | Alert UX gating: Watch vs Actionable by Confidence              | P0       | todo   | Gate statistical alerts; keep deterministic stuck/diag Actionable with clear why; extends C1 |
| H7  | Agent Confidence copy + never-overclaim guardrails              | P1       | todo   | Same intent as E6; ship with Epic E                                                          |
| H8  | Kelly review: Confidence threshold defaults                     | P1       | todo   | Lock open decisions in Spec §7b / §12 after pilot feedback                                   |

---

## Suggested first sprint (vertical slice)

1. A2–A5 — auth + API stub *(done for A2/A3/A5)*
2. B1–B5 — ingest messy customer file into tenant store
3. G1–G3 + G7 — named sources + source readings + balance calc (+ fixtures)
4. C1–C3 + G4–G5 — alerts (incl. balance) + operator dashboard viz
5. H3–H4 + H6 stubs — Confidence card + Watch tagging on thin demo data
6. F1–F2 — demo path ready (show loss % + Confidence on dashboard)

After that sprint lands, run an incremental `/code-review` on auth + ingestion + water balance + alert path before expanding AI (Epic E + H1/H7) and CRWA roll-up (D4 + G6 + H5).
