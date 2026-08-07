# Kelly invite — sent (ops)

**Status:** Invite sent **2026-08-06** · CloudFront / review URLs re-verified live the same day.

**Live SPA (CloudFront):** `https://d1gokx5wxrd4x6.cloudfront.net`
**Guided review:** `https://d1gokx5wxrd4x6.cloudfront.net/review`

## What was sent

**Subject:** Water Saver — guided review (20–30 min)

**Body:**

> Kelly,
>
> The Water Saver guided review is ready. It walks the live app section by section and emails me a structured summary when you finish.
>
> **Start here:** https://d1gokx5wxrd4x6.cloudfront.net/review
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

- [x] CloudFront SPA live — `https://d1gokx5wxrd4x6.cloudfront.net` (re-applied + Cognito users re-provisioned 2026-08-06 after destroy prove)
- [x] API Gateway / review Lambda healthy — `GET /health` 200 on `https://uqujnhmk31.execute-api.us-east-1.amazonaws.com`
- [x] Kelly can sign in with review credentials — pool `us-east-1_eeMuYPlMK`; password file updated (`./scripts/provision-demo-users.sh`)
- [x] `./scripts/smoke.sh` or [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) F2 boxes reviewed — all F2 boxes checked 2026-08-04
- [x] **Steve:** Send invite email / message with CloudFront URL + credential delivery out-of-band — **sent 2026-08-06**

## Redeploy SPA after UI changes

```bash
./scripts/deploy-spa.sh
```

Requires `frontend/src/environments/primeng-license.local.ts` (gitignored) for the `hosted` Angular build.

## After Kelly submits

- Ticket **H8** — apply Confidence threshold feedback to Spec §7b
- Record outcome in [action-items.md](./action-items.md) and [CLOSEOUT.md](./CLOSEOUT.md)
