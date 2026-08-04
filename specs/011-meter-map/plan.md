# Plan — Feature 011: Meter Map

**Status:** verified (MVP shipped).

## Approach (done)

1. Spec-Kit scaffold while Assessment III CI/IaC finished.
2. Extended `MeterLocation` with optional WGS84; Dynamo put/get; Leaflet on Meters page.
3. Seed script + browser prove; docs in `docs/meter-map.md`.

## Dependencies

- Existing `GET /meters` JWT tenant isolation
- PrimeNG SelectButton / Card chrome (MCP-checked)
- No paid tile keys
