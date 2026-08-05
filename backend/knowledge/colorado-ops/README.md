# Colorado ops knowledge (CDPHE / state guidance)

Curated extracts for Compose Assistant (`POST /api/rag`) live here as `.md` / `.txt`.
**Always prefer the live CDPHE URLs** listed in each file (and in `01-online-sources.md`).

## Files

| File                                 | Role                                      |
| ------------------------------------ | ----------------------------------------- |
| `00-disclaimer.md`                   | Do not invent dosing; cite sources        |
| `01-online-sources.md`               | Master online URL index                   |
| `02-drinking-water-hub.md`           | https://cdphe.colorado.gov/drinking-water |
| `03-disinfectant-residual.md`        | Residual / GW quick guide + Aqua Talk     |
| `04-monitoring-plans-mors.md`        | Plans, schedules, MORs                    |
| `05-regulation-11-and-operators.md`  | Reg 11 + ORC / CCWP pointers              |
| `06-sampling-basics.md`              | Sampling + schedules pointers             |
| `07-boil-water-and-public-notice.md` | Boil-water / public notice (refuse draft) |
| `08-seasonal-systems.md`             | Seasonal system start-up pointers         |
| `09-contacts-index.md`               | CDPHE / CCWP contacts                     |

Each `.md` has a sibling `*.metadata.json` (`scope=shared`) for Bedrock KB filtering.

## Re-ingest after edits

Knowledge is copied into the Compose backend image at build time. After changing these files:

```bash
# Rebuild so /app/backend/knowledge is current, then ingest:
docker compose up -d --build backend

curl -sS -X POST http://127.0.0.1:3000/api/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' \
  -H 'X-User-Id: kelly-op' \
  -d '{"path":"/app/backend/knowledge/colorado-ops"}'
```

Or ingest shared bootstrap by path `/app/backend/knowledge` (adds chunks to the tenant/shared index per API headers).

## Rules

- Shared statewide guidance only in this folder.
- Site-specific permits / SOPs → tenant-scoped ingest only.
- Answers must include the **online URL** when citing CDPHE material.
- Do not invent chlorine feed rates.
