# LangSmith observability (Feature 002)

## Enable tracing

1. API key from [smith.langchain.com](https://smith.langchain.com) → Settings → API Keys.
2. Gitignored `.env` / `.env.secrets`:

```bash
LANGSMITH_API_KEY=lsv2_pt_...   # also mirrored to LANGCHAIN_API_KEY locally
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=Water_Saver   # existing Assessment project name
```

3. `docker compose up -d --force-recreate backend`
4. Hit traced routes:

```bash
curl -sS -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' -H 'X-User-Id: kelly-op' \
  -d '{"alert":"Watch unusual usage on Oak St"}' \
  http://127.0.0.1:3000/api/agent/triage
```

5. Open project **Water_Saver** (signed into LangSmith):
   https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010

Look for runs: `water-saver-alert-triage`, `LangGraph`, `classify` / `gather_context` / `draft`, `list_alerts`.

## Tenant constraints

Traces attach metadata `tenant_id` / `feature=002`. Tools and graph nodes are scoped to the caller tenant only.

## Proven (2026-08-03)

See [`../002-langgraph-langsmith-agent.md`](../002-langgraph-langsmith-agent.md) for live run URLs.
