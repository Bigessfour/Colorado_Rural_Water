# Plan — Feature 013: Kelly Ship Prove & Ops

**Status:** CLOSED (ops complete 2026-08-06 — Kelly invite sent; CloudFront/review/API live)

## Approach

1. Work prove matrix top-down (P1 rows with `[ ]` in PROVE_FEATURES).
2. Use MCP Chrome DevTools against `localhost:4200` + live Cognito/API; record pass/fail/blocked with date.
3. Fix only bugs found during prove — no scope creep.
4. Close Feature 012 convergence items (T012-19, T012-20) in same pass where efficient.
5. Document ops steps (Kelly invite, smoke checklist) in action-items — no fake “pass”.

## Phases

| Phase | Deliverable                                | Result                                 |
| ----- | ------------------------------------------ | -------------------------------------- |
| A     | Alerts export + Meters CRUD prove          | done                                   |
| B     | Account MFA + Review walkthrough prove     | Review done; MFA deferred Pilot        |
| C     | Admin/CRWA prove + Reports signed-in prove | done (Reports evidence/016)            |
| D     | Ops checklist + Kelly invite               | smoke done; invite **sent 2026-08-06** |

## Dependencies

- Demo / Kelly Cognito users on us-east-1 SPA pool
- Live API (`codeplatoon` / Assessment III)
- CloudFront SPA `https://d1gokx5wxrd4x6.cloudfront.net` (Deployed; re-verified 2026-08-06)
