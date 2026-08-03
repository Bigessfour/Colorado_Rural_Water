#!/usr/bin/env bash
# Thin shell entry for MCP (cross-platform users may prefer scripts/rag-mcp.mjs).
# Resolves Node 24 by absolute path so Cursor MCP (minimal PATH) can start.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export CRWA_RAG_ROOT="${CRWA_RAG_ROOT:-$ROOT}"

resolve_node() {
  if [[ -n ${CRWA_RAG_NODE-} && -x ${CRWA_RAG_NODE} ]]; then
    printf '%s\n' "$CRWA_RAG_NODE"
    return 0
  fi
  local candidate
  for candidate in \
    /opt/homebrew/opt/node@24/bin/node \
    /usr/local/opt/node@24/bin/node \
    /opt/homebrew/bin/node \
    /usr/local/bin/node; do
    if [[ -x $candidate ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  return 1
}

NODE_BIN="$(resolve_node)" || {
  echo "[crwa-rag] node not found. Install Node 24 or set CRWA_RAG_NODE to an absolute node binary." >&2
  exit 1
}

exec "$NODE_BIN" "$ROOT/scripts/rag-mcp.mjs"
