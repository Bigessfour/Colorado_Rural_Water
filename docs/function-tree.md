# Water Saver Function Tree (Visual Overview)

**Auto-generated raw data:** [function-inventory.generated.md](./function-inventory.generated.md) (TS scanner — `frontend/src` + `backend/src`; run `npm run inventory`)
**Status overlay:** [action-items.md](./action-items.md)

```mermaid
flowchart TB
    User((Operator / Admin))

    subgraph Spa["Angular SPA"]
        Login["/login\nAuth + MFA challenges"]
        Account["/account\nPassword + TOTP MFA"]
        Dash["/dashboard\nBalance + confidence + alerts"]
        Upload["/upload\nCustomer CSV / Excel"]
        MetersPage["/meters\nInventory CRUD"]
        Sources["/sources\nCRUD + source ingest"]
        Alerts["/alerts\nAck / resolve / CSV / explain"]
        Assistant["/assistant\nAgent chat"]
        Billing["/billing\nMunicipality membership"]
        Admin["/admin\nTenants + invite + billing"]
        Crwa["/crwa\nSanitized roll-up"]
        Review["/review\nKelly guided feedback"]
    end

    subgraph Api["HTTP API JWT"]
        Health["GET /health"]
        Me["GET /me"]
        Presign["POST /uploads/presign"]
        Ingest["POST /ingest"]
        IngestSrc["POST /ingest/sources"]
        SourcesApi["/sources CRUD"]
        Balance["GET /balance\nPUT /thresholds"]
        AlertsApi["GET/POST /alerts\nPOST /alerts/explain"]
        Meters["GET/POST /meters\nGET/PUT/DELETE /meters/{id}"]
        AgentApi["GET/POST /agent"]
        ReviewApi["/review/sessions\nsteps + submit + SES"]
        BillingApi["GET /billing"]
        AdminApi["/admin/*\ntenants users billing rollup"]
    end

    subgraph Shared["Shared domain"]
        Auth["auth + tenant-admin"]
        Csv["csv-parse + excel-parse + source-csv"]
        Loc["meter-location"]
        WB["water-balance"]
        AE["alert-engine + balance-alerts + explain"]
        Bill["billing"]
        AgCtx["agent-context + conversation"]
        Rollup["crwa-rollup"]
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
    Assistant --> AgentApi
    Billing --> BillingApi
    Admin --> AdminApi
    Crwa --> AdminApi
    Review --> ReviewApi

    Ingest --> Csv --> Loc --> Store
    IngestSrc --> Csv --> Store
    S3Ingest --> Csv --> Store
    Balance --> WB --> Store
    AlertsApi --> AE
    AlertsApi --> Store
    AgentApi --> AgCtx --> Store
    ReviewApi --> Store
    AdminApi --> Auth
    AdminApi --> Bill
    AdminApi --> Rollup
    Me --> Auth
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

## AI / agent

```mermaid
flowchart LR
    AgentApi[GET/POST /agent] --> Guard[agent-context isolation + confirm]
    Guard --> Template[templateAgentReply]
    Guard -.-> Bedrock[bedrock optional]
    Explain[POST /alerts/explain] --> ExplainTpl[explainAlertTemplate]
```

See [action-items.md](./action-items.md) for proof status per function.
