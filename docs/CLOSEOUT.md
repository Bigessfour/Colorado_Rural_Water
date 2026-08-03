# Water Saver — Engineering Closeout (2026-08-03)

**Verdict:** **Code Done** for Kelly gate + finishable Pilot. **Ops remaining** before Kelly’s live walkthrough (invite + F2 smoke boxes). Payment Epic I3+ stays externally blocked.

## Shipped on `main`

| Area | Status |
| ---- | ------ |
| Foundation (A), ingest (B), alerts (C), roles (D), agent thin (E), review (F), balance (G), Confidence (H1–H7) | done |
| Meter inventory CRUD + usage Stats viz | done |
| Kelly DataViz (usage band, balance bars, doughnuts, meter viz) | done |
| Alert accept / dispatch / resolve + meter timeline (hardened) | done |
| F5 review API + SES + Cognito Kelly user | done (API smoke) |
| Prove protocol (`PROVE_FEATURES.md` + Cursor rule) | done |
| Backend tests | 133 pass |
| Frontend tests | ~38 pass |

**Live API:** `https://14jxov7h72.execute-api.us-east-2.amazonaws.com`  
**SPA (current):** `cd frontend && npm start` → `http://localhost:4200` (no CloudFront host yet)  
**AWS:** account `570912405222` · profile `townofwiley` · `us-east-2`

## Not code (ops / external)

1. **Send Kelly invite** — `/review` + creds in `~/.cursor/secrets/watersaver-kelly-review-cognito.txt` + [KELLY_REVIEW.md](KELLY_REVIEW.md)
2. **Kelly F2 smoke** — fill [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) during her run (or Steve dry-run)
3. **H8** — blocked until Kelly submits real review feedback
4. **I3–I8 payment** — blocked on CRWA processor discovery
5. **E2/E3 agent polish** — Pilot todo (thin inventory stub exists)
6. **Public HTTPS SPA** — optional CloudFront; Kelly can use localhost or a tunnel until then

## GitHub issues

Closed as delivered in code (see issue comments). Left open only where work is genuinely remaining or blocked:

- **#10** Epic H — leave open until H8 feedback applied (or close with “H8 blocked” note)
- Payment / vNext — tracked in tickets, not necessarily as open GH issues

## Done Detector

This is **Done** for engineering scope. Core criteria met; shipping more Pilot polish before Kelly invite risks delay. Smallest next step: **send the Kelly invite**.
