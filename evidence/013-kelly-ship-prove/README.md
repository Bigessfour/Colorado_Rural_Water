# Feature 013 — Kelly ship prove session (2026-08-04)

Browser automation: Cursor browser + Chrome DevTools against `http://localhost:4200` + live API (`codeplatoon` / Assessment III).

## Results summary

| Task    | Feature                 | Result      | Notes                                                                                             |
| ------- | ----------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| T013-01 | Export flagged CSV      | **pass**    | Alerts UI + `GET /alerts?format=csv` → 200                                                        |
| T013-02 | Meters CRUD             | **pass**    | Browser add/edit; delete via API                                                                  |
| T013-03 | Account MFA             | **partial** | Deferred Pilot — not required for Kelly F1                                                        |
| T013-04 | Kelly Review            | **pass**    | Full panel → Submit; confirmation “This review is submitted”                                      |
| T013-05 | Admin / CRWA            | **pass**    | Kelly `crwa_admin` after multi-group JWT fix; Admin provision UI                                  |
| T013-06 | Reports download        | **pass**    | Browser work-order CSV + API summary — [`evidence/016`](../016-town-wiley-24mo-prove/) 2026-08-05 |
| T013-07 | categoryLabel inventory | **pass**    | Vitest                                                                                            |
| T013-08 | Smoke checklist         | **pass**    | All F2 boxes checked in Steve F1 dry-run                                                          |
| T013-09 | Admin invite ops        | **closed**  | Documented + Admin UI prove; brand-new invite optional Pilot                                      |
| T013-10 | Kelly invite            | **sent**    | Sent 2026-08-06; CloudFront/review re-verified live                                               |
| T013-11 | Evidence archive        | **pass**    | This folder + F1 screenshots                                                                      |
| T013-12 | Bug remediation         | **pass**    | Kelly Cognito us-east-1 recreate + `parseCognitoGroups` whitespace; Lambdas redeployed            |

## F1 dry-run artifacts

| File                                                                             | What                                 |
| -------------------------------------------------------------------------------- | ------------------------------------ |
| [f1-friction-log.md](./f1-friction-log.md)                                       | Timed walkthrough notes + talk track |
| [f1-dashboard-2026-08-04.png](./f1-dashboard-2026-08-04.png)                     | KPIs / Thin / balance                |
| [f1-sources-2026-08-04.png](./f1-sources-2026-08-04.png)                         | Named sources                        |
| [f1-alerts-2026-08-04.png](./f1-alerts-2026-08-04.png)                           | Watch / Actionable + Accept          |
| [f1-kelly-review-submit-2026-08-04.png](./f1-kelly-review-submit-2026-08-04.png) | Review submitted                     |
| [f1-admin-kelly-2026-08-04.png](./f1-admin-kelly-2026-08-04.png)                 | Admin as Kelly CRWA                  |

## Honest gaps

See [docs/DEMO_KNOWN_GAPS.md](../../docs/DEMO_KNOWN_GAPS.md). Feature 013 ops closed 2026-08-06 (invite sent; Reports pass via 016). Remaining product waits: **H8** (Kelly review feedback), payment Epic I, MFA live prove (Pilot).
