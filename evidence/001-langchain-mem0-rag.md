# Evidence — Feature 001 LangChain + Mem0 RAG Core

**Date:** 2026-08-03 (LangChain API proof refreshed)
**Account:** `388691194728` / `codeplatoon` / `us-east-1`
**Runtime:** Docker Compose (`db` + `backend`)
**Status:** verified

## Rubric → documented LangChain APIs (grading map)

| Rubric language           | Documented LangChain API used                                                                                                    | Source                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Chains + prompt templates | `ChatPromptTemplate.from_messages` + `MessagesPlaceholder("chat_history")` + LCEL `prompt \| ChatBedrock \| StrOutputParser`     | `backend/rag/chain.py`                       |
| RAG: load / split         | `DirectoryLoader` / `TextLoader` + `RecursiveCharacterTextSplitter`                                                              | `backend/rag/ingest.py`                      |
| RAG: embed / vector store | `BedrockEmbeddings` + `FAISS.from_documents` / `FAISS.load_local` + **`as_retriever().invoke`**                                  | `backend/rag/llm.py`, `store.py`, `chain.py` |
| LangChain session memory  | `RunnableWithMessageHistory` + `InMemoryChatMessageHistory` (tenant-scoped `user_id` + `session_id` via `ConfigurableFieldSpec`) | `backend/rag/chain.py`, `memory.py`          |
| Mem0 long-term memory     | Platform `MemoryClient` add/search with `filters={"user_id": tenant_id:userId}`                                                  | `backend/rag/memory.py`                      |
| Chat model                | `langchain_aws.ChatBedrock` (Nova Lite)                                                                                          | `backend/rag/llm.py`                         |

API response includes a `langchain` fingerprint for demos:

```json
"langchain": {
  "prompt": "ChatPromptTemplate+MessagesPlaceholder",
  "chain": "LCEL prompt|ChatBedrock|StrOutputParser",
  "history": "RunnableWithMessageHistory+InMemoryChatMessageHistory",
  "retriever": "FAISS.as_retriever"
}
```

## What was proven

| Check                                       | Result                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Documented LangChain unit tests             | **13 passed** (`test_isolation.py` + `test_langchain_apis.py`)                |
| `GET /health`                               | 200 — `runtime: compose`                                                      |
| `GET /ready`                                | 200 — db + rag ok                                                             |
| `POST /api/rag` Watch vs Actionable         | **200** — cites `runbook.md` + `alerts.md`; `langchain` fingerprint present   |
| Session memory (RunnableWithMessageHistory) | **200** — turn 3 recalled **Cedar Fork** + **Route 3** from same `session_id` |
| Mem0 platform                               | configured via `.env` `MEM0_API_KEY`; `MemoryClient` add on each turn         |

## Fixes locked during verify

1. **Ingest glob:** `DirectoryLoader` does not expand `{md,txt}` braces — load `**/*.md` and `**/*.txt` separately (`backend/rag/ingest.py`).
2. **Compose AWS auth:** do not use in-container `AWS_PROFILE` with host Keychain `credential_process`; export access keys into Compose env (see feature `plan.md`).
3. **Mem0:** use `MemoryClient(api_key=…)` (platform), not local `Memory()`; search with `filters={"user_id": …}`.
4. **Session memory:** use documented `RunnableWithMessageHistory` + `MessagesPlaceholder` (not hand-rolled conversation string only).
5. **Retriever:** use documented `FAISS.as_retriever(...).invoke(question)`.

## Commands (reproducible)

```bash
eval "$(aws configure export-credentials --profile codeplatoon --format env)"
unset AWS_PROFILE
docker compose up -d --build db backend
docker compose exec -T backend sh -c \
  'cd /app/backend && PYTHONPATH=/app/backend pytest tests/test_isolation.py tests/test_langchain_apis.py -q'
./scripts/smoke.sh http://127.0.0.1:3000
```

Multi-turn session proof:

```bash
SESSION=prove-001
curl -sS -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' -H 'X-User-Id: kelly-op' \
  -d "{\"question\":\"What is Watch vs Actionable?\",\"session_id\":\"$SESSION\"}" \
  http://127.0.0.1:3000/api/rag
# then remember Cedar Fork / Route 3, then ask what was remembered — expect both names in answer
```

## Artifacts (local, not committed)

- `/tmp/ws-001-langchain-pytest.txt` — 11 passed
- `/tmp/ws-001-rag-turn1.json` — Watch vs Actionable + `langchain` fingerprint
- `/tmp/ws-001-rag-turn3.json` — Cedar Fork / Route 3 session recall

## Out of scope for 001 (next)

- Full three-tier Compose including **frontend** UI prove → Feature 005 / PROVE_FEATURES Assistant row
- LangSmith tracing screenshots → Feature 002
- LangGraph checkpointer persistence (bonus Feature 002) — 001 keeps classic LangChain session memory for rubric language
