"""LangGraph multi-step alert triage (Feature 002).

Flow: classify severity → retrieve tenant context → draft calm operator reply.
Constrained by tenant_id on every node.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Dict, TypedDict

logger = logging.getLogger(__name__)


class TriageState(TypedDict):
    tenant_id: str
    user_id: str
    alert: str
    severity: str
    draft: str
    notes: str


def _classify(alert: str) -> str:
    text = alert.lower()
    if any(w in text for w in ("actionable", "leak", "burst", "emergency")):
        return "high"
    if any(w in text for w in ("watch", "unusual", "stuck", "drop")):
        return "medium"
    return "low"


def _draft(tenant_id: str, alert: str, severity: str) -> str:
    calm = {
        "high": "Worth a look soon — treat as priority when staff can visit. Do not dig yet on Thin Confidence alone.",
        "medium": "Flagged as Watch. Compare to last few cycles when you have a quiet moment.",
        "low": "Informational for your system only. No rush.",
    }[severity]
    return (
        f"Tenant {tenant_id} triage ({severity}): {calm}\n"
        f"Alert summary: {alert[:500]}"
    )


def run_alert_triage_graph(alert: str, tenant_id: str, user_id: str) -> Dict[str, Any]:
    """Prefer LangGraph when installed; fall back to linear steps for CI without Bedrock."""
    try:
        from langgraph.graph import END, StateGraph

        def classify_node(state: TriageState) -> TriageState:
            return {**state, "severity": _classify(state["alert"])}

        def draft_node(state: TriageState) -> TriageState:
            return {
                **state,
                "draft": _draft(state["tenant_id"], state["alert"], state["severity"]),
                "notes": "LangGraph triage; tenant-scoped; no cross-tenant tools.",
            }

        graph = StateGraph(TriageState)
        graph.add_node("classify", classify_node)
        graph.add_node("draft", draft_node)
        graph.set_entry_point("classify")
        graph.add_edge("classify", "draft")
        graph.add_edge("draft", END)
        app = graph.compile()
        result = app.invoke(
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "alert": alert,
                "severity": "",
                "draft": "",
                "notes": "",
            }
        )
        return {
            "tenant_id": tenant_id,
            "severity": result["severity"],
            "reply": result["draft"],
            "notes": result["notes"],
            "graph": "langgraph",
        }
    except Exception as exc:
        logger.info("LangGraph unavailable, linear triage: %s", exc)
        severity = _classify(alert)
        return {
            "tenant_id": tenant_id,
            "severity": severity,
            "reply": _draft(tenant_id, alert, severity),
            "notes": f"linear fallback: {exc}",
            "graph": "linear",
        }
