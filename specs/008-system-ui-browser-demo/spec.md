# Feature 008: System UI / Browser Bonus

**Rubric:** 15% bonus
**Status:** CLOSED (honest verify 2026-08-04 — Compose AI + Cognito upload/dashboard/ack)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [x] System-level operator UI in browser demonstrates full stack end-to-end
- [x] Path: upload → process → AI insight / alert → acknowledge
- [x] Clear path for the 1-on-1 demo

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `docs/ASSESSMENT_III_DEMO.md`
- `docs/DEMO_WALKTHROUGH.md`
- `frontend/src/app/`

## Demo evidence

[`evidence/008-system-ui-browser-demo.md`](../../evidence/008-system-ui-browser-demo.md)

## Acceptance Criteria

- [x] Browser UI demonstrates a full operator path without requiring CLI-only steps for the demo.
- [x] Path includes at least: sign-in (or seeded session) → upload or select sample meter data → see dashboard/alert → use AI feature → acknowledge or act on result.
- [x] UI is reachable after Compose/deploy (documented URL).
- [x] Demo script lists the clicks that prove the three-tier + AI integration live.
