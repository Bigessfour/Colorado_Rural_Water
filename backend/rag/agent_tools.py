"""Custom tool-using agent for Water Saver (Feature 002).

Uses LangChain ``@tool`` helpers (documented tool API) with tenant-scoped
implementations. Routing is deterministic for Compose/CI; optional Bedrock
polish when credentials exist.

Live AWS product chat continues to use Lambda ``/agent`` + Dynamo.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from langchain_core.tools import StructuredTool
from rag.llm import LLMConfigurationError, get_chat_model
from rag.persona import friendly_municipality_name
from rag.settings import configure_langsmith
from rag.tenant import (
    assert_no_cross_tenant_context,
    normalize_tenant_id,
    normalize_user_id,
)

logger = logging.getLogger(__name__)


def _make_tools(tenant_id: str) -> List[StructuredTool]:
    """Factory so every tool observation is locked to the caller's tenant."""
    place = friendly_municipality_name(tenant_id)

    def list_alerts() -> str:
        return (
            f"[{place}] Sample alerts: Watch unusual usage on Main St; "
            "Watch stuck meter #104; Balance Watch for current period "
            "(insufficient if one-sided)."
        )

    def usage_summary() -> str:
        return (
            f"[{place}] Usage summary: upload recent cycles for Confidence. "
            "Typical band appears after 3+ months of billed gallons."
        )

    def suggest_column_map(headers: str = "acct,addr,read,date") -> str:
        return (
            f"[{place}] Suggested map for headers [{headers}]: "
            "account_id←acct, service_address←addr, reading←read, reading_date←date. "
            "Confirm before ingest."
        )

    return [
        StructuredTool.from_function(
            func=list_alerts,
            name="list_alerts",
            description="List open Watch/Actionable alerts for this water system only.",
        ),
        StructuredTool.from_function(
            func=usage_summary,
            name="usage_summary",
            description="Summarize usage/confidence guidance for this water system only.",
        ),
        StructuredTool.from_function(
            func=suggest_column_map,
            name="suggest_column_map",
            description="Suggest CSV column mapping for messy meter uploads.",
        ),
    ]


def _pick_tool(message: str) -> tuple[str, Dict[str, str]]:
    m = message.lower()
    if "column" in m or "map" in m or "csv" in m:
        return "suggest_column_map", {"headers": message}
    if "usage" in m or "trend" in m or "gallon" in m:
        return "usage_summary", {}
    if "alert" in m or "leak" in m or "watch" in m:
        return "list_alerts", {}
    return "list_alerts", {}


def run_tool_agent(message: str, tenant_id: str, user_id: str) -> Dict[str, Any]:
    tenant_id = normalize_tenant_id(tenant_id)
    user_id = normalize_user_id(user_id)
    tracing = configure_langsmith()
    assert_no_cross_tenant_context(tenant_id, [message], [])

    tools = {t.name: t for t in _make_tools(tenant_id)}
    tool_name, tool_args = _pick_tool(message)
    tool = tools[tool_name]
    observation = tool.invoke(tool_args)
    assert_no_cross_tenant_context(tenant_id, [message, str(observation)], [])

    place = friendly_municipality_name(tenant_id)
    reply = (
        f"I used tool `{tool_name}` for {place} only.\n\n"
        f"{observation}\n\n"
        "Say if you want me to explain an alert or help map a CSV."
    )

    try:
        llm = get_chat_model()
        polished = llm.invoke(
            [
                (
                    "system",
                    f"You are Water Saver. You are helping operators at {place} only. "
                    "Never say “tenant” or use internal system ids. "
                    "Rewrite the operator reply calmly in 2-4 short sentences. "
                    "Do not invent other towns.",
                ),
                ("human", f"User asked: {message}\nTool result: {observation}"),
            ]
        )
        if hasattr(polished, "content"):
            reply = polished.content
    except LLMConfigurationError:
        pass
    except Exception as exc:
        logger.info("Agent polish skipped: %s", exc)

    result = {
        "reply": reply,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "tool": tool_name,
        "observation": observation,
        "tools_available": sorted(tools.keys()),
        "guardrails": {
            "noCrossTenantData": True,
            "tenantScopedTools": True,
        },
        "langsmith": tracing,
    }

    try:
        from langsmith import traceable

        @traceable(
            name="water-saver-tool-agent",
            metadata={"tenant_id": tenant_id, "feature": "002", "tool": tool_name},
        )
        def traced() -> Dict[str, Any]:
            return result

        return traced()
    except Exception:
        return result
