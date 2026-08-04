#!/usr/bin/env bash
# Ensure Cognito groups exist. Uses ListGroups/CreateGroup (GetGroup is denied for copilot).
set -euo pipefail
PROFILE="${AWS_PROFILE:-codeplatoon}"
REGION="${AWS_REGION:-us-east-1}"
POOL_ID="${1:-}"

if [[ -z ${POOL_ID} ]]; then
	POOL_ID="$(cd "$(dirname "$0")/../infra/terraform" && terraform output -raw cognito_user_pool_id 2>/dev/null || true)"
fi
if [[ -z ${POOL_ID} ]]; then
	echo "Usage: $0 <user-pool-id>" >&2
	exit 1
fi

ensure_group() {
	local name="$1" desc="$2" prec="$3"
	if aws cognito-idp list-groups --user-pool-id "${POOL_ID}" --profile "${PROFILE}" --region "${REGION}" \
		--query "Groups[?GroupName=='${name}'].GroupName" --output text 2>/dev/null | grep -qx "${name}"; then
		echo "exists: ${name}"
		return 0
	fi
	aws cognito-idp create-group \
		--user-pool-id "${POOL_ID}" \
		--group-name "${name}" \
		--description "${desc}" \
		--precedence "${prec}" \
		--profile "${PROFILE}" \
		--region "${REGION}"
	echo "created: ${name}"
}

ensure_group operators "Municipal operators / clerks" 30
ensure_group system_admins "Utility system admins (invite users within tenant)" 20
ensure_group crwa_admins "CRWA staff — provision tenants, enterprise roll-up" 10
