# Changelog - Playbook Agent

## v0.8.1 (2026-03-24)
### Fixed — Bug Fix Sprint: Core Mechanics & Robustness
- **Seed Data: Instructions linked to Playbooks** — Instructions now include `jw_playbookid@odata.bind`, fixing `start_playbook` returning 0 instructions
- **Seed Data: Boolean field values** — `jw_requiresapproval` and `jw_allowmcp` now correctly use `true`/`false` (Dataverse `Edm.Boolean` rejects integers — see DATAVERSE_PATTERNS.md)
- **Seed Data: Missing tools** — Added `exit` and `delete_dataverse_record` tools with agent-tool junction links
- **Seed Data: create_visual schema** — Added `3d` chart type, `caseId`, `artifactType`, `artifactName` fields, expanded options properties
- **Agent Loop: Token count fix** — `totalTokens` was using `+=` (doubling), now correctly uses `=`
- **Agent Loop: Max iterations safety** — Error event now fires unconditionally when loop exhausts
- **Agent Loop: Status transition** — Added `thinking` status change after tool execution before next LLM call
- **builtinTools: complete_instruction** — Now returns explicit error when instruction ID not found (was silent no-op)
- **builtinTools: create_visual artifact save** — Defaults `artifactType` to `'Chart'`, no longer requires both caseId AND artifactType
- **builtinTools: OData injection** — Filter queries now use `escapeOData()` for playbook ID
- **toolExecutor: CloudFlow tools** — Now throws explicit error instead of returning fake success object
- **dataverse: Token fields** — Removed `.toString()` from `jw_tokenprompt`/`jw_tokencompletion` (now persisted as numbers)
- **useAgentChat: Token persistence** — Cumulative token usage now saved to the last assistant message in Dataverse
- **MessageList: System messages visible** — System messages rendered as collapsible banners instead of hidden
- **AdminWorkspace: AgentConfig condition** — Removed redundant `formMode === 'edit'` check that blocked create mode

### Fixed — Follow-up (review agent findings)
- **builtinTools: playbook name null safety** — `playbook.jw_name` fallback to `'Unnamed Playbook'` in case title and `'Playbook'` in thread-case link name
- **builtinTools: artifact error feedback** — `handleCreateVisual` now returns `artifactError` field to LLM when artifact save fails (was silently swallowed)
- **seedData: analyze_document schema** — Added description clarifying "provide either urlSource OR base64Source"

### Changed
- AppHeader version bump to 0.8.1
- New CSS for `.system-message-banner` component

## v0.8.0 (2026-03-24)
### Added — "Make the Invisible Visible"
- **SemanticRenderer** (`src/components/semantic/SemanticRenderer.tsx`): Registry mapping artifact `jw_type` strings to React components. Supports 12 types: Chart, Report, Analysis, Markdown, InvoiceTable, InvoiceData, Table, SapOrder, SapApprovalPayload, JSON, Dashboard, Summary. Type-colored badges, compact mode, bidirectional editing support (SAP form fields, JSON editor)
- **Artifact Browser** (`src/components/semantic/ArtifactBrowser.tsx`): Right panel showing all artifacts for active case. Type filter chips, expand/collapse per artifact, auto-refresh every 10s, case auto-discovery from thread via jw_threadcases
- **Case Dashboard** (`src/components/semantic/CaseDashboard.tsx`): Right panel showing case lifecycle. Status badge (Active/Completed/Cancelled), playbook progress bar with instruction checklist, linked artifacts list, expandable context data JSON viewer, case metadata
- **Playbook Progress** (`src/components/semantic/PlaybookProgress.tsx`): Inline chat component showing playbook instruction checklist with progress bar. Auto-refreshes while case is active, collapsible, numbered steps with completion states
- **Better Approval UX**: Rewritten `ApprovalForm.tsx` with structured forms for known tools (SAP, Dataverse, DocInt, artifacts). Field schemas with typed inputs (text, select, json, boolean). Form/JSON mode toggle. Tool category badges (sap/dataverse/docint/agent)

### Changed
- App.tsx: Artifact and Case-Detail right panels now render real components (was placeholders)
- ChatWorkspace: PlaybookProgress inline component rendered below chat header
- AppHeader version bump to 0.8.0
- ~600 lines new CSS for SemanticRenderer, Artifact Browser, Case Dashboard, Playbook Progress, improved Approval Form

## v0.7.0 (2026-03-24)
### Added — Feature A: Connector Wiring
- **SAP OData tool** (`query_sap`): Real SAP queries via Power Automate proxy connector, method routing (GET/POST/PATCH/DELETE)
- **Document Intelligence tool** (`analyze_document`): Full async flow (submit → poll → result), returns markdown extracted text
- **Connector tool routing** in `toolExecutor.ts`: `CONNECTOR_HANDLERS` map routes `executionTarget` to actual connector wrappers
- Debug events emitted for every connector tool execution

### Added — Feature B: Playbook Execution Engine
- **`start_playbook` tool**: Creates jw_case linked to playbook, links thread via jw_threadcases junction, loads all instructions, initializes case context JSON with instruction tracking
- **`complete_instruction` tool**: Marks instructions complete in case context, auto-completes case when all instructions done
- **`save_artifact` tool**: Saves typed artifacts (Report/Analysis/Invoice/etc.) to jw_artifacts, optional case linking + versioning via parentArtifactId

### Added — Feature C: HitL Audit Trail
- `ToolExecutionRecord` interface in toolExecutor.ts: captures callId, toolName, args, response, approvalState, durationMs
- `onToolExecuted` callback in `ToolExecutorConfig`: collects audit data during agent loop
- Post-loop jw_toolexecution record creation in useAgentChat.ts: links to persisted assistant message IDs
- Approval states: Pending → Approved/Rejected/AutoExecuted persisted as Dataverse choice values

### Added — Feature D: Dynamic Tool Loading
- `getAgentWithTools()` + expand `jw_agent_jw_agenttool($expand=jw_toolid)` in useAgentChat.ts
- `dvToolToDefinition()`: converts Dataverse jw_tool records to ToolDefinition (maps endpointType enum, parses JSON inputSchema, normalizes boolean requiresApproval)
- Hybrid fallback: uses dynamic tools from Dataverse if available, falls back to BUILTIN_TOOL_DEFINITIONS
- InternalReact tools validated against BUILTIN_TOOLS handler registry

### Added — Feature E: Debug Console Upgrade
- **Source filter buttons**: All / Dataverse / Connectors / Agent Loop
- **Status filter buttons**: All / Success / Error / Pending
- **Search box**: Filter by operation name or input content
- **Stats bar**: Total events, error count, avg duration, per-source breakdown
- **Collapsible JSON blocks**: Request, Response, Error, Raw Result — each with line count, styled backgrounds
- **Event cards**: Colored status/source badges, duration display, expand/collapse
- `agent-loop` added as debug event source type

### Changed
- Seed data: 12 tools (was 7), 12 agent-tool links (was 7), updated system prompt with all new capabilities
- General Assistant system prompt: documents SAP, DocInt, playbook, artifact, and instruction tools
- AppHeader version bump to 0.7.0

## v0.6.0 (2026-03-24)
### Added
- **Admin Workspace** (`src/components/admin/AdminWorkspace.tsx`): Full entity management view with entity tabs, split-panel layout (record list + detail form), search, sort, CRUD for all 6 admin entities
- **Agent Config** (`src/components/admin/AgentConfig.tsx`): Specialized agent editor with tool binding checkboxes, Monaco system prompt editor, model config JSON editor, tabbed interface (General/Prompt/Tools)
- **RecordForm** (`src/components/admin/RecordForm.tsx`): Dynamic form renderer from EntityRegistry metadata, supports string/memo/boolean/choice/lookup/json fields
- **RecordList** (`src/components/admin/RecordList.tsx`): Reusable record list with search, sortable columns, animated rows (framer-motion), delete actions
- **EntityRegistry** (`src/components/admin/EntityRegistry.ts`): Schema metadata for all 9 jw_ entities (fields, types, lookups, choices, display names)
- **AI-assisted creation tools**: `create_dataverse_record`, `update_dataverse_record`, `link_agent_tool` — new builtin tools for LLM-driven entity management (HitL gated)
- **Generic CRUD service map** (`getTableService` in dataverse.ts): Route CRUD operations by table plural name
- New libraries: `@monaco-editor/react`, `framer-motion`, `react-hot-toast`
- Admin nav item in ThreadSidebar
- ~400 lines admin CSS (dark theme, toggle switches, tool cards, Monaco wraps)

### Changed
- Seed data expanded: 7 tools (was 4), 7 agent-tool links (was 4)
- General Assistant system prompt updated with new tool descriptions
- AppHeader version bump to 0.6.0
- App.tsx: added 'admin' to MainView type, AdminWorkspace rendering

## v0.5.3 (2026-03-24)
### Fixed
- **MCP query options** — Changed `$select`/`$filter`/`$orderby`/`$top` to SDK-style `select`/`filter`/`orderBy`/`top`. Fixed `orderBy` to `string[]` as IGetAllOptions requires.
- **Tool-call replay** — `tool_call_id` and `name` fields now persisted to Dataverse (via `jw_toolcalls` JSON + `jw_name`) and reconstructed on thread reload.
- **System message duplication** — Agent loop now always replaces system message with latest agent.systemPrompt, preventing stale prompts after config changes.

### Changed
- `createMessage` in dataverse.ts: added `toolCallId` and `name` parameters
- `loadMessages` in useAgentChat.ts: role-aware JSON parsing for tool_call_id

## v0.5.2 (2026-03-23)
### Fixed
- **Hallucinated column `jw_ordernumber`** — Field doesn't exist on `jw_instruction` entity. Removed from seed data, using `jw_type: 'Rule'` instead. Instructions can now be created successfully.
- **Main container height** — Added `min-height: 0` to flex parents (app-body, workspace, main-content). Fixes content not filling the viewport when scrolling.

### Added
- **DATAVERSE_PATTERNS.md** — Documented field verification rule: always check generated model before using any field name in CRUD payloads
- **VERSIONS.md** — Responded to all user v0.5.1 feedback (JSON viewer, hallucinated column root cause, agent vs playbook, design sprint)

## v0.5.1 (2026-03-23)
### Fixed
- **CRITICAL: Boolean fields** — Dataverse Yes/No columns require `true`/`false`, not `0`/`1`. PAC CLI generates misleading `{0: 'No', 1: 'Yes'}` enums. Fixed `jw_requiresapproval` and `jw_allowmcp` in seed data.
- **CRITICAL: tracedOperation silent failures** — Dataverse SDK resolves promise even on failure (`success: false`). `tracedOperation` now checks `result.success` and throws with the actual error message. Debug Log correctly shows errors.
- **executeSeed defensive validation** — Create operations now verify `result.data` contains an ID. Throws descriptive error if create returns empty data.
- **agent-tool link error messages** — Changed from "skipped" to "error" with message "parent record likely failed to create" when agent/tool IDs are missing.

### Added
- **Error hover tooltip** — Seed panel error messages now show full error in a styled popover on hover (was truncated title attribute)
- **DATAVERSE_PATTERNS.md** — Documented boolean field gotcha and IOperationResult.success checking pattern

## v0.5.0 (2026-03-23)
### Added
- **SeedPanel** (`src/components/admin/SeedPanel.tsx`): Transparent seed data UI with toggleable records, real-time status, idempotent execution, Select All/Deselect All, summary display
- **Seed Data Service** (`src/services/seedData.ts`): Idempotent seed executor with General Assistant agent (4 tools, system prompt, model config), sample playbook + 3 instructions, agent-tool junction linking
- **Right panel canvas**: Sliding right panel in App.tsx for seed, agent-config, artifacts, case-detail (last 3 are placeholders)
- **AppHeader panel buttons**: 4 toggle buttons (Seed, Config, Artifacts, Cases) with active state styling

### Fixed
- `createMessage` lookup bug: was binding `jw_threadid` to `jw_messages` instead of `jw_threads`
- DebugPanel duplicate React keys: pending + final events shared same `evt.id`
- `useMcp` TABLE_SERVICES: wired all 15 tables (was only 3 system tables)
- `builtinTools` TABLE_GETALL_MAP: added jw_documents, jw_agenttools, jw_threadcases
- VisualizationCard not rendered in ChatWorkspace: now renders from visualizations state
- seedData.ts TypeScript errors: relaxed generic constraint, fixed type casts

### Changed
- App layout: workspace now supports optional right panel alongside main content
- AppHeader redesigned with left/right sections and panel toggle buttons
- Version bumped to 0.5.0
- CSS: new styles for right panel, seed panel, header buttons, type badges, animations

## v0.4.0 (2026-03-23)
### Added
- **Version Notes file** (`docs/VERSIONS.md`): Collaborative version tracking — what was done, how to test, open questions for user feedback
- Version badge tooltip in AppHeader showing version summary + pointer to VERSIONS.md
- Exported `APP_VERSION` constant from AppHeader for reuse

### Changed
- CLAUDE.md updated: version 0.4.0, phase description, VERSIONS.md added to documentation index

## v0.3.1 (2026-03-23)
### Changed — Data Model & Architecture Decisions
- **Architecture Decision: Custom Agent Loop** — decided against Vercel AI SDK. SPA has no SSE streaming; Custom Connector returns full JSON. Custom loop gives full control over HitL, sub-agents, and debugging.
- **Data Model: jw_thread** — added `jw_parentthreadid` (self-ref lookup for sub-agent threads) and `jw_status` (Choice: Active/Completed/Cancelled)
- **Data Model: jw_message** — added `jw_toolcalls` (JSON for tool_calls array), `jw_tokenprompt` and `jw_tokencompletion` (Whole Number for token tracking)
- **Data Model: jw_artifact** — changed `jw_caseid` RequiredLevel from ApplicationRequired to None (visuals without case)
- Updated entity_creation/01_tables_and_fields.json with 4 new field definitions
- Updated entity_creation/02_lookup_columns.json with jw_parentthreadid lookup + artifact-case optional fix
- Updated Data Model Blueprint.md with all new fields
- Created `ContextFiles/Architecture Decisions.md` (ADR log)
- Updated ContextFiles: replaced all Vercel AI SDK references with Custom Agent Loop
- Updated CLAUDE.md memory index and next steps

## v0.3.0 (2026-03-23)
### Added
- **Visualization Panel**: New tab with Recharts (Bar/Line/Pie charts) + Three.js (3D scene)
  - JSON data input for custom chart data
  - 3D bar chart with OrbitControls and labeled bars
  - Deps: recharts, @react-three/fiber, @react-three/drei, three
- **Dataverse MCP Explorer**: New tab with interactive testing of MCP tools
  - `search_dataverse_tables(intent)`: Keyword-based table discovery (DE+EN)
  - `get_table_schema(logical_name)`: Minified schema with static fallback from Data Model Blueprint
  - `execute_dataverse_query(table, options)`: Read-only OData queries (max 50 records)
  - Full table registry for all jw_ entities + system entities
  - Static schemas for all jw_ entities from the Data Model Blueprint
- **SAP Connector UI**: Extended with queryString, body (JSON), and headers inputs
  - Info banner explaining POST-only connector pattern

### Changed
- SAP OData: Documented POST-only connector pattern (method in body, not HTTP verb)
- SAP OData: Added JSDoc comments explaining RPC envelope architecture
- SAP connector docs: Added headers support warning
- App version bumped to 0.3.0
- App tabs: 5 tabs now (Dataverse Explorer, Connector Tester, Visualization, MCP Explorer, Debug Log)

## v0.2.0 (2026-03-22)
### Fixed
- Azure OpenAI: switched from `max_tokens` to `max_completion_tokens` (required by API)
- Azure OpenAI: central defaults (`OPENAI_DEFAULTS`) for temperature, max_completion_tokens, apiVersion
- Document Intelligence: full async flow — submit -> extract Operation-Location -> poll GetAnalyzeResult -> return content
- SAP OData: API version corrected to `2024-10-01` (was `2024-01-01`)

### Added
- Full CRUD for Dataverse teams: `createTeam()` with lookup binding helpers, `update`, `delete`
- Full CRUD for systemusers: `create`, `update`, `delete` wrappers
- DataverseExplorer UI: Create Team form, Update Team, Delete Record
- ConnectorTester UI: configurable `max_completion_tokens` and `temperature` inputs
- ConnectorTester UI: Doc Intelligence shows extracted text + automatic polling status
- App version badge displayed in header

## v0.1.0 (2026-03-22)
### Added
- Initial MVP: CLAUDE.md, service layer, debug console UI
- Service layer: `debugEventBus.ts`, `sdk.ts`, `dataverse.ts`, `connectors.ts`
- React hooks: `useDebugLog`, `useDataverse`, `useConnectors`
- UI: DataverseExplorer (list/get/metadata), ConnectorTester (OpenAI/DocInt/SAP), DebugPanel
- Tabbed App shell replacing Vite boilerplate
