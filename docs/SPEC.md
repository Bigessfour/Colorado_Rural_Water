# Water Saver – Spec Kit

*Working name: Water Saver (final name to be chosen by Colorado Rural Water Association)*
*Status: Scoped for Kelly demo → Pilot hardening → vNext (see §0)*
*Last updated: August 3, 2026*
*Scope freeze: section walkthrough defaults applied (subject to Kelly / pilot feedback where marked)*

---

## 0. Scope layers (authoritative)

Agents and humans use this section to decide what “done” means. Prefer this over older “everything is MVP” wording in tickets.

| Layer                  | Purpose                                                  | Quality bar                                                                             |
| ---------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Kelly demo**         | End-to-end walkthrough for Kelly Stone / CRWA leadership | Demo-polished **critical path**; known Pilot gaps are OK if listed and not fake dig-now |
| **Pilot hardening**    | 3–10 municipalities after Kelly                          | Stronger Confidence, roles, CRWA roll-up, AI agent, threshold stores                    |
| **vNext / post-pilot** | Explicitly deferred                                      | Do not start unless Spec §0 moves the item                                              |

### Kelly demo — Stay

- Messy customer CSV/Excel ingest + visual mapper + S3 drop (Epic B core)
- Core meter alerts (unusual usage, stuck, drops, diagnostic flags, statistical outliers) with **Watch vs Actionable**
- Member dashboard: KPI cards, usage/balance trend, prioritized alert feed, **Data Confidence card** (heuristic OK)
- **Water balance (live, light):** named sources, source readings (manual/CSV/S3), In − Out, `insufficient` when one-sided, Watch balance alerts with frozen defaults (§7a)
- Cognito email/password sign-in (MFA optional / later)
- Demonstrable `tenant_id` isolation for the demo tenant
- Scripted happy path + smoke checklist (F1–F2)
- Calm rural-operator UX on the critical path

### Pilot hardening — immediately after Kelly

- Persist acknowledge/resolve + audit (C3); export (C4); meter history drill-down (C5)
- Finish G4 tenant threshold store; G5 richer balance viz; G6 CRWA balance summary
- Real Confidence calculator + store (H3), bulk history UX (H2), full H6 gating polish
- Roles D1–D3; CRWA roll-up D4 + H5
- Conversational AI shell + onboarding interview + mapping help + cost/safety (Epic E) with Confidence coaching
- True per-tenant IAM ABAC (A6); MFA UX (D5 remainder)
- Per-meter Confidence; configurable reading cycles (beyond UTC calendar month)

### vNext / post-pilot — Defer

- Real-time AMI streaming
- Customer-facing portal / resident alerts
- Direct write-back to billing systems
- Custom ML / Bayesian leak models
- Exhaustive billing-system connectors
- Formal address parse beyond single-line service address
- Complex multi-step AWS provisioning driven by the agent
- Native mobile apps

---

## 1. Vision & Product Philosophy

**Stay — do not dilute.**

Water Saver is a CRWA-branded, multi-tenant cloud tool built specifically for small rural water systems in Colorado.

It gives municipal water operators (clerks, operators, managers) an easy way to import meter readings, see clear trends, and receive practical alerts that help:

- Conserve water
- Catch leaks and anomalies early
- Protect customers from unexpectedly high bills
- Account for water put into the system versus water billed (system loss / unexplained gain)
- Keep the utility looking competent and caring

**Core feeling the product must deliver**
“A big-city capability that was clearly designed for small rural systems.”
Operators and their customers should feel important and well-supported. The tool should reduce stress, not add it.

---

## 2. Goals & Success Criteria

**Primary success metric (Kelly + Pilot)**
A non-technical city clerk can upload (or drop) a messy real-world CSV/Excel file and, within minutes, see useful trend charts and alerts that help save money for both the utility and its customers — with almost zero need to call CRWA for help.

**Additional goals**

- Present a working pilot to Kelly Stone / CRWA leadership
- Serve as a strong portfolio piece demonstrating AWS multi-tenant architecture, AI assistance, and rural-focused UX
- Support 3–10 pilot municipalities cleanly and securely

**Quality bar**
- **Kelly:** demo-polished critical path (§0 Stay); no runtime errors on the walkthrough; Watch never reads as dig-now certainty
- **Pilot:** harden remaining P0 tickets; reduce rough edges on Operator / System Admin / CRWA Admin flows
- Do **not** interpret “production-ready / no rough edges” as requiring full Epic D/E/H before Kelly

---

## 3. Users & Roles

| Role              | Who                              | Kelly demo                         | Pilot                                 |
| ----------------- | -------------------------------- | ---------------------------------- | ------------------------------------- |
| Operator          | City clerk / operator            | **Stay** — primary demo persona    | Full                                  |
| System Admin      | Designated person at the utility | Stub / same as Operator OK         | Invite users (D2) + source management |
| CRWA Admin        | CRWA staff                       | Not required for Kelly walkthrough | Provision tenant (D3) + roll-up (D4)  |
| Conversational AI | System agent                     | Rules stay; full agent = Pilot     | Epic E                                |

**Capabilities (product intent — timing per §0)**

| Role              | Capabilities                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Operator          | Upload customer & source readings, view dashboard & alerts (including water balance), acknowledge alerts, manage own profile (password + MFA)    |
| System Admin      | Everything an Operator can do + invite/manage users **within their own system only** + manage named water sources                                |
| CRWA Admin        | Provision new municipalities (one initial user per system), view sanitized enterprise roll-up (incl. water-balance KPIs), manage global settings |
| Conversational AI | Guides onboarding, helps map data, explains alerts & loss figures, assists with configuration (with strict guardrails)                           |

---

## 4. Scope by layer (detail)

### Kelly — Must have

- Extremely forgiving CSV / Excel upload + visual column mapper
- Automated ingestion path (S3 drop zone)
- Core alerts: unusual/high usage, stuck/non-registering meters, sudden large drops, diagnostic flags, statistical outliers — **gated by Data Confidence** so thin history never reads as dig-now certainty
- Member Dashboard with KPI cards, trends, **live water balance (in vs out)**, **Data Confidence card**, prioritized alert feed
- **Named sources** + source readings + In − Out for a period (`insufficient` when one-sided)
- **Water-balance alerts** using **frozen defaults** (§7a); mode **Watch** until Confidence gating matures
- Cognito email + password auth (MFA optional for Kelly)
- Strong tenant isolation (demonstrable on demo tenant)
- Plain-language alert copy on the critical path (static/heuristic OK for Kelly; Bedrock C6 = Pilot if not ready)

### Pilot — Must have (after Kelly)

- Acknowledge / resolve alerts with persistence + audit (C3)
- Export of flagged meters (C4); basic meter history (C5)
- Tenant-configurable balance thresholds; richer balance viz; CRWA balance summary (G4 remainder, G5, G6)
- Agile onboarding paths A–D + bulk historical load UX (H1/H2/E2)
- Real Confidence calculator (H3) + CRWA Confidence roll-up (H5)
- Conversational AI agent for onboarding, mapping help, explanations, confidence coaching, and guided configuration (Epic E) with cost transparency
- Roles + CRWA enterprise roll-up (D1–D4)
- Self-service MFA UX; true per-tenant IAM ABAC (A6)

### Explicitly out of scope (vNext)

- Real-time AMI streaming
- Customer-facing portal or direct alerts to residents
- Direct write-back into billing systems
- Advanced custom ML models (confidence uses simple heuristics — see §7b)
- Native mobile apps
- Exhaustive support for every possible billing system
- Formal multi-field address parsing (street/city/zip) beyond single-line service address
- Agent-driven multi-step AWS provisioning

---

## 5. Onboarding Experience

### Kelly

- Use **Path A (Bootstrap)** with a **seeded demo tenant** and scripted walkthrough (F1)
- Live Bedrock onboarding interview is **not** required for Kelly
- Confidence expectations still shown in UI copy: Thin → statistical = Watch; stuck/diag may be Actionable with a clear “why”

### Pilot

When CRWA adds a new municipality:

1. System creates the tenant and provisions one initial user.
2. That user is greeted by the conversational AI agent.
3. Agent collects minimum required information conversationally:
   - System / town name
   - Approximate number of meters
   - Preferred units (gallons / cubic feet)
   - Typical billing cycle
   - Primary contact
   - Which billing or meter-reading system they use (offers the most common options + “Other / Spreadsheet”)
   - **Data inventory** — what history they can provide now (see paths below)
4. Agent tailors the ingestion experience (pre-selects helpful column suggestions when possible) **and sets Confidence expectations** in plain language.
5. User is guided to upload their first file (or bulk history) with heavy, friendly assistance.
6. AI remains available afterward for questions, mapping tweaks, confidence coaching, and configuration changes.

### Onboarding paths by data richness

Utilities arrive with very different archives. The product must be agile: **work with what they have**, never shame thin data, and never imply thin-data flags mean the same as a decade of history.

| Path                                             | What they have                            | Product behavior                                                                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Bootstrap (little / no history)**          | Current cycle only, or a few recent reads | Start immediately. Confidence starts **Thin**. Deterministic flags OK (stuck meter, diagnostic bits); statistical “unusual usage” stays **Watch**. Agent says confidence builds each cycle. |
| **B — Short history (≈1–6 months)**              | A handful of billing cycles               | Bulk or multi-file upload welcome. Confidence **Building**. Some comparative flags appear as Watch with “why we’re cautious” copy.                                                          |
| **C — Seasonal baseline (≈6–18 months)**         | About a year / two seasons                | Confidence approaches **Solid**. Statistical alerts can become **Actionable** once thresholds are met (§7b frozen defaults).                                                                |
| **D — Deep archive (1–3+ years, or many years)** | Multi-year exports                        | Prefer **bulk historical ingest** (one or many files). Confidence **Strong** faster. Still recalculate coverage % and gaps; do not assume every meter has full depth.                       |

**Bulk historical load (paths B–D) — Pilot**
Reuse Epic B ingest (forgiving mapper + S3 drop). Support multiple files / date ranges for the same tenant. After commit, recompute Confidence (tenant + per-signal). Show a short “what we loaded” summary: meters covered, date span, gaps.

**Agent behavior during onboarding (non-negotiable — apply when agent ships)**

- Ask what they have (“Any past months or years of readings you can export?”) — do not require deep history to start.
- Set expectations: thin data → useful Watch flags; dig-now Actionable statistical alarms need more comparable history.
- Never overclaim (“We found a leak” when Confidence is Thin). Prefer “Worth a look when you can” / “Watch — not enough history yet for a firm call.”
- Celebrate progress: “You’re about *N* more similar months from Solid confidence for usage outliers.”
- Apply the same honesty to **all** municipal data elements (customer meters, sources / water balance, trends, alerts)—not only high-usage flags.

---

## 6. Conversational AI Agent Rules (Critical)

**Stay** these rules permanently. **Kelly:** optional thin explanations (C6) or static copy. **Pilot:** full agent must obey all of the following.

- Tone: Professional, friendly, helpful, and reassuring. Feels like it was built for *this* town.
- Retains conversation history and names where appropriate so interactions feel continuous and personal.
- When proposing any configuration or AWS-related change:
  - Explain clearly what will happen
  - State the cost impact in plain language
  - Always present the **cheapest viable option first**
  - Require explicit confirmation before proceeding
  - Offer clear alternatives if the user wants more capability
- **Confidence coaching**
  - Explain Confidence in everyday language (how much history and coverage we have—not “how sure we are of a leak”)
  - Distinguish **Watch** vs **Actionable** whenever discussing flags
  - Never imply dig-now certainty from Thin / Building models
- **Hard safety rules**
  - Never delete or make dramatic changes to data without a specific, multi-step, intentionally directive confirmation from the user
  - Never expose one tenant’s data to another
  - Always help users understand (in everyday language) how AWS and CRWA are protecting their data

---

## 7. Data & Ingestion

**Canonical customer / distribution fields (flexible)**

| Field                                                 | Role                                         | Stability                                                                       |
| ----------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| **Meter ID**                                          | Identity of the physical meter at a location | Stable (replaced only if hardware replaced)                                     |
| **Service address**                                   | Service location the meter serves            | **Stable — treat as the meter’s location key for operators; should not change** |
| **Occupant / customer name**                          | Who is currently billed or living there      | **Mutable** — renters move, owners sell; updates do not move the meter          |
| Account Number                                        | Billing account (may change with ownership)  | Mutable                                                                         |
| Timestamp, Cumulative Reading, Unit, Diagnostic Flags | Reading stream                               | Per reading                                                                     |
| Meter Size, Install Date, Route                       | Meter metadata                               | Mostly stable                                                                   |

Also map any additional columns the AI helps when needed. **Do not collapse name and address into one field** in the canonical store — uploads may still ship them mashed together; the mapper separates them.

**Meter location rule (Kelly + Pilot)**
A meter is tracked by **Meter ID + service address**. Alerts, history, exports, and dashboards always show the address with the meter. When a new name appears for the same Meter ID / address, update the current occupant name and keep history of readings continuous — do not create a second meter.

**Frozen for Kelly — address depth**
Single-line **service address** string only. Formal street/city/zip / 911 / PO Box componentization = **vNext**.

**Canonical production / source fields**
Source ID, Source Name (e.g. “Well 1 – North”, “Well 2 – Town”), Source Type (well / spring / purchase / other), Timestamp, Cumulative or Period Volume, Unit. Operators must be able to name each source clearly.

**Frozen for Kelly — source reading semantics**
Mapper and store accept **both** period volumes and cumulative readings (same as customer meters). Prefer period volume when both are present for a source row only if the mapping says so; otherwise follow mapped columns. Do not require operators to pick one global mode for Kelly.

**Ingestion principles**

- Extremely tolerant of messy, improperly formatted, or incomplete files
- Everyday-language feedback and guidance so non-technical users succeed
- Visual column mapper that remembers the mapping for that system
- Handles new accounts, unexpected columns, and real-world variation without frustration
- Both interactive upload and automated S3 drop supported from day one
- Source (in) readings may be entered manually, uploaded as a small spreadsheet, or dropped to S3 — same forgiving UX as customer meters

**Retention**
Default 24 months, configurable per municipality. Longer retention may affect the subscription fee (pricing formula = Pilot / open).

---

## 7a. Water balance (production vs billed)

Small systems often have **2–3 wells** (or other sources). Each source has a meter that records water **put into** the distribution system. Customer meters record water **taken out** / billed.

**Ideal:** for a chosen period,
`Σ source production ≈ Σ customer consumption`

Reality is never perfect (flushing, leaks, meter error, theft, timing mismatches). The product must make the **gap** visible and trackable so operators can spot big leaks and also catch the reverse problem (billed volume exceeding what was pumped).

### Definitions (plain language)

| Term                           | Meaning                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| **In (production)**            | Sum of named source meter volumes for the period (wells, etc.)                           |
| **Out (billed / distributed)** | Sum of customer meter usage for the same period (from cumulative deltas or billed usage) |
| **Unaccounted volume**         | `In − Out` (positive = loss / unbilled; negative = billed more than produced)            |
| **Unaccounted %**              | `(In − Out) / In × 100` when In > 0; **null** when status is `insufficient`              |

**Status semantics (Kelly — non-negotiable)**
- `insufficient` when In and/or Out is missing for the period (one-sided or empty) — **never** present as loss/gain dig-now
- `loss` / `gain` / `ok` only when both sides have data

### Period keying

| Layer              | Behavior                                                          |
| ------------------ | ----------------------------------------------------------------- |
| **Kelly (frozen)** | UTC calendar months (`YYYY-MM`) from reading timestamps           |
| **Pilot**          | Configurable reading/billing cycles (e.g. mid-month to mid-month) |

Do not treat calendar-month as the final product model — it is the Kelly / early-pilot default.

### Operator experience

1. Configure named sources (Well 1, Well 2, …) once per system.
2. Enter or upload source readings each cycle (as easy as customer uploads).
3. After customer meter ingest, dashboard shows In / Out / Loss (or Gain) with a simple chart over time — or **insufficient** with calm copy when thin.
4. Alerts when loss % or absolute volume exceeds thresholds, or when Out > In by more than a small tolerance (**Watch** mode for Kelly).

### Frozen for Kelly — balance alert defaults

Subject to pilot feedback (H8 / Kelly review). Match code `DEFAULT_BALANCE_THRESHOLDS`:

| Signal                | Default                                                                 | Notes                                                     |
| --------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------- |
| High unaccounted loss | `unaccountedPct ≥ 15` **and** `unaccountedGal ≥ 10_000`                 | Skip if `insufficient`                                    |
| Sold exceeds produced | Out exceeds In by more than **2%** of In **and** excess ≥ **5_000** gal | Timing tolerance                                          |
| Alert mode            | **Watch**                                                               | Until H3/H6 mature; never dig-now framing on Thin balance |

Per-tenant threshold store = **Pilot** (finish G4).

### CRWA roll-up

**Pilot:** sanitized per-municipality water-balance KPI and trend — enough for CRWA to see which systems have rising loss without exposing customer PII. Not a Kelly blocker.

### Explicit non-goals

- Hydraulic modeling / GIS pipe networks
- Automatic allocation of loss to a specific main break location
- Real-time SCADA streaming from well pumps

---

## 7b. Data Confidence — history depth vs actionable alarms

**Problem:** A flag on a system with 1–2 months of readings must not feel like the same “dig now” signal as a flag on a system with 10 years of history. Operators need to understand **what the data is telling them** and that **good actionable insight builds over time**.

**What Confidence measures**
Confidence is **not** “probability of a leak.” It is a plain-language score of **how much comparable history and coverage we have** for a given signal so statistical / comparative claims are fair.

Applies to **all** municipal data elements in scope:

| Signal family           | Examples                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Customer meters         | High usage vs peers/history, stuck / non-registering, sudden drops, diagnostic flags |
| Water balance / sources | Unaccounted %, In vs Out trends, sold > pumped                                       |
| Trends & roll-ups       | Period charts, CRWA cross-pilot summaries                                            |

### Levels (operator-facing labels)

| Level        | Intent                                        | Operator message (examples)                                                    |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------ |
| **Thin**     | Very little history or sparse coverage        | “Early data — flags are for watching, not digging yet.”                        |
| **Building** | Several cycles; incomplete seasonality        | “Useful patterns starting — treat statistical alerts as Watch.”                |
| **Solid**    | Enough comparable history for cautious action | “Strong enough for Actionable statistical alerts (still verify in the field).” |
| **Strong**   | Deep / multi-season (or multi-year) coverage  | “History is deep enough for firm comparative calls.”                           |

### Calculator (simple heuristics — no custom ML)

Score from transparent inputs (document formula in code comments; tune later via H8):

1. **Months of comparable readings** — contiguous (or near-contiguous) billing cycles with usable data for the signal.
2. **Meter / source coverage %** — share of expected meters (or named sources) present in recent cycles.
3. **Seasonality coverage** — whether both colder and warmer periods are represented (matters for usage outliers and balance norms).
4. **Signal completeness** — e.g. balance Confidence also needs source *and* customer sides for the same periods.

Produce:

- **Tenant-level Confidence** — default dashboard KPI (“your system overall”). **Kelly Stay.**
- **Per-signal Confidence** — customer usage, water balance, meter health, etc. **Kelly Stay** (heuristic OK).
- **Per-meter Confidence** — **Pilot** (not required for Kelly).

### Watch vs Actionable

| Mode                        | When                                                              | UX                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Watch**                   | Below Actionable threshold for that signal                        | Tag severity as Watch / informational; copy explains thin history; do **not** imply dig-now. Export still allowed with a Confidence note. |
| **Actionable**              | At/above threshold                                                | Normal priority alerts; still plain-language, never absolute certainty.                                                                   |
| **Deterministic always-on** | Stuck zero, hardware diagnostic bits, obvious missing source read | May stay Actionable even when statistical Confidence is Thin — but label why (“meter reported stuck,” not “leak model”).                  |

### Frozen for Kelly — Confidence thresholds

**Subject to pilot feedback (ticket H8).** Treat as locked for implementation until Kelly review changes them:

| Guidance                                  | Frozen default                                                                               | Notes                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Thin → Building                           | **3** months comparable history **and** coverage ≥ **50%**                                   | Below this: statistical usage outliers = Watch only                            |
| Building → Solid (Actionable statistical) | **6** months comparable history                                                              | Copy may say “About *N* more similar months toward a high display score (~90)” |
| Solid → Strong                            | **12+** months **and** seasonality (winter + summer) **and** coverage ≥ **80%**              | Multi-year archive accelerates Strong if coverage holds                        |
| Display score                             | 0–100 heuristic mapped from the inputs above                                                 | Must never be labeled “leak accuracy %”                                        |
| “>90% Confidence”                         | Means **display score** near Solid — **not** a fifth named level                             |                                                                                |
| Balance vs stuck gating                   | Balance alerts = **Watch** while Thin/Building; stuck/diag may be **Actionable** with reason |                                                                                |
| Scope                                     | Tenant + per-signal for Kelly; per-meter = Pilot                                             |                                                                                |

### Operator dashboard

- **Confidence card / report**: level label, display score (if shown), plain-language “what this means,” and “what would improve it” (e.g. “Upload 4 more monthly cycles” / “Add Well 2 readings for June–July”).
- Alert feed shows Watch vs Actionable tags; Thin systems never look like a fake high-accuracy leak detector.
- AI explanations must mention Confidence when discussing statistical flags (when AI ships).

### CRWA roll-up

**Pilot:** sanitized per-municipality Confidence (level + months of history / coverage summary) next to water-balance KPIs. Helps CRWA coach pilots. No cross-tenant PII.

### Explicit non-goals

- Bayesian leak probability models or custom deep learning
- Claiming Confidence = field-verified leak certainty
- Blocking operators from *seeing* Watch flags (visibility yes; dig-now framing no)

---

## 8. Security & Trust

- Full tenant isolation (data, users, configuration) — **Kelly Stay** (demonstrable)
- Encryption at rest and in transit — **Stay**
- Cognito-managed authentication with optional MFA — password **Kelly**; MFA UX **Pilot**
- AI explains data protection in plain language — **Pilot** (with agent)
- Clear auditability of important actions — ack audit **Pilot** (C3)
- No dramatic data changes without multi-step intentional confirmation — **Stay** (agent rules)
- True per-tenant IAM ABAC — **Pilot** (A6)

---

## 9. Cost & Pricing Model

- Transparent AWS cost structure — **Pilot** (F3 polish)
- CRWA sets the target price point for the service — **open** (business)
- System can suggest pricing to municipalities based on number of meters and complexity of needs — **Pilot / open**
- AI always surfaces cost implications of configuration choices — **Pilot** (with agent)
- **Kelly:** no pricing UI required

---

## 10. Technical Direction (High Level)

- Multi-tenant AWS serverless architecture
- Strong isolation by `tenant_id`
- Angular + PrimeNG frontend (consistent with existing municipal work); PrimeNG MCP mandatory for UI component work (see `AGENTS.md`)
- Cognito authentication
- Forgiving ingestion pipeline + AI-assisted mapping
- Bedrock-powered explanations and conversational agent (**Pilot** for full agent)
- Terraform for infrastructure
- Quality: demo-polished Kelly critical path; Pilot hardens the rest (see §0 / §2)

---

## 11. Acceptance Criteria

### 11a. Ready to show Kelly Stone

- [ ] A non-technical user can ingest a messy real-world **customer** file with friendly guidance
- [ ] Dashboard shows trends, **live water balance** (or calm `insufficient` copy), **Data Confidence**, and prioritized alerts with Watch vs Actionable obvious when history is thin
- [ ] Operator can name 2–3 sources, ingest source readings, and see In/Out/Loss (or insufficient) vs aggregated customer usage for a period
- [ ] Balance / statistical alerts never read as dig-now certainty on Thin data
- [ ] Tenant isolation is solid and demonstrable (JWT → `tenant_id`; no client override)
- [ ] Sign-in works for the demo operator (email/password)
- [ ] Critical path feels calm and rural-friendly (no confusing setup on the walkthrough)
- [ ] Scripted walkthrough (F1) + smoke checklist (F2) pass without runtime errors

**Not Kelly blockers:** full conversational AI, CRWA enterprise roll-up, persisted ack audit, MFA, per-tenant balance threshold admin UI, bulk multi-year history UX.

### 11b. Ready for pilot expansion (after Kelly)

- [x] C3 persist ack; C4 export; C5 meter history
- [ ] G4 tenant thresholds; G5 viz polish; G6 + D4 + H5 CRWA roll-up (balance + Confidence)
- [ ] H3 Confidence calculator stored; H2 bulk history; H6 gating complete
- [ ] Epic E agent obeys §6 (cost, deletes, no cross-tenant)
- [ ] D1–D3 roles; A6 ABAC progress; D5 MFA UX
- [ ] Onboarding paths B–D usable without shame copy

---

## 12. Open Items

### Still open (need CRWA / business input)

- Final product name (CRWA)
- Exact list of “top” billing systems to pre-support in the first pilot release
- Detailed pricing formula (meter count bands, retention multipliers, etc.)
- Additional sample data sets beyond current fixtures (expand as pilots join)

### Frozen for Kelly (revisit in Pilot / H8 — not blockers)

| Topic                          | Frozen decision                                                     |
| ------------------------------ | ------------------------------------------------------------------- |
| Water-balance alert thresholds | 15% + 10k gal loss; 2% + 5k gal sold>pumped; Watch mode             |
| Period keying                  | UTC `YYYY-MM`                                                       |
| Source reading semantics       | Both period and cumulative tolerated                                |
| Address depth                  | Single-line service address                                         |
| Confidence cutoffs             | 3 / 6 / 12 months + coverage 50% / 80%; display score ≠ fifth level |
| Per-meter Confidence           | Pilot                                                               |
| Balance alert aggressiveness   | Watch while Thin/Building; stuck/diag Actionable with reason        |
