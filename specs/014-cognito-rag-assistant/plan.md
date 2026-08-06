# Plan — Feature 014: Production Cognito RAG Assistant

**Status:** CLOSED (verified 2026-08-05 — Bedrock KB live; Cognito SPA prove + security sign-off; evidence/014 + evidence/016)

## Approach

1. Spec gate: Pilot scope includes Cognito JWT RAG (Compose FAISS stays Assessment-only).
2. Expand `backend/knowledge/colorado-ops/` + sync to S3 (`knowledge/shared/` + `knowledge/tenants/{id}/`).
3. Terraform Bedrock Knowledge Base + OpenSearch Serverless + IAM Retrieve.
4. Lambda `POST /agent`: Retrieve (filtered) → Converse → Dynamo CONV#; live tools for alerts/usage/column map.
5. SPA sources UI; Guardrails / rate caps / smoke; dual-path docs.

## AWS

Account `388691194728` · profile `codeplatoon` · `us-east-1` · tag `Assessment-iii`.
