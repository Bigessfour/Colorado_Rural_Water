#!/usr/bin/env bash
# Angular CLI MCP — absolute Node + local @angular/cli (Cursor has a minimal PATH).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="${CRWA_RAG_NODE:-/opt/homebrew/opt/node@24/bin/node}"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node)"
fi
NG_JS="$ROOT/frontend/node_modules/@angular/cli/bin/ng.js"
if [[ ! -f "$NG_JS" ]]; then
  echo "[angular-cli-mcp] missing $NG_JS — run: cd frontend && npm install" >&2
  exit 1
fi
export PATH="/opt/homebrew/opt/node@24/bin:/usr/local/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
export NO_UPDATE_NOTIFIER=1
cd "$ROOT/frontend"
exec "$NODE_BIN" "$NG_JS" mcp "$@"
