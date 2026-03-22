# Changelog - Playbook Agent

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
