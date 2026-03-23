# Changelog - Playbook Agent

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
