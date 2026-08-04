# Feature 002: LangGraph + LangSmith + Agent Bonuses

**Rubric:** 25% bonuses
**Status:** planned → implementing
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths

## User value

Operators of small Colorado rural water systems get AI assistance that stays inside their municipality: explain alerts, answer questions about their meter data / runbooks, and help map messy CSV columns — without leaking other tenants' data.

## Acceptance criteria (official rubric language)

- [ ] LangGraph workflow for alert triage or CSV mapping assistant
- [ ] LangSmith observability / tracing enabled and evidenced
- [ ] Custom autonomous tool-using agent (query usage, list alerts, suggest column maps)
- [ ] Document how to view traces and how agent is constrained by tenant_id

## Non-goals

- Lex / Polly / Comprehend / Rekognition
- Cross-tenant demo shortcuts
- Replacing Angular with React

## Primary paths

- `backend/rag/graph.py`
- `backend/rag/agent_tools.py`
- `evidence/langsmith/`

## Demo evidence

See [`../RUBRIC_COVERAGE.md`](../RUBRIC_COVERAGE.md) row for Feature 002.

## Acceptance Criteria

- [ ] At least one LangGraph workflow is implemented for a multi-step product path (e.g. alert triage or CSV mapping assistant).
- [ ] LangSmith tracing/observability is enabled for the chain/graph path and can be shown in evidence (trace URL or screenshot).
- [ ] A custom tool-using agent exists and can call at least one product tool (e.g. list alerts, query usage summary, suggest column map).
- [ ] Agent/tools respect tenant scope (no cross-tenant tool results).
- [ ] Docs explain how to view LangSmith traces and how the agent is constrained.
- [ ] Demo path: run the graph/agent once and show intermediate steps or final structured result.
