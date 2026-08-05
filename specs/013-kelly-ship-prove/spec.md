# Feature 013: Kelly Ship — Remaining Browser Prove & Ops

**Rubric:** Kelly demo ship gate (Spec §0)
**Status:** In progress (prove session 2026-08-04)
**Product:** Water Saver (Colorado Rural Water)
**Depends on:** Feature 008 (browser demo), Feature 012 (reports/onboarding chrome)

## User value

Close the open rows in `docs/PROVE_FEATURES.md` and ops items in `docs/action-items.md` so Kelly-ready sign-off is honest — every operator-facing workflow either **pass**, **blocked** (with reason), or explicitly deferred.

## Acceptance criteria

### P1 — Browser prove (Chrome DevTools)

- [ ] **Export flagged CSV** (`/alerts`) — click Export flagged; file download or success notice
- [ ] **Meters CRUD** (`/meters`) — add, edit, delete; table reflects change
- [ ] **Account MFA** (`/account`) — password fields + MFA setup; status visible
- [ ] **Kelly Review** (`/review`) — start session, rate steps, submit; confirmation visible
- [ ] **Admin / CRWA** (`/admin`, `/crwa`) — admin-only surfaces load; invite or roll-up action without error

### P2 — Feature 012 convergence tail

- [ ] Signed-in **Reports** prove — work-order CSV/XLS + summary HTML from `/reports` (T012-19)
- [ ] Inventory proof for `report-catalog.categoryLabel` (T012-20)

### P3 — Ops (documented, not code)

- [ ] Kelly F2 smoke — `docs/SMOKE_CHECKLIST.md` boxes filled after live walkthrough
- [ ] Admin invite happy path against live Cognito (manual checklist)
- [ ] Send Kelly invite — `docs/KELLY_INVITE.md` template used

## Non-goals

- CloudFront / public HTTPS SPA (A1 remains blocked until infra)
- Payment processor (Epic I vNext)
- New product features beyond proving existing surfaces

## Primary paths

- `docs/PROVE_FEATURES.md`, `docs/action-items.md`, `docs/SMOKE_CHECKLIST.md`
- Existing routes: `/alerts`, `/meters`, `/account`, `/review`, `/admin`, `/crwa`, `/reports`
