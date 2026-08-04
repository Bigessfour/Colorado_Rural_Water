# Plan — Feature 012: Member Onboarding Intake & Reports

**Status:** verified (MVP shipped 2026-08-04).

## Approach

1. Persist onboarding intake on `META#onboarding` Dynamo item per tenant (JWT-scoped GET/PUT).
2. Angular wizard at `/onboarding` with six steps; redirect prompt in shell when incomplete.
3. Extend flagged export with coordinates + map links; add XLS via existing `xlsx` dependency.
4. HTML operations summary aggregates dashboard-like KPIs server-side for print/PDF.
5. Reports page wires downloads; Assistant points operators to wizard.

## Phases

| Phase | Deliverable                                   |
| ----- | --------------------------------------------- |
| A     | Onboarding schema, API, wizard UI             |
| B     | Work order CSV/XLS + Reports page             |
| C     | HTML summary report + print flow              |
| D     | Theme toggle, Settings page, Reports hub tabs |

## Dependencies

- JWT tenant isolation (existing)
- Alert engine + meter locations (011 coords)
- PrimeNG Card/Button/Select (existing chrome)

## Terraform

Add `onboarding` and `reports` Lambda handlers + API Gateway routes (`GET/PUT /onboarding`, `GET /reports/work-orders`, `GET /reports/summary`).
