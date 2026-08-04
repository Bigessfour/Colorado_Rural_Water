# Plan — Feature 013: Kelly Ship Prove & Ops

**Status:** Draft

## Approach

1. Work prove matrix top-down (P1 rows with `[ ]` in PROVE_FEATURES).
2. Use MCP Chrome DevTools against `localhost:4200` + live Cognito/API; record pass/fail/blocked with date.
3. Fix only bugs found during prove — no scope creep.
4. Close Feature 012 convergence items (T012-19, T012-20) in same pass where efficient.
5. Document ops steps (Kelly invite, smoke checklist) in action-items — no fake “pass”.

## Phases

| Phase | Deliverable |
| ----- | ----------- |
| A | Alerts export + Meters CRUD prove |
| B | Account MFA + Review walkthrough prove |
| C | Admin/CRWA prove + Reports signed-in prove |
| D | Ops checklist + Kelly invite readiness |

## Dependencies

- Demo operator Cognito user (`demo.operator@watersaver.local` or equivalent)
- Live API (`codeplatoon` / Assessment III)
- SPA `npm start` on `:4200`
