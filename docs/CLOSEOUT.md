# Water Saver — Engineering Closeout

**Last updated:** 2026-08-08

## Verdict

| Layer                                                 | Status                                              |
| ----------------------------------------------------- | --------------------------------------------------- |
| **Assessment III + Kelly demo**                       | **Done** (2026-08-06)                               |
| **Pilot hardening (Spec §0)**                         | **Done** (2026-08-08)                               |
| **vNext** (Epic I payment, Phase F writes, full ABAC) | **Deferred** — see [PILOT_DONE.md](./PILOT_DONE.md) |

Spec Kit features **001–014** closed for Assessment. Pilot P1/P2 closed with documented accepted deferrals (MFA live ops, H8 Kelly feedback, A6 session-tag ABAC, Epic I).

---

## Shipped on `main`

| Area                                                                                                      | Status          |
| --------------------------------------------------------------------------------------------------------- | --------------- |
| Foundation (A), ingest (B), alerts (C), roles (D), agent (E), review (F), balance (G), Confidence (H1–H7) | done            |
| H3 persisted Confidence + ingest refresh                                                                  | done 2026-08-08 |
| Reading cycles + per-meter Confidence                                                                     | done 2026-08-08 |
| 42/42 surface inventory with proof                                                                        | done 2026-08-08 |
| Backend tests                                                                                             | **238** pass    |
| Frontend tests                                                                                            | **115** pass    |

**Live API:** `https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com`
**SPA:** `https://d13u7fsvytjwxn.cloudfront.net` · `./scripts/deploy-spa.sh`
**AWS:** account `388691194728` · profile `codeplatoon` · `us-east-1` · tag `Assessment-iii`

Full Pilot record: **[PILOT_DONE.md](./PILOT_DONE.md)** · Doc index: **[README.md](./README.md)**

---

## Accepted deferrals (not reopening Pilot)

See [PILOT_DONE.md § Accepted deferrals](./PILOT_DONE.md#accepted-deferrals-honest--not-pilot-blockers).

---

## Done detector

**Shippable for first pilot municipalities:** Yes — per [PILOT_DONE.md](./PILOT_DONE.md).
**Next work:** vNext items only when CRWA moves them in Spec §0 (payment discovery, etc.).
