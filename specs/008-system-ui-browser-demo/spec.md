# Feature 008: System UI / Browser Bonus

**Rubric:** 15% bonus
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] System-level operator UI in browser demonstrates full stack end-to-end
- [ ] Path: upload → process → AI insight / alert → acknowledge
- [ ] Clear path for the 1-on-1 demo

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `docs/ASSESSMENT_III_DEMO.md`
- `docs/DEMO_WALKTHROUGH.md`
- `frontend/src/app/`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 008.

## Acceptance Criteria

- [ ] Browser UI demonstrates a full operator path without requiring CLI-only steps for the demo.
- [ ] Path includes at least: sign-in (or seeded session) → upload or select sample meter data → see dashboard/alert → use AI feature → acknowledge or act on result.
- [ ] UI is reachable after Compose/deploy (documented URL).
- [ ] Demo script lists the clicks that prove the three-tier + AI integration live.
