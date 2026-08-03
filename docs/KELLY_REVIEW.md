# Kelly Review — how to use this (F5)

**Audience:** Kelly Stone / CRWA leadership
**Time:** about 20–30 minutes
**URL:** start the SPA (`cd frontend && npm start`) → `http://localhost:4200/review` (or `?mode=review` on any page after Start). API is already live.

---

## What this is

A private, guided walkthrough of the live Water Saver app. On each section you leave structured feedback. When you finish, **Submit review** emails Steve one summary. No Zoom required.

## Feedback choices (every step)

| Choice                 | Meaning                                             |
| ---------------------- | --------------------------------------------------- |
| **Love this**          | Keep as-is / prioritize                             |
| **Don't need this**    | Candidate to hide or defer                          |
| **Change this**        | Keep the idea, but adjust (**short note required**) |
| **Need something new** | Feature gap (**short note required**)               |
| Optional free-text     | Always available                                    |
| Clarity 1–5            | Optional usefulness signal                          |

## Steps

1. Sign-in / first impression → `/login`
2. Dashboard (KPIs, Confidence, balance) → `/dashboard`
3. Upload + messy file / column mapper → `/upload`
4. Alerts (Watch vs Actionable) → `/alerts`
5. Sources + water balance → `/sources`
6. Meter inventory → `/meters`
7. Acknowledge / history / export → `/alerts`
8. CRWA Admin (provision, roll-up, billing) → `/crwa` (+ Admin)
9. Overall / missing features → `/review`

## Tips

- A floating **Kelly review** panel stays on screen; Minimize it while you click around.
- Skip is allowed; comments help most on Change / Need something new.
- Submit once at the end — the API rejects a second submit.

## For Steve (ops)

1. [x] Terraform `review_notify_to` + `review_from_email` (SES-verified) — applied to `water-saver-dev-review`.
2. [x] Cognito `kelly.review@watersaver.local` — `operators` + `crwa_admins`, tenant `town-wiley` (password in `~/.cursor/secrets/watersaver-kelly-review-cognito.txt`, not git).
3. [x] Deploy API (review Lambda + routes) — live smoke: create → step → submit → `emailSent: true`.
4. [x] SPA `/review` + panel — **`cd frontend && npm start` → http://localhost:4200/review** (API Gateway URL is not the SPA; no CloudFront host yet).
5. [x] Runtime error capture — SPA `ErrorHandler` / window errors → `POST /telemetry/client-errors` → CloudWatch `/aws/lambda/water-saver-dev-me` (`CLIENT_ERROR`). Review Lambda errors → `/aws/lambda/water-saver-dev-review`.
6. [ ] Send Kelly: localhost or future public SPA URL, credentials, this page.

### Tail logs during a Kelly run

```bash
aws logs tail /aws/lambda/water-saver-dev-review --follow --profile townofwiley --region us-east-2
aws logs tail /aws/lambda/water-saver-dev-me --follow --profile townofwiley --region us-east-2 --filter-pattern CLIENT_ERROR
```

Feedback is stored under Dynamo `TENANT#_review` (not municipal tenant data). Ticket **F5** done; **H8** still waits on Kelly’s real submit.
