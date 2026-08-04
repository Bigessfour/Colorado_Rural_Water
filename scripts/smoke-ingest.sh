#!/usr/bin/env bash
# Smoke-test POST /ingest with Cognito USER_PASSWORD_AUTH (codeplatoon).
# Usage:
#   DEMO_USER='...' DEMO_PASS='...' ./scripts/smoke-ingest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT="${COGNITO_CLIENT_ID:-3lbh20n9383nhraaioaa5is5an}"
API="${API_BASE:-https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com}"
USER="${DEMO_USER:?Set DEMO_USER}"
PASS="${DEMO_PASS:?Set DEMO_PASS}"
CSV_FILE="${1:-${ROOT}/sample-data/messy-readings-july.csv}"

TOKEN=$(aws cognito-idp initiate-auth \
	--profile "${AWS_PROFILE:-codeplatoon}" --region "${AWS_REGION:-us-east-1}" \
	--client-id "${CLIENT}" \
	--auth-flow USER_PASSWORD_AUTH \
	--auth-parameters USERNAME="${USER}",PASSWORD="${PASS}" \
	--query 'AuthenticationResult.IdToken' --output text)

BODY=$(
	python3 - <<PY
import json
from pathlib import Path
print(json.dumps({"csvText": Path("${CSV_FILE}").read_text(), "dryRun": False}))
PY
)

curl -sS -X POST "${API}/ingest" \
	-H "authorization: Bearer ${TOKEN}" \
	-H "content-type: application/json" \
	-d "${BODY}" | python3 -m json.tool
