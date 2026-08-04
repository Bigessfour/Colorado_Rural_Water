# Plan — Feature 011: Meter Map

**Status:** planned / deferred — implement after 001–010 smoke.

## Approach

1. Scaffold Spec-Kit only (this folder) while Assessment III CI/IaC finishes.
2. When green-lit: extend `MeterLocation` with optional WGS84; Dynamo put/get; Leaflet component on Meters page.
3. Full design: Cursor plan `feature_011_meter_map` + draft in conversation (AC-1…AC-11).

## Dependencies

- Existing `GET /meters` JWT tenant isolation
- PrimeNG MCP for SelectButton/Card chrome
- No paid tile keys
