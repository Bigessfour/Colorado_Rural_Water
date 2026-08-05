# Tasks — Feature 014: Production Cognito RAG Assistant

- [x] T014-01: Spec + SPEC §0 / TICKETS / DEMO_KNOWN_GAPS updates
- [x] T014-02: Expand colorado-ops corpus + knowledge-sync + eval set
- [x] T014-03: Terraform bedrock-kb module + API IAM/env wiring
- [x] T014-04: Lambda kb-retrieve + agent RAG unify + SPA sources
- [x] T014-05: Live agent tools (alerts, usage, column map)
- [x] T014-06: Hardening (guardrails env, rate cap, audit, smoke)
- [x] T014-07: Compose dual-path docs + RAG_API_KEY example
- [x] T014-EV: Evidence `evidence/014-cognito-rag-assistant.md`

## Remaining ops (not code)

- [x] `terraform apply` bedrock-kb + S3 Vectors index (AOSS blocked by cost-guard)
- [x] `knowledge-sync.sh` + StartIngestionJob — 2026-08-04: ingest 14/14 COMPLETE (KB `WETVFQJCRN`)
- [x] Chrome prove Cognito JWT RAG row in PROVE_FEATURES.md — 2026-08-05: row = pass (evidence/016)
- [x] Security checklist sign-off (`docs/014-security-review-checklist.md`) — 2026-08-05: all boxes checked; live probes in evidence/014 § Security sign-off
- [x] Eval runner `scripts/agent-eval.mjs` — 2026-08-05: 11/11 passing on bedrock-kb
- [x] Assistant educational disclaimer line (SPA) — 2026-08-05
