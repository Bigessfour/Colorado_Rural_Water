# Water Saver Function Tree (Visual Overview)

**Auto-generated raw data:** [function-inventory.generated.md](./function-inventory.generated.md) (TS scanner — `frontend/src` + `backend/src`; run `npm run inventory`)
**Status overlay:** [action-items.md](./action-items.md)
**Last scan:** 2026-08-04 — **206** tracked · **182** with proof · **24** without (scanner)

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
  subgraph compose [Compose_8080_Assessment]
    AsstUI["/assistant"]
    RagApi["POST /api/rag"]
    ChatBedrock["ChatBedrock + FAISS"]
    Mem0["Mem0 MemoryClient"]
    AsstUI --> RagApi --> ChatBedrock
    RagApi --> Mem0
  end
  subgraph aws [Cognito_JWT_Product_014]
    AgentApi["GET/POST /agent"]
    Guard["agent-context isolation + confirm"]
    Tools["live agent-tools"]
    KB["Bedrock KB Retrieve filter"]
    Local["local corpus fallback"]
    Converse["Converse Nova + Guardrail"]
    Conv["Dynamo CONV#"]
    AgentApi --> Guard --> Tools
    Guard --> KB
    KB --> Converse
    KB -.-> Local
    Local --> Converse
    Converse --> Conv
  end
```

Assessment Features **001 / 007 / 008** prove Compose LangChain RAG. Feature **014** is the Cognito product path (KB + tools + CONV#).

See [action-items.md](./action-items.md) · [PROVE_FEATURES.md](./PROVE_FEATURES.md) · [evidence/014-cognito-rag-assistant.md](../evidence/014-cognito-rag-assistant.md).
