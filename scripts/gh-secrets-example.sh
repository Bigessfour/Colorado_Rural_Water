#!/usr/bin/env bash
# Document GitHub Actions / AWS secret *names* only — never commit values.
cat <<'EOF'
# GitHub repository Secrets (Settings → Secrets and variables → Actions)

AWS_ACCESS_KEY_ID          # codeplatoon IAM user/key for CI (or OIDC role later)
AWS_SECRET_ACCESS_KEY
MEM0_API_KEY               # optional Mem0 cloud
LANGCHAIN_API_KEY          # LangSmith
RAG_API_KEY                # optional shared gate for Compose /api/*

# GitHub Variables (optional)
AWS_REGION=us-east-1
ECR_REPO_PREFIX=water-saver
LANGCHAIN_PROJECT=water-saver-assessment-iii

# AWS Secrets Manager (Terraform module.security creates stub)
# Secret name pattern: water-saver-dev-ai-runtime
# Put JSON keys: MEM0_API_KEY, LANGCHAIN_API_KEY — never in git.

# Local
cp .env.example .env
# fill values; keep .env and .env.secrets gitignored
EOF
