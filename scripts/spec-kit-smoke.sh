#!/usr/bin/env bash
# Quick Spec Kit health check — run from repo root or via npm run spec-kit:smoke
set -euo pipefail

ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
	echo "spec-kit-smoke: $*" >&2
	exit 1
}

echo "spec-kit-smoke: checking Spec Kit setup..."

command -v specify >/dev/null 2>&1 || fail "specify CLI not on PATH"

if ! specify integration status >/dev/null 2>&1; then
	fail "specify integration status failed"
fi

if ! specify extension list >/dev/null 2>&1; then
	fail "specify extension list failed"
fi

for pattern in \
	".specify/feature.json" \
	".specify/project.json" \
	".specify/extensions.yml" \
	".specify/extensions/agent-context/agent-context-config.yml" \
	".specify/extensions/git/git-config.yml"; do
	[[ -f $pattern ]] || fail "missing $pattern"
done

FEATURE_DIR="$(
	python3 - <<'PY'
import json
import sys
from pathlib import Path

root = Path(".")
fj = root / ".specify" / "feature.json"
if not fj.is_file():
    sys.exit(1)
data = json.loads(fj.read_text(encoding="utf-8"))
fd = data.get("feature_directory", "")
if not fd:
    sys.exit(1)
print(fd)
PY
)" || fail "feature.json missing feature_directory"

[[ -d $FEATURE_DIR ]] || fail "feature directory not found: $FEATURE_DIR"
[[ -f "$FEATURE_DIR/plan.md" ]] || fail "plan.md missing under $FEATURE_DIR"

if grep -qi '^\*\*Status:\*\*.*CLOSED' "$FEATURE_DIR/plan.md" 2>/dev/null; then
	echo "spec-kit-smoke: warning: active plan.md is marked CLOSED ($FEATURE_DIR)" >&2
	echo "spec-kit-smoke:   update .specify/feature.json before starting new SDD work" >&2
fi

PATHS_JSON="$(bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only 2>/dev/null)" ||
	fail "check-prerequisites.sh --paths-only failed"

PATHS_JSON="$PATHS_JSON" python3 - <<'PY'
import json
import os
import sys

raw = os.environ.get("PATHS_JSON", "")
if not raw.strip():
    sys.exit("empty prerequisites JSON")
data = json.loads(raw)
required = ("REPO_ROOT", "BRANCH", "FEATURE_DIR", "FEATURE_SPEC", "IMPL_PLAN")
for key in required:
    if not data.get(key):
        sys.exit(f"missing {key} in prerequisites JSON")
PY

while IFS= read -r script; do
	[[ -x $script ]] || fail "not executable: $script"
done < <(
	find .specify/scripts/bash .specify/extensions/*/scripts/bash -name '*.sh' 2>/dev/null | sort
)

for marker_file in AGENTS.md agent.md .cursor/rules/specify-rules.mdc; do
	[[ -f $marker_file ]] || fail "missing $marker_file"
	grep -q '<!-- SPECKIT START -->' "$marker_file" || fail "SPECKIT block missing in $marker_file"
done

echo "spec-kit-smoke: OK (feature_directory=$FEATURE_DIR)"
