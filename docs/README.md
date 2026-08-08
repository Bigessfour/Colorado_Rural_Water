# Water Saver — documentation index

Use this page to find the **current** doc — not every file in `docs/` is active workflow.

---

## Status (2026-08-08)

| Layer                       | Verdict      | Canonical doc                                        |
| --------------------------- | ------------ | ---------------------------------------------------- |
| Assessment III + Kelly demo | **Done**     | [CLOSEOUT.md](./CLOSEOUT.md)                         |
| Pilot hardening (Spec §0)   | **Done**     | [PILOT_DONE.md](./PILOT_DONE.md)                     |
| vNext / payment Epic I      | **Deferred** | [SPEC.md](./SPEC.md) §0 · [TICKETS.md](./TICKETS.md) |

---

## Product & architecture

| Doc                                          | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| [SPEC.md](./SPEC.md)                         | Product spec — **§0 scope layers** is authority |
| [TICKETS.md](./TICKETS.md)                   | Epic backlog (mostly `done`; I3+ blocked)       |
| [TENANT_ISOLATION.md](./TENANT_ISOLATION.md) | Multi-tenant model + A6 residual                |
| [BILLING.md](./BILLING.md)                   | Manual ledger (Epic I0–I2)                      |
| [AWS_ACCOUNT.md](./AWS_ACCOUNT.md)           | Locked lab account / profile / tags             |

---

## Verification & ship gates

| Doc                                                                  | Purpose                                          |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| [PROVE_FEATURES.md](./PROVE_FEATURES.md)                             | Browser prove matrix (operator workflows)        |
| [correctness-surface-passes.md](./correctness-surface-passes.md)     | 42-surface unit/integration/E2E register         |
| [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md)                 | Kelly + acceptance runbook                       |
| [SMOKE_CHECKLIST.md](./SMOKE_CHECKLIST.md)                           | Live smoke steps                                 |
| [action-items.md](./action-items.md)                                 | Handler/page proof overlay (inventory companion) |
| [function-inventory.generated.md](./function-inventory.generated.md) | Generated — run `npm run inventory`              |

---

## Operators & CRWA

| Doc                                                              | Purpose                      |
| ---------------------------------------------------------------- | ---------------------------- |
| [user-guide/tenant-operator.md](./user-guide/tenant-operator.md) | Municipal operator guide     |
| [user-guide/crwa-admin.md](./user-guide/crwa-admin.md)           | CRWA admin guide             |
| [DEMO_WALKTHROUGH.md](./DEMO_WALKTHROUGH.md)                     | Scripted product walkthrough |

---

## Agent / dev tooling

| Doc                                  | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| [AGENTS.md](../AGENTS.md)            | Mandatory agent protocol (repo root) |
| [codebase-rag.md](./codebase-rag.md) | Local RAG index                      |
| [spec-kit.md](./spec-kit.md)         | Spec Kit / SDD in this repo          |

---

## Archive (historical — do not extend)

| Doc                                                            | Notes                             |
| -------------------------------------------------------------- | --------------------------------- |
| [archive/](./archive/)                                         | Superseded assessment / gap lists |
| [ASSESSMENT_III_SUBMISSION.md](./ASSESSMENT_III_SUBMISSION.md) | Rubric zap sheet (grading)        |
| [ASSESSMENT_III_DEMO.md](./ASSESSMENT_III_DEMO.md)             | Instructor demo script            |
| [KELLY_INVITE.md](./KELLY_INVITE.md)                           | Invite sent 2026-08-06            |

**Removed / merged:** [DEMO_KNOWN_GAPS.md](./DEMO_KNOWN_GAPS.md) → [PILOT_DONE.md](./PILOT_DONE.md) accepted deferrals. [PILOT_TRACK.md](./PILOT_TRACK.md) → frozen completion record.
