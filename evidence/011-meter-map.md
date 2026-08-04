# Evidence — Feature 011 Meter Map

**Date:** 2026-08-04
**Status:** verified (product polish; not Assessment III required %)
**Account:** `388691194728` / `codeplatoon` / `us-east-1`

## What was proved

| Check                                             | Result                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Backend optional `latitude` / `longitude` on LOC# | Unit tests + live `PUT /meters/{id}`                                   |
| Deploy                                            | `water-saver-dev-meters` updated from `api-handlers.zip`               |
| Seed                                              | `scripts/seed-meter-coords.mjs` → 5 Wiley pins + `1099` without coords |
| SPA `/meters` SelectButton Table \| Map \| Both   | Chrome DevTools                                                        |
| Status line                                       | “Plotted 5 of 6 meters (1 missing location)”                           |
| Leaflet + OSM                                     | 5 markers, OSM attribution, popup `1042` / address / readings          |
| Screenshot                                        | [`meters-map-view.png`](./meters-map-view.png)                         |

## How to re-run seed

Use **IdToken** (tenant claim), not AccessToken:

```bash
API_BASE="https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com" \
BEARER_TOKEN="<cognito id token>" \
CREATE_MISSING=1 \
node scripts/seed-meter-coords.mjs
```

## Notes

- No map API keys; OSM public tiles.
- CORS: prove SPA as `http://localhost:4200` (not `127.0.0.1`).
- Full TF apply not required for this prove — meters Lambda code-only update.
