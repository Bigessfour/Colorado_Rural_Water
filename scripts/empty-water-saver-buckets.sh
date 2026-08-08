#!/usr/bin/env bash
# Empty Water Saver versioned S3 buckets before terraform destroy (belt + suspenders).
# Does NOT touch the remote state bucket water-saver-tf-state-388691194728.
set -euo pipefail

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
PROFILE="${AWS_PROFILE:-}"

# Empty AWS_PROFILE breaks the AWS CLI ("config profile () could not be found").
# CI uses env credentials only; local runs pass AWS_PROFILE=codeplatoon.
if [[ -n ${PROFILE} ]]; then
	export AWS_PROFILE="${PROFILE}"
else
	unset AWS_PROFILE
fi

aws_cli() {
	if [[ -n ${PROFILE} ]]; then
		aws --profile "${PROFILE}" --region "${REGION}" "$@"
	else
		aws --region "${REGION}" "$@"
	fi
}

ACCOUNT="$(aws_cli sts get-caller-identity --query Account --output text)"
if [[ ${ACCOUNT} != "388691194728" ]]; then
	echo "Refusing: expected account 388691194728, got ${ACCOUNT}" >&2
	exit 1
fi

PREFIX="${PROJECT_NAME:-water-saver}-${ENVIRONMENT:-dev}"
BUCKETS=(
	"${PREFIX}-uploads-${ACCOUNT}"
	"${PREFIX}-spa-${ACCOUNT}"
	"${PREFIX}-knowledge-${ACCOUNT}"
)

empty_versions() {
	local bucket="$1"
	local kind="$2" # Versions | DeleteMarkers
	python3 - "$bucket" "$kind" "$REGION" "$PROFILE" <<'PY'
import json, subprocess, sys
bucket, kind, region, profile = sys.argv[1:5]
base = ["aws", "--region", region]
if profile:
    base[1:1] = ["--profile", profile]
try:
    raw = subprocess.check_output(base + ["s3api", "list-object-versions", "--bucket", bucket, "--output", "json"], text=True)
except subprocess.CalledProcessError:
    sys.exit(0)
data = json.loads(raw)
objs = [{"Key": o["Key"], "VersionId": o["VersionId"]} for o in data.get(kind) or [] if "Key" in o and "VersionId" in o]
while objs:
    chunk, objs = objs[:1000], objs[1000:]
    subprocess.check_call(base + [
        "s3api", "delete-objects", "--bucket", bucket,
        "--delete", json.dumps({"Objects": chunk, "Quiet": True}),
    ])
PY
}

for b in "${BUCKETS[@]}"; do
	if ! aws_cli s3api head-bucket --bucket "${b}" 2>/dev/null; then
		echo "==> skip missing bucket ${b}"
		continue
	fi
	echo "==> emptying s3://${b}"
	aws_cli s3 rm "s3://${b}" --recursive 2>/dev/null || true
	empty_versions "${b}" "Versions"
	empty_versions "${b}" "DeleteMarkers"
done

echo "==> bucket empty complete (state bucket intentionally untouched)"
