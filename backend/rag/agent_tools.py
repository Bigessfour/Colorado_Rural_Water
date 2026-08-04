"""Custom tool-using agent for Water Saver (Feature 002).

Tools are stubbed with tenant-scoped safe responses for Compose/CI.
Live AWS product path continues to use Lambda /agent with Dynamo.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Callable, Dict, List

from rag.chain import RAGError, run_rag
from rag.llm import LLMConfigurationError, get_chat_model
from rag.tenant import assert_no_cross_tenant_context

logger = logging.getLogger(__name__)


def tool_list_alerts(tenant_id: str, _args: str) -> str:
    return (
        f"[{tenant_id}] Sample alerts: Watch unusual usage on Main St; "
        "Watch stuck meter #104; Balance Watch for current period (insufficient if one-sided)."
    )


def tool_usage_summary(tenant_id: str, _args: str) -> str:
    return (
        f"[{tenant_id}] Usage summary: upload recent cycles for Confidence. "
        "Typical band appears after 3+ months of billed gallons."
    )


def tool_suggest_column_map(tenant_id: str, args: str) -> str:
    headers = args or "acct,addr,read,date"
    return (
        f"[{tenant_id}] Suggested map for headers [{headers}]: "
        "account_id←acct, service_address←addr, reading←read, reading_date←date. "
        "Confirm before ingest."
    )


TOOLS: Dict[str, Callable[[str, str], str]] = {
    "list_alerts": tool_list_alerts,
    "usage_summary": tool_usage_summary,
    "suggest_column_map": tool_suggest_column_map,
}


def _pick_tool(message: str) -> tuple[str, str]:
    m = message.lower()
    if "column" in m or "map" in m or "csv" in m:
        return "suggest_column_map", message
    if "usage" in m or "trend" in m or "gallon" in m:
        return "usage_summary", message
    if "alert" in m or "leak" in m or "watch" in m:
        return "list_alerts", message
    return "list_alerts", message


def run_tool_agent(message: str, tenant_id: str, user_id: str) -> Dict[str, Any]:
    assert_no_cross_tenant_context(tenant_id, [message], [])
    tool_name, tool_args = _pick_tool(message)
    tool_fn = TOOLS[tool_name]
    observation = tool_fn(tenant_id, tool_args)
    assert_no_cross_tenant_context(tenant_id, [message, observation], [])

    reply = (
        f"I used tool `{tool_name}` inside tenant {tenant_id} only.\n\n"
        f"{observation}\n\n"
        "Say if you want me to explain an alert or help map a CSV."
    )

    # Optional Bedrock polish when credentials exist
    try:
        llm = get_chat_model()
        polished = llm.invoke(
            [
                (
                    "system",
                    f"You are Water Saver. Stay inside tenant {tenant_id}. "
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

    return {
        "reply": reply,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "tool": tool_name,
        "observation": observation,
        "guardrails": {
            "noCrossTenantData": True,
            "tenantScopedTools": True,
        },
    }
