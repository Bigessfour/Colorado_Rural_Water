# Water Saver MVP – Implementation Tickets

Ordered for a vertical slice first (messy file → dashboard + alerts), then multi-tenant hardening and AI polish.

Statuses: `todo` | `in_progress` | `done` | `blocked`

---

## Epic A — Foundation

| ID  | Title                                         | Priority | Status | Notes                                                       |
| --- | --------------------------------------------- | -------- | ------ | ----------------------------------------------------------- |
| A1  | Repo bootstrap & README                       | P0       | done   | Monorepo layout, Spec Kit, this backlog                     |
| A2  | Terraform skeleton (accounts, naming, tags)   | P0       | done   | Account 570912405222 / profile townofwiley; provider ~> 6.0 |
| A3  | Cognito user pool + app client (MFA optional) | P0       | done   | Live pool us-east-2_oHpsTZZAN; MFA/groups IAM workarounds   |
| A4  | Tenant model + isolation strategy doc         | P0       | todo   | Draft in `docs/TENANT_ISOLATION.md`; finalize store choice  |
| A5  | API Gateway + Lambda stub (health + me)       | P0       | done   | Live API 14jxov7h72; /health 200, /me JWT 401 without token |

## Epic B — Ingestion (critical path)

| ID  | Title                                      | Priority | Status | Notes                                        |
| --- | ------------------------------------------ | -------- | ------ | -------------------------------------------- |
| B1  | Sample messy CSV/Excel fixtures            | P0       | in_progress | Customer + source CSVs; address column + name churn demo |
| B2  | Presigned upload + S3 drop zone per tenant | P0       | todo        | Interactive upload and automated drop                    |
| B3  | Parse CSV/Excel with forgiving heuristics  | P0       | todo        | Everyday-language error messages                         |
| B4  | Visual column mapper UI + saved mapping    | P0       | todo        | Remembers mapping per tenant; split name vs address      |
| B5  | Canonical reading + meter-location store   | P0       | todo        | Meter ID, **service address (stable)**, occupant name (mutable), readings |
| B6  | Ingestion status UX (progress / failures)  | P1       | todo        | Non-technical friendly                                   |
| B7  | Occupant-name update without relocating meter | P1    | todo        | Same meter_id/address → update name only; continuous history |

## Epic C — Alerts & Dashboard

| ID  | Title                                                       | Priority | Status | Notes                                                                         |
| --- | ----------------------------------------------------------- | -------- | ------ | ----------------------------------------------------------------------------- |
| C1  | Alert engine v1 (high usage, stuck, drops, flags, outliers) | P0       | todo   | Deterministic rules first; no custom ML; include water-balance rules (see G4) |
| C2  | Member dashboard (KPIs, trends, alert feed)                 | P0       | todo   | Angular + PrimeNG; include water-balance panel (G5)                           |
| C3  | Acknowledge / resolve alerts                                | P0       | todo   | Audit who/when                                                                |
| C4  | Export flagged meters                                       | P1       | todo   | CSV download                                                                  |
| C5  | Basic meter history view                                    | P1       | todo   | Drill-down shows service address + current occupant name |
| C6  | AI plain-language alert explanations                        | P1       | todo   | Bedrock; tenant-scoped context only; explain loss/gain in plain language      |

## Epic D — Auth, roles & CRWA roll-up

| ID  | Title                                       | Priority | Status | Notes                                                        |
| --- | ------------------------------------------- | -------- | ------ | ------------------------------------------------------------ |
| D1  | Roles: Operator / System Admin / CRWA Admin | P0       | todo   | Cognito groups or custom claims                              |
| D2  | System Admin: invite users within tenant    | P1       | todo   |                                                              |
| D3  | CRWA Admin: provision tenant + initial user | P0       | todo   | Onboarding entry point                                       |
| D4  | CRWA enterprise roll-up (sanitized)         | P1       | todo   | No cross-tenant PII leakage; include water-balance KPIs (G6) |
| D5  | Self-service password + MFA UX              | P1       | todo   | Cognito hosted or custom                                     |

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

| ID  | Title                                              | Priority | Status | Notes                                                       |
| --- | -------------------------------------------------- | -------- | ------ | ----------------------------------------------------------- |
| E1  | Agent shell + conversation history (tenant-scoped) | P1       | todo   | Bedrock                                                     |
| E2  | Onboarding interview flow                          | P1       | todo   | Per Spec §5                                                 |
| E3  | Mapping assistance + config help                   | P1       | todo   |                                                             |
| E4  | Cost-transparency + confirmation guardrails        | P0       | todo   | Cheapest option first; no delete without multi-step confirm |
| E5  | Tenant isolation tests for AI context              | P0       | todo   | Hard safety rule                                            |

## Epic F — Polish for Kelly Stone demo

| ID  | Title                                      | Priority | Status | Notes               |
| --- | ------------------------------------------ | -------- | ------ | ------------------- |
| F1  | Seed demo tenant + guided walkthrough      | P0       | todo   | Scripted happy path |
| F2  | End-to-end smoke test checklist            | P0       | todo   | Maps to Spec §11    |
| F3  | Cost/usage transparency copy in UI         | P2       | todo   |                     |
| F4  | Branding placeholder (CRWA + working name) | P2       | todo   | Final name TBD      |

---

## Suggested first sprint (vertical slice)

1. A2–A5 — auth + API stub *(done for A2/A3/A5)*
2. B1–B5 — ingest messy customer file into tenant store
3. G1–G3 + G7 — named sources + source readings + balance calc (+ fixtures)
4. C1–C3 + G4–G5 — alerts (incl. balance) + operator dashboard viz
5. F1–F2 — demo path ready (show loss % on dashboard)

After that sprint lands, run an incremental `/code-review` on auth + ingestion + water balance + alert path before expanding AI (Epic E) and CRWA roll-up (D4 + G6).
