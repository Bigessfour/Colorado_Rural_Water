# Water Saver / Colorado Rural Water — Agent Rules (NON-NEGOTIABLE)

Working name: **Water Saver**. Stack: Angular 22+, PrimeNG 22, Terraform, AWS serverless, Cognito, Bedrock.

This file (`AGENTS.md`) and `agent.md` are equivalent. Cursor rules under `.cursor/rules/` mirror these mandates.

---

## 1. Turn protocol (mandatory every turn)

### Before doing work

1. **RAG first** — Call MCP `crwa-rag` → `search_codebase` with a query that captures the full task context (and `rag_status` if the index looks stale). Prefer RAG over broad speculative greps.
2. **Package MCP docs** — Before changing Angular, PrimeNG, Terraform, or AWS configuration/APIs, query the matching package MCP for **current** docs (do not rely on training memory alone):
   - Angular → `angular-cli` MCP
   - PrimeNG / PrimeUI → `primeng` MCP (`@primeng/mcp`) — **mandatory** for every component/directive/theme/provider change (see §3)
   - Terraform / providers → `terraform` MCP (HashiCorp registry)
   - AWS services / IAM / Bedrock / Cognito → `aws` MCP (and AWS knowledge tools when relevant)
3. Only then implement.

### After finishing work (end of every turn)

4. **Reindex RAG** — Call MCP `crwa-rag` → `refresh_index` (incremental; `full: true` only if the index is missing or badly stale). CLI fallback: `npm run rag:index:incremental`.

Skipping RAG start/end or package-MCP doc checks is a process failure for this repo.

---

## 2. Product & architecture guardrails

- Multi-tenant isolation by `tenant_id` on every record and authorized request. Never trust client-supplied tenant overrides.
- Spec Kit: `docs/SPEC.md` — **§0 Scope layers** is authoritative (Kelly vs Pilot vs vNext). Tickets: `docs/TICKETS.md`. Isolation: `docs/TENANT_ISOLATION.md`.
- AI agent (product): cheapest option first, explain cost, require confirmation, multi-step confirm for deletes. No cross-tenant data in prompts.
- Prefer reversible local edits. Confirm before push, shared deploys, or IAM mutations.
- **AWS account (locked):** `388691194728` · CLI profile **`codeplatoon`** · region **`us-east-1`** · required tag **`Assessment-iii`** — see `docs/AWS_ACCOUNT.md`.

## 3. Frontend conventions

- Angular **22+**, standalone components, signals where appropriate, native control flow (`@if` / `@for`).
- PrimeNG **22** with `@primeuix/themes` (Aura or project preset).
- Rural-operator UX: calm, clear, low stress — see Spec §1.

### PrimeNG / PrimeUI — MCP required (NON-NEGOTIABLE)

When implementing or changing any PrimeNG/PrimeUI element (component, directive, module import, `providePrimeNG`, theme/preset, or Pro candidate):

1. Query MCP **`primeng`** first — use `search` / `get_component` / `get_example` / `get_guide` / `get_setup` / `validate_usage` as appropriate for the change.
2. Apply the MCP-suggested configuration **fully** (imports, providers, props, theming, templates) — do **not** invent API or setup from memory.
3. There is no separate “PrimeUI Pro MCP”; Pro and core docs both come from the same `primeng` MCP.

## 4. Infra conventions

- Terraform under `infra/terraform`. No secrets in git (`.tfvars`, `.env`, state).
- Serverless handlers under `backend/src` must resolve tenant from JWT claims.

## 5. MCP inventory (this project)

| Server        | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `crwa-rag`    | Project codebase RAG (`search_codebase`, `rag_status`, `refresh_index`) |
| `angular-cli` | Latest Angular CLI / framework guidance                                 |
| `primeng`     | PrimeNG/PrimeUI docs via `@primeng/mcp` (`search`, `get_component`, …)  |
| `terraform`   | Terraform Registry / provider docs                                      |
| `aws`         | AWS MCP (global) — live AWS + service guidance                          |

Project MCP file: `.cursor/mcp.json`. Global AWS launcher remains in `~/.cursor/mcp.json`.

## 6. Local commands

```bash
npm run rag:status
npm run rag:index
npm run rag:index:incremental
npm run rag:query -- "tenant isolation alerts"
npm run inventory   # regenerate docs/function-inventory.generated.md (TS/Angular + Lambda)
cd frontend && npm start
cd backend && npm test
```

## 6a. Feature prove tests (browser — NON-NEGOTIABLE)

High-level / big features are **not Done** until proven live in the SPA:

1. MCP **Chrome DevTools** — navigate, poke buttons, fill fields, assert visible data/KPI changes, screenshot.
2. Record results in [`docs/PROVE_FEATURES.md`](docs/PROVE_FEATURES.md).
3. Vitest/backend unit tests remain required for logic; they do **not** replace prove.

## 7. Function inventory (this repo)

- **Stack:** Angular 22 + TypeScript Lambda handlers — **not** C# / Syncfusion Blazor.
- Config: `.function-inventory.json` (`stack: typescript`, roots `frontend/src` + `backend/src`).
- Always exclude `mcp/**`, `node_modules/**`, build artifacts. Theme oracle is **PrimeNG MCP**, not `sf_blazor_style`.
- After public API / route / handler changes: `npm run inventory`, then update `docs/action-items.md` proofs.
- **Done / ship gate** for Kelly or pilot = Spec §0 + `docs/ACCEPTANCE_CHECKLIST.md` / smoke — **not** inventory count alone.
- Overlays: `docs/function-tree.md` (visual), `docs/action-items.md` (proof status).

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/011-meter-map/plan.md
<!-- SPECKIT END -->
