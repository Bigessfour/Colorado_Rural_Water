#!/usr/bin/env bash
# Sync curated knowledge → S3 for Bedrock Knowledge Base ingest (Feature 014).
# Usage:
#   AWS_PROFILE=codeplatoon ./scripts/knowledge-sync.sh [bucket] [region]
# Defaults: bucket from TF output or WATER_SAVER_KNOWLEDGE_BUCKET; region us-east-1
set -euo pipefail

ROOT="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROFILE="${AWS_PROFILE:-codeplatoon}"
REGION="${2:-${AWS_REGION:-us-east-1}}"
BUCKET="${1:-${WATER_SAVER_KNOWLEDGE_BUCKET:-}}"

if [[ -z $BUCKET ]]; then
	BUCKET="$(aws --profile "$PROFILE" --region "$REGION" s3api list-buckets \
		--query "Buckets[?contains(Name, 'water-saver') && contains(Name, 'knowledge')].Name | [0]" \
		--output text 2>/dev/null || true)"
fi

if [[ -z $BUCKET || $BUCKET == "None" ]]; then
	echo "knowledge-sync: set WATER_SAVER_KNOWLEDGE_BUCKET or pass bucket as arg" >&2
	exit 1
fi

SRC="$ROOT/backend/knowledge"
echo "knowledge-sync: $SRC → s3://$BUCKET/knowledge/shared/ (profile=$PROFILE region=$REGION)"

aws --profile "$PROFILE" --region "$REGION" s3 sync "$SRC/" "s3://$BUCKET/knowledge/shared/" \
	--exclude "*.pyc" \
	--exclude "__pycache__/*" \
	--exclude "eval-set.json" \
	--exclude "*/README.md" \
	--exclude "README.md" \
	--delete

echo "knowledge-sync: done. Start a Bedrock KB data-source sync after large corpus changes."
echo "  Per-tenant SOPs: s3://$BUCKET/knowledge/tenants/{tenant_id}/ + matching *.metadata.json (tenant_id attribute)."
