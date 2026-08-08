# Water Saver — Engineering Closeout (2026-08-03, final 2026-08-08)

**Verdict:** **Code Done** — Spec Kit features **001–014** closed 2026-08-06. **Surface gap closure done 2026-08-08** — 42/42 inventory surfaces with proof ([correctness-surface-passes.md](correctness-surface-passes.md)); hosted CloudFront subset smoke pass. **Kelly invite sent 2026-08-06** ([KELLY_INVITE.md](KELLY_INVITE.md)). External/Pilot only: H8 (Kelly’s real review submit), payment Epic I3+, live MFA enrollment, Phase F gated writes.

**Repo state (2026-08-08):** All code on `main` · no open PRs · GitHub branch `main` only · CI + Terraform Apply green on `a02cd9c`.

## Shipped on `main`

| Area                                                                                                           | Status           |
| -------------------------------------------------------------------------------------------------------------- | ---------------- |
| Foundation (A), ingest (B), alerts (C), roles (D), agent thin (E), review (F), balance (G), Confidence (H1–H7) | done             |
| Meter inventory CRUD + usage Stats viz                                                                         | done             |
| Kelly DataViz (usage band, balance bars, doughnuts, meter viz)                                                 | done             |
| Alert accept / dispatch / resolve + meter timeline (hardened)                                                  | done             |
| F5 review API + SES + Cognito Kelly user                                                                       | done (API smoke) |
| Prove protocol (`PROVE_FEATURES.md` + Cursor rule)                                                             | done             |
| Backend tests                                                                                                  | 229 pass         |
| Frontend tests                                                                                                 | 113 pass         |
| Surface inventory (`.function-inventory.json`)                                                                 | 42/42 with proof |

**Live API:** `https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com`
**SPA (CloudFront):** `https://d13u7fsvytjwxn.cloudfront.net` · review: `/review` · redeploy: `./scripts/deploy-spa.sh`
**Local SPA (dev):** `cd frontend && npm start` → `http://localhost:4200`
**AWS:** account `388691194728` · profile `codeplatoon` · `us-east-1` · tag `Assessment-iii`
**Account doc:** [AWS_ACCOUNT.md](AWS_ACCOUNT.md)

## Not code (ops / external)

1. ~~**Send Kelly invite**~~ — **done** 2026-08-06 ([KELLY_INVITE.md](KELLY_INVITE.md)); SPA `https://d13u7fsvytjwxn.cloudfront.net` + `/review` (re-check after stack recreate 2026-08-08)
2. ~~**Kelly F2 smoke**~~ — **done** Steve dry-run 2026-08-04 ([SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) all boxes; [DEMO_KNOWN_GAPS.md](DEMO_KNOWN_GAPS.md))
3. **H8** — blocked until Kelly submits **her** real review feedback (Steve dry-run submit already exercised SES)
4. **I3–I8 payment** — blocked on CRWA processor discovery
5. **E2/E3 agent polish** — Pilot (form + Assistant Path A–D wired; deeper interview polish optional)
6. ~~**Public HTTPS SPA**~~ — **done** CloudFront `d13u7fsvytjwxn.cloudfront.net` (stack re-applied 2026-08-08; hosted smoke pass)

## Demo-prep fixes (2026-08-04)

- Recreated `kelly.review@watersaver.local` in us-east-1 Cognito SPA pool (old us-east-2 pool gone)
- Fixed API Gateway space-separated `cognito:groups` parsing → multi-role `/me` + Admin/CRWA nav; redeployed Lambdas
- F1 friction log + screenshots under `evidence/013-kelly-ship-prove/`

## GitHub issues

Closed as delivered in code (see issue comments). Left open only where work is genuinely remaining or blocked:

- **#10** Epic H — leave open until H8 feedback applied (or close with “H8 blocked” note)
- Payment / vNext — tracked in tickets, not necessarily as open GH issues

## Done Detector

This is **Done** for engineering + Spec Kit portfolio (001–014). Kelly invite sent. Remaining work is external or explicit Pilot/vNext (H8 feedback, payment, live MFA, gated writes) — not open Spec Kit checkboxes.
