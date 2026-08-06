# Tasks — Feature 013: Kelly Ship Prove & Ops

## Phase A — Alerts & meters

- [x] T013-01: Browser prove Export flagged CSV on `/alerts`; update PROVE_FEATURES row
- [x] T013-02: Browser prove Meters CRUD (add/edit/delete); update PROVE_FEATURES row

## Phase B — Account & review

- [x] T013-03: Browser prove Account MFA setup/status on `/account` — **closed as deferred Pilot** (Account UI + Vitest shipped; live MFA enrollment not in Kelly/Assessment ship; Spec non-goal)
- [x] T013-04: Browser prove Kelly Review full walkthrough on `/review` — 2026-08-04 Steve dry-run submit

## Phase C — Admin & reports tail

- [x] T013-05: Browser prove Admin invite + CRWA roll-up surfaces — Kelly `crwa_admin` after JWT parse fix
- [x] T013-06: Signed-in Reports download prove (T012-19) — **pass** 2026-08-05 browser work-order CSV + API summary ([`evidence/016-town-wiley-24mo-prove`](../../evidence/016-town-wiley-24mo-prove/); [PROVE_FEATURES](../../docs/PROVE_FEATURES.md))
- [x] T013-07: Inventory proof for `report-catalog.categoryLabel` (T012-20)

## Phase D — Ops handoff

- [x] T013-08: Run/fill SMOKE_CHECKLIST live boxes; link evidence — 2026-08-04 F1 dry-run
- [x] T013-09: Document admin invite manual steps in action-items — closed Kelly F1 (Admin UI proved; brand-new invite optional Pilot)
- [x] T013-10: Kelly invite from KELLY_INVITE.md — **sent 2026-08-06**; CloudFront/review re-verified live

## Phase E: Convergence

- [x] T013-11: Archive prove screenshots and session notes under `evidence/013-kelly-ship-prove/` per Constitution VI
- [x] T013-12: Remediate P1 bugs found during prove — multi-group JWT roles + Kelly Cognito pool realignment
