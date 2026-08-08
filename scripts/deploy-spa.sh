#!/usr/bin/env bash
# Build Angular SPA and sync to the CloudFront-backed S3 bucket (codeplatoon / CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${AWS_PROFILE:-}"
# CI / GH Actions use configure-aws-credentials env vars; local default is codeplatoon.
if [[ -z ${PROFILE} && -z ${GITHUB_ACTIONS:-} && -z ${AWS_ACCESS_KEY_ID:-} ]]; then
	PROFILE="codeplatoon"
fi
REGION="${AWS_REGION:-us-east-1}"
DIST_DIR="${ROOT}/frontend/dist/frontend/browser"

if [[ -n ${PROFILE} ]]; then
	export AWS_PROFILE="${PROFILE}"
else
	unset AWS_PROFILE
fi
export AWS_REGION="${REGION}"
export AWS_DEFAULT_REGION="${REGION}"

aws_cli() {
	if [[ -n ${AWS_PROFILE:-} ]]; then
		aws --profile "${AWS_PROFILE}" --region "${REGION}" "$@"
	else
		aws --region "${REGION}" "$@"
	fi
}

echo "==> Caller identity (${PROFILE:-env-credentials})"
ACCOUNT="$(aws_cli sts get-caller-identity --query Account --output text)"
if [[ ${ACCOUNT} != "388691194728" ]]; then
	echo "Refusing deploy: expected account 388691194728, got ${ACCOUNT}" >&2
	exit 1
fi

echo "==> Sync hosted environment from Terraform outputs"
bash "${ROOT}/scripts/sync-hosted-environment.sh"

cd "${ROOT}/infra/terraform"
tf_out() {
	if [[ -n ${AWS_PROFILE:-} ]]; then
		terraform "$@"
	else
		env -u AWS_PROFILE terraform "$@"
	fi
}
BUCKET="$(tf_out output -raw spa_bucket_name)"
DIST_ID="$(tf_out output -raw spa_cloudfront_distribution_id)"
SPA_URL="$(tf_out output -raw spa_url)"

if [[ -z ${BUCKET} || ${BUCKET} == "null" ]]; then
	echo "spa_bucket_name output empty — apply spa module first" >&2
	exit 1
fi

echo "==> Building frontend (hosted → terraform-synced API/Cognito + PrimeNG license)"
cd "${ROOT}/frontend"
if [[ -n ${PRIMENG_LICENSE:-} ]]; then
	printf '/** CI secret — do not commit. */\nexport const primeNgLicense = %s;\n' \
		"$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<<"${PRIMENG_LICENSE}")" \
		>src/environments/primeng-license.local.ts
fi
if [[ ! -f src/environments/primeng-license.local.ts ]]; then
	cp src/environments/primeng-license.ts src/environments/primeng-license.local.ts
fi
if [[ ! -f src/environments/environment.hosted.generated.ts ]]; then
	echo "Missing environment.hosted.generated.ts — sync-hosted-environment.sh failed?" >&2
	exit 1
fi
npx ng build --configuration hosted

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
	echo "Missing ${DIST_DIR}/index.html after build" >&2
	exit 1
fi

echo "==> Syncing ${DIST_DIR} → s3://${BUCKET}"
aws_cli s3 sync "${DIST_DIR}/" "s3://${BUCKET}/" \
	--delete \
	--cache-control "public,max-age=31536000,immutable" \
	--exclude "index.html" \
	--exclude "*.html"

aws_cli s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET}/index.html" \
	--cache-control "public,max-age=0,must-revalidate" \
	--content-type "text/html"

find "${DIST_DIR}" -name '*.html' ! -name 'index.html' -print0 2>/dev/null |
	while IFS= read -r -d '' f; do
		rel="${f#"${DIST_DIR}/"}"
		aws_cli s3 cp "${f}" "s3://${BUCKET}/${rel}" \
			--cache-control "public,max-age=0,must-revalidate" \
			--content-type "text/html"
	done

echo "==> Invalidating CloudFront ${DIST_ID}"
INVALIDATION_ID="$(aws_cli cloudfront create-invalidation \
	--distribution-id "${DIST_ID}" \
	--paths "/*" \
	--query 'Invalidation.Id' \
	--output text)"

echo "Invalidation: ${INVALIDATION_ID}"
echo "SPA URL: ${SPA_URL}"
echo "Review:  ${SPA_URL}/review"
echo "Done. CloudFront may take 1–3 minutes to finish invalidation."
