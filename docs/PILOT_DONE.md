# Pilot — Done (2026-08-08)

**Verdict:** Pilot hardening is **closed** for first-municipality rollout (Spec §0 Pilot layer). Assessment III + Kelly demo path were already closed 2026-08-06.

**Engineering record:** [CLOSEOUT.md](./CLOSEOUT.md) · **Surface proofs:** [correctness-surface-passes.md](./correctness-surface-passes.md) · **Browser matrix:** [PROVE_FEATURES.md](./PROVE_FEATURES.md)

---

## Live product

| Surface          | URL / command                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| SPA (CloudFront) | `https://d13u7fsvytjwxn.cloudfront.net`                                                               |
| API              | `https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com`                                              |
| Review           | `/review` on SPA                                                                                      |
| Deploy SPA       | `./scripts/deploy-spa.sh` (after `terraform apply`)                                                   |
| Sync hosted env  | `./scripts/sync-hosted-environment.sh`                                                                |
| Terraform        | workspace `dev` · account `388691194728` · profile `codeplatoon` · `us-east-1` · tag `Assessment-iii` |

---

## What shipped (Pilot P1 + P2)

| Area                                                       | Status | Evidence                                                                  |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| C3 alert persistence (accept / dispatch / resolve + audit) | done   | Dynamo `ALERT#STATUS` + `ALERT#EVT`; browser Act→Accept 2026-08-08        |
| H3 Confidence store                                        | done   | `CFG#confidence`; refresh on ingest; alerts + CRWA rollup use stored tier |
| D1–D3 roles + JWT drift                                    | done   | Invite, gates, space-separated `cognito:groups` on `/me`                  |
| G4 tenant balance thresholds                               | done   | `PUT /balance/thresholds`                                                 |
| D4 + H5 CRWA roll-up                                       | done   | `/admin/rollup`; persisted Confidence + reading cycle                     |
| Per-meter Confidence                                       | done   | `meterConfidence` on alert rows                                           |
| Configurable reading cycles                                | done   | `PUT /balance/reading-cycle` · `CFG#reading_cycle`                        |
| Sources geocode                                            | done   | `buildSourcePlaceQuery` (name + label + town bias)                        |
| Alerts Explain prose                                       | done   | Shorter deterministic templates (2026-08-08)                              |
| G5/G6 balance viz + CRWA summary                           | done   | Kelly DataViz + sanitized rollup                                          |
| C4/C5 export + meter history                               | done   | CSV export + History sparkline / timeline                                 |
| E onboarding + agent thin path                             | done   | Path A–D, cost confirm, Confidence coaching                               |
| 42/42 surface inventory proofs                             | done   | [correctness-surface-passes.md](./correctness-surface-passes.md)          |

**Test baselines (2026-08-08):** backend **238** · frontend **115** · `npm run inventory` → 42/42 with proof.

---

## Accepted deferrals (honest — not Pilot blockers)

These are **documented and accepted** at Pilot close. They do not reopen Pilot unless Spec §0 moves an item to active work.

| Item                                                 | Layer         | Accepted as                                                                       |
| ---------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| **D5 live MFA** (TOTP enroll + login challenge)      | Pilot ops     | Account UI + Vitest shipped; enroll when a municipality requests MFA              |
| **H8** Confidence threshold tuning from Kelly review | External      | §7b freeze in code until Kelly submits real `/review` feedback                    |
| **A6** full session-tag IAM ABAC                     | vNext / scale | LeadingKeys + Deny Scan shipped; see [TENANT_ISOLATION.md](./TENANT_ISOLATION.md) |
| **E7** agent RAG tool UX polish                      | Continuous    | KB retrieve + Converse live; polish is incremental, not a ship gate               |
| **Epic I3–I8** payment processor                     | vNext         | Blocked on CRWA discovery — out of scope                                          |
| **Phase F** gated write tools                        | vNext         | Confirm gates in agent-context; no auto-delete tools                              |
| Practice CSV re-import on demo tenant                | Demo guard    | Dynamo duplicate-key rejection is expected                                        |

---

## vNext (do not start without Spec §0 change)

Real-time AMI · resident portal · CIS write-back · custom ML · payment Epic I · mutating agent tools · native mobile · formal address parse.

---

## Re-verify after deploy

```bash
cd backend && npm test
cd frontend && npm test
npm run inventory
DEMO_USER='demo.operator@watersaver.local' DEMO_PASS='…' ./scripts/smoke-presign-ingest.sh
# Browser: docs/PROVE_FEATURES.md
```

---

## Historical docs

Assessment III grading and Kelly demo scripts remain for audit only:

- [ASSESSMENT_III_SUBMISSION.md](./ASSESSMENT_III_SUBMISSION.md) · [ASSESSMENT_III_DEMO.md](./ASSESSMENT_III_DEMO.md)
- [KELLY_INVITE.md](./KELLY_INVITE.md) · [archive/KELLY_ZOOM_WALKTHROUGH.md](./archive/KELLY_ZOOM_WALKTHROUGH.md)
