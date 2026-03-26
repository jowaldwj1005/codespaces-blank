# CLAUDE.md - Playbook Agent

**App Version:** 0.13.0
**Phase:** Definition Experience & Navigation — Unified sidebar, agent/playbook builders, case canvas

## Quick Context

Power Platform Code App (React + TypeScript + Vite) — a meta-app / orchestration engine. Dynamically renders UIs and manages AI Agent workflows from Dataverse metadata. NOT a traditional CRUD app.

## Gotchas & Hard-Won Lessons

| # | Gotcha | Details |
|---|--------|---------|
| 1 | **Responses API, not Chat Completions** | Azure OpenAI uses `input[]` / `output[]`, NOT `messages[]`. No `temperature` param — API rejects it. Use `max_output_tokens`, `reasoning_effort`, `web_search`. |
| 2 | **PAC CLI connector wrapping** | Connectors return `IOperationResult<void>`. Actual payload is nested: `raw.success.data` or `raw.data`. Always use `normalizeConnectorResponse()` + `tryParseJson()`. |
| 3 | **Module-level state for tab survival** | React components unmount on tab switch. Use module-level `Set`/`Map` (not `useRef`) for state that must survive remount. See `_streamedMessages` in MessageBubble.tsx. |
| 4 | **agentLoopRegistry is the source of truth** | `agentLoopRegistry` singleton survives tab switches. On remount, check registry status before overwriting state from Dataverse. |
| 5 | **Incremental message persistence** | Messages persist to Dataverse AS they arrive during agent loop, not in bulk after. Post-loop only handles tool execution audit records. |
| 6 | **Seed data tools need junction links** | Adding a tool to seedData.ts is NOT enough. Must also add `agent_tool_link` junction record or the LLM can't use it. |
| 7 | **No temperature anywhere** | Removed from seed data, form defaults, hints, schema descriptions. Don't re-add. |

## Architecture Rules (Non-Negotiable)

1. **SDK-Only Data Access** — NEVER use `fetch()`, `axios`, or direct REST. Use PAC CLI services in `src/generated/`.
2. **One Integration Boundary** — All I/O through `src/services/sdk.ts`. UI/hooks never call generated services directly.
3. **Debug-First** — Every SDK call emits events via `debugEventBus.ts`.
4. **Human-in-the-Loop** — LLM never executes POST/PATCH directly. ToolExecution interceptor required.

## Layer Stack

```
src/services/sdk.ts             → traced wrappers, table constants, OData helpers
src/services/dataverse.ts       → CRUD for each jw_ table
src/services/connectors.ts      → Connector wrappers + normalizeConnectorResponse + OPENAI_DEFAULTS
src/services/dataverseMcp.ts    → MCP tools: search_tables, get_schema, execute_query
src/services/agentLoop.ts       → Custom Agent Loop: LLM call → tool execution → iterate
src/services/agentLoopRegistry.ts → Singleton registry — loop state survives tab switches
src/services/toolExecutor.ts    → Tool routing (builtin/connector/flow) + HitL gate
src/services/builtinTools.ts    → Builtin tool handlers + BUILTIN_TOOL_DEFINITIONS
src/services/seedData.ts        → General Assistant seed data + idempotent executor
src/hooks/useAgentChat.ts       → Core chat hook: state, approvals, incremental persistence
src/hooks/useWorkspaceTabs.ts   → Tab state management
src/hooks/useCaseManager.ts     → Case CRUD + thread association
src/components/sidebar/         → UnifiedSidebar (collapsed rail + full panel)
src/components/chat/            → ChatWorkspace, MessageList, MessageBubble, ToolCallCard
src/components/case/            → CaseCanvas (case overview tab)
src/components/define/          → AgentCanvas, DefinitionBuilder, EntityCard
src/components/admin/           → AdminWorkspace, AgentConfig, RecordList, RecordForm, EntityRegistry
src/components/layout/          → WorkspaceTabs
src/App.tsx                     → Workspace shell: sidebar + tabbed content
```

## Data Model (jw_ prefix)

**Definition:** jw_agent, jw_tool, jw_playbook, jw_instruction, jw_agenttool (junction)
**State:** jw_case, jw_artifact, jw_document, jw_threadcase
**Interaction:** jw_thread, jw_message, jw_toolexecution

See `ContextFiles/Data Model Blueprint.md` for full schema.

## Key Documentation

### Active Docs (read first)

| File | What's in it |
|------|-------------|
| `docs/DESIGN_AND_ISSUES.md` | **Master design doc** — known issues (P0/P1/P2), UX flows, proposals, roadmap |
| `docs/VERSIONS.md` | Version notes v0.10–v0.13 with Q&A (recent history) |
| `docs/FEATURE_IDEAS.md` | Feature backlog with user decisions and status |
| `docs/JO_PROFILE.md` | User profile — how to collaborate effectively |
| `docs/memory/DATAVERSE_PATTERNS.md` | SDK access, CRUD patterns, lookup binding, gotchas |
| `docs/memory/CONNECTOR_PATTERNS.md` | Azure OpenAI Responses API, Doc Intelligence, SAP OData |
| `docs/memory/CHANGELOG.md` | Full technical changelog (all versions) |

### Architecture & Data Model

| File | What's in it |
|------|-------------|
| `ContextFiles/Data Model Blueprint.md` | Full jw_ entity schema — **strict source of truth** |
| `ContextFiles/Architecture Decisions.md` | ADRs: Custom Agent Loop, Sub-Agents, Visuals, Token Tracking |
| `ContextFiles/Architecture Core.md` | SemanticRenderer, decoupled workspaces, meta-app concept |
| `ContextFiles/Agentic Workflows.md` | HitL architecture, Smart Context, Dataverse MCP |
| `ContextFiles/customconnectorinformation/azureopenai_responses.txt` | Sample Responses API request/response for validation |

### Legacy (implemented or superseded)

| File | Status |
|------|--------|
| `docs/legacy/DESIGN_SPRINT_CANVAS.md` | Implemented in v0.12–v0.13 (tabbed workspace, sidebar, CaseCanvas) |
| `docs/legacy/VERSIONS_ARCHIVE.md` | Q&A version notes v0.1–v0.9 |

## Commands

```bash
cd PlaybookAgent && npm run dev    # Start dev server
cd PlaybookAgent && npm run build  # Type-check + build
cd PlaybookAgent && npm run lint   # ESLint
```
