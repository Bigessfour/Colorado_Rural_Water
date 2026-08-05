# Assessment III — Demo diagrams

Paste-ready Mermaid for the grading sheet + AWS product talk-track. Sources live beside this file as `01`–`08` `.mmd` files.

**Suggested live order:** 1 → 2 → 3 → 4 → 5 → 6 → close with 7. Show 8 once when you hit isolation.

| #   | Rubric / topic                 | Source                                                                   |
| --- | ------------------------------ | ------------------------------------------------------------------------ |
| 1   | AWS product flow               | [`01-aws-product-flow.mmd`](./01-aws-product-flow.mmd)                   |
| 2   | GitHub Actions + Compose (30%) | [`02-github-actions-compose.mmd`](./02-github-actions-compose.mmd)       |
| 3   | LangChain + Mem0 RAG (25%)     | [`03-langchain-mem0-rag.mmd`](./03-langchain-mem0-rag.mmd)               |
| 4   | LangGraph / Agent / LangSmith  | [`04-langgraph-agent-langsmith.mmd`](./04-langgraph-agent-langsmith.mmd) |
| 5   | Integrations + UI (15%)        | [`05-integrations-ui.mmd`](./05-integrations-ui.mmd)                     |
| 6   | Terraform (10%)                | [`06-terraform.mmd`](./06-terraform.mmd)                                 |
| 7   | Product happy path             | [`07-product-happy-path.mmd`](./07-product-happy-path.mmd)               |
| 8   | Tenant isolation               | [`08-tenant-isolation.mmd`](./08-tenant-isolation.mmd)                   |

Related (older / alternate): [`assessment-iii-system-architecture.mmd`](./assessment-iii-system-architecture.mmd), [`assessment-iii-data-flow.mmd`](./assessment-iii-data-flow.mmd).

---

## 1. AWS Product Flow (main architecture)

```mermaid
flowchart TB
  subgraph Client["Operator Browser"]
    SPA[Angular + PrimeNG SPA<br/>CloudFront duqk1pqvmrsuh]
  end

  subgraph Edge["Edge / Auth"]
    COG[Amazon Cognito<br/>email + password<br/>JWT with custom:tenant_id]
  end

  subgraph API["API Layer"]
    APIGW[API Gateway HTTP API<br/>JWT authorizer]
  end

  subgraph Compute["Serverless Compute"]
    L1[Lambda: ingest / upload]
    L2[Lambda: alerts / balance]
    L3[Lambda: meters / sources]
    L4[Lambda: agent / explain]
    L5[Lambda: review / admin / reports]
  end

  subgraph Data["Data and Storage"]
    S3[S3 Uploads<br/>tenant-scoped keys]
    DDB[(DynamoDB<br/>water-saver-dev-data)]
  end

  subgraph AI["AI"]
    BR[Amazon Bedrock<br/>Nova Lite + Titan Embed]
  end

  SPA -->|1. Sign-in| COG
  SPA -->|2. Bearer JWT| APIGW
  APIGW --> L1
  APIGW --> L2
  APIGW --> L3
  APIGW --> L4
  APIGW --> L5
  L1 --> S3
  L1 --> DDB
  L2 --> DDB
  L3 --> DDB
  L4 --> DDB
  L5 --> DDB
  L4 --> BR

  style COG fill:#ff9900,color:#000
  style APIGW fill:#ff9900,color:#000
  style BR fill:#ff9900,color:#000
  style DDB fill:#3b48cc,color:#fff
  style S3 fill:#3b48cc,color:#fff
```

---

## 2. GitHub Actions + Docker Compose (30%)

```mermaid
flowchart LR
  subgraph Dev["Developer"]
    Push[git push / PR]
  end

  subgraph GHA["GitHub Actions"]
    CI[ci.yml<br/>pytest + compose build]
    TF[terraform.yml<br/>plan on PR / apply on main]
    DEST[destroy.yml<br/>workflow_dispatch]
  end

  subgraph Local["Local three-tier Compose"]
    FE[frontend :8080]
    BE[backend :3000]
    RAG[Python RAG]
    PG[(Postgres)]
  end

  Push --> CI
  Push --> TF
  CI --> Local
  FE --> BE
  BE --> RAG
  BE --> PG
  RAG --> PG
```

---

## 3. LangChain + Mem0 RAG Flow (25%)

```mermaid
flowchart TB
  Op[Operator question<br/>+ X-Tenant-Id] --> API["/api/rag"]
  API --> Chain[LangChain LCEL chain]

  subgraph Memory["Tenant-scoped Memory"]
    Mem0[Mem0<br/>keyed tenant_id:userId]
    Sess[LangChain Session Memory]
  end

  subgraph Retrieval["RAG"]
    FAISS[FAISS vector store<br/>per tenant_id]
    Embed[Bedrock Titan Embed]
  end

  subgraph LLM["Generation"]
    Prompt[ChatPromptTemplate]
    Chat[Bedrock Nova Lite]
  end

  Chain --> Mem0
  Chain --> Sess
  Chain --> FAISS
  FAISS --> Embed
  Chain --> Prompt --> Chat
  Chat --> Answer[Tenant-scoped answer]
  Answer --> Op
```

---

## 4. LangGraph / Agent / LangSmith Bonus

```mermaid
flowchart TB
  Q[Operator or system request] --> Graph[LangGraph workflow<br/>backend/rag/graph.py]

  Graph --> Triage{Triage node}
  Triage -->|list alerts| Tool1[list_alerts]
  Triage -->|usage summary| Tool2[usage_summary]
  Triage -->|column map help| Tool3[suggest_column_map]
  Triage -->|explain| Tool4[explain_alert]

  Tool1 --> Guard[Isolation + confirm guards<br/>tenant_id only]
  Tool2 --> Guard
  Tool3 --> Guard
  Tool4 --> Guard
  Guard --> Resp[Safe response]

  Graph -.->|traces| LS[LangSmith<br/>Water_Saver project]
```

---

## 5. Integrations + UI (15%)

```mermaid
flowchart LR
  subgraph UI["Angular + PrimeNG"]
    Login["/login"]
    Dash["/dashboard"]
    Upload["/upload"]
    Alerts["/alerts"]
    Sources["/sources"]
    Agent["/assistant"]
    Reports["/reports"]
  end

  subgraph Backend["API + AI"]
    Cognito[Cognito JWT]
    Lambda[Lambda handlers]
    Bedrock[Bedrock]
  end

  Login --> Cognito
  Dash --> Cognito
  Upload --> Cognito
  Alerts --> Cognito
  Sources --> Cognito
  Agent --> Cognito
  Reports --> Cognito
  Cognito --> Lambda
  Agent --> Bedrock
  Lambda --> Bedrock
```

---

## 6. Terraform (10%)

Remote state uses S3 + native lockfile (`use_lockfile`), not DynamoDB.

```mermaid
flowchart TB
  subgraph Local["Local / CI"]
    Code[infra/terraform]
    Vars[environments/dev.tfvars]
  end

  subgraph State["Remote State"]
    S3State[S3 bucket<br/>water-saver-tf-state-388691194728]
    Lock[S3 native lockfile<br/>use_lockfile]
  end

  subgraph AWS["Account 388691194728"]
    CognitoMod[module: cognito]
    StorageMod[module: storage]
    ApiMod[module: api]
    SecMod[module: security]
  end

  Code --> Vars
  Vars -->|terraform apply| CognitoMod
  Vars -->|terraform apply| StorageMod
  Vars -->|terraform apply| ApiMod
  Vars -->|terraform apply| SecMod
  CognitoMod --> S3State
  StorageMod --> S3State
  ApiMod --> S3State
  SecMod --> S3State
  S3State --> Lock
  TagNote[Every resource tagged Assessment-iii=true]
  CognitoMod --> TagNote
  StorageMod --> TagNote
  ApiMod --> TagNote
  SecMod --> TagNote
```

---

## 7. Product Happy Path

```mermaid
flowchart LR
  A[Messy CSV / Excel] --> B[Upload + Visual Mapper]
  B --> C[Tenant-scoped ingest<br/>S3 + Dynamo]
  C --> D[Dashboard<br/>KPIs + Trends]
  C --> E[Water Balance<br/>In vs Out]
  C --> F[Data Confidence]
  C --> G[Prioritized Alerts<br/>Watch vs Actionable]
  G --> H[Acknowledge]
  D --> I[Calm rural-operator UX]
  E --> I
  F --> I
  G --> I
```

---

## 8. Tenant Isolation (cross-cutting)

```mermaid
flowchart TB
  Browser[Browser] -->|JWT only — no client tenant override| API[API Gateway]
  API -->|JWT claims only| Auth[parseAuthFromClaims]
  Auth --> TID[tenant_id from custom:tenant_id]
  TID --> Every[Every Dynamo query<br/>S3 key prefix<br/>Mem0 key<br/>RAG index<br/>Agent prompt]
  Every --> Safe[No cross-tenant leakage]
```
