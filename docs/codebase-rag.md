# Codebase RAG (Water Saver)

Local JS RAG over `frontend/`, `backend/`, `infra/`, `docs/`, and agent rules.

## Commands

```bash
npm run rag:setup              # first clone (if needed)
npm run rag:status
npm run rag:index              # full
npm run rag:index:incremental  # end of agent turns
npm run rag:query -- "your question"
```

## MCP

Server id: **`crwa-rag`** (project `.cursor/mcp.json` only — do **not** also enable a global copy)

| Tool              | Use                                              |
| ----------------- | ------------------------------------------------ |
| `search_codebase` | Start of every agent turn — full project context |
| `rag_status`      | Index health                                     |
| `refresh_index`   | End of every agent turn after changes            |

Launcher: absolute Node → `mcp/crwa-rag/server.mjs` (official MCP SDK stdio). Relies on `CRWA_RAG_ROOT`.
Angular CLI MCP: `scripts/angular-mcp.sh` (local `frontend` `@angular/cli`; bare `npx` fails under Cursor’s minimal PATH).

Index cache: `.rag/` (gitignored). Generation stays with the IDE model; RAG only retrieves.
