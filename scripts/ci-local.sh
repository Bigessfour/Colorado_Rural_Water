#!/usr/bin/env bash
# Mirror .github/workflows/ci.yml locally — faster fail loop than push → Actions.
# Usage:
#   ./scripts/ci-local.sh           # all jobs (compose rebuild is the slow one)
#   ./scripts/ci-local.sh --fast    # skip docker compose build/up (tests + config only)
#   ./scripts/ci-local.sh --compose # compose build + health/smoke only
#
# Full GH Actions parity still needs a push (or `brew install act` + act -W …).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

MODE="${1:-all}"
case "${MODE}" in
--fast | fast) MODE=fast ;;
--compose | compose) MODE=compose ;;
--all | all | "") MODE=all ;;
-h | --help)
	sed -n '2,10p' "$0"
	exit 0
	;;
esac

run_backend_node() {
	echo "== backend node tests =="
	(cd backend && (npm ci || npm install) && npm test)
}

run_pytest() {
	echo "== pytest (RAG isolation) =="
	# Match ci.yml setup-python 3.11 (host 3.14 breaks psycopg2-binary wheels)
	local py
	if command -v python3.11 >/dev/null 2>&1; then
		py=python3.11
	else
		py=python3
		echo "WARN: python3.11 not found — using ${py} (may fail on psycopg2)"
	fi
	if [[ ! -d .venv-ci ]]; then
		"${py}" -m venv .venv-ci
	fi
	# shellcheck disable=SC1091
	source .venv-ci/bin/activate
	pip install -q -U pip
	pip install -q -r backend/requirements.txt
	(cd backend && PYTHONPATH=. pytest tests/ -q --tb=short)
	deactivate || true
}

run_compose() {
	echo "== docker compose config =="
	docker compose config --quiet
	echo "== docker compose build =="
	docker compose build
	echo "== docker compose up --wait =="
	# Prefer native health wait; fall back to plain up if older compose
	if ! docker compose up -d --wait --wait-timeout 120; then
		echo "(compose --wait unsupported or timed out — up -d + smoke waits)"
		docker compose up -d
	fi
	echo "== smoke (health + ready + frontend; RAG optional) =="
	SMOKE_FRONTEND_URL="${SMOKE_FRONTEND_URL:-http://127.0.0.1:8080}" \
		./scripts/smoke.sh http://127.0.0.1:3000
	echo "== compose smoke ok (left stack running; docker compose down -v to tear down) =="
}

echo "ci-local mode=${MODE} (mirrors ci.yml)"
case "${MODE}" in
fast)
	run_backend_node
	run_pytest
	docker compose config --quiet
	bash scripts/spec-kit-smoke.sh
	echo "OK — fast path green (skipped compose build/up)"
	;;
compose)
	run_compose
	;;
all)
	run_backend_node
	run_pytest
	run_compose
	echo "OK — full local CI green"
	;;
esac
