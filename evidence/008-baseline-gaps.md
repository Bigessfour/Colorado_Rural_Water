# Feature 008 — baseline gaps (2026-08-04)

## Captured

- Compose `/assistant`: [`screenshots/008-baseline-assistant-compose.png`](screenshots/008-baseline-assistant-compose.png)
- Compose stack up (`:8080` / `:3000`); `ng serve` was down at baseline

## Gaps (demo spine)

| Gap                                            | Severity | Fix                                                                  |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------- |
| Invalid PrimeUI License toast on Compose       | P0       | Wire `primeng-license.local.ts` into compose build + CSS safety hide |
| Assistant replies show raw `**markdown**`      | P0       | Safe markdown pipe on assistant bubbles                              |
| Shell hides **Assistant** unless Cognito login | P0       | Show Assistant when `composeDemo`                                    |
| No Compose assessment banner                   | P0       | Calm shell banner for Compose vs AWS paths                           |
| Upload / Alerts Cognito-gated (expected)       | Demo     | Dual script — Cognito for upload→ack                                 |
| evidence/08-compose-ui placeholder             | P2       | Fill with 008 evidence                                               |
| Assessment demo doc thin                       | P2       | Click-by-click rewrite                                               |
