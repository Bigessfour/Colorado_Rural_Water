# Feature 013: Kelly Ship — Remaining Browser Prove & Ops

**Rubric:** Kelly demo ship gate (Spec §0)
**Status:** Closed (ops complete 2026-08-06 — invite sent; URLs live)
**Product:** Water Saver (Colorado Rural Water)
**Depends on:** Feature 008 (browser demo), Feature 012 (reports/onboarding chrome)

## User value

Close the open rows in `docs/PROVE_FEATURES.md` and ops items in `docs/action-items.md` so Kelly-ready sign-off is honest — every operator-facing workflow either **pass**, **blocked** (with reason), or explicitly deferred.

## Acceptance criteria

### P1 — Browser prove (Chrome DevTools)

- [x] **Export flagged CSV** (`/alerts`) — click Export flagged; file download or success notice
- [x] **Meters CRUD** (`/meters`) — add, edit, delete; table reflects change
- [x] **Account MFA** (`/account`) — **closed as deferred Pilot** (UI template + Vitest; live MFA enrollment out of Kelly/Assessment ship — see Non-goals)
- [x] **Kelly Review** (`/review`) — start session, rate steps, submit; confirmation visible
- [x] **Admin / CRWA** (`/admin`, `/crwa`) — admin-only surfaces load; invite or roll-up action without error

### P2 — Feature 012 convergence tail

- [x] Signed-in **Reports** prove — work-order CSV/XLS + summary HTML from `/reports` (T012-19 / T013-06; evidence/016)
- [x] Inventory proof for `report-catalog.categoryLabel` (T012-20)

### P3 — Ops (documented, not code)

- [x] Kelly F2 smoke — `docs/SMOKE_CHECKLIST.md` boxes filled after live walkthrough
- [x] Admin invite / Admin surface — documented + Admin/CRWA UI proved (`kelly.review`); brand-new Cognito invite optional Pilot
- [x] Send Kelly invite — `docs/KELLY_INVITE.md` — **sent 2026-08-06**; CloudFront/review re-verified live

## Non-goals

- Payment processor (Epic I vNext)
- New product features beyond proving existing surfaces
- Live Account MFA prove (Pilot — template + Vitest only for Kelly F1)

~~CloudFront / public HTTPS SPA~~ — **live** `https://duqk1pqvmrsuh.cloudfront.net` (2026-08-04; re-verified 2026-08-06)

## Primary paths

- `docs/PROVE_FEATURES.md`, `docs/action-items.md`, `docs/SMOKE_CHECKLIST.md`, `docs/KELLY_INVITE.md`
- Existing routes: `/alerts`, `/meters`, `/account`, `/review`, `/admin`, `/crwa`, `/reports`
