"""Tenant isolation unit tests (Assessment III — Feature 001/002)."""

import pytest
from rag.agent_tools import run_tool_agent
from rag.graph import run_alert_triage_graph
from rag.memory import append_turn, clear_sessions_for_tests, history_messages
from rag.tenant import (
    assert_no_cross_tenant_context,
    find_cross_tenant_leaks,
    memory_user_id,
)


def test_memory_user_id_format():
    assert memory_user_id("town-wiley", "u1") == "town-wiley:u1"


def test_memory_user_id_rejects_colon():
    with pytest.raises(PermissionError):
        memory_user_id("a:b", "u1")


def test_memory_user_id_rejects_path_traversal():
    with pytest.raises(PermissionError):
        memory_user_id("town-a/../town-b", "u1")
    with pytest.raises(PermissionError):
        memory_user_id("town-wiley", "../evil")


def test_cross_tenant_leak_detected():
    leaks = find_cross_tenant_leaks(
        "town-wiley",
        ["Help with town-steve meters"],
        ["town-steve", "town-wiley"],
    )
    assert len(leaks) == 1


def test_assert_raises_on_leak():
    with pytest.raises(PermissionError):
        assert_no_cross_tenant_context("a", ["see b data"], ["b"])


def test_session_histories_do_not_mix_tenants():
    clear_sessions_for_tests()
    append_turn("t1:u1", "s", "hello t1", "hi t1")
    append_turn("t2:u1", "s", "hello t2", "hi t2")
    t1 = history_messages("t1:u1", "s")
    t2 = history_messages("t2:u1", "s")
    assert len(t1) == 2
    assert len(t2) == 2
    assert "t2" not in t1[0]["content"]
    assert "t1" not in t2[0]["content"]


def test_triage_graph_tenant_scoped():
    out = run_alert_triage_graph(
        "Watch unusual usage on Oak St",
        tenant_id="town-wiley",
        user_id="op1",
    )
    assert out["tenant_id"] == "town-wiley"
    assert out["severity"] in ("low", "medium", "high")
    assert "Town of Wiley" in out["reply"]
    assert "town-wiley" not in out["reply"]


def test_tool_agent_uses_tenant_tool():
    out = run_tool_agent("list my alerts please", tenant_id="town-wiley", user_id="op1")
    assert out["tenant_id"] == "town-wiley"
    assert out["tool"] == "list_alerts"
    assert "Town of Wiley" in out["observation"]
    assert "town-wiley" not in out["observation"]
    assert out["guardrails"]["noCrossTenantData"] is True
