# Feature 014 — security review checklist (KB + agent)

Run before inviting Pilot municipalities. Tag resources `Assessment-iii` · account `388691194728` · `us-east-1`.

**Signed off 2026-08-05** — live probes recorded in [`evidence/014-cognito-rag-assistant.md`](../evidence/014-cognito-rag-assistant.md) (§ Security sign-off).

## AuthZ

- [x] Cognito JWT authorizer on `POST /agent` — no body `tenant_id` trust on AWS path — 2026-08-05: API `tz6rqlus7b` routes `GET/POST /agent` use JWT authorizer `water-saver-dev-jwt` (issuer `us-east-1_oZlKJ1y39`, audience SPA client)
- [x] Every Bedrock `Retrieve` uses metadata filter `scope=shared OR tenant_id=<jwt>` — 2026-08-05: `buildTenantRetrievalFilter` in `backend/src/shared/kb-retrieve.ts`; unit-covered in `kb-retrieve.test.ts` (168/168 pass)
- [x] Cross-tenant negative test: tenant A JWT cannot see tenant B SOP chunks — 2026-08-05 live: town-wiley JWT asking for town-of-steve SOPs → reply declines; sources only shared CDPHE material, zero `tenants/` URIs
- [x] Compose `RAG_API_KEY` set for any non-localhost exposure — 2026-08-05: documented in `.env.example` (empty = localhost Assessment only); `backend/rag/auth.py` enforces header/Bearer when set

## IAM / data

- [x] Lambda role: `bedrock:Retrieve` only on this KB ARN; Converse on Nova only — 2026-08-05: role `water-saver-dev-api-lambda` → `Retrieve/RetrieveAndGenerate` on `knowledge-base/WETVFQJCRN` only; Converse/Invoke limited to Nova micro/lite models + inference profiles
- [x] KB role: S3 read limited to knowledge bucket; confused-deputy SourceAccount conditions — 2026-08-05: `modules/bedrock-kb/main.tf` trust policy has `aws:SourceAccount` + `aws:SourceArn knowledge-base/*` conditions; S3 read has `aws:ResourceAccount` condition
- [x] Knowledge bucket: public access blocked, TLS-only bucket policy — 2026-08-05 live: all four PublicAccessBlock flags true; `DenyInsecureTransport` bucket policy present
- [x] S3 Vectors index IAM limited to KB service role (no aoss:* — cost-guard deny) — 2026-08-05: `s3vectors:*` grants scoped to `aws_s3vectors_index.kb.index_arn` for KB role only

## Runtime controls

- [x] `AGENT_RATE_LIMIT_HOUR` soft cap observed (429 when exceeded) — 2026-08-05 live: cap lowered to 2 on `water-saver-dev-agent`, request 2+ returned HTTP 429 "Assistant rate limit reached (2/hour…)"; env restored to 60
- [x] Structured `agent.turn` logs include `request_id`, `tenant_id`, token usage (no PII dumps) — 2026-08-05 live: CloudWatch `/aws/lambda/water-saver-dev-agent` shows `agent.turn` with request_id, tenant_id, user_id, retrieval_mode, tool, input/output tokens
- [x] Optional `BEDROCK_GUARDRAIL_ID` attached for Converse when configured — 2026-08-05: env var wired on Lambda (empty in dev; `bedrock.ts` attaches when set)
- [x] Confirm gates still block delete/config without `CONFIRM DELETE|CHANGE` — 2026-08-05: `detectNeedsConfirm` unit-covered in `agent-isolation.test.ts` (pass); mutating actions excluded from agent tools

## Ops

- [x] `./scripts/knowledge-sync.sh` documented; quarterly refresh checklist followed — 2026-08-05: [`docs/colorado-ops-refresh.md`](colorado-ops-refresh.md); sync run 2026-08-04
- [x] KB data-source sync completed after corpus changes — 2026-08-04: StartIngestionJob 14/14 documents COMPLETE (KB `WETVFQJCRN` / data source `PSPZLC3UYW`)
- [x] `SMOKE_REQUIRE_AGENT=1` against API GW with live JWT — 2026-08-05 live: `smoke ok`; `/agent` 200 with `retrievalMode: bedrock-kb` + KB sources (smoke.sh now skips Compose-only `/ready` on API GW)
