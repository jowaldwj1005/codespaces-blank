# CLAUDE.md - Playbook Agent

**App Version:** 0.3.0
**Phase:** MVP - Dataverse CRUD + Connector Debug + Visualization + MCP

## Quick Context

This is a Power Platform Code App (React + TypeScript + Vite) — a meta-app / orchestration engine. It dynamically renders UIs and manages AI Agent workflows based on metadata stored in Dataverse. NOT a traditional CRUD app with hardcoded screens.

## Memory & Documentation Index

Detailed learnings and patterns are split into focused docs to keep context windows lean:

| File | What's in it |
|------|-------------|
| `docs/memory/CHANGELOG.md` | Version history — what changed when |
| `docs/memory/DATAVERSE_PATTERNS.md` | SDK access, CRUD patterns, lookup binding, adding new tables |
| `docs/memory/CONNECTOR_PATTERNS.md` | Azure OpenAI, Doc Intelligence, SAP OData — API versions, gotchas |
| `ContextFiles/CLAUDE.md` | Original Gemini-suggested AI dev instructions |
| `ContextFiles/Data Model Blueprint.md` | Full jw_ entity schema (strict source of truth) |
| `ContextFiles/Architecture Core.md` | SemanticRenderer, decoupled workspaces, meta-app concept |
| `ContextFiles/Architecture Decisions.md` | ADRs: Custom Agent Loop, Sub-Agents, Visuals, Token Tracking |
| `ContextFiles/Agentic Workflows.md` | HitL architecture, Smart Context, Dataverse MCP |
| `ContextFiles/PAC CLI & Connectors.md` | Connector bridge patterns, Custom Agent Loop architecture |
| `ContextFiles/learningsfromprioragent/` | Bootstrap checklist + connection management playbook |

**Read `docs/memory/` first** — it has the distilled, actionable patterns. Read `ContextFiles/` for deep architectural context.

## Architecture Rules (Non-Negotiable)

1. **SDK-Only Data Access** — NEVER use `fetch()`, `axios`, or direct REST. Use PAC CLI generated services in `src/generated/`.
2. **One Integration Boundary** — All I/O through `src/services/sdk.ts`. UI/hooks never call generated services directly.
3. **Debug-First** — Every SDK call emits events via `debugEventBus.ts`. Check Debug Log tab.
4. **Human-in-the-Loop** (future) — LLM never executes POST/PATCH directly. ToolExecution interceptor required.

## Layer Stack

```
src/services/sdk.ts          → traced wrappers, table constants, OData helpers
src/services/dataverse.ts    → CRUD for each table (getAll/get/create/update/delete)
src/services/connectors.ts   → Connector wrappers + response normalization + OPENAI_DEFAULTS
src/services/dataverseMcp.ts → MCP tools: search_tables, get_schema, execute_query
src/hooks/                   → useDataverse, useConnectors, useDebugLog, useMcp
src/components/              → DataverseExplorer, ConnectorTester, VisualizationPanel, McpExplorer, DebugPanel
src/App.tsx                  → Tabbed shell (5 tabs, version badge in header)
```

## Data Sources (Connected)

### Dataverse Tables
| Service | Table | CRUD |
|---|---|---|
| `SystemusersService` | systemusers | getAll, get, create, update, delete |
| `TeamsService` | teams | getAll, get, create, update, delete |
| `BusinessunitsService` | businessunits | getAll, get, getMetadata |

### Custom Connectors
| Service | Connector | Key Params |
|---|---|---|
| `CustomConnector_AzureOpenAIService` | Azure OpenAI | `max_completion_tokens` (NOT max_tokens), api `2025-01-01-preview` |
| `CustCon_AzureDocIntService` | Doc Intelligence | Async: submit → poll Operation-Location → get result |
| `CustCon_SAP_OdataService` | SAP OData | api `2024-10-01`, via Power Automate proxy flow |

## Target Data Model (jw_ prefix)

**Definition:** jw_agent, jw_tool, jw_playbook, jw_instruction, jw_agenttool
**State:** jw_case, jw_artifact, jw_document, jw_threadcase
**Interaction:** jw_thread, jw_message, jw_toolexecution

See `ContextFiles/Data Model Blueprint.md` for full schema.

## Commands

```bash
cd PlaybookAgent && npm run dev    # Start dev server
cd PlaybookAgent && npm run build  # Type-check + build
cd PlaybookAgent && npm run lint   # ESLint
```

## What's Next

1. Finalize jw_ data model in Dataverse (create entities via PAC CLI)
2. Plan SemanticRenderer architecture for dynamic UI
3. Implement Custom Agent Loop (decided: no Vercel AI SDK — SPA has no SSE)
4. Design HitL approval flow with ToolExecution records
5. Layout features: Chat workspace, Case dashboard, Artifact viewer, Debug panel
6. Decide on RAG/CheatSheet indexing strategy
