# Changelog - Playbook Agent

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
