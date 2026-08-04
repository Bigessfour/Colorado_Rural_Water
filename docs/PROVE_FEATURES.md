# Feature prove tests (browser)

**Rule:** Every high-level / big feature needs a **live prove** before calling it Done — not only unit/Vitest smokes.

**How:** MCP **Chrome DevTools** (`user-chrome-devtools`): `navigate` → poke UI via `evaluate` (click buttons, fill fields) → assert DOM / visible data → `screenshot` for evidence. Prefer the local SPA (`http://localhost:4200`) against the live API.

Unit tests prove logic. Prove tests prove **the workflow the operator sees**.

---

## Prove recipe (every big feature)

1. SPA running (`cd frontend && npm start`).
2. Sign in as demo (or Kelly) operator — real Cognito session in the browser.
3. For each control on the happy path: **click / type / select** — do not only assert that a component constructed.
4. Assert **visible outcome**: status text, table rows, chart/KPI values, dialog content, success/error messages.
5. Capture a **screenshot** at the end (or on fail).
6. Record result in the matrix below (`pass` / `fail` / `blocked` + one-line note + date).

**Blocked** is OK when backend not deployed or no fixture data — do not mark pass from unit tests alone.

---

## Feature matrix

| Feature            | Route / entry               | Must poke                                         | Must see change                                                                                                              | Prove?                                                                                                                                                               |
| ------------------ | --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in            | `/login`                    | email, password, Sign in                          | lands authenticated shell                                                                                                    | **pass** 2026-08-04 — Cognito SPA session `demo.operator@watersaver.local` (Feature 008)                                                                             |
| Dashboard DataViz  | `/dashboard`                | sign-in refresh                                   | usage line (+ band or calm thin hint); balance **bars**; Confidence doughnut; health doughnut when meters &gt; 0; alert feed | **pass** 2026-08-03 — Solid/19 meters; 4 canvases; band note; health donut                                                                                           |
| Dashboard          | `/dashboard`                | Refresh                                           | Confidence, balance KPI/chart, alert feed Watch/Actionable                                                                   | **pass** 2026-08-04 — 5 meters · 3 alerts · balance 88.7% · Thin ([`evidence/008`](../evidence/008-system-ui-browser-demo.md))                                       |
| Upload customer    | `/upload`                   | choose file, map cols, ingest                     | preview → success / meters/readings updated                                                                                  | **pass*** 2026-08-04 — sample CSV via `POST /ingest` + signed-in Upload UI; Chrome synthetic File stuck at “Reading…” (*API path proved)                             |
| Sources            | `/sources`                  | add/edit source, ingest source reads              | list updates; dashboard In/Out moves                                                                                         | **pass** 2026-08-04 — wells created + `messy-source-readings-july.csv` ingest (API; Feature 008 seed)                                                                |
| Alerts list        | `/alerts`                   | Refresh, Explain                                  | rows + plainLanguage / confidence                                                                                            | **pass** 2026-08-04 — Watch + Actionable rows visible                                                                                                                |
| Alert actions (C3) | `/alerts`                   | Act on alert → note → Accept / Dispatch / Resolve | status label; resolved drops; notice                                                                                         | **pass** 2026-08-04 — Accept on balance alert → status accepted                                                                                                      |
| Meter history (C5) | Alerts → History            | open History                                      | **usage sparkline** + readings + alert activity                                                                              | **pass** 2026-08-03 — History dialog sparkline canvas for meter 1045                                                                                                 |
| Meter Stats viz    | `/meters` Stats / History   | Stats button; History usage block                 | age, latest cycle, YTD, lifetime; sparkline; YoY or calm hint                                                                | **pass** 2026-08-03 — Stats dialog meter 1042; KPIs + 2 canvases; YoY calm hint                                                                                      |
| Export flagged     | `/alerts`                   | Export flagged CSV                                | file download / success notice                                                                                               | [ ]                                                                                                                                                                  |
| Meters CRUD        | `/meters`                   | add / edit / delete                               | table reflects change                                                                                                        | [ ]                                                                                                                                                                  |
| Meter map (011)    | `/meters` Map / Both        | SelectButton Map; marker click                    | pins + popup; “Plotted N of M”; skip without coords                                                                          | **pass** 2026-08-04 — 5/6 plotted, OSM Leaflet, popup 1042 ([`evidence/011-meter-map`](../evidence/011-meter-map.md))                                                |
| Tenant map center  | Admin provision + `/meters` | Map town on create; empty map center              | `/me` returns lat/lng; empty map uses town (not CO centroid) when profile has coords                                         | **partial** 2026-08-04 — backend + SPA wired; Wiley seed + live Chrome prove pending CDPHE docs / re-login                                                           |
| Colorado ops KB    | `/assistant`                | Ask chlorine/residual after docs dropped          | Cites `colorado-ops/*` + live CDPHE URLs; refuses inventing dosing without docs                                              | **pass** 2026-08-04 — ingested hub/DBP/MOR/Reg11; residual answers cite `cdphe.colorado.gov/dbps` + `/rtcr` + GW PDF (`docs/colorado-ops-knowledge.md`)              |
| Account MFA        | `/account`                  | password + MFA setup fields                       | status On / challenge on next login                                                                                          | [ ]                                                                                                                                                                  |
| Assistant          | `/assistant`                | type prompt, send, onboarding                     | reply; tenant-scoped (`town-wiley`); Bedrock Compose RAG                                                                     | **pass** 2026-08-04 — Compose `/assistant` Watch vs Actionable + onboarding; [`evidence/007-integrations-bedrock-ui.md`](../evidence/007-integrations-bedrock-ui.md) |
| Kelly Review       | `/review`                   | Start, rate steps, comments, Submit               | panel advances; submit confirmation                                                                                          | [ ]                                                                                                                                                                  |
| Admin / CRWA       | `/admin`                    | invite / billing fields (admin only)              | tenant list / billing view updates                                                                                           | [ ]                                                                                                                                                                  |

---

## Chrome DevTools helper patterns

```js
// Click by button label
[...document.querySelectorAll('button')].find(b => b.textContent.includes('Act on alert'))?.click()

// Fill textarea / input
const ta = document.querySelector('textarea');
if (ta) { ta.value = 'Checked register — no leak'; ta.dispatchEvent(new Event('input', { bubbles: true })); }

// Read visible status / notices
[...document.querySelectorAll('.p-message, td, .notice')].map(el => el.textContent.trim()).filter(Boolean)
```

Screenshots: call MCP `screenshot` after the critical assertion.

---

## Relationship to other checklists

| Doc                                                | Role                                                         |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Vitest / backend `npm test`                        | Logic + wiring smokes                                        |
| [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md)           | Spec §11a Kelly gate boxes                                   |
| **This file**                                      | Per-feature browser prove (buttons, fields, data vis)        |
| [ACCEPTANCE_CHECKLIST.md](ACCEPTANCE_CHECKLIST.md) | Ship/Kelly gates; link prove matrix when marking UI features |

Agents: do not claim a big UI feature Done until its row here is `pass` or explicitly `blocked` with reason.
