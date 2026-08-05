# Meter map (Feature 011)

Operator-facing Leaflet + OpenStreetMap view of tenant meters on `/meters`.

## What it does

- **Table | Map | Both** toggle (PrimeNG SelectButton) on the Meters page
- Plots meters that have optional WGS84 `latitude` / `longitude`
- Popups: meter ID, service address, reading count
- Meters without coords are skipped (count shown in the status line)
- **Default center:** tenant map center from `GET /me` (`mapCenterLat` / `mapCenterLng` / `mapZoom`), set when CRWA Admin provisions the system. Falls back to Colorado statewide (~39.0, −105.5, zoom 7) when unset
- When pins exist, map still **fitBounds** to the plotted meters
- No map API keys — OSM public tiles + Leaflet only

## Tenant map center (provision)

1. On **Admin → Provision system**, enter **Map town** (e.g. `Wiley, CO`) or leave blank to use display name.
2. SPA Photon-geocodes that town (Colorado bbox) and POSTs `mapTown` + `mapCenterLat/Lng` + `mapZoom` with the tenant create.
3. Operators see that center on empty / no-pin maps after sign-in (`AuthService.mapCenter` from `/me`).

Existing tenants (e.g. `town-wiley`) can be backfilled on the Dynamo `META#profile` item without re-provisioning.

## Set meter pin coordinates (operator-friendly)

1. **Suggest from address** (Add / Edit dialog)
   Uses the service address → Photon (OSM) geocoder → fills lat/lng. Biases toward Colorado when state is missing. Match label is shown so the operator can sanity-check.
2. **Fine-tune pin** (toolbar)
   Select a meter, turn on Fine-tune, then **drag the pin** or **click the map**. Location saves automatically via `PUT /meters/{id}`.
3. **Manual numbers** still work in the lat/lng fields.
4. **API / seed** (dev): `scripts/seed-meter-coords.mjs` with Cognito **IdToken**.

Rural street addresses are often approximate — treat geocode as “get close,” then fine-tune.

## Limits

- No bulk auto-geocode of the whole inventory (rate limits + quality)
- No CSV lat/lng columns yet (good next bulk path)
- Geocode is operator-initiated only (Photon / OSM data; no paid tile/geocode keys in git)
- Service address remains the stable location key; lat/lng are relocatable metadata
- Tile usage follows [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/)

## Related

- Spec: `specs/011-meter-map/`
- CDPHE / ops knowledge: `docs/colorado-ops-knowledge.md`
- Prove: `docs/PROVE_FEATURES.md`
- Evidence: `evidence/011-meter-map.md`
