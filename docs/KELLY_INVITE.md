# Kelly invite — ready to send (ops)

**Status:** Engineering complete · **Your action:** send this to Kelly Stone.

## What to send

**Subject:** Water Saver — guided review (20–30 min, no Zoom required)

**Body (edit URLs if needed):**

> Kelly,
>
> The Water Saver guided review is ready. It walks the live app section by section and emails me a structured summary when you finish.
>
> **Start here:** `http://localhost:4200/review`  
> (Steve runs the SPA locally during the pilot; a hosted URL can follow.)
>
> **Sign-in:** use the review operator account Steve shared separately (not in email).
>
> **How it works:** [docs/KELLY_REVIEW.md](./KELLY_REVIEW.md) — floating panel, Love / Don't need / Change / Need something new on each step.
>
> **Steps:** login → dashboard → upload → alerts → sources → meters → acknowledge → CRWA admin → overall review.
>
> When you're done, click **Submit review** once. That triggers the summary email and closes the session.
>
> Thanks,  
> Steve

## Credentials (do not commit)

- Password file: `~/.cursor/secrets/watersaver-kelly-review-cognito.txt`
- User: `kelly.review@watersaver.local` (tenant `town-wiley`, groups `operators` + `crwa_admins`)

## Pre-send checklist

- [ ] `cd frontend && npm start` — SPA at http://localhost:4200
- [ ] API Gateway / review Lambda healthy (see [KELLY_REVIEW.md](./KELLY_REVIEW.md) ops section)
- [ ] Kelly can sign in with review credentials
- [ ] `./scripts/smoke.sh` or [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md) F2 boxes reviewed
- [ ] Send invite email / message with URL + credential delivery out-of-band

## After Kelly submits

- Ticket **H8** — apply Confidence threshold feedback to Spec §7b
- Record outcome in [action-items.md](./action-items.md) and [CLOSEOUT.md](./CLOSEOUT.md)
