"""Prove Feature 001 uses documented LangChain APIs (no Bedrock required)."""
import pytest
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory

from rag.chain import PROMPT, build_conversational_rag_chain, build_rag_chain
from rag.memory import clear_sessions_for_tests, get_session_history, history_messages


def test_prompt_is_chat_prompt_template_with_history_placeholder():
    assert isinstance(PROMPT, ChatPromptTemplate)
    var_names = set(PROMPT.input_variables)
    assert "question" in var_names
    assert "context" in var_names
    assert "mem0_context" in var_names
    assert "tenant_id" in var_names
    assert any(
        getattr(m, "variable_name", None) == "chat_history"
        or type(m).__name__ == "MessagesPlaceholder"
        for m in PROMPT.messages
    )


def test_lcel_chain_ends_with_str_output_parser():
    llm = FakeListChatModel(responses=["Watch means worth a look."])
    chain = build_rag_chain(llm)
    assert isinstance(chain.last, StrOutputParser)


def test_runnable_with_message_history_persists_session():
    clear_sessions_for_tests()
    llm = FakeListChatModel(
        responses=[
            "Cedar Fork is a meter in town-wiley.",
            "You asked about Cedar Fork earlier.",
        ]
    )
    chain = build_conversational_rag_chain(llm)
    assert isinstance(chain, RunnableWithMessageHistory)

    cfg = {"configurable": {"user_id": "town-wiley:op1", "session_id": "sess-a"}}
    payload = {
        "question": "Remember meter Cedar Fork",
        "context": "[runbook.md]\nCedar Fork is on Route 3.",
        "mem0_context": "(none yet)",
        "tenant_id": "town-wiley",
    }
    a1 = chain.invoke(payload, config=cfg)
    assert isinstance(a1, str) and a1

    payload2 = {**payload, "question": "What meter did I just mention?"}
    a2 = chain.invoke(payload2, config=cfg)
    assert isinstance(a2, str) and a2

    msgs = history_messages("town-wiley:op1", "sess-a")
    assert len(msgs) >= 4  # 2 human + 2 ai
    assert any(m["role"] == "user" and "Cedar Fork" in m["content"] for m in msgs)


def test_session_histories_isolated_via_factory():
    clear_sessions_for_tests()
    h1 = get_session_history(user_id="t1:u1", session_id="s")
    h2 = get_session_history(user_id="t2:u1", session_id="s")
    h1.add_user_message("only tenant one")
    h2.add_user_message("only tenant two")
    assert h1.messages[0].content == "only tenant one"
    assert h2.messages[0].content == "only tenant two"
    assert h1 is not h2


def test_faiss_index_dir_rejects_path_traversal(tmp_path, monkeypatch):
    from rag import store as store_mod

    monkeypatch.setattr(store_mod, "FAISS_INDEX_PATH", str(tmp_path))
    with pytest.raises(ValueError):
        store_mod.index_dir("town-a/../town-b")
    with pytest.raises(ValueError):
        store_mod.index_dir("..")
    safe = store_mod.index_dir("town-wiley")
    assert safe.endswith("town-wiley")
    assert str(tmp_path) in safe
