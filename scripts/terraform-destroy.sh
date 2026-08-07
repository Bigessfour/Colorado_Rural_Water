#!/usr/bin/env bash
# Local Water Saver stack teardown (Assessment III / codeplatoon).
# Usage:
#   ./scripts/terraform-destroy.sh              # dry-run plan -destroy
#   ./scripts/terraform-destroy.sh --destroy    # real destroy (requires CONFIRM=destroy)
set -euo pipefail

ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${AWS_PROFILE:-codeplatoon}"
REGION="${AWS_REGION:-us-east-1}"
TF_DIR="${ROOT}/infra/terraform"
VAR_FILE="${TF_VAR_FILE:-environments/dev.tfvars}"
DO_DESTROY=false

for arg in "$@"; do
	case "${arg}" in
	--destroy) DO_DESTROY=true ;;
	--dry-run) DO_DESTROY=false ;;
	*)
		echo "Unknown arg: ${arg}" >&2
		exit 2
		;;
	esac
done

export AWS_PROFILE="${PROFILE}"
export AWS_REGION="${REGION}"
export AWS_DEFAULT_REGION="${REGION}"

echo "==> Caller identity (${PROFILE})"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [[ ${ACCOUNT} != "388691194728" ]]; then
	echo "Refusing: expected account 388691194728, got ${ACCOUNT}" >&2
	exit 1
fi

cd "${TF_DIR}"
terraform init -input=false
terraform workspace select dev || terraform workspace new dev

if [[ ! -f ${VAR_FILE} ]]; then
	echo "Missing ${TF_DIR}/${VAR_FILE}" >&2
	exit 1
fi

echo "==> Empty managed S3 buckets (force_destroy backup)"
if [[ ${DO_DESTROY} == true ]]; then
	AWS_PROFILE="${PROFILE}" AWS_REGION="${REGION}" bash "${ROOT}/scripts/empty-water-saver-buckets.sh"
else
	echo "    (skipped on dry-run)"
fi

if [[ ${DO_DESTROY} == false ]]; then
	echo "==> DRY RUN: terraform plan -destroy"
	terraform plan -destroy -var-file="${VAR_FILE}" -no-color -input=false
	echo "==> Dry run complete. Re-run with CONFIRM=destroy ./scripts/terraform-destroy.sh --destroy for real teardown."
	exit 0
fi

if [[ ${CONFIRM:-} != "destroy" ]]; then
	echo "Refusing real destroy: set CONFIRM=destroy" >&2
	exit 1
fi

echo "==> REAL DESTROY starting (SPA/API/Cognito/KB will go down)"
terraform destroy -var-file="${VAR_FILE}" -auto-approve -no-color -input=false

echo "==> Residual scan (Assessment-iii tag + water-saver name prefix)"
bash "${ROOT}/scripts/destroy-residual-scan.sh" || true

echo "==> Destroy finished. Remote state bucket water-saver-tf-state-388691194728 is intentionally retained."
