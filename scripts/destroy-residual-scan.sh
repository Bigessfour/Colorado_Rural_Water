#!/usr/bin/env bash
# Post-destroy residual scan for Water Saver (codeplatoon / Assessment-iii).
# Exits 1 if unexpected leftovers found (state bucket is allowed).
set -euo pipefail

REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
PROFILE="${AWS_PROFILE:-}"

aws_cli() {
	if [[ -n ${PROFILE} ]]; then
		aws --profile "${PROFILE}" --region "${REGION}" "$@"
	else
		aws --region "${REGION}" "$@"
	fi
}

ACCOUNT="$(aws_cli sts get-caller-identity --query Account --output text)"
PREFIX="${PROJECT_NAME:-water-saver}-${ENVIRONMENT:-dev}"
STATE_BUCKET="water-saver-tf-state-${ACCOUNT}"
FOUND=0

echo "==> Residual scan account=${ACCOUNT} region=${REGION} prefix=${PREFIX}"

# S3 application buckets
for b in "${PREFIX}-uploads-${ACCOUNT}" "${PREFIX}-spa-${ACCOUNT}" "${PREFIX}-knowledge-${ACCOUNT}"; do
	if aws_cli s3api head-bucket --bucket "${b}" 2>/dev/null; then
		echo "RESIDUAL S3 bucket: ${b}"
		FOUND=1
	fi
done

# DynamoDB
if aws_cli dynamodb describe-table --table-name "${PREFIX}-data" &>/dev/null; then
	echo "RESIDUAL DynamoDB table: ${PREFIX}-data"
	FOUND=1
fi

# Cognito pools named like water-saver
POOLS="$(aws_cli cognito-idp list-user-pools --max-results 20 \
	--query "UserPools[?contains(Name, 'water-saver')].Id" --output text 2>/dev/null || true)"
if [[ -n ${POOLS} && ${POOLS} != None ]]; then
	echo "RESIDUAL Cognito user pool(s): ${POOLS}"
	FOUND=1
fi

# HTTP APIs
APIS="$(aws_cli apigatewayv2 get-apis \
	--query "Items[?contains(Name, 'water-saver')].ApiId" --output text 2>/dev/null || true)"
if [[ -n ${APIS} && ${APIS} != None ]]; then
	echo "RESIDUAL API Gateway HTTP API(s): ${APIS}"
	FOUND=1
fi

# Lambda functions
FUNCS="$(aws_cli lambda list-functions \
	--query "Functions[?starts_with(FunctionName, '${PREFIX}')].FunctionName" --output text 2>/dev/null || true)"
if [[ -n ${FUNCS} && ${FUNCS} != None ]]; then
	echo "RESIDUAL Lambda(s): ${FUNCS}"
	FOUND=1
fi

# CloudFront distributions with water-saver comment
CF="$(aws_cli cloudfront list-distributions \
	--query "DistributionList.Items[?contains(Comment, 'water-saver') && (Status=='Deployed' || Status=='InProgress')].Id" \
	--output text 2>/dev/null || true)"
if [[ -n ${CF} && ${CF} != None ]]; then
	echo "RESIDUAL CloudFront: ${CF}"
	FOUND=1
fi

# Bedrock KB (best-effort)
KBS="$(aws_cli bedrock-agent list-knowledge-bases --max-results 20 \
	--query "knowledgeBaseSummaries[?contains(name, 'water-saver') || contains(name, '${PREFIX}')].knowledgeBaseId" \
	--output text 2>/dev/null || true)"
if [[ -n ${KBS} && ${KBS} != None ]]; then
	echo "RESIDUAL Bedrock KB(s): ${KBS}"
	FOUND=1
fi

# Lambda log groups (auto-created; delete if present)
LOGS="$(aws_cli logs describe-log-groups --log-group-name-prefix "/aws/lambda/${PREFIX}" \
	--query 'logGroups[].logGroupName' --output text 2>/dev/null || true)"
if [[ -n ${LOGS} && ${LOGS} != None ]]; then
	echo "NOTE leftover CloudWatch log groups — deleting: ${LOGS}"
	for lg in ${LOGS}; do
		aws_cli logs delete-log-group --log-group-name "${lg}" 2>/dev/null || true
	done
fi

echo "==> Allowed residual: state bucket ${STATE_BUCKET} (bootstrap, not in stack)"
aws_cli s3api head-bucket --bucket "${STATE_BUCKET}" >/dev/null

if [[ ${FOUND} -ne 0 ]]; then
	echo "==> FAIL: residuals remain"
	exit 1
fi
echo "==> PASS: no Water Saver application residuals detected"
exit 0
