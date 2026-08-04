#!/usr/bin/env bash
# Scaffold local Assessment III env files (no secrets committed to git).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env ]]; then
	cp .env.example .env
	echo "Created .env from .env.example — fill Mem0/LangSmith/AWS as needed."
else
	echo ".env already exists — left unchanged."
fi

# Ensure Compose has a local DB password without storing one in tracked files.
if ! grep -Eq '^POSTGRES_PASSWORD=.+' .env; then
	local_pw="$(openssl rand -hex 12)"
	if grep -q '^POSTGRES_PASSWORD=' .env; then
		# portable in-place edit
		tmp="$(mktemp)"
		sed "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${local_pw}/" .env >"${tmp}"
		mv "${tmp}" .env
	else
		printf '\nPOSTGRES_PASSWORD=%s\n' "${local_pw}" >>.env
	fi
	echo "Wrote a random POSTGRES_PASSWORD into .env (gitignored)."
fi

if [[ ! -f .env.secrets ]]; then
	cat >.env.secrets <<'EOF'
# Local-only secrets (gitignored). Never commit.
# MEM0_API_KEY=
# LANGCHAIN_API_KEY=
# RAG_API_KEY=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
EOF
	echo "Created .env.secrets template."
else
	echo ".env.secrets already exists — left unchanged."
fi

mkdir -p evidence
echo "Next: docker compose up --build && ./scripts/smoke.sh"
echo "AWS: aws sts get-caller-identity --profile codeplatoon"
