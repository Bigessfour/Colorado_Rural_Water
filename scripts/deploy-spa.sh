#!/usr/bin/env bash
# Build Angular SPA and sync to the CloudFront-backed S3 bucket (codeplatoon).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${SPA_AWS_PROFILE:-codeplatoon}"
REGION="${AWS_REGION:-us-east-1}"
DIST_DIR="${ROOT}/frontend/dist/frontend/browser"

export AWS_PROFILE="${PROFILE}"
export AWS_REGION="${REGION}"
export AWS_DEFAULT_PROFILE="${PROFILE}"

echo "==> Caller identity (${PROFILE})"
aws sts get-caller-identity --profile "${PROFILE}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [[ ${ACCOUNT} != "388691194728" ]]; then
	echo "Refusing deploy: expected account 388691194728, got ${ACCOUNT}" >&2
	exit 1
fi

cd "${ROOT}/infra/terraform"
BUCKET="$(terraform output -raw spa_bucket_name)"
DIST_ID="$(terraform output -raw spa_cloudfront_distribution_id)"
SPA_URL="$(terraform output -raw spa_url)"

if [[ -z ${BUCKET} || ${BUCKET} == "null" ]]; then
	echo "spa_bucket_name output empty — apply spa module first" >&2
	exit 1
fi

echo "==> Building frontend (hosted → live API + local PrimeNG license)"
cd "${ROOT}/frontend"
if [[ ! -f src/environments/primeng-license.local.ts ]]; then
	echo "Missing frontend/src/environments/primeng-license.local.ts (gitignored). Copy from primeng-license.local.example.ts" >&2
	exit 1
fi
npx ng build --configuration hosted

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
	echo "Missing ${DIST_DIR}/index.html after build" >&2
	exit 1
fi

AWS=(aws --profile "${PROFILE}" --region "${REGION}")

echo "==> Syncing ${DIST_DIR} → s3://${BUCKET}"
"${AWS[@]}" s3 sync "${DIST_DIR}/" "s3://${BUCKET}/" \
	--delete \
	--cache-control "public,max-age=31536000,immutable" \
	--exclude "index.html" \
	--exclude "*.html"

"${AWS[@]}" s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET}/index.html" \
	--cache-control "public,max-age=0,must-revalidate" \
	--content-type "text/html"

# Sync remaining HTML (if any) without long cache
find "${DIST_DIR}" -name '*.html' ! -name 'index.html' -print0 2>/dev/null |
	while IFS= read -r -d '' f; do
		rel="${f#"${DIST_DIR}/"}"
		"${AWS[@]}" s3 cp "${f}" "s3://${BUCKET}/${rel}" \
			--cache-control "public,max-age=0,must-revalidate" \
			--content-type "text/html"
	done

echo "==> Invalidating CloudFront ${DIST_ID}"
INVALIDATION_ID="$("${AWS[@]}" cloudfront create-invalidation \
	--distribution-id "${DIST_ID}" \
	--paths "/*" \
	--query 'Invalidation.Id' \
	--output text)"

echo "Invalidation: ${INVALIDATION_ID}"
echo "SPA URL: ${SPA_URL}"
echo "Review:  ${SPA_URL}/review"
echo "Done. CloudFront may take 1–3 minutes to finish invalidation."
