#!/usr/bin/env bash
# Smoke-test POST /ingest with Cognito USER_PASSWORD_AUTH.
# Usage:
#   DEMO_USER='...' DEMO_PASS='...' ./scripts/smoke-ingest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POOL="${COGNITO_POOL_ID:-us-east-2_oHpsTZZAN}"
CLIENT="${COGNITO_CLIENT_ID:-5fd9gii0m2aaibpn1j261pmfo9}"
API="${API_BASE:-https://14jxov7h72.execute-api.us-east-2.amazonaws.com}"
USER="${DEMO_USER:?Set DEMO_USER}"
PASS="${DEMO_PASS:?Set DEMO_PASS}"
CSV_FILE="${1:-$ROOT/sample-data/messy-readings-july.csv}"

TOKEN=$(aws cognito-idp initiate-auth \
  --profile "${AWS_PROFILE:-townofwiley}" --region "${AWS_REGION:-us-east-2}" \
  --client-id "$CLIENT" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$USER",PASSWORD="$PASS" \
  --query 'AuthenticationResult.IdToken' --output text)

BODY=$(python3 - <<PY
import json
from pathlib import Path
print(json.dumps({"csvText": Path("$CSV_FILE").read_text(), "dryRun": False}))
PY
)

curl -sS -X POST "$API/ingest" \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d "$BODY" | python3 -m json.tool
