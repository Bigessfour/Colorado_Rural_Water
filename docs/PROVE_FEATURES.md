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

| Feature            | Route / entry             | Must poke                                         | Must see change                                                                                                              | Prove?                                                                          |
| ------------------ | ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sign-in            | `/login`                  | email, password, Sign in                          | lands authenticated shell                                                                                                    | [ ]                                                                             |
| Dashboard DataViz  | `/dashboard`              | sign-in refresh                                   | usage line (+ band or calm thin hint); balance **bars**; Confidence doughnut; health doughnut when meters &gt; 0; alert feed | **pass** 2026-08-03 — Solid/19 meters; 4 canvases; band note; health donut      |
| Dashboard          | `/dashboard`              | Refresh                                           | Confidence, balance KPI/chart, alert feed Watch/Actionable                                                                   | **pass** 2026-08-03 (same session)                                              |
| Upload customer    | `/upload`                 | choose file, map cols, ingest                     | preview → success / meters/readings updated                                                                                  | [ ]                                                                             |
| Sources            | `/sources`                | add/edit source, ingest source reads              | list updates; dashboard In/Out moves                                                                                         | [ ]                                                                             |
| Alerts list        | `/alerts`                 | Refresh, Explain                                  | rows + plainLanguage / confidence                                                                                            | [ ]                                                                             |
| Alert actions (C3) | `/alerts`                 | Act on alert → note → Accept / Dispatch / Resolve | status label; resolved drops; notice                                                                                         | [ ]                                                                             |
| Meter history (C5) | Alerts → History          | open History                                      | **usage sparkline** + readings + alert activity                                                                              | **pass** 2026-08-03 — History dialog sparkline canvas for meter 1045            |
| Meter Stats viz    | `/meters` Stats / History | Stats button; History usage block                 | age, latest cycle, YTD, lifetime; sparkline; YoY or calm hint                                                                | **pass** 2026-08-03 — Stats dialog meter 1042; KPIs + 2 canvases; YoY calm hint |
| Export flagged     | `/alerts`                 | Export flagged CSV                                | file download / success notice                                                                                               | [ ]                                                                             |
| Meters CRUD        | `/meters`                 | add / edit / delete                               | table reflects change                                                                                                        | [ ]                                                                             |
| Account MFA        | `/account`                | password + MFA setup fields                       | status On / challenge on next login                                                                                          | [ ]                                                                             |
| Assistant          | `/agent`                  | type prompt, send, confirm if asked               | reply; no cross-tenant leak copy                                                                                             | [ ]                                                                             |
| Kelly Review       | `/review`                 | Start, rate steps, comments, Submit               | panel advances; submit confirmation                                                                                          | [ ]                                                                             |
| Admin / CRWA       | `/admin`                  | invite / billing fields (admin only)              | tenant list / billing view updates                                                                                           | [ ]                                                                             |

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
