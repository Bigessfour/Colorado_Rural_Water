# Plan — Feature 002: LangGraph + LangSmith + Agent Bonuses

## Context

Assessment III full-credit track layered on Water Saver. AWS account `388691194728` / `codeplatoon` / `us-east-1` (Assessment-iii tag required).

## Approach

1. Keep Kelly vertical slice intact; Feature 001 RAG remains the default Compose Assistant path.
2. Add LangGraph alert triage + StructuredTool agent behind `/api/agent/triage` and `/api/agent`.
3. Wire LangSmith via env (`LANGCHAIN_TRACING_V2` + `LANGCHAIN_API_KEY`); evidence screenshots when key available.

## Technical notes

- Graph: `StateGraph` nodes `classify` → `gather_context` → `draft` (`backend/rag/graph.py`)
- Agent: `StructuredTool` factory scoped to `tenant_id` (`backend/rag/agent_tools.py`)
- Tracing: `configure_langsmith()` + `@traceable` (`backend/rag/settings.py`)
- Docs: `evidence/langsmith/README.md`

## Dependencies

Feature 001 closed. LangSmith screenshot blocked until `LANGCHAIN_API_KEY` is in `.env`.

## Status

**CLOSED / verified** — graph, tool agent, docs, and LangSmith Water_Saver traces proven.
Local AC re-check 2026-08-03: triage + agent APIs still return expected shapes with `langsmith.enabled=true`.

