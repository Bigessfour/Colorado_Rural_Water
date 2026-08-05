# Colorado ops knowledge — quarterly refresh checklist

Use with Feature 014 (Cognito RAG) and Compose FAISS bootstrap.

## Cadence

Every quarter (or after major CDPHE site reorganizations):

1. Open [`backend/knowledge/colorado-ops/01-online-sources.md`](../backend/knowledge/colorado-ops/01-online-sources.md) and click every primary URL.
2. Update extracts in `02`–`09` if guidance changed; bump **Retrieved:** dates.
3. Keep companion `*.metadata.json` (`scope=shared`) beside each file for Bedrock KB filtering.
4. Run sync:
   ```bash
   AWS_PROFILE=codeplatoon WATER_SAVER_KNOWLEDGE_BUCKET=<bucket> ./scripts/knowledge-sync.sh
   ```
5. Start a Bedrock Knowledge Base data-source sync (console or CLI).
6. Re-run eval set against Cognito `/agent` (and Compose when relevant):
   ```bash
   SMOKE_ID_TOKEN=<Cognito JWT> node scripts/agent-eval.mjs
   ```
   Expect 11/11 with `retrievalMode=bedrock-kb`; nonzero exit on any failed case.
7. Record result in [`PROVE_FEATURES.md`](PROVE_FEATURES.md) / Feature 014 evidence.

## Isolation

- Shared statewide only under `knowledge/shared/`.
- Site-specific SOPs: `knowledge/tenants/{tenant_id}/` with metadata `tenant_id` + `scope=tenant`.
