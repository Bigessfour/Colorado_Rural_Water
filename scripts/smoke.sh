#!/usr/bin/env bash
# Smoke: hard health + ready (+ optional frontend). RAG is opt-in (avoids Bedrock flake).
#
# Usage:
#   ./scripts/smoke.sh [BASE_URL]
#   SMOKE_REQUIRE_RAG=1 ./scripts/smoke.sh          # also POST /api/rag — expect HTTP 200
#   SMOKE_REQUIRE_AGENT=1 SMOKE_ID_TOKEN=… ./scripts/smoke.sh https://…execute-api…
#   SMOKE_FRONTEND_URL=http://127.0.0.1:8080 ./scripts/smoke.sh
#
# Full RAG eval set (11 grounding/refusal cases against /agent):
#   SMOKE_ID_TOKEN=… node scripts/agent-eval.mjs [BASE_URL]
#
# Env:
#   SMOKE_TENANT_ID / SMOKE_USER_ID — Compose RAG headers when required
#   SMOKE_ID_TOKEN — Cognito JWT for Feature 014 POST /agent (API GW)
#   SMOKE_WAIT_SEC — max seconds to wait for health/ready (default 90)
set -euo pipefail

BASE="${1:-http://127.0.0.1:3000}"
TENANT="${SMOKE_TENANT_ID:-town-wiley}"
USER="${SMOKE_USER_ID:-smoke-user}"
WAIT_SEC="${SMOKE_WAIT_SEC:-90}"
REQUIRE_RAG="${SMOKE_REQUIRE_RAG:-0}"
REQUIRE_AGENT="${SMOKE_REQUIRE_AGENT:-0}"
ID_TOKEN="${SMOKE_ID_TOKEN:-}"
FRONTEND_URL="${SMOKE_FRONTEND_URL:-}"

wait_http() {
	local url="$1"
	local label="$2"
	local deadline=$((SECONDS + WAIT_SEC))
	local code=""
	echo "== wait ${label}: ${url} (≤${WAIT_SEC}s) =="
	while ((SECONDS < deadline)); do
		code=$(curl -s -o /tmp/ws-wait-body.json -w "%{http_code}" "$url" || true)
		if [[ $code == "200" ]]; then
			cat /tmp/ws-wait-body.json
			echo
			return 0
		fi
		sleep 2
	done
	echo "TIMEOUT waiting for ${label} (last HTTP ${code:-none})" >&2
	[[ -f /tmp/ws-wait-body.json ]] && cat /tmp/ws-wait-body.json >&2 || true
	return 1
}

echo "== GET ${BASE}/health =="
wait_http "${BASE}/health" "health"
grep -q '"status"' /tmp/ws-wait-body.json

# /ready exists on the Compose spine only; API GW (Feature 014) serves /health alone.
READY_CODE=$(curl -s -o /tmp/ws-ready-probe.json -w "%{http_code}" "${BASE}/ready" || true)
if [[ ${READY_CODE} == "404" ]]; then
	echo "== ${BASE}/ready not served (API GW path) — skipping ready gate =="
else
	echo "== GET ${BASE}/ready =="
	wait_http "${BASE}/ready" "ready"
	python3 - <<'PY'
import json
d = json.load(open("/tmp/ws-wait-body.json"))
assert d.get("status") == "ready", d
PY
fi

if [[ -n ${FRONTEND_URL} ]]; then
	echo "== GET frontend ${FRONTEND_URL} =="
	wait_http "${FRONTEND_URL}" "frontend"
fi

if [[ ${REQUIRE_RAG} == "1" || ${REQUIRE_RAG} == "true" ]]; then
	echo "== POST ${BASE}/api/rag (SMOKE_REQUIRE_RAG=1 — expect 200) =="
	CODE=$(curl -s -o /tmp/ws-rag.json -w "%{http_code}" \
		-X POST "${BASE}/api/rag" \
		-H "content-type: application/json" \
		-H "X-Tenant-Id: ${TENANT}" \
		-H "X-User-Id: ${USER}" \
		-d "{\"question\":\"What is Watch vs Actionable?\",\"tenant_id\":\"${TENANT}\",\"user_id\":\"${USER}\",\"session_id\":\"smoke\"}" || true)
	echo "HTTP ${CODE}"
	cat /tmp/ws-rag.json || true
	if [[ ${CODE} != "200" ]]; then
		echo "RAG required but got HTTP ${CODE} (need AWS/Bedrock creds in the container)" >&2
		exit 1
	fi
	grep -q '"answer"\|"tenant_id"' /tmp/ws-rag.json
else
	echo "== Compose RAG skipped (set SMOKE_REQUIRE_RAG=1 for live Bedrock prove) =="
fi

if [[ ${REQUIRE_AGENT} == "1" || ${REQUIRE_AGENT} == "true" ]]; then
	if [[ -z ${ID_TOKEN} ]]; then
		echo "SMOKE_REQUIRE_AGENT=1 needs SMOKE_ID_TOKEN (Cognito JWT)" >&2
		exit 1
	fi
	echo "== POST ${BASE}/agent (Feature 014 Cognito RAG — expect 200) =="
	CODE=$(curl -s -o /tmp/ws-agent.json -w "%{http_code}" \
		-X POST "${BASE}/agent" \
		-H "content-type: application/json" \
		-H "authorization: Bearer ${ID_TOKEN}" \
		-d '{"message":"What is Watch vs Actionable for our meters?"}' || true)
	echo "HTTP ${CODE}"
	cat /tmp/ws-agent.json || true
	if [[ ${CODE} != "200" ]]; then
		echo "Agent RAG required but got HTTP ${CODE}" >&2
		exit 1
	fi
	grep -q '"reply"' /tmp/ws-agent.json
else
	echo "== Cognito /agent skipped (set SMOKE_REQUIRE_AGENT=1 + SMOKE_ID_TOKEN) =="
fi

echo "smoke ok"
