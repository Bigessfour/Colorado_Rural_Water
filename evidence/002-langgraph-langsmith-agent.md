# Evidence — Feature 002 LangGraph + LangSmith + Tool Agent

**Date:** 2026-08-03
**Account:** `388691194728` / `codeplatoon` / `us-east-1`
**Runtime:** Docker Compose (`db` + `backend`)
**Status:** verified / closed (including LangSmith traces; AC re-checked 2026-08-03)

## Rubric → implementation map

| Rubric item             | Implementation                                  | Proof                                                            |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| LangGraph workflow      | `StateGraph`: classify → gather_context → draft | `POST /api/agent/triage` + LangSmith run `LangGraph` / node runs |
| Tool-using agent        | LangChain `StructuredTool` (`list_alerts`, …)   | `POST /api/agent` + LangSmith `list_alerts` / `ChatBedrock`      |
| Tenant isolation        | `normalize_tenant_id` + tenant-scoped tools     | pytest + observation strings                                     |
| LangSmith observability | `configure_langsmith()` + `@traceable`          | Live project **Water_Saver** (see URLs below)                    |

## LangSmith project

- Project: **Water_Saver**
- Project URL: https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010
- Alert triage root: https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010/r/019fca11-bd2a-7943-8dcc-a52e87e078cd (`water-saver-alert-triage`)
- Graph run: https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010/r/019fca11-bd5e-7e63-8c0c-3e65b019731f (`LangGraph`)
- Nodes: `classify`, `gather_context`, `draft` (each success in same session)
- Tool path: `list_alerts` + `ChatBedrock` success runs in same project

(If a link still fails in-browser, open LangSmith → project **Water_Saver** while signed in — API confirmed runs exist.)

Env (gitignored `.env`):

```bash
LANGSMITH_API_KEY=…          # or LANGCHAIN_API_KEY
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=Water_Saver
```

## Local API proof

```bash
curl -sS -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' -H 'X-User-Id: kelly-op' \
  -d '{"alert":"Watch unusual usage on Oak St"}' \
  http://127.0.0.1:3000/api/agent/triage
# → graph=langgraph, steps=[classify,gather_context,draft], langsmith.enabled=true

curl -sS -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' -H 'X-User-Id: kelly-op' \
  -d '{"message":"list my alerts please"}' \
  http://127.0.0.1:3000/api/agent
# → tool=list_alerts, langsmith.enabled=true
```

## Pytest

`tests/test_feature_002.py` + isolation (Compose backend image).
