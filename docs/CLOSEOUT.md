# Water Saver — Engineering Closeout (2026-08-03)

**Verdict:** **Code Done** for Kelly gate + finishable Pilot. **Ops remaining** before Kelly’s live walkthrough (invite + F2 smoke boxes). Payment Epic I3+ stays externally blocked.

## Shipped on `main`

| Area                                                                                                           | Status           |
| -------------------------------------------------------------------------------------------------------------- | ---------------- |
| Foundation (A), ingest (B), alerts (C), roles (D), agent thin (E), review (F), balance (G), Confidence (H1–H7) | done             |
| Meter inventory CRUD + usage Stats viz                                                                         | done             |
| Kelly DataViz (usage band, balance bars, doughnuts, meter viz)                                                 | done             |
| Alert accept / dispatch / resolve + meter timeline (hardened)                                                  | done             |
| F5 review API + SES + Cognito Kelly user                                                                       | done (API smoke) |
| Prove protocol (`PROVE_FEATURES.md` + Cursor rule)                                                             | done             |
| Backend tests                                                                                                  | 133 pass         |
| Frontend tests                                                                                                 | ~38 pass         |

**Live API:** `https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com`
**SPA (CloudFront):** `https://duqk1pqvmrsuh.cloudfront.net` · review: `/review` · redeploy: `./scripts/deploy-spa.sh`
**Local SPA (dev):** `cd frontend && npm start` → `http://localhost:4200`
**AWS:** account `388691194728` · profile `codeplatoon` · `us-east-1` · tag `Assessment-iii`
**Account doc:** [AWS_ACCOUNT.md](AWS_ACCOUNT.md)

## Not code (ops / external)

1. **Send Kelly invite** — CloudFront URL ready in [KELLY_INVITE.md](KELLY_INVITE.md); **Steve sends** when scheduling (creds in `~/.cursor/secrets/watersaver-kelly-review-cognito.txt`)
2. ~~**Kelly F2 smoke**~~ — **done** Steve dry-run 2026-08-04 ([SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) all boxes; [DEMO_KNOWN_GAPS.md](DEMO_KNOWN_GAPS.md))
3. **H8** — blocked until Kelly submits **her** real review feedback (Steve dry-run submit already exercised SES)
4. **I3–I8 payment** — blocked on CRWA processor discovery
5. **E2/E3 agent polish** — Pilot todo (thin inventory stub exists)
6. ~~**Public HTTPS SPA**~~ — **done** CloudFront `duqk1pqvmrsuh.cloudfront.net` (2026-08-04)

## Demo-prep fixes (2026-08-04)

- Recreated `kelly.review@watersaver.local` in us-east-1 Cognito SPA pool (old us-east-2 pool gone)
- Fixed API Gateway space-separated `cognito:groups` parsing → multi-role `/me` + Admin/CRWA nav; redeployed Lambdas
- F1 friction log + screenshots under `evidence/013-kelly-ship-prove/`

## GitHub issues

Closed as delivered in code (see issue comments). Left open only where work is genuinely remaining or blocked:

- **#10** Epic H — leave open until H8 feedback applied (or close with “H8 blocked” note)
- Payment / vNext — tracked in tickets, not necessarily as open GH issues

## Done Detector

This is **Done** for engineering scope. Core criteria met; shipping more Pilot polish before Kelly invite risks delay. Smallest next step: **send the Kelly invite**.
