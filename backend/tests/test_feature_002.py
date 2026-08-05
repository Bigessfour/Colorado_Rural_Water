"""Feature 002 — LangGraph triage + tool agent (no Bedrock required)."""

from rag.agent_tools import _make_tools, run_tool_agent
from rag.graph import run_alert_triage_graph


def test_langgraph_triage_returns_steps():
    out = run_alert_triage_graph(
        "Watch unusual usage on Oak St",
        tenant_id="town-wiley",
        user_id="op1",
    )
    assert out["tenant_id"] == "town-wiley"
    assert out["severity"] in ("low", "medium", "high")
    assert out["graph"] in ("langgraph", "linear")
    assert isinstance(out.get("steps"), list)
    assert [s["node"] for s in out["steps"]] == [
        "classify",
        "gather_context",
        "draft",
    ]
    assert "Town of Wiley" in out["reply"]
    assert "town-wiley" not in out["reply"]


def test_tool_agent_uses_langchain_structured_tools():
    tools = _make_tools("town-wiley")
    names = sorted(t.name for t in tools)
    assert names == ["list_alerts", "suggest_column_map", "usage_summary"]

    out = run_tool_agent(
        "list my alerts please",
        tenant_id="town-wiley",
        user_id="op1",
    )
    assert out["tool"] == "list_alerts"
    assert out["tenant_id"] == "town-wiley"
    assert "Town of Wiley" in out["observation"]
    assert "town-wiley" not in out["observation"]
    assert out["guardrails"]["noCrossTenantData"] is True
    assert "list_alerts" in out["tools_available"]


def test_tool_agent_column_map_route():
    out = run_tool_agent(
        "help map csv columns acct,addr,read",
        tenant_id="town-wiley",
        user_id="op1",
    )
    assert out["tool"] == "suggest_column_map"
    assert "account_id" in out["observation"]


def test_configure_langsmith_reports_disabled_without_key(monkeypatch):
    import rag.settings as settings

    monkeypatch.setattr(settings, "LANGCHAIN_API_KEY", "")
    monkeypatch.setattr(settings, "_LANGCHAIN_TRACING_RAW", "true")
    info = settings.configure_langsmith()
    assert info["enabled"] is False
    assert info["tracing_flag"] is True
    assert info["has_api_key"] is False
