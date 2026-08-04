# Plan — Feature 001: LangChain + Mem0 RAG Core

## Context

Assessment III full-credit track layered on Water Saver. AWS account `388691194728` / `codeplatoon` / `us-east-1` (Assessment-iii tag required).

## Approach

1. Keep Kelly vertical slice (Cognito, upload, dashboard, alerts, tenant isolation).
2. Deliver this feature's acceptance criteria without breaking dual-runtime (Compose + AWS serverless).
3. Port LangChain / Mem0 / FAISS patterns from Assessment III where they fit Water Saver domain.

## Technical notes

- Frontend: Angular 22 + PrimeNG (Compose agent page uses `/api/rag` when `composeDemo`)
- AI: Bedrock (Nova Lite + Titan embeddings) + LangChain + Mem0 (tenant-keyed `tenant_id:userId`)
- RAG: `backend/rag/` Flask on `:5001`, proxied by Node Express on `:3000`
- Knowledge bootstrap: `backend/knowledge/*.md` → FAISS under `/data/faiss`
- IaC: `infra/terraform` (live AWS path); Compose DoD: frontend + backend + Postgres

## Compose Bedrock auth (locked)

Host `AWS_PROFILE=codeplatoon` uses macOS Keychain `credential_process` and **does not work inside Linux containers**. For Compose:

```bash
eval "$(aws configure export-credentials --profile codeplatoon --format env)"
unset AWS_PROFILE
docker compose up -d --build db backend
```

Or put `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in gitignored `.env.secrets`. Do not mount `~/.aws` expecting Keychain scripts to run in-container.

Optional: `MEM0_API_KEY` for platform long-term memory (uses `MemoryClient`, not local `Memory()`).

## Dependencies

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) and constitution `.specify/memory/constitution.md`.

## Status

**Done / verified** — see [`../../evidence/001-langchain-mem0-rag.md`](../../evidence/001-langchain-mem0-rag.md).
