# Feature 011: Meter Map (Product)

**Rubric:** optional product polish (not Assessment III required %)
**Status:** planned (deferred until Features 001–010 smoke green)
**Product:** Water Saver (Colorado Rural Water)
**Isolation:** `tenant_id` on all AI / data paths
**Depends on:** Meter list/API, tenant isolation, existing Meters UI

## User value

| Actor                | Value                                                    |
| -------------------- | -------------------------------------------------------- |
| Rural water operator | See where meters sit; spot geographic patterns in alerts |
| CRWA / pilot demo    | Visual story: “here’s your system on a map”              |
| Assessor (optional)  | Bonus polish after rubric is green                       |

## Acceptance criteria (official)

- [ ] Display tenant-scoped meters on a Leaflet + OSM map using optional lat/lng
- [ ] Integrate with Angular 22 + PrimeNG 22 (chrome only; map is Leaflet)
- [ ] Marker popups with meter identity + key status; graceful skip when coords missing
- [ ] Preserve multi-tenant isolation; no map API keys in git

## Non-goals (MVP)

- Live geocoding, routing, clustering, offline maps
- Blocking Features 001–010
- Rewriting the Meters table (map complements it)

## Primary paths (when implementing)

- `frontend/src/app/pages/meters/` (+ `MeterMapComponent`)
- `backend/src/shared/meter-location.ts` (add `latitude` / `longitude`)
- `docs/meter-map.md`

## Locked MVP decisions

| Topic            | Choice                                                  |
| ---------------- | ------------------------------------------------------- |
| Empty map center | Colorado centroid 39.0, −105.5 zoom 7                   |
| Coord entry      | Add/edit form fields + seed ≥5 CO pins (+1 without)     |
| UI entry         | `/meters` SelectButton: Table \| Map \| Both            |
| Popup            | meterId, serviceAddress, readingCount                   |
| Stretch          | Alert colors, clustering, alert deep-link, CSV geo cols |

## Demo evidence

Deferred — see [`plan.md`](plan.md). Do not block Assessment III closeout on this feature.
