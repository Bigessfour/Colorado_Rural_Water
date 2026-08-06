#!/usr/bin/env bash
# Provision Assessment demo + Kelly Cognito users into the live SPA pool.
# Reads passwords from ~/.cursor/secrets (not git). Idempotent where possible.
#
# Usage (from repo root):
#   AWS_PROFILE=codeplatoon ./scripts/provision-demo-users.sh
set -euo pipefail

ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${AWS_PROFILE:-codeplatoon}"
REGION="${AWS_REGION:-us-east-1}"
SECRETS_DIR="${HOME}/.cursor/secrets"
DEMO_SECRET="${SECRETS_DIR}/watersaver-demo-operator-cognito.txt"
KELLY_SECRET="${SECRETS_DIR}/watersaver-kelly-review-cognito.txt"

export AWS_PROFILE="${PROFILE}"
export AWS_REGION="${REGION}"
export AWS_DEFAULT_REGION="${REGION}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
if [[ ${ACCOUNT} != "388691194728" ]]; then
	echo "Refusing: expected account 388691194728, got ${ACCOUNT}" >&2
	exit 1
fi

cd "${ROOT}/infra/terraform"
POOL_ID="$(terraform output -raw cognito_user_pool_id)"
CLIENT_ID="$(terraform output -raw cognito_spa_client_id)"
SPA_URL="$(terraform output -raw spa_url)"
API_URL="$(terraform output -raw api_endpoint)"
cd "${ROOT}"

echo "==> Pool ${POOL_ID}  client ${CLIENT_ID}"
bash "${ROOT}/scripts/ensure-cognito-groups.sh" "${POOL_ID}"

read_secret_field() {
	local file="$1" key="$2"
	awk -F= -v k="${key}" '$1==k {print substr($0, index($0,"=")+1); exit}' "${file}"
}

provision_user() {
	local email="$1"
	local password="$2"
	local tenant="$3"
	shift 3
	local groups=("$@")

	echo "==> Ensuring Cognito user ${email} (tenant=${tenant} groups=${groups[*]})"

	if aws cognito-idp admin-get-user --user-pool-id "${POOL_ID}" --username "${email}" &>/dev/null; then
		echo "    user exists — refreshing password + attributes + groups"
	else
		aws cognito-idp admin-create-user \
			--user-pool-id "${POOL_ID}" \
			--username "${email}" \
			--user-attributes \
			"Name=email,Value=${email}" \
			"Name=email_verified,Value=true" \
			"Name=custom:tenant_id,Value=${tenant}" \
			--message-action SUPPRESS \
			--temporary-password "${password}" \
			>/dev/null
		echo "    created"
	fi

	aws cognito-idp admin-update-user-attributes \
		--user-pool-id "${POOL_ID}" \
		--username "${email}" \
		--user-attributes \
		"Name=email,Value=${email}" \
		"Name=email_verified,Value=true" \
		"Name=custom:tenant_id,Value=${tenant}" \
		>/dev/null

	aws cognito-idp admin-set-user-password \
		--user-pool-id "${POOL_ID}" \
		--username "${email}" \
		--password "${password}" \
		--permanent \
		>/dev/null

	# Remove from all known groups then re-add desired (keeps membership exact)
	for g in operators system_admins crwa_admins; do
		aws cognito-idp admin-remove-user-from-group \
			--user-pool-id "${POOL_ID}" --username "${email}" --group-name "${g}" 2>/dev/null || true
	done
	for g in "${groups[@]}"; do
		aws cognito-idp admin-add-user-to-group \
			--user-pool-id "${POOL_ID}" --username "${email}" --group-name "${g}"
		echo "    group ${g}"
	done
}

write_secret_file() {
	local path="$1"
	local email="$2"
	local password="$3"
	local tenant="$4"
	local groups_csv="$5"
	local note="$6"
	umask 077
	cat >"${path}" <<EOF
email=${email}
user_pool=${POOL_ID}
client_id=${CLIENT_ID}
permanent_password=${password}
tenant_id=${tenant}
groups=${groups_csv}
spa_url=${SPA_URL}
api_endpoint=${API_URL}
created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
note=${note}
EOF
	chmod 600 "${path}"
	echo "==> Updated ${path}"
}

[[ -f ${DEMO_SECRET} ]] || {
	echo "Missing ${DEMO_SECRET}" >&2
	exit 1
}
[[ -f ${KELLY_SECRET} ]] || {
	echo "Missing ${KELLY_SECRET}" >&2
	exit 1
}

DEMO_EMAIL="$(read_secret_field "${DEMO_SECRET}" email)"
DEMO_PASS="$(read_secret_field "${DEMO_SECRET}" permanent_password)"
DEMO_TENANT="$(read_secret_field "${DEMO_SECRET}" tenant_id)"
KELLY_EMAIL="$(read_secret_field "${KELLY_SECRET}" email)"
KELLY_PASS="$(read_secret_field "${KELLY_SECRET}" permanent_password)"
KELLY_TENANT="$(read_secret_field "${KELLY_SECRET}" tenant_id)"

provision_user "${DEMO_EMAIL}" "${DEMO_PASS}" "${DEMO_TENANT:-town-wiley}" operators
provision_user "${KELLY_EMAIL}" "${KELLY_PASS}" "${KELLY_TENANT:-town-wiley}" operators crwa_admins

write_secret_file "${DEMO_SECRET}" "${DEMO_EMAIL}" "${DEMO_PASS}" "${DEMO_TENANT:-town-wiley}" "operators" \
	"Assessment III demo operator — re-provisioned after terraform destroy/re-apply $(date -u +%Y-%m-%d)."
write_secret_file "${KELLY_SECRET}" "${KELLY_EMAIL}" "${KELLY_PASS}" "${KELLY_TENANT:-town-wiley}" "operators,crwa_admins" \
	"Kelly review user — re-provisioned after terraform destroy/re-apply $(date -u +%Y-%m-%d). Share out-of-band."

echo "==> Auth smoke (InitiateAuth USER_PASSWORD_AUTH)"
smoke_auth() {
	local email="$1" pass="$2" label="$3"
	local out
	out="$(aws cognito-idp initiate-auth \
		--auth-flow USER_PASSWORD_AUTH \
		--client-id "${CLIENT_ID}" \
		--auth-parameters "USERNAME=${email},PASSWORD=${pass}" \
		--query 'AuthenticationResult.IdToken' --output text 2>&1)" || {
		echo "FAIL ${label}: ${out}" >&2
		return 1
	}
	if [[ ${out} == None || -z ${out} ]]; then
		echo "FAIL ${label}: no IdToken" >&2
		return 1
	fi
	echo "    OK ${label} (${#out} char id token)"
}
smoke_auth "${DEMO_EMAIL}" "${DEMO_PASS}" "demo.operator"
smoke_auth "${KELLY_EMAIL}" "${KELLY_PASS}" "kelly.review"

echo "==> Done. SPA ${SPA_URL}  API ${API_URL}"
echo "    Deploy SPA if needed: ./scripts/deploy-spa.sh"
