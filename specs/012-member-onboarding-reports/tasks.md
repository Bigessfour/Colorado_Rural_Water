# Tasks — Feature 012: Member Onboarding Intake & Reports

## Phase A — Intake

- [x] T012-01: Spec-Kit folder + `.specify/feature.json` pointer
- [x] T012-02: `onboarding-intake.ts` schema + validation + tests
- [x] T012-03: Dynamo `META#onboarding` get/put + `handlers/onboarding.ts`
- [x] T012-04: Onboarding wizard page + route + shell nav gate
- [x] T012-05: Assistant copy links to `/onboarding`

## Phase B — Work orders

- [x] T012-06: `work-order-export.ts` CSV/XLS + tests
- [x] T012-07: `handlers/reports.ts` work-orders endpoint
- [x] T012-08: Reports page + alerts page cross-link

## Phase C — Summary report

- [x] T012-09: `report-summary.ts` HTML builder + tests
- [x] T012-10: Reports summary download/print UI
- [x] T012-11: Terraform + lambda bundle entries
- [x] T012-12: `docs/onboarding-reports.md` + inventory + tests green

## Phase D — Operator chrome (2026-08-04)

- [x] T012-13: `ThemeService` + light/dark toggle (shell + Settings)
- [x] T012-14: Reports hub tabs — catalog, run actions, recent activity
- [x] T012-15: Settings page (`/settings`) — display + session profile + quick links
- [x] T012-16: Shell nav + routes + Vitest smokes (theme, settings, reports tabs)
- [x] T012-17: Browser prove rows in `docs/PROVE_FEATURES.md` + evidence screenshot
- [x] T012-18: Commit/push Phase D slice; optional `/code-review` before Kelly invite

## Phase E: Convergence

- [ ] T012-19: Signed-in browser prove — Reports CSV/XLS download + summary HTML open per spec acceptance (partial) — **blocked** live API 404 until terraform apply
- [x] T012-20: Close inventory proof for `report-catalog.categoryLabel` — extend reports spec or action-items (partial)
