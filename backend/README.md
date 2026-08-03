# Water Saver backend (serverless handlers)

TypeScript Lambda handlers for API, ingestion, alerts, and AI.

## Layout

```
src/
  shared/           tenant context, auth claims, responses
  handlers/
    health.ts       GET /health
    me.ts           GET /me (authenticated)
    upload-url.ts   POST /uploads/presign (stub)
    ingest.ts       S3 event / process upload (stub)
    alerts.ts       list / acknowledge alerts (stub)
    agent.ts        conversational AI (stub)
  services/         business logic stubs
```

Isolation: every handler must resolve `tenant_id` from the JWT and never accept a client-supplied tenant override for data access.

## Scripts

```bash
npm install
npm run build
npm test
```
