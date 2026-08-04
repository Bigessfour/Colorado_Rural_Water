# Colorado ops knowledge (CDPHE scaffold)

Compose Assistant retrieves markdown/text under `backend/knowledge/` into a FAISS index
(LangChain). Statewide Colorado guidance lives in **`backend/knowledge/colorado-ops/`**.

## Status (2026-08-04)

Curated extracts + **online URL citations** are in place:

| File                                | Online focus                                                                           |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `01-online-sources.md`              | Master URL index                                                                       |
| `02-drinking-water-hub.md`          | https://cdphe.colorado.gov/drinking-water                                              |
| `03-disinfectant-residual.md`       | https://cdphe.colorado.gov/dbps · https://cdphe.colorado.gov/rtcr · Aqua Talk · GW PDF |
| `04-monitoring-plans-mors.md`       | https://cdphe.colorado.gov/monitoringplans · MORs · schedules                          |
| `05-regulation-11-and-operators.md` | Reg 11 index · ORC / CCWP                                                              |

`https://cdphe.colorado.gov/clean-water` is indexed as **secondary** (surface water / discharge) — not the PWS operator primary hub.

## Re-ingest

```bash
docker compose up -d --build backend

curl -sS -X POST http://127.0.0.1:3000/api/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-Id: town-wiley' \
  -H 'X-User-Id: kelly-op' \
  -d '{"path":"/app/backend/knowledge/colorado-ops"}'
```

Assistant answers should include the **live CDPHE URLs** from Context, not only local filenames.

## Isolation

- Shared bootstrap docs: OK for all tenants (general CDPHE / statewide).
- Site-specific permits / SOPs: ingest only under that municipality’s `tenant_id` — never cross-tenant.
