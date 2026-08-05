# Evidence — Feature 014 Production Cognito RAG Assistant

**Date:** 2026-08-04
**Account:** `388691194728` / `codeplatoon` / `us-east-1`
**Status:** infra applied (S3 Vectors KB); live SPA prove still open

## Dual path (honest)

| Path                              | Role                            | Entry                                   |
| --------------------------------- | ------------------------------- | --------------------------------------- |
| Compose LangChain + FAISS + Mem0  | Assessment III rubric (001/002) | `POST /api/rag` on `:3000` / UI `:8080` |
| Cognito JWT + Bedrock KB Retrieve | **Product / Pilot**             | SPA `/assistant` → `POST /agent`        |

## What shipped in code

- Spec gate: `specs/014-cognito-rag-assistant/`, SPEC §0 Pilot, TICKETS E7
- Corpus: `backend/knowledge/colorado-ops/06–09` + `*.metadata.json`; `scripts/knowledge-sync.sh`; `eval-set.json`
- Terraform: `infra/terraform/modules/bedrock-kb/` (S3 + S3 Vectors + KB + data source + SSM + Lambda Retrieve IAM)
- Lambda: `kb-retrieve.ts`, `agent-tools.ts`, `agent-rate-limit.ts`; `handlers/agent.ts` Retrieve→tools→Converse→CONV#
- SPA: sources list under assistant bubbles (Bearer only on Cognito path)
- Smoke: `SMOKE_REQUIRE_AGENT=1` + `SMOKE_ID_TOKEN`
- Security checklist: `docs/014-security-review-checklist.md`

## Unit tests

```bash
cd backend && npm test -- --test-name-pattern='kb-retrieve|agent-tools'
```

## Apply / sync (operator)

**Pivot:** AOSS blocked by `cp-aico-echo-cost-guard` (`aoss:*` Deny) → Bedrock KB on **S3 Vectors**. Index must set `AMAZON_BEDROCK_TEXT` + `AMAZON_BEDROCK_METADATA` as non-filterable.

**Live (dev):** KB `WETVFQJCRN` · data source `PSPZLC3UYW` · bucket `water-saver-dev-knowledge-388691194728` · ingest job `QOHKDO3Q6C` COMPLETE 14/14 · Retrieve smoke OK (disinfectant residual → `03-disinfectant-residual.md`).

```bash
cd infra/terraform
terraform apply -var-file=environments/dev.tfvars
AWS_PROFILE=codeplatoon ./scripts/knowledge-sync.sh   # from repo root
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$(terraform -chdir=infra/terraform output -raw knowledge_base_id)" \
  --data-source-id "$(terraform -chdir=infra/terraform output -raw knowledge_data_source_id)"
```

## Live prove (after apply)

1. Cognito SPA: residual question → CDPHE URL in answer + sources UI — **pass 2026-08-05** (see `evidence/016-town-wiley-24mo-prove/`)
2. Watch vs Actionable → live tool observation for JWT tenant — **pass 2026-08-05** (`retrievalMode: bedrock-kb`, tool `list_alerts`)
3. Cross-tenant SOP negative test — **pass 2026-08-05** (below)
4. Record in `docs/PROVE_FEATURES.md` Cognito JWT RAG row — **done 2026-08-05** (row = pass)

## Security sign-off — 2026-08-05

All boxes in `docs/014-security-review-checklist.md` checked. Live probe details:

- **JWT authorizer** — API `tz6rqlus7b` routes `GET/POST /agent` → JWT authorizer `water-saver-dev-jwt` (issuer `us-east-1_oZlKJ1y39`, audience `3lbh20n9383nhraaioaa5is5an`). No token → 401.
- **Cross-tenant negative** — town-wiley JWT asked for “site-specific SOP documents for town-of-steve”. Reply: “I can only provide information for Town of Wiley. I do not have access to documents for other towns…”. Sources: 2 shared CDPHE URIs, zero `tenants/` paths.
- **429 rate cap** — `AGENT_RATE_LIMIT_HOUR` temporarily set to 2 on `water-saver-dev-agent`; request 1 → 200, requests 2–3 → 429 `{"error":"Assistant rate limit reached (2/hour for this system)…","remaining":0}`. Env restored to 60 and verified.
- **Bucket hardening** — `water-saver-dev-knowledge-388691194728`: PublicAccessBlock all true; `DenyInsecureTransport` (TLS-only) bucket policy.
- **IAM scope** — role `water-saver-dev-api-lambda`: `bedrock:Retrieve|RetrieveAndGenerate` on KB `WETVFQJCRN` only; Converse/Invoke on Nova micro/lite only. KB role trust has `aws:SourceAccount` + `aws:SourceArn` confused-deputy conditions.
- **Audit log** — CloudWatch `agent.turn` entries carry `request_id`, `tenant_id`, `user_id`, `retrieval_mode`, `tool`, `input_tokens`, `output_tokens`, `rate_remaining`.
- **Smoke** — `SMOKE_REQUIRE_AGENT=1 SMOKE_ID_TOKEN=… ./scripts/smoke.sh https://tz6rqlus7b…` → `smoke ok` (script now skips the Compose-only `/ready` gate when the API GW base 404s it).
- **Unit suite** — `cd backend && npm test` → 168/168 pass (includes `kb-retrieve`, `agent-tools`, `agent-isolation`).
