# Feature 002: LangGraph + LangSmith + Agent Bonuses

**Rubric:** 25% bonuses
**Status:** done / closed (verified 2026-08-03 — LangSmith traces live; AC re-checked same day)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators get multi-step alert triage and tool-assisted answers that stay inside their municipality — with LangSmith traces for Assessment demos.

## Acceptance criteria (official rubric language)

- [x] LangGraph workflow for alert triage or CSV mapping assistant
- [x] LangSmith observability / tracing enabled and evidenced
- [x] Custom autonomous tool-using agent (query usage, list alerts, suggest column maps)
- [x] Document how to view traces and how agent is constrained by tenant_id

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `backend/rag/graph.py`
- `backend/rag/agent_tools.py`
- `backend/rag/settings.py` (`configure_langsmith`)
- `evidence/langsmith/`
- `evidence/002-langgraph-langsmith-agent.md`

## Demo evidence

See [`../../evidence/002-langgraph-langsmith-agent.md`](../../evidence/002-langgraph-langsmith-agent.md) and [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 002.

## Acceptance Criteria

- [x] At least one LangGraph workflow is implemented for a multi-step product path (e.g. alert triage or CSV mapping assistant).
- [x] LangSmith tracing/observability is enabled for the chain/graph path and can be shown in evidence (trace URL or screenshot).
- [x] A custom tool-using agent exists and can call at least one product tool (e.g. list alerts, query usage summary, suggest column map).
- [x] Agent/tools respect tenant scope (no cross-tenant tool results).
- [x] Docs explain how to view LangSmith traces and how the agent is constrained.
- [x] Demo path: run the graph/agent once and show intermediate steps or final structured result.

### Close-out review (2026-08-03)

| Criterion            | Proof                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LangGraph multi-step | `POST /api/agent/triage` → `graph=langgraph`, steps `classify` → `gather_context` → `draft`                                                                                      |
| LangSmith evidenced  | Project [Water_Saver](https://smith.langchain.com/o/eb241cf3-019d-4c69-8f37-6743c9492e5e/projects/p/d2ada7e5-aa71-433f-aa74-3b0f51c05010); triage run `water-saver-alert-triage` |
| Tool-using agent     | `POST /api/agent` → `tool=list_alerts` (+ usage_summary / suggest_column_map available)                                                                                          |
| Tenant scope         | Tools factory-scoped; observation strings include caller `tenant_id` only                                                                                                        |
| Docs                 | `evidence/langsmith/README.md`                                                                                                                                                   |
| Demo steps           | API JSON `steps` + LangSmith node runs                                                                                                                                           |

**Status: CLOSED for Feature 002.**
