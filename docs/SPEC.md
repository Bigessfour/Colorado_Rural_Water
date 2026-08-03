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
- Core alerts: unusual/high usage, stuck/non-registering meters, sudden large drops, diagnostic flags, statistical outliers
- Member Dashboard with KPI cards, usage trends, **water balance (in vs out)**, anomaly volume, meter health, prioritized alert feed, and AI explanations
- Ability to acknowledge / resolve alerts
- Export of flagged meters
- Basic meter history
- **Named production / source meters (wells, etc.) with period readings** and comparison to aggregated customer (distribution) usage
- **Water-balance alerts** when unexplained loss or “sold more than pumped” exceeds configurable thresholds
- CRWA enterprise roll-up dashboard (sanitized / anonymized where appropriate) **including water-balance summary across pilots**
- Conversational AI agent for onboarding, mapping help, explanations, and guided configuration
- Cognito email + password auth with self-service MFA and password management
- Strong tenant isolation and data security
- Transparent cost awareness (AI always offers cheapest option first and explains cost impact)

### Explicitly out of scope for MVP (vNext)

- Real-time AMI streaming
- Customer-facing portal or direct alerts to residents
- Direct write-back into billing systems
- Advanced custom ML models
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
4. Agent tailors the ingestion experience (pre-selects helpful column suggestions when possible).
5. User is guided to upload their first file with heavy, friendly assistance.
6. AI remains available afterward for questions, mapping tweaks, and configuration changes.

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
- **Hard safety rules**
  - Never delete or make dramatic changes to data without a specific, multi-step, intentionally directive confirmation from the user
  - Never expose one tenant’s data to another
  - Always help users understand (in everyday language) how AWS and CRWA are protecting their data

---

## 7. Data & Ingestion

**Canonical customer / distribution fields (flexible)**  

| Field | Role | Stability |
|-------|------|-----------|
| **Meter ID** | Identity of the physical meter at a location | Stable (replaced only if hardware replaced) |
| **Service address** | Service location the meter serves | **Stable — treat as the meter’s location key for operators; should not change** |
| **Occupant / customer name** | Who is currently billed or living there | **Mutable** — renters move, owners sell; updates do not move the meter |
| Account Number | Billing account (may change with ownership) | Mutable |
| Timestamp, Cumulative Reading, Unit, Diagnostic Flags | Reading stream | Per reading |
| Meter Size, Install Date, Route | Meter metadata | Mostly stable |

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
- Dashboard clearly shows trends, **water balance (in vs out / loss %)**, and prioritized alerts with plain-language explanations
- Alerts feel useful for preventing high bills, catching distribution leaks early, and flagging unexplained production vs billed gaps
- Tenant isolation is solid and demonstrable
- Conversational AI behaves according to the rules above (especially cost transparency and deletion safety)
- System feels polished and purpose-built for rural operators
- CRWA roll-up view exists with appropriate sanitization **and water-balance summary**
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
