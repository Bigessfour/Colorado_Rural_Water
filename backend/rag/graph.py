"""LangGraph multi-step alert triage (Feature 002).

Documented LangGraph ``StateGraph`` flow (tenant-scoped on every node):

1. ``classify`` — severity from alert text
2. ``gather_context`` — calm operator notes (tenant-only; no other tenants)
3. ``draft`` — operator-facing reply

LangSmith: set ``LANGCHAIN_TRACING_V2=true`` + ``LANGCHAIN_API_KEY`` (see
``configure_langsmith``). Graph invokes are wrapped with ``@traceable`` when
langsmith is installed.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, TypedDict

from rag.settings import configure_langsmith
from rag.tenant import normalize_tenant_id, normalize_user_id

logger = logging.getLogger(__name__)


class TriageState(TypedDict):
    tenant_id: str
    user_id: str
    alert: str
    severity: str
    context: str
    draft: str
    notes: str
    steps: List[Dict[str, str]]


def _classify(alert: str) -> str:
    text = alert.lower()
    if any(w in text for w in ("actionable", "leak", "burst", "emergency")):
        return "high"
    if any(w in text for w in ("watch", "unusual", "stuck", "drop")):
        return "medium"
    return "low"


def _gather_context(tenant_id: str, severity: str) -> str:
    return (
        f"Tenant={tenant_id} only. Severity={severity}. "
        "Use Watch vs Actionable language; Thin Confidence is never a confirmed leak. "
        "Prefer field check when staff can visit — not dig-now."
    )


def _draft(tenant_id: str, alert: str, severity: str, context: str) -> str:
    calm = {
        "high": "Worth a look soon — treat as priority when staff can visit. Do not dig yet on Thin Confidence alone.",
        "medium": "Flagged as Watch. Compare to last few cycles when you have a quiet moment.",
        "low": "Informational for your system only. No rush.",
    }[severity]
    return (
        f"Tenant {tenant_id} triage ({severity}): {calm}\n"
        f"Context: {context}\n"
        f"Alert summary: {alert[:500]}"
    )


def _append_step(state: TriageState, node: str, detail: str) -> List[Dict[str, str]]:
    steps = list(state.get("steps") or [])
    steps.append({"node": node, "detail": detail[:300]})
    return steps


def _build_graph():
    from langgraph.graph import END, START, StateGraph

    def classify_node(state: TriageState) -> TriageState:
        severity = _classify(state["alert"])
        return {
            **state,
            "severity": severity,
            "steps": _append_step(state, "classify", f"severity={severity}"),
        }

    def gather_node(state: TriageState) -> TriageState:
        context = _gather_context(state["tenant_id"], state["severity"])
        return {
            **state,
            "context": context,
            "steps": _append_step(state, "gather_context", context),
        }

    def draft_node(state: TriageState) -> TriageState:
        draft = _draft(
            state["tenant_id"], state["alert"], state["severity"], state["context"]
        )
        return {
            **state,
            "draft": draft,
            "notes": "LangGraph triage; tenant-scoped; no cross-tenant tools.",
            "steps": _append_step(state, "draft", "operator reply drafted"),
        }

    graph = StateGraph(TriageState)
    graph.add_node("classify", classify_node)
    graph.add_node("gather_context", gather_node)
    graph.add_node("draft", draft_node)
    graph.add_edge(START, "classify")
    graph.add_edge("classify", "gather_context")
    graph.add_edge("gather_context", "draft")
    graph.add_edge("draft", END)
    return graph.compile()


def _linear_triage(
    alert: str, tenant_id: str, user_id: str, reason: str
) -> Dict[str, Any]:
    severity = _classify(alert)
    context = _gather_context(tenant_id, severity)
    draft = _draft(tenant_id, alert, severity, context)
    steps = [
        {"node": "classify", "detail": f"severity={severity}"},
        {"node": "gather_context", "detail": context[:300]},
        {"node": "draft", "detail": "operator reply drafted"},
    ]
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "severity": severity,
        "reply": draft,
        "notes": f"linear fallback: {reason}",
        "graph": "linear",
        "steps": steps,
        "langsmith": configure_langsmith(),
    }


def run_alert_triage_graph(alert: str, tenant_id: str, user_id: str) -> Dict[str, Any]:
    """Run documented LangGraph StateGraph (or linear fallback)."""
    tenant_id = normalize_tenant_id(tenant_id)
    user_id = normalize_user_id(user_id)
    tracing = configure_langsmith()

    def _invoke() -> Dict[str, Any]:
        try:
            app = _build_graph()
            result = app.invoke(
                {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "alert": alert,
                    "severity": "",
                    "context": "",
                    "draft": "",
                    "notes": "",
                    "steps": [],
                }
            )
            return {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "severity": result["severity"],
                "reply": result["draft"],
                "notes": result["notes"],
                "graph": "langgraph",
                "steps": result.get("steps") or [],
                "langsmith": tracing,
            }
        except Exception as exc:
            logger.info("LangGraph unavailable, linear triage: %s", exc)
            return _linear_triage(alert, tenant_id, user_id, str(exc))

    try:
        from langsmith import traceable

        @traceable(
            name="water-saver-alert-triage",
            metadata={"tenant_id": tenant_id, "feature": "002"},
        )
        def traced_invoke() -> Dict[str, Any]:
            return _invoke()

        return traced_invoke()
    except Exception:
        return _invoke()
