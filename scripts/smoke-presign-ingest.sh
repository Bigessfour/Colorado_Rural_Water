#!/usr/bin/env bash
# Ops dry-run: Cognito JWT → POST /uploads/presign → S3 PutObject → wait for s3-ingest.
# Sync Upload UI (mapper + dryRun) stays on POST /ingest; use this when mapping is already saved
# or for bulk drops under tenants/{tenantId}/uploads/.
#
# Usage:
#   DEMO_USER='...' DEMO_PASS='...' ./scripts/smoke-presign-ingest.sh [path-to-csv-or-xlsx]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT="${COGNITO_CLIENT_ID:-3lbh20n9383nhraaioaa5is5an}"
API="${API_BASE:-https://uqujnhmk31.execute-api.us-east-1.amazonaws.com}"
PROFILE="${AWS_PROFILE:-codeplatoon}"
REGION="${AWS_REGION:-us-east-1}"
FILE="${1:-${ROOT}/sample-data/messy-readings-july.csv}"
USER="${DEMO_USER:?Set DEMO_USER}"
PASS="${DEMO_PASS:?Set DEMO_PASS}"

if [[ ! -f $FILE ]]; then
	echo "File not found: $FILE" >&2
	exit 1
fi

BASENAME="$(basename "$FILE")"
CONTENT_TYPE="text/csv"
if [[ $BASENAME =~ \.xlsx?$ ]]; then
	CONTENT_TYPE="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
fi

echo "== Cognito auth =="
TOKEN=$(aws cognito-idp initiate-auth \
	--profile "$PROFILE" --region "$REGION" \
	--client-id "$CLIENT" \
	--auth-flow USER_PASSWORD_AUTH \
	--auth-parameters USERNAME="${USER}",PASSWORD="${PASS}" \
	--query 'AuthenticationResult.IdToken' --output text)

echo "== POST /uploads/presign =="
PRESIGN=$(curl -sS -X POST "${API}/uploads/presign" \
	-H "authorization: Bearer ${TOKEN}" \
	-H "content-type: application/json" \
	-d "$(
		python3 - <<PY
import json
print(json.dumps({"filename": "${BASENAME}", "contentType": "${CONTENT_TYPE}", "kind": "customer"}))
PY
	)")
echo "$PRESIGN" | python3 -m json.tool

UPLOAD_URL=$(echo "$PRESIGN" | python3 -c "import json,sys; print(json.load(sys.stdin)['uploadUrl'])")
KEY=$(echo "$PRESIGN" | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])")
BUCKET=$(echo "$PRESIGN" | python3 -c "import json,sys; print(json.load(sys.stdin)['bucket'])")

echo "== PutObject ${BUCKET}/${KEY} =="
curl -sS -X PUT "$UPLOAD_URL" \
	-H "Content-Type: ${CONTENT_TYPE}" \
	--data-binary @"${FILE}" \
	-o /tmp/water-saver-presign-put.out \
	-w "HTTP %{http_code}\n"

echo "== Wait briefly for s3-ingest Lambda =="
sleep 8

echo "== Recent s3-ingest log events (if log group exists) =="
LOG_GROUP=$(aws logs describe-log-groups --profile "$PROFILE" --region "$REGION" \
	--log-group-name-prefix "/aws/lambda/" \
	--query "logGroups[?contains(logGroupName, 's3') || contains(logGroupName, 'ingest')].logGroupName" \
	--output text 2>/dev/null | tr '\t' '\n' | head -5 || true)
if [[ -n ${LOG_GROUP:-} ]]; then
	echo "Log groups (sample):"
	echo "$LOG_GROUP"
else
	echo "(No matching log groups listed — check CloudWatch for water-saver-*-s3-ingest manually.)"
fi

echo
echo "Done. Object key: ${KEY}"
echo "Sync path (mapper UI): POST /ingest with csvText/excelBase64"
echo "S3 path (this script): mapping already saved or auto-guessed by s3-ingest"
