# Water Saver Function Tree (Visual Overview)

**Auto-generated raw data:** [function-inventory.generated.md](./function-inventory.generated.md) (C# scanner — currently empty for this repo)
**Status overlay:** [action-items.md](./action-items.md)

```mermaid
flowchart TB
    User((Operator / Admin))

    subgraph Spa["Angular SPA"]
        Login["/login\nAuthService Cognito"]
        Dash["/dashboard\nBalance + confidence + alerts"]
        Upload["/upload\nCustomer CSV"]
        Sources["/sources\nCRUD + source ingest"]
        Alerts["/alerts\nAck / resolve / CSV"]
        Admin["/admin\nTenants + invite"]
        Crwa["/crwa\nRoll-up stub"]
    end

    subgraph Api["HTTP API JWT"]
        Health["GET /health"]
        Me["GET /me"]
        Presign["POST /uploads/presign"]
        Ingest["POST /ingest"]
        IngestSrc["POST /ingest/sources"]
        SourcesApi["/sources CRUD"]
        Balance["GET /balance\nPUT /thresholds"]
        AlertsApi["GET/POST /alerts"]
        Meters["GET/PUT /meters/{id}"]
        AdminApi["/admin/*"]
    end

    subgraph Shared["Shared domain"]
        Auth["auth + tenant-admin"]
        Csv["csv-parse + source-csv"]
        Loc["meter-location"]
        WB["water-balance"]
        AE["alert-engine + balance-alerts"]
        Store["dynamo / memory stores"]
    end

    subgraph Async["Async"]
        S3["S3 upload"]
        S3Ingest["s3-ingest handler"]
    end

    User --> Spa
    Login --> Me
    Upload --> Presign
    Upload --> Ingest
    Presign --> S3 --> S3Ingest
    Sources --> SourcesApi
    Sources --> IngestSrc
    Dash --> Balance
    Dash --> AlertsApi
    Alerts --> AlertsApi
    Alerts --> Meters
    Admin --> AdminApi

    Ingest --> Csv --> Loc --> Store
    IngestSrc --> Csv --> Store
    S3Ingest --> Csv --> Store
    Balance --> WB --> Store
    AlertsApi --> AE
    AlertsApi --> Store
    Me --> Auth
    AdminApi --> Auth
    Health -.-> Api
```

## Cross-cutting

```mermaid
flowchart LR
    JWT[Cognito JWT claims] --> Auth[parseAuthFromClaims]
    Auth --> Tenant[requireTenantId]
    Tenant --> AllHandlers[Tenant-scoped handlers]
    AllHandlers --> Dynamo[DATA table PK tenant]
```

## AI / agent (deferred)

```mermaid
flowchart LR
    AgentStub[agent.ts stub\nbundled only] -.-> EpicE[Epic E Bedrock]
```

See [action-items.md](./action-items.md) for proof status per function.
