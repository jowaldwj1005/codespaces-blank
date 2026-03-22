# CLAUDE.md - Playbook Agent MVP

## Project Overview

**Playbook Agent** is a Power Platform Code App (React + TypeScript + Vite) that serves as a meta-app / orchestration engine. It dynamically renders UIs and manages AI Agent workflows based on metadata stored in **Dataverse**. This is NOT a traditional CRUD app with hardcoded screens - it's a semantic rendering engine driven by data.

## Current Phase: MVP - Dataverse CRUD + Connector Debug

The MVP proves that:
1. We can perform full CRUD on Dataverse tables via the PAC CLI generated SDK
2. We can call all 3 custom connectors (Azure OpenAI, Azure Doc Intelligence, SAP OData) and inspect raw responses
3. We have a proper wrapper/service layer that future agentic features build on
4. We have a debug event bus that logs every SDK operation for diagnostics

## Architecture Rules

### 1. SDK-Only Data Access (CRITICAL)
- **NEVER** use `fetch()`, `axios`, or direct REST calls to Dataverse or connectors
- **ALWAYS** use the PAC CLI generated services in `src/generated/`
- Authentication is handled by the Power Apps host - no auth code needed

### 2. One Integration Boundary
All platform I/O goes through `src/services/sdk.ts`. UI, hooks, and future agent code never call generated services directly.

**Layer stack:**
```
src/services/sdk.ts          → raw client wrapper + debug events
src/services/dataverse.ts    → Dataverse CRUD helpers (table constants, OData escaping, lookup binding)
src/services/connectors.ts   → Connector wrappers with response normalization
src/hooks/                   → React hooks for query/mutation state
src/components/              → UI components
```

### 3. Debug-First Development
Every SDK call emits a structured debug event via the event bus (`src/services/debugEventBus.ts`). The debug panel shows request/response/timing for all operations.

### 4. Human-in-the-Loop by Default (Future)
The LLM must NEVER execute POST/PATCH to external systems directly. All write operations go through a `ToolExecution` interceptor requiring human approval. (Not in MVP scope, but the wrapper layer is designed for it.)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 7 with `@microsoft/power-apps-vite` plugin |
| Platform SDK | `@microsoft/power-apps` ^1.0.3 |
| UI (future) | Fluent UI v9 + Tailwind CSS |
| Validation (future) | Zod |
| AI SDK (future) | Vercel AI SDK `@ai-sdk/react` |

## Data Sources (Connected via PAC CLI)

### Dataverse Tables
| Generated Service | Table | Purpose |
|---|---|---|
| `SystemusersService` | systemusers | Platform users |
| `TeamsService` | teams | Security teams |
| `BusinessunitsService` | businessunits | Org structure |

### Custom Connectors
| Generated Service | Connector | Operations |
|---|---|---|
| `CustomConnector_AzureOpenAIService` | Azure OpenAI | `chat_completion` (GPT-5.2) |
| `CustCon_AzureDocIntService` | Azure Document Intelligence | `AnalyzeDocument`, `GetAnalyzeResult` |
| `CustCon_SAP_OdataService` | SAP OData (via Power Automate proxy) | `ExecuteSapODataRequest` |

## Dataverse Data Model (Target - jw_ prefix)

### Definition Layer
- **jw_agent** - AI personas (systemprompt, modelconfig, allowmcp)
- **jw_tool** - Tool definitions (inputschema, requiresapproval, endpointtype)
- **jw_playbook** - Process groupings
- **jw_instruction** - Knowledge/rules (type: Rule|CheatSheet, tags, content)
- **jw_agenttool** - N:N intersection (Agent <-> Tool) with JSON overrides

### State & Workspace Layer
- **jw_case** - Business state (title, playbookid, contextdata JSON)
- **jw_artifact** - Semantic UI driver (type string -> component mapping, payload JSON up to 1M chars)
- **jw_document** - File storage (file blob, mimetype)
- **jw_threadcase** - N:N intersection (Thread <-> Case) with link context

### Interaction Layer
- **jw_thread** - Chat sessions (title, agentid)
- **jw_message** - Chat history (role: user|assistant|system|tool, content)
- **jw_toolexecution** - HitL core (callid, requestpayload, responsepayload, approvalstate: Pending|Approved|Rejected|AutoExecuted)

## Key Patterns from Prior Agent Learnings

1. **Table constants & primary keys in one place** - no scattered string literals
2. **Lookup binding helpers** for `@odata.bind` paths
3. **OData escaping** for filter values
4. **Response normalization** per connector - connectors wrap responses differently (`body`, `data`, `result`, nested `raw.success.data`)
5. **Debug event emission** for every operation with normalized + raw payloads
6. **Active-version semantics** for config records (`statecode=0`)
7. **Structured list options** (filter/select/top/orderBy) - don't rely on raw query strings

## File Structure Convention

```
PlaybookAgent/src/
├── generated/           # PAC CLI generated - DO NOT EDIT
│   ├── models/          # TypeScript interfaces for entities
│   ├── services/        # CRUD + connector service classes
│   └── index.ts         # Central exports
├── services/            # Our wrapper layer
│   ├── debugEventBus.ts # Event bus for debug logging
│   ├── sdk.ts           # Low-level SDK wrapper
│   ├── dataverse.ts     # Dataverse CRUD helpers
│   └── connectors.ts    # Connector normalization wrappers
├── hooks/               # React hooks
├── components/          # UI components
├── App.tsx              # Main app shell
└── main.tsx             # Entry point
```

## Commands

```bash
cd PlaybookAgent && npm run dev    # Start dev server
cd PlaybookAgent && npm run build  # Type-check + build
cd PlaybookAgent && npm run lint   # ESLint
```

## What's Next (After MVP CRUD Works)

1. Finalize the jw_ data model in Dataverse (create entities via PAC CLI)
2. Plan the SemanticRenderer architecture for dynamic UI
3. Evaluate agentic frameworks (Vercel AI SDK, custom middleware)
4. Design HitL approval flow with ToolExecution records
5. Layout features: Chat workspace, Case dashboard, Artifact viewer, Debug panel
6. Decide on RAG/CheatSheet indexing strategy
