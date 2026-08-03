# Water Saver – Implementation Tickets

Ordered for a vertical slice first (messy file → dashboard + alerts), then multi-tenant hardening and AI polish.

Statuses: `todo` | `in_progress` | `done` | `blocked`

**Scope authority:** [docs/SPEC.md](SPEC.md) **§0** (Kelly vs Pilot vs vNext). Prefer §0 over older “everything is MVP” wording.

---

## Kelly critical path (finish before F1/F2)

**Kelly path closed** (`e0bfd92` on main). Remaining work is **Pilot hardening** (Spec §0).

| Focus               | Tickets                   | Notes                                                        |
| ------------------- | ------------------------- | ------------------------------------------------------------ |
| Dashboard polish    | C2                        | Live balance + Confidence + balance alert feed; chart In/Out/Loss |
| Balance alerts feed | G4 (thin), G5             | Defaults frozen; UI feed done; **tenant threshold store shipped Pilot** |
| Confidence UX       | H3 stub→heuristic, H4, H6 | §7b freeze in engine + dashboard card + Watch gating         |
| Demo packaging      | F1, F2                    | docs/DEMO_WALKTHROUGH.md + docs/SMOKE_CHECKLIST.md           |
| Ack persistence     | C3                        | **Pilot: durable ack/resolve + audit under TENANT#**         |
| Export + history    | C4, C5                    | **Pilot: CSV export + meter history drill-down**             |
| Roles + onboarding  | D1, D2, D3                | **Pilot: Cognito roles + CRWA provision + System Admin invite** |

---

## Epic A — Foundation

| ID  | Title                                         | Priority | Status | Layer | Notes                                                                                           |
| --- | --------------------------------------------- | -------- | ------ | ----- | ----------------------------------------------------------------------------------------------- |
| A1  | Repo bootstrap & README                       | P0       | done   | Kelly | Monorepo layout, Spec Kit, this backlog                                                         |
| A2  | Terraform skeleton (accounts, naming, tags)   | P0       | done   | Kelly | Account 570912405222 / profile townofwiley; provider ~> 6.0                                     |
| A3  | Cognito user pool + app client (MFA optional) | P0       | done   | Kelly | Live pool us-east-2_oHpsTZZAN; MFA/groups IAM workarounds                                       |
| A4  | Tenant model + isolation strategy doc         | P0       | done   | Kelly | DynamoDB single-table + S3 uploads; see TENANT_ISOLATION.md                                     |
| A5  | API Gateway + Lambda stub (health + me)       | P0       | done   | Kelly | Live API 14jxov7h72; /health 200, /me JWT 401 without token                                     |
| A6  | Per-tenant IAM ABAC / session tags            | P1       | todo   | Pilot | Shared role hardened to tenants/* + LeadingKeys TENANT#*; true cross-tenant IAM deny still open |

## Epic B — Ingestion (critical path)

| ID  | Title                                         | Priority | Status | Layer | Notes                                                  |
| --- | --------------------------------------------- | -------- | ------ | ----- | ------------------------------------------------------ |
| B1  | Sample messy CSV/Excel fixtures               | P0       | done   | Kelly | Customer + source CSVs; **Town_of_Steve_Meter_Export_MESSY.xlsx** primary Excel stress fixture |
| B2  | Presigned upload + S3 drop zone per tenant    | P0       | done   | Kelly | Presign + S3 notify → s3-ingest; `kind:source` path    |
| B3  | Parse CSV/Excel with forgiving heuristics     | P0       | done   | Kelly | `csv-parse.ts` + `excel-parse.ts` (xlsx); header detect, footers, aliases, CF warn; **size/DoS caps + tenantFromKey harden** (post-review); tests on Town of Steve workbook |
| B4  | Visual column mapper UI + saved mapping       | P0       | done   | Kelly | Upload mapper UI + Dynamo `MAP#customer_readings`      |
| B5  | Canonical reading + meter-location store      | P0       | done   | Kelly | Dynamo LOC#/RDG#; POST /ingest smoked with sample CSV  |
| B6  | Ingestion status UX (progress / failures)     | P1       | todo   | Pilot | Non-technical friendly                                 |
| B7  | Occupant-name update without relocating meter | P1       | done   | Kelly | Covered by meter-location upsert + ingest commit       |

## Epic C — Alerts & Dashboard

| ID  | Title                                                       | Priority | Status      | Layer  | Notes                                                                        |
| --- | ----------------------------------------------------------- | -------- | ----------- | ------ | ---------------------------------------------------------------------------- |
| C1  | Alert engine v1 (high usage, stuck, drops, flags, outliers) | P0       | done        | Kelly  | Deterministic rules + Confidence Watch/Actionable; GET /alerts               |
| C2  | Member dashboard (KPIs, trends, alert feed)                 | P0       | done        | Kelly  | Live Confidence + balance chart (In/Out/Loss) + meter/balance alert feed |
| C3  | Acknowledge / resolve alerts                                | P0       | done        | Pilot  | Dynamo `ALERT#STATUS#`; audit who/when; resolved hidden from default GET   |
| C4  | Export flagged meters                                       | P1       | done        | Pilot  | `GET /alerts?format=csv` + Alerts “Export flagged CSV”; confidenceNote on Watch rows |
| C5  | Basic meter history view                                    | P1       | done        | Pilot  | `GET /meters/{meterId}`; Alerts History dialog (address + current occupant)          |
| C6  | AI plain-language alert explanations                        | P1       | todo        | Pilot  | Bedrock; tenant-scoped; Kelly may use static/heuristic copy                  |

## Epic D — Auth, roles & CRWA roll-up

| ID  | Title                                       | Priority | Status      | Layer       | Notes                                                                  |
| --- | ------------------------------------------- | -------- | ----------- | ----------- | ---------------------------------------------------------------------- |
| D1  | Roles: Operator / System Admin / CRWA Admin | P0       | done        | Pilot       | Cognito groups → AuthContext; `/me` roles; Admin nav gated             |
| D2  | System Admin: invite users within tenant    | P1       | done        | Pilot       | `POST /admin/users/invite`; JWT tenant only; temp password once        |
| D3  | CRWA Admin: provision tenant + initial user | P0       | done        | Pilot       | `POST /admin/tenants`; META#profile + Cognito AdminCreateUser          |
| D4  | CRWA enterprise roll-up (sanitized)         | P1       | todo        | Pilot       | No cross-tenant PII; include water-balance KPIs (G6) + Confidence (H5) |
| D5  | Self-service password + MFA UX              | P1       | in_progress | Kelly/Pilot | SPA email/password done (Kelly); MFA UX later (Pilot)                  |

## Epic G — Water balance (production in vs billed out)

Named source/well meters vs aggregated customer usage — Spec §7a. Goal: surface unexplained loss (leaks) and the reverse (billed > pumped).

| ID  | Title                                                     | Priority | Status      | Layer       | Notes                                                                             |
| --- | --------------------------------------------------------- | -------- | ----------- | ----------- | --------------------------------------------------------------------------------- |
| G1  | Named sources CRUD (tenant-scoped)                        | P0       | done        | Kelly       | GET/POST/PUT/DELETE /sources; Dynamo SRC#; DELETE cascades SRD#                   |
| G2  | Source reading ingest (manual + CSV/S3, forgiving mapper) | P0       | done        | Kelly       | POST /ingest/sources; SRD#; S3 `uploads/sources/` via `kind:source`               |
| G3  | Balance calculator for billing period                     | P0       | done        | Kelly       | GET /balance; one-sided=insufficient; period dedupe; UTC YYYY-MM                  |
| G4  | Water-balance alerts (high loss + sold > pumped)          | P0       | done        | Kelly/Pilot | Feed + UI (Kelly); tenant `CFG#balance_thresholds` + PUT /balance/thresholds (Pilot) |
| G5  | Operator dashboard viz (In / Out / Loss trend)            | P0       | done        | Kelly       | KPI + In/Out/Unaccounted chart; insufficient calm copy                      |
| G6  | CRWA roll-up water-balance summary                        | P1       | todo        | Pilot       | Sanitized per-municipality; wire with D4                                          |
| G7  | Sample source + customer fixtures for demo balance        | P0       | done        | Kelly       | `messy-source-readings-july.csv` + customer CSV; GH #9                            |

## Epic E — Conversational AI

| ID  | Title                                              | Priority | Status | Layer | Notes                                                          |
| --- | -------------------------------------------------- | -------- | ------ | ----- | -------------------------------------------------------------- |
| E1  | Agent shell + conversation history (tenant-scoped) | P1       | todo   | Pilot | Bedrock                                                        |
| E2  | Onboarding interview flow                          | P1       | todo   | Pilot | Per Spec §5; include data-inventory questions (extend with H1) |
| E3  | Mapping assistance + config help                   | P1       | todo   | Pilot |                                                                |
| E4  | Cost-transparency + confirmation guardrails        | P0       | todo   | Pilot | Cheapest option first; no delete without multi-step confirm    |
| E5  | Tenant isolation tests for AI context              | P0       | todo   | Pilot | Hard safety rule                                               |
| E6  | Confidence coaching copy in agent                  | P1       | todo   | Pilot | Watch vs Actionable; never overclaim; Spec §5 / §7b            |

## Epic F — Polish for Kelly Stone demo

| ID  | Title                                      | Priority | Status | Layer | Notes               |
| --- | ------------------------------------------ | -------- | ------ | ----- | ------------------- |
| F1  | Seed demo tenant + guided walkthrough      | P0       | done   | Kelly | docs/DEMO_WALKTHROUGH.md + sample-data CSVs |
| F2  | End-to-end smoke test checklist            | P0       | done   | Kelly | docs/SMOKE_CHECKLIST.md ↔ Spec §11a   |
| F3  | Cost/usage transparency copy in UI         | P2       | todo   | Pilot |                     |
| F4  | Branding placeholder (CRWA + working name) | P2       | todo   | Pilot | Final name TBD      |

## Epic H — Onboarding agility & Data Confidence

Work with any amount of history (none → years); never treat thin-data flags as dig-now alarms. Spec §5 paths + §7b. Heuristics only (no custom ML). Tracking: [GH #10](https://github.com/Bigessfour/Colorado_Rural_Water/issues/10).

| ID  | Title                                                           | Priority | Status | Layer       | Notes                                                                             |
| --- | --------------------------------------------------------------- | -------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| H1  | Onboarding data-inventory interview                             | P0       | todo   | Pilot       | Extend E2: ask what history they have; set Confidence expectations; paths A–D     |
| H2  | Historical bulk ingest UX                                       | P0       | todo   | Pilot       | Multi-file / multi-year load on top of Epic B; post-load “what we loaded” summary |
| H3  | Confidence calculator (tenant + per-signal; optional per-meter) | P0       | done   | Kelly/Pilot | Heuristic §7b freeze (months + coverage + seasonality); store/per-meter = Pilot |
| H4  | Operator dashboard Confidence card                              | P0       | done   | Kelly       | Level + display score + improve hint + per-signal Watch/Actionable              |
| H5  | CRWA roll-up Confidence column / card                           | P1       | todo   | Pilot       | Sanitized per-municipality; wire with D4 / G6                                     |
| H6  | Alert UX gating: Watch vs Actionable by Confidence              | P0       | done   | Kelly       | Statistical Watch until Solid; stuck/diag Actionable; balance Watch (§7a)         |
| H7  | Agent Confidence copy + never-overclaim guardrails              | P1       | todo   | Pilot       | Same intent as E6; ship with Epic E                                               |
| H8  | Kelly review: Confidence threshold defaults                     | P1       | todo   | Pilot       | Revisit Spec §7b freeze after Kelly feedback                                      |

## Epic I — CRWA membership billing (processor-agnostic)

Water Saver as a **CRWA member service** (dues / pilot status) — not municipal CIS write-back (vNext). Spec §9; living notes [docs/BILLING.md](BILLING.md).

**Do not** add a payment-processor SDK, webhooks, or secrets until **I3** is written with a decision. I0–I2 ship without a processor.

| ID  | Title                                                                                          | Priority | Status | Layer              | Notes                                                                                          |
| --- | ---------------------------------------------------------------------------------------------- | -------- | ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| I0  | Tenant billing fields + status on CRWA tenant list; provision form plan + pilot/paid           | P1       | done   | Early pilot        | `billingStatus`, plan, meter estimate; extend D3 profile; no processor                         |
| I1  | Admin: Record external payment, Extend pilot, Mark past due / Suspend / Reactivate + audit     | P1       | done   | Early pilot        | Internal `BILL#EVENT` ledger; offline check/ACH; no processor                                  |
| I2  | Municipality Billing page (status + plain-language plan; history from our ledger)              | P1       | done   | Early pilot / near | System Admin only; no “update card” until I4–I6                                                |
| I3  | **Due-out:** Payment processor discovery with CRWA                                             | P1       | todo   | Discovery          | Outcome in Spec §12 / BILLING.md; blocks I4+ only                                              |
| I4  | **Install:** Processor adapter (Stripe recommended if greenfield)                              | P1       | todo   | After I3           | Secrets in SSM/Secrets Manager; vendor-neutral `paymentProvider` + external ids                |
| I5  | Webhooks / sync → auto `billingStatus`                                                         | P0       | todo   | After I4           | Idempotent external event ids                                                                  |
| I6  | Self-serve payment-method update (portal or vendor equivalent)                                 | P1       | todo   | After I4           | Municipality System Admin                                                                      |
| I7  | Subscriptions + dunning automation                                                             | P2       | todo   | Later              | After pilot hardens                                                                            |
| I8  | Usage band suggestion polish + basic revenue export                                            | P2       | todo   | Later              | Meter band on create-tenant; export for CRWA bookkeeping                                       |

---

## Suggested next sprint (Pilot)

1. Smoke D1–D3: CRWA provision tenant → initial System Admin signs in → invite Operator → upload path
2. MFA UX (**D5** remainder); IAM ABAC (**A6**) thin if needed
3. Then Epic E / D4 roll-up (G6/H5) — not before admin onboarding smoke is green
4. When CRWA needs pilot vs paid tracking: **I0–I2 done** (manual status; still no processor SDK)
5. **I3** discovery conversation before any processor install (I4+)

Do **not** start vNext (AMI, resident portal, **municipal CIS** billing write-back, custom ML, formal address parse, agent AWS provisioning).

Do **not** start membership payment-processor code (I4+) until I3 is closed with a written decision.
