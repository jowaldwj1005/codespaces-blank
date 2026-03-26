# Versions Archive — v0.1.0 through v0.9.x

> Q&A version notes from the initial development phase (2026-03-22 to 2026-03-25).
> For technical details on each version, see `docs/memory/CHANGELOG.md`.
> Active version notes (v0.10 onward) live in `docs/VERSIONS.md`.

---

## v0.9.0 — Intelligence & Rich Output (2026-03-25)

### What Was Done

**3 major features:** Responses API with reasoning, code-based data exploration, and rich Markdown rendering with simulated streaming.

**Azure OpenAI Responses API:**
- Upgraded API version to `2025-03-01-preview`
- Added reasoning support for o-series models — configurable `reasoning_effort` (low/medium/high)
- Cached token tracking + reasoning token tracking
- Default `max_completion_tokens` bumped to 4096

**Data Exploration Code Tools:**
- `run_data_code` — sandboxed JavaScript execution with built-in data helpers
- `cross_table_analysis` — multi-table query + analysis code for joins and correlations

**Rich Markdown Rendering & Streaming UI:**
- Full GFM markdown support in assistant messages
- Simulated streaming: character-by-character reveal with blinking cursor
- Reasoning thought bubbles for o-series models
- Streaming messages have subtle border glow during output

### Questions for User

- Which Azure OpenAI model are you deploying? o4-mini recommended for reasoning + cost balance.
- Reasoning effort default: currently `medium`. Want `high` or `low`?
- Code execution limits: currently no timeout on `run_data_code`. Add 5s limit?
- Streaming speed: ~12ms per char. Too fast? Too slow?

---

## v0.8.1 — Bug Fix Sprint: Core Mechanics & Robustness (2026-03-24)

### What Was Done

**15 bugs fixed** across seed data, agent loop, tool execution, data persistence, and UI.

Key fixes:
- Instructions now linked to playbooks (`jw_playbookid@odata.bind`) — `start_playbook` was finding 0 instructions
- Token count was doubling (`+=` → `=`)
- `complete_instruction` now returns error when instruction not found (was silent no-op)
- System messages visible as collapsible banners (were completely hidden)
- `playbook.jw_name` null safety — case title no longer becomes `"undefined — Case"`

**Review Agent Findings (deferred — intentional design):**
- `TABLE_CREATE_MAP` only covers 6 tables (prevents agents from creating raw system records — intentional)
- `linkAgentTool` duplicate handling is silent but idempotent by design

### User Feedback (jo)

> "I have not seen anything around playbook steps yet. We need to move forward."
> "The left navigation bar does not make sense anymore. It should rather be cases or agents or playbooks."
> "File upload is not possible — no upload options."
> "Agent in chat answers with markdown but it's not rendered."
> "If I switch to a different chat, the agent does not continue working. We should see different states for threads and allow background continuation."

→ These issues drove the v0.9-v0.12 development cycle.

---

## v0.8.0 — Make the Invisible Visible (2026-03-24)

### What Was Done

**5 features making the agent's work visible:**

- **SemanticRenderer**: Registry maps artifact `jw_type` → React components. 12 types: Chart, Report, Analysis, Markdown, InvoiceTable, InvoiceData, Table, SapOrder, SapApprovalPayload, JSON, Dashboard, Summary
- **Artifact Browser**: Right panel showing all artifacts for active case. Type filter chips, auto-refresh every 10s
- **Case Dashboard**: Status badge, playbook progress bar + instruction checklist, expandable context data JSON viewer
- **Playbook Progress**: Inline chat component — progress bar + numbered instruction checklist, collapsible
- **Better Approval UX**: Structured HitL forms per tool type, form/JSON mode toggle, tool category badges

---

## v0.7.0 — Full Agent Toolkit (2026-03-24)

### What Was Done

**5 major features in one sprint:**

- **Connector Wiring**: `query_sap` (SAP OData via Power Automate proxy), `analyze_document` (Azure Doc Intelligence full async flow)
- **Playbook Execution Engine**: `start_playbook` (create case + link to playbook + initialize context), `complete_instruction`, `save_artifact`
- **HitL Audit Trail**: `ToolExecutionRecord` collected during agent loop → creates `jw_toolexecution` records in Dataverse
- **Dynamic Tool Loading**: Tools loaded from Dataverse jw_agenttool junctions, not hardcoded
- **Debug Console Upgrade**: Source/status filters, search box, collapsible JSON blocks, stats bar

---

## v0.6.0 — Admin Workspace (2026-03-24)

Full entity management view with entity tabs, split-panel layout, search, sort, CRUD for all 6 admin entities. AgentConfig with tool binding checkboxes, Monaco system prompt editor. EntityRegistry schema metadata.

---

## v0.5.x — Seed Data & Right Panel (2026-03-23)

- **v0.5.3**: Fixed MCP query options, tool-call replay, system message duplication
- **v0.5.2**: Fixed hallucinated column `jw_ordernumber` (field doesn't exist on `jw_instruction`), container height
- **v0.5.1**: Fixed boolean fields (Dataverse requires `true`/`false`), `tracedOperation` silent failures, defensive seed validation
- **v0.5.0**: SeedPanel UI, idempotent seed executor, General Assistant agent + 4 tools, right panel canvas

---

## v0.4.0 — Version Notes (2026-03-23)

Added `docs/VERSIONS.md` collaborative version tracking. Version badge in AppHeader.

---

## v0.3.x — Visualization & MCP (2026-03-23)

- **v0.3.1**: Architecture Decision: Custom Agent Loop (decided against Vercel AI SDK). Added `jw_parentthreadid`, `jw_status` to jw_thread. Created `ContextFiles/Architecture Decisions.md`
- **v0.3.0**: Visualization Panel (Recharts + Three.js), Dataverse MCP Explorer (`search_dataverse_tables`, `get_table_schema`, `execute_dataverse_query`), SAP Connector UI extended

---

## v0.2.0 — Connector Fixes (2026-03-22)

Fixed Azure OpenAI (`max_completion_tokens`), Doc Intelligence async flow, SAP API version. Full CRUD for teams and systemusers. ConnectorTester extended.

---

## v0.1.0 — MVP (2026-03-22)

Initial MVP: service layer (`debugEventBus`, `sdk`, `dataverse`, `connectors`), React hooks, DataverseExplorer, ConnectorTester, DebugPanel, tabbed App shell.
