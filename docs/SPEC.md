# Water Saver – Spec Kit (MVP Draft)

*Working name: Water Saver (final name to be chosen by Colorado Rural Water Association)*
*Status: Proof-of-Concept / MVP – ready for review with Kelly Stone and portfolio use*
*Last updated: August 3, 2026*

---

## 1. Vision & Product Philosophy

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

## 2. Goals & Success Criteria (MVP)

**Primary success metric**
A non-technical city clerk can upload (or drop) a messy real-world CSV/Excel file and, within minutes, see useful trend charts and actionable alerts that help save money for both the utility and its customers — with almost zero need to call CRWA for help.

**Additional goals**

- Present a working pilot to Kelly Stone / CRWA leadership
- Serve as a strong portfolio piece demonstrating AWS multi-tenant architecture, AI assistance, and rural-focused UX
- Support 3–10 pilot municipalities cleanly and securely

---

## 3. Users & Roles

| Role              | Who                              | Capabilities                                                                                                                                         |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator          | City clerk / operator            | Upload customer & source (well) readings, view dashboard & alerts (including water balance), acknowledge alerts, manage own profile (password + MFA) |
| System Admin      | Designated person at the utility | Everything an Operator can do + invite/manage users **within their own system only** + manage named water sources                                    |
| CRWA Admin        | CRWA staff                       | Provision new municipalities (one initial user per system), view sanitized enterprise roll-up (incl. water-balance KPIs), manage global settings     |
| Conversational AI | System agent                     | Guides onboarding, helps map data, explains alerts & loss figures, assists with configuration (with strict guardrails)                               |

---

## 4. MVP Scope

### Must have

- Extremely forgiving CSV / Excel upload + visual column mapper
- Automated ingestion path (S3 drop zone)
- Core alerts: unusual/high usage, stuck/non-registering meters, sudden large drops, diagnostic flags, statistical outliers — **gated by Data Confidence** so thin history never reads as dig-now certainty
- Member Dashboard with KPI cards, usage trends, **water balance (in vs out)**, **Data Confidence card**, anomaly volume, meter health, prioritized alert feed, and AI explanations
- Ability to acknowledge / resolve alerts
- Export of flagged meters
- Basic meter history
- **Named production / source meters (wells, etc.) with period readings** and comparison to aggregated customer (distribution) usage
- **Water-balance alerts** when unexplained loss or “sold more than pumped” exceeds configurable thresholds
- CRWA enterprise roll-up dashboard (sanitized / anonymized where appropriate) **including water-balance summary and Confidence across pilots**
- Agile utility onboarding that works with **any** amount of historical data (none → months → years) plus bulk historical load when available
- Conversational AI agent for onboarding, mapping help, explanations, confidence coaching, and guided configuration
- Cognito email + password auth with self-service MFA and password management
- Strong tenant isolation and data security
- Transparent cost awareness (AI always offers cheapest option first and explains cost impact)

### Explicitly out of scope for MVP (vNext)

- Real-time AMI streaming
- Customer-facing portal or direct alerts to residents
- Direct write-back into billing systems
- Advanced custom ML models (confidence uses simple heuristics first — see §7b)
- Native mobile apps
- Exhaustive support for every possible billing system

---

## 5. Onboarding Experience

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

| Path | What they have | Product behavior |
| ---- | -------------- | ---------------- |
| **A — Bootstrap (little / no history)** | Current cycle only, or a few recent reads | Start immediately. Confidence starts **Thin**. Deterministic flags OK (stuck meter, diagnostic bits); statistical “unusual usage” stays **Watch**. Agent says confidence builds each cycle. |
| **B — Short history (≈1–6 months)** | A handful of billing cycles | Bulk or multi-file upload welcome. Confidence **Building**. Some comparative flags appear as Watch with “why we’re cautious” copy. |
| **C — Seasonal baseline (≈6–18 months)** | About a year / two seasons | Confidence approaches **Solid**. Statistical alerts can become **Actionable** once thresholds are met (defaults in §7b; open decisions). |
| **D — Deep archive (1–3+ years, or many years)** | Multi-year exports | Prefer **bulk historical ingest** (one or many files). Confidence **Strong** faster. Still recalculate coverage % and gaps; do not assume every meter has full depth. |

**Bulk historical load (paths B–D)**
Reuse Epic B ingest (forgiving mapper + S3 drop). Support multiple files / date ranges for the same tenant. After commit, recompute Confidence (tenant + per-signal). Show a short “what we loaded” summary: meters covered, date span, gaps.

**Agent behavior during onboarding (non-negotiable)**

- Ask what they have (“Any past months or years of readings you can export?”) — do not require deep history to start.
- Set expectations: thin data → useful Watch flags; dig-now Actionable statistical alarms need more comparable history.
- Never overclaim (“We found a leak” when Confidence is Thin). Prefer “Worth a look when you can” / “Watch — not enough history yet for a firm call.”
- Celebrate progress: “You’re about *N* more similar months from Solid confidence for usage outliers.”
- Apply the same honesty to **all** municipal data elements (customer meters, sources / water balance, trends, alerts)—not only high-usage flags.

---

## 6. Conversational AI Agent Rules (Critical)

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

**Meter location rule (MVP)**
A meter is tracked by **Meter ID + service address**. Alerts, history, exports, and dashboards always show the address with the meter. When a new name appears for the same Meter ID / address, update the current occupant name and keep history of readings continuous — do not create a second meter.

**Canonical production / source fields**
Source ID, Source Name (e.g. “Well 1 – North”, “Well 2 – Town”), Source Type (well / spring / purchase / other), Timestamp, Cumulative or Period Volume, Unit. Operators must be able to name each source clearly.

**Ingestion principles**

- Extremely tolerant of messy, improperly formatted, or incomplete files
- Everyday-language feedback and guidance so non-technical users succeed
- Visual column mapper that remembers the mapping for that system
- Handles new accounts, unexpected columns, and real-world variation without frustration
- Both interactive upload and automated S3 drop supported from day one
- Source (in) readings may be entered manually, uploaded as a small spreadsheet, or dropped to S3 — same forgiving UX as customer meters

**Retention**
Default 24 months, configurable per municipality. Longer retention may affect the subscription fee.

---

## 7a. Water balance (production vs billed) — MVP

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
| **Unaccounted %**              | `(In − Out) / In × 100` when In > 0                                                      |

Periods should align with the utility’s typical billing/reading cycle (configurable; default monthly).

**MVP period keying (pilot):** balance uses **UTC calendar months (`YYYY-MM`)** derived from reading timestamps. Configurable reading cycles (e.g. mid-month to mid-month) are deferred to G4/G5 — do not treat calendar-month as the final product model.

### Operator experience

1. Configure named sources (Well 1, Well 2, …) once per system.
2. Enter or upload source readings each cycle (as easy as customer uploads).
3. After customer meter ingest, dashboard shows In / Out / Loss (or Gain) with a simple chart over time.
4. Alerts when loss % or absolute volume exceeds tenant thresholds, or when Out > In by more than a small tolerance.

### CRWA roll-up

Sanitized view: per-municipality (or anonymized) water-balance KPI and trend — enough for CRWA to see which systems have rising loss without exposing customer PII.

### Explicit non-goals (MVP)

- Hydraulic modeling / GIS pipe networks
- Automatic allocation of loss to a specific main break location
- Real-time SCADA streaming from well pumps

---

## 7b. Data Confidence — history depth vs actionable alarms

**Problem:** A flag on a system with 1–2 months of readings must not feel like the same “dig now” signal as a flag on a system with 10 years of history. Operators need to understand **what the data is telling them** and that **good actionable insight builds over time**.

**What Confidence measures (MVP)**
Confidence is **not** “probability of a leak.” It is a plain-language score of **how much comparable history and coverage we have** for a given signal so statistical / comparative claims are fair.

Applies to **all** municipal data elements in scope:

| Signal family | Examples |
| ------------- | -------- |
| Customer meters | High usage vs peers/history, stuck / non-registering, sudden drops, diagnostic flags |
| Water balance / sources | Unaccounted %, In vs Out trends, sold > pumped |
| Trends & roll-ups | Period charts, CRWA cross-pilot summaries |

### Levels (operator-facing labels)

| Level | Intent | Operator message (examples) |
| ----- | ------ | --------------------------- |
| **Thin** | Very little history or sparse coverage | “Early data — flags are for watching, not digging yet.” |
| **Building** | Several cycles; incomplete seasonality | “Useful patterns starting — treat statistical alerts as Watch.” |
| **Solid** | Enough comparable history for cautious action | “Strong enough for Actionable statistical alerts (still verify in the field).” |
| **Strong** | Deep / multi-season (or multi-year) coverage | “History is deep enough for firm comparative calls.” |

### MVP calculator (simple heuristics — no custom ML)

Score from transparent inputs (document formula in code comments; tune later):

1. **Months of comparable readings** — contiguous (or near-contiguous) billing cycles with usable data for the signal.
2. **Meter / source coverage %** — share of expected meters (or named sources) present in recent cycles.
3. **Seasonality coverage** — whether both colder and warmer periods are represented (matters for usage outliers and balance norms).
4. **Signal completeness** — e.g. balance Confidence also needs source *and* customer sides for the same periods.

Produce:

- **Tenant-level Confidence** — default dashboard KPI (“your system overall”).
- **Per-signal Confidence** — customer usage, water balance, meter health, etc.
- **Per-meter Confidence** (optional in MVP, useful when one meter has far less history than peers) — show on meter detail / alert row when helpful.

### Watch vs Actionable

| Mode | When | UX |
| ---- | ---- | --- |
| **Watch** | Below Actionable threshold for that signal | Tag severity as Watch / informational; copy explains thin history; do **not** imply dig-now. Export still allowed with a Confidence note. |
| **Actionable** | At/above threshold | Normal priority alerts; still plain-language, never absolute certainty. |
| **Deterministic always-on** | Stuck zero, hardware diagnostic bits, obvious missing source read | May stay Actionable even when statistical Confidence is Thin — but label why (“meter reported stuck,” not “leak model”). |

### Proposed default thresholds (OPEN DECISIONS — tune with Kelly / pilots)

Treat as **proposed defaults**, not locked science:

| Guidance | Proposed default | Notes |
| -------- | ---------------- | ----- |
| Thin → Building | ≈ 3 months comparable history **and** coverage ≥ ~50% | Below this: statistical usage outliers = Watch only |
| Building → Solid (Actionable statistical) | ≈ 6 months **or** ~4 more months from a typical Thin start toward “>90% Confidence” display | Copy example: “About 4 more similar months to reach Solid (>90% display score).” Exact mapping of months → display % is an open decision |
| Solid → Strong | ≈ 12+ months **and** seasonality covered (winter + summer) **and** coverage ≥ ~80% | Multi-year archive accelerates Strong if coverage holds |
| Display score | 0–100 heuristic mapped from the inputs above | Must never be labeled “leak accuracy %” |

**Open decisions (capture in tickets / Kelly review)**

- Exact month cutoffs and coverage % for each level
- Whether “>90% Confidence” is a display score or a named level alias for Solid
- How aggressively to gate water-balance alerts vs meter stuck alerts
- Per-meter Confidence in MVP vs tenant + per-signal only
- Retention vs Confidence: longer retention helps Strong; fee impact already noted in §7

### Operator dashboard

- **Confidence card / report**: level label, display score (if shown), plain-language “what this means,” and “what would improve it” (e.g. “Upload 4 more monthly cycles” / “Add Well 2 readings for June–July”).
- Alert feed shows Watch vs Actionable tags; Thin systems never look like a fake high-accuracy leak detector.
- AI explanations must mention Confidence when discussing statistical flags.

### CRWA roll-up

- Sanitized per-municipality Confidence (level + months of history / coverage summary) next to water-balance KPIs.
- Helps CRWA coach pilots (“Town X is Thin — don’t treat their high-usage flags like Town Y’s Strong archive”).
- No cross-tenant PII; no raw customer lists in roll-up.

### Explicit non-goals (MVP)

- Bayesian leak probability models or custom deep learning
- Claiming Confidence = field-verified leak certainty
- Blocking operators from *seeing* Watch flags (visibility yes; dig-now framing no)

---

## 8. Security & Trust

- Full tenant isolation (data, users, configuration)
- Encryption at rest and in transit
- Cognito-managed authentication with optional MFA
- AI proactively explains data protection practices in plain language
- Clear auditability of important actions
- No dramatic data changes without multi-step intentional confirmation

---

## 9. Cost & Pricing Model

- Transparent AWS cost structure
- CRWA sets the target price point for the service
- System can suggest pricing to municipalities based on number of meters and complexity of needs
- AI always surfaces cost implications of configuration choices

---

## 10. Technical Direction (High Level)

- Multi-tenant AWS serverless architecture
- Strong isolation by `tenant_id`
- Angular + PrimeNG frontend (consistent with existing municipal work)
- Cognito authentication
- Forgiving ingestion pipeline + AI-assisted mapping
- Bedrock-powered explanations and conversational agent
- Terraform for infrastructure
- Production-ready quality bar: no rough edges, minimal setup friction, reliable behavior

---

## 11. Acceptance Criteria for “Ready to Show Kelly Stone”

- A non-technical user can successfully ingest a messy real-world file with friendly guidance
- Dashboard clearly shows trends, **water balance (in vs out / loss %)**, **Data Confidence**, and prioritized alerts with plain-language explanations
- Alerts feel useful for preventing high bills, catching distribution leaks early, and flagging unexplained production vs billed gaps — **Watch vs Actionable is obvious when history is thin**
- Onboarding works for bootstrap (little history) and bulk historical load without requiring years of data up front
- Tenant isolation is solid and demonstrable
- Conversational AI behaves according to the rules above (especially cost transparency, deletion safety, and Confidence coaching)
- System feels polished and purpose-built for rural operators
- CRWA roll-up view exists with appropriate sanitization **and water-balance + Confidence summary**
- End-to-end flow works without runtime errors or confusing setup steps
- Operator can name 2–3 sources, enter readings, and see loss/gain vs aggregated customer usage for a period

---

## 12. Open Items

- Final product name (to be chosen by CRWA)
- Exact list of “top” billing systems to pre-support in the first release
- Detailed pricing formula (meter count bands, retention multipliers, etc.)
- Specific sample data sets for demo and testing
- Default water-balance alert thresholds (loss % / absolute gallons) and CRWA-recommended norms for rural systems
- Whether source readings are always period volumes, always cumulative, or both (mapper should tolerate either)
- How far to go with formal address components (single line vs street/city/zip) for rural 911 / PO box edge cases
- **Data Confidence defaults** (§7b): month/coverage cutoffs, display-score vs level mapping, “~4 months to >90%” copy, per-meter Confidence in MVP, balance vs stuck-meter gating aggressiveness
