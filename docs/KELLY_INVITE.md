# Kelly invite — ready to send (ops)

**Status:** Engineering complete · **Your action:** send this to Kelly Stone.

**Live SPA (CloudFront):** `https://duqk1pqvmrsuh.cloudfront.net`
**Guided review:** `https://duqk1pqvmrsuh.cloudfront.net/review`

## What to send

**Subject:** Water Saver — guided review (20–30 min)

**Body:**

> Kelly,
>
> The Water Saver guided review is ready. It walks the live app section by section and emails me a structured summary when you finish.
>
> **Start here:** https://duqk1pqvmrsuh.cloudfront.net/review
>
> **Sign-in:** use the review operator account Steve shared separately (not in email).
>
> **How it works:** On each step, choose Love / Don't need / Change / Need something new. When you're done, click **Submit review** once.
>
> **Steps:** login → dashboard → upload → alerts → sources → meters → acknowledge → CRWA admin → overall review.
>
> Thanks,
> Steve

## Credentials (do not commit)

- Password file: `~/.cursor/secrets/watersaver-kelly-review-cognito.txt`
- User: `kelly.review@watersaver.local` (tenant `town-wiley`, groups `operators` + `crwa_admins`)

## Pre-send checklist

- [x] CloudFront SPA live — `https://duqk1pqvmrsuh.cloudfront.net` (2026-08-04 deploy; Cognito login + `/review` proved)
- [x] API Gateway / review Lambda healthy — `GET /health` 200; review submit SES path proved 2026-08-04 Steve dry-run
- [x] Kelly can sign in with review credentials — recreated in **us-east-1** SPA pool (`us-east-1_oZlKJ1y39`); password file updated
- [x] `./scripts/smoke.sh` or [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) F2 boxes reviewed — all F2 boxes checked 2026-08-04
- [ ] **Steve:** Send invite email / message with CloudFront URL + credential delivery out-of-band

## Redeploy SPA after UI changes

```bash
./scripts/deploy-spa.sh
```

Requires `frontend/src/environments/primeng-license.local.ts` (gitignored) for the `hosted` Angular build.

## After Kelly submits

- Ticket **H8** — apply Confidence threshold feedback to Spec §7b
- Record outcome in [action-items.md](./action-items.md) and [CLOSEOUT.md](./CLOSEOUT.md)
