"""Custom tool-using agent for Water Saver (Feature 002 — Assessment / Compose).

Uses LangChain ``StructuredTool`` helpers with tenant-scoped **sample** observations.
Routing is deterministic for Compose/CI; optional Bedrock polish when credentials exist.

Product path (``composeDemo: false`` Cognito SPA):
  Lambda ``GET/POST /agent`` + Dynamo tools in ``backend/src/shared/agent-tools.ts``.
  Do **not** treat these Flask stubs as product parity.

Compose / Assessment (``environment.compose.ts`` → ``composeDemo: true``):
  These stubs stay for rubric demos (LangChain tools + LangSmith). Observations are
  labeled sample data so operators never confuse them with live municipality rows.
"""

from __future__ import annotations

import logging
import re
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

# Assessment sample map — mirrors common messy export headers (not Dynamo).
_SAMPLE_HEADER_MAP = {
    "acct": "account_id",
    "account": "account_id",
    "account_id": "account_id",
    "account #": "account_id",
    "addr": "service_address",
    "address": "service_address",
    "service address": "service_address",
    "read": "reading",
    "reading": "reading",
    "gallons": "reading",
    "date": "reading_date",
    "reading date": "reading_date",
    "read date": "reading_date",
    "meter": "meter_id",
    "meter id": "meter_id",
    "meter_id": "meter_id",
}


def _parse_headers(raw: str) -> List[str]:
    """Pull a header list from operator text (headers: a, b, c)."""
    m = re.search(r"headers?\s*[:=]\s*([^\n]+)", raw, re.I)
    if m:
        chunk = m.group(1).strip()
    else:
        after = re.search(r"(?i)(?:columns?|headers?)\s*[:=]?\s*([^\n]+)", raw)
        chunk = after.group(1).strip() if after else ""
    if not chunk or ("," not in chunk and "|" not in chunk and ";" not in chunk):
        # Bare defaults when the operator did not paste a list.
        if re.search(r"(?i)\bacct\b.*,.*\baddr\b", raw):
            chunk = "acct, addr, read, date"
        else:
            return ["acct", "addr", "read", "date"]
    chunk = re.split(r"(?<=\w)\.\s+", chunk, maxsplit=1)[0]
    parts = re.split(r"[,|;]+", chunk)
    cleaned = [p.strip() for p in parts if p.strip() and len(p.strip()) < 60][:24]
    return cleaned or ["acct", "addr", "read", "date"]


def _suggest_map_lines(headers: List[str]) -> str:
    suggestions: List[str] = []
    unmapped: List[str] = []
    for h in headers:
        key = h.lower().strip()
        canon = _SAMPLE_HEADER_MAP.get(key)
        if canon:
            suggestions.append(f"{canon}←{h}")
        else:
            unmapped.append(h)
    bits = [
        f"Suggested map for headers [{', '.join(headers)}]:",
        ", ".join(suggestions) if suggestions else "(no confident matches)",
    ]
    if unmapped:
        bits.append(f"Unmapped: {', '.join(unmapped)}")
    bits.append("Confirm in Upload before import. (Compose sample tool — not live Dynamo.)")
    return " ".join(bits)


def _make_tools(tenant_id: str) -> List[StructuredTool]:
    """Factory so every tool observation is locked to the caller's tenant place name."""
    place = friendly_municipality_name(tenant_id)

    def list_alerts() -> str:
        return (
            f"[{place}] SAMPLE (Compose/Assessment only — not live Dynamo): "
            "Watch unusual usage on Main St; Watch stuck meter #104; "
            "Balance Watch for current period (insufficient if one-sided)."
        )

    def usage_summary() -> str:
        return (
            f"[{place}] SAMPLE (Compose/Assessment only): upload recent cycles for Confidence. "
            "Typical band appears after 3+ months of billed gallons. "
            "Product Cognito /agent uses live Confidence from meter readings."
        )

    def suggest_column_map(headers: str = "acct,addr,read,date") -> str:
        parts = _parse_headers(headers)
        return f"[{place}] {_suggest_map_lines(parts)}"

    return [
        StructuredTool.from_function(
            func=list_alerts,
            name="list_alerts",
            description="List sample Watch/Actionable alerts for this water system (Compose demo).",
        ),
        StructuredTool.from_function(
            func=usage_summary,
            name="usage_summary",
            description="Sample usage/confidence guidance for this water system (Compose demo).",
        ),
        StructuredTool.from_function(
            func=suggest_column_map,
            name="suggest_column_map",
            description="Suggest CSV column mapping for messy meter uploads (Compose demo).",
        ),
    ]


def _pick_tool(message: str) -> tuple[str, Dict[str, str]]:
    m = message.lower()
    if "column" in m or "map" in m or "csv" in m or "header" in m:
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
        f"I used tool `{tool_name}` for {place} only (Compose sample data).\n\n"
        f"{observation}\n\n"
        "Say if you want me to explain an alert or help map a CSV. "
        "Live CloudFront operators use Cognito /agent with real Dynamo tools."
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
                    "Do not invent other towns. Mention this is sample/Compose data if relevant.",
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
        "compose_demo_stubs": True,
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
