# Evidence — Mem0 platform connection (Assessment III)

**Date:** 2026-08-04
**Status:** verified (live)
**Parent feature:** [001](../specs/001-langchain-mem0-rag/) · full write-up also in [`001-langchain-mem0-rag.md`](001-langchain-mem0-rag.md)

## Verdict

**Mem0 is connected and working** for the Compose RAG path via platform `MemoryClient` (`MEM0_API_KEY`).

Not the same as LangChain session memory (`InMemoryChatMessageHistory`) — Mem0 is long-term and survives a new `session_id`.

## Proof summary

1. Client OK in container (`MemoryClient`, key present).
2. `POST /api/rag` taught: Willow Bend Meter `WB-1785805726` on Route 9 (tenant `town-wiley`, user `mem0-prove`).
3. `GET /api/history?q=Willow` returned Mem0 memories with `user_id=town-wiley:mem0-prove`.
4. New session recall answered with meter id + Route 9.
5. Isolation: `town-steve` same user string → **0** hits.

## Wiring

- [`backend/rag/memory.py`](../backend/rag/memory.py) — `MemoryClient` add/search
- [`backend/rag/chain.py`](../backend/rag/chain.py) — `mem0_context` in prompt; `persist_mem0_turn` after answer
- [`backend/rag/tenant.py`](../backend/rag/tenant.py) — `memory_user_id` = `{tenant_id}:{user_id}`
