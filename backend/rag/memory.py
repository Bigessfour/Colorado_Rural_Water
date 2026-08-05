import logging
from typing import Any, Dict, List

from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import HumanMessage
from rag.settings import MEM0_API_KEY

logger = logging.getLogger(__name__)

_session_histories: Dict[str, InMemoryChatMessageHistory] = {}
_mem0_client = None


def _session_key(user_id: str, session_id: str) -> str:
    # user_id is already tenant_id:userId from memory_user_id()
    return f"{user_id}:{session_id}"


def get_session_history(user_id: str, session_id: str) -> InMemoryChatMessageHistory:
    """Factory for ``RunnableWithMessageHistory`` (tenant-scoped session memory)."""
    key = _session_key(user_id, session_id)
    if key not in _session_histories:
        _session_histories[key] = InMemoryChatMessageHistory()
    return _session_histories[key]


def append_turn(user_id: str, session_id: str, question: str, answer: str) -> None:
    """Test / manual helper — production RAG uses RunnableWithMessageHistory."""
    history = get_session_history(user_id, session_id)
    history.add_user_message(question)
    history.add_ai_message(answer)
    persist_mem0_turn(user_id, question, answer)


def persist_mem0_turn(user_id: str, question: str, answer: str) -> None:
    """Long-term Mem0 write (platform MemoryClient)."""
    _mem0_add(user_id, question, answer)


def history_messages(user_id: str, session_id: str) -> List[Dict[str, str]]:
    history = get_session_history(user_id, session_id)
    out = []
    for msg in history.messages:
        role = "user" if isinstance(msg, HumanMessage) else "assistant"
        out.append({"role": role, "content": msg.content})
    return out


def clear_sessions_for_tests() -> None:
    _session_histories.clear()


def _get_mem0():
    """Platform Mem0 client (API key). Local Memory() needs OpenAI — not used here."""
    global _mem0_client
    if not MEM0_API_KEY:
        return None
    if _mem0_client is None:
        try:
            from mem0 import MemoryClient

            _mem0_client = MemoryClient(api_key=MEM0_API_KEY)
        except Exception as exc:
            logger.warning("Mem0 init failed: %s", exc)
            return None
    return _mem0_client


def _mem0_add(user_id: str, question: str, answer: str) -> None:
    client = _get_mem0()
    if not client:
        return
    try:
        client.add(
            [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ],
            user_id=user_id,
        )
    except Exception as exc:
        logger.warning("Mem0 add failed: %s", exc)


def mem0_search(user_id: str, query: str, limit: int = 3) -> List[Dict[str, Any]]:
    client = _get_mem0()
    if not client:
        return []
    try:
        results = client.search(
            query,
            filters={"user_id": user_id},
            top_k=limit,
        )
        if isinstance(results, dict):
            return results.get("results", []) or []
        return results or []
    except Exception as exc:
        logger.warning("Mem0 search failed: %s", exc)
        return []


def format_mem0_context(memories: List[Dict[str, Any]]) -> str:
    if not memories:
        return ""
    lines = []
    for m in memories:
        text = m.get("memory") or m.get("text") or str(m)
        lines.append(f"- {text}")
    return "Relevant memories:\n" + "\n".join(lines)
