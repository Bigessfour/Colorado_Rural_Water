# Tasks — Feature 002: LangGraph + LangSmith + Agent Bonuses

## Implementation checklist

- [x] T002-01: LangGraph workflow for alert triage (`classify` → `gather_context` → `draft`)
- [x] T002-02: LangSmith observability / tracing enabled and evidenced (Water_Saver project run URLs)
- [x] T002-03: Custom tool-using agent (`StructuredTool`: list_alerts, usage_summary, suggest_column_map)
- [x] T002-04: Document how to view traces and how agent is constrained by tenant_id

- [x] T002-EV: Record evidence path → `evidence/002-langgraph-langsmith-agent.md`
- [x] T002-DOC: `evidence/langsmith/README.md` + `.env.example` LangSmith vars

## Verification (2026-08-03)

- API: triage `graph=langgraph` + three `steps`; agent `tool=list_alerts`; `langsmith.enabled=true`
- LangSmith: `water-saver-alert-triage`, `LangGraph`, node runs, `list_alerts` / `ChatBedrock` in project Water_Saver
- Close-out re-check: same API results with workspace URLs
  https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010

## Close-out

**Status: CLOSED for Feature 002.** All acceptance criteria checked; evidence + LangSmith links verified.
