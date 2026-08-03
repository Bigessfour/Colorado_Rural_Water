# Water Saver backend (serverless handlers)

TypeScript Lambda handlers for API, ingestion, alerts, and AI.

## Layout

```
src/
  shared/           auth, CSV parse, ingest commit, Dynamo/memory stores
  handlers/
    health.ts       GET /health
    me.ts           GET /me (JWT)
    admin.ts        GET/POST /admin/tenants; GET /admin/users; POST /admin/users/invite (D1–D3)
    upload-url.ts   POST /uploads/presign (JWT) → S3 PutObject URL
    ingest.ts       POST /ingest (JWT) → parse CSV → DynamoDB
    s3-ingest.ts    S3 ObjectCreated under tenants/{tenantId}/uploads/
    alerts.ts       list / acknowledge / resolve / CSV export (C3–C4)
    meters.ts       GET /meters/{meterId} history (C5)
    agent.ts        conversational AI (stub)
```

Isolation: every handler resolves `tenant_id` from the JWT (or S3 key prefix) and never trusts a client-supplied tenant override for authorization.

## Scripts

```bash
npm install
npm test
npm run typecheck
# from repo root:
npm run backend:bundle   # → infra/terraform/build/api-handlers.zip
```

## Env (Lambda)

| Variable        | Purpose               |
| --------------- | --------------------- |
| `UPLOAD_BUCKET` | Tenant uploads bucket |
| `DATA_TABLE`    | DynamoDB single table |
