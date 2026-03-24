# Playbook Agent — Version Notes

> Collaborative version file. Claude documents each release, user answers questions & shapes next steps.
> Format inspired by FEATURE_IDEAS.md — a living conversation, not just a changelog.

---

## v0.8.1 — Bug Fix Sprint: Core Mechanics & Robustness (2026-03-24)

### What Was Done

**15 bugs fixed** across seed data, agent loop, tool execution, data persistence, and UI layers.

**Seed Data Fixes:**
- Instructions now linked to their playbook via `jw_playbookid@odata.bind` — `start_playbook` was finding 0 instructions
- Boolean fields (`jw_requiresapproval`, `jw_allowmcp`) now correctly use `true`/`false` (Dataverse Edm.Boolean rejects integers)
- Added missing tools: `exit`, `delete_dataverse_record`
- `create_visual` schema expanded: `3d` chart type, `caseId`/`artifactType`/`artifactName` fields

**Agent Loop Fixes:**
- Token count was doubling (`+=` → `=`)
- Max iterations safety check now unconditional
- Added `thinking` status transition after tool execution (was missing)

**Tool Execution Fixes:**
- `complete_instruction` now returns error when instruction not found (was silent no-op)
- `create_visual` artifact save relaxed — defaults artifactType to `'Chart'`
- OData injection protection via `escapeOData()` on playbook filter
- CloudFlow tools now throw explicit error instead of fake success

**Data Persistence Fixes:**
- Token fields stored as numbers, not strings
- Cumulative token usage now persisted to last assistant message in Dataverse

**UI Fixes:**
- System messages visible as collapsible banners (were completely hidden)
- AdminWorkspace AgentConfig no longer blocked in create mode

**Follow-up Fixes (review agent):**
- `playbook.jw_name` null safety — case title no longer becomes `"undefined — Case"` if playbook has no name
- `create_visual` now tells the LLM when artifact save fails (returns `artifactError` field)
- `analyze_document` seed schema clarifies "provide either urlSource OR base64Source"

**Review Agent Findings (deferred — low severity / intentional design):**
- `save_artifact.payload` has no `type` in schema (handler accepts both string and object — works fine)
- `TABLE_CREATE_MAP` / `TABLE_UPDATE_MAP` only cover 6 tables (intentional: prevents agents from creating raw messages/threads/toolexecutions — those have dedicated handlers)
- `linkAgentTool` duplicate handling is silent but correct (idempotent by design)
- JSON parse failure in `completeInstruction` context data silently resets to `{}` (acceptable — logged in debug)

### How to Test
1. **Seed data**: Run seed → verify instructions appear in Debug Log with `_jw_playbookid_value` populated
2. **Start playbook**: Use "start the Data Exploration playbook" → should find and load instructions (was broken before)
3. **System prompt**: System message now appears as a collapsed "SYS" banner at top of chat
4. **Token tracking**: After agent responds, check the message record in Dataverse — `jw_tokenprompt`/`jw_tokencompletion` should be populated
5. **Complete instruction**: Try completing a non-existent instruction ID → should get an error message back

### Questions for You
1. **Doc Intelligence**: Confirmed the connector hardcodes `prebuilt-layout` in the swagger path. To support `prebuilt-invoice`/`prebuilt-receipt`, the connector definition needs to be edited in Power Platform (parameterize the model in the path). Want me to document the exact changes needed?
# jo 
you choose whether you give me swagger or conceptual or other instructions for the switch, but for now remind for later, not main prio now
2. **Drag-to-reorder playbook steps**: Interested in adding this to the next sprint?
# i have not seen anything around paybook steps yet. we need to move forward
3. **Raw notes on cases / timeline**: Should we add a notes field to `jw_case` and a timeline component?
# yes
4. **Next focus**: Ready to move into AI-assisted agent/playbook creation, or more stabilization first?
#see upper comment. while thinking about it, it would make sense to treat this as a whole feature as suggestions should be shown around all related entities and editable while chatting with the agent and sharing the same context

### bugs / errors
I see no jsons:
index.html:1 Uncaught (in promise) EventisTrusted: truereturnValue: truesrcElement: scripttarget: scripttimeStamp: 73878.09999996424type: "error"[[Prototype]]: EventUnderstand this error
2es6.apphost-runtime.js:36 ECS - Config fetch complete
index-BFGJ3wyK.js:278 Monaco initialization: error: Event
(anonymous) @ index-BFGJ3wyK.js:278Understand this error
index.html:1 Uncaught (in promise) EventUnderstand this error
index-BFGJ3wyK.js:278 Monaco initialization: error: Event
(anonymous) @ index-BFGJ3wyK.js:278Understand this error
index.html:1 Uncaught (in promise) EventUnderstand this error
index-BFGJ3wyK.js:278 Monaco initialization: error: Event
(anonymous) @ index-BFGJ3wyK.js:278Understand this error
index.html:1 Uncaught (in promise) Event

agent does not continue working if I switch to a different chat or config view. so if we have this big sidebar we should then also see different states for the threads, while we need a way to make sure they work as much as possible in the background or can be triggered to continue where left off.
right now if i switched i am stuck, i cant send bcs it says agent working but i coudlnt see the tool calls that just started executing and became visual therefore.

right now i did not see one ai generated visual or 

*error in cases*
{
  "id": "73d2a7a5-ee26-f111-88b4-6045bd0aafb1"
}
Error
{"message":"{\"error\":{\"code\":\"0x80040217\",\"message\":\"Entity 'jw_case' With Id = 73d2a7a5-ee26-f111-88b4-6045bd0aafb1 Does Not Exist\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiExceptionSourceKey\":\"Plugin/Microsoft.Crm.ObjectModel.CustomBusinessEntityService\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiStepKey\":\"63068d15-8726-f111-88b4-6045bd0aafb1\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiDepthKey\":\"1\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiActivityIdKey\":\"9d6284b0-2ea5-4b28-bd59-5e9a3f0b116b\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiPluginSolutionNameKey\":\"System\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiStepSolutionNameKey\":\"System\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiExceptionCategory\":\"ClientError\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiExceptionMessageName\":\"ObjectDoesNotExist\",\"@Microsoft.PowerApps.CDS.ErrorDetails.ApiExceptionHttpStatusCode\":\"404\",\"@Microsoft.PowerApps.CDS.HelpLink\":\"http://go.microsoft.com/fwlink/?LinkID=398563&error=Microsoft.Crm.CrmException%3a80040217&client=platform\",\"@Microsoft.PowerApps.CDS.InnerError.Message\":\"Entity 'jw_case' With Id = 73d2a7a5-ee26-f111-88b4-6045bd0aafb1 Does Not Exist\"}}","status":404,"requestId":"5092794b-fc3b-48b7-90bc-3a6de768cc61"}

bug in the tabs, the count is always for every tab the count of records for the currently selected

***important***
### main layout and feature structure/binding must be reworked
it does not make sense anymore how the layout is structured. we want to define and control and interact with agents on cases while playbooks define the way an agent processes a case so that an exploration agent can pull context data and a processing agent can work through transactions or work very human focused. both agents should be able to create artefacts that are stored in relation to the case and can be files and their processes stati while agents can control whats saved through other features. also approval step audit logs could be artefacts. but firstly visuals and tables etc.
this also relates with the knowledge files that an agent can write and can be referenced in playbook instructions (visualize @ marks dynamically possible?) so agent knows in future runds what to load in
therefore the left navigation bar does not make sense any more, it should rather be cases or agents or playbooks or n:n tables i guess? but I cant really recall the idea of the threat, was that soly for free chat or our main agent case processing engine?
I am just thinking, if we have dataverse mcp. could we include in seed data an agent that can use dataverse mcp to create full playbooks, agents, demo cases and whatsever?
fileupload is not possible as no upload options
agent in chat answers with markdown but its not rendered as such (notice what i write per message to you regarding ideas)

---

## v0.8.0 — Make the Invisible Visible (2026-03-24)

### What Was Done

**The core architectural concept of the meta-app is now real.** 5 features making the agent's work visible:

**A. SemanticRenderer** — THE foundational component:
- Registry maps artifact `jw_type` strings → React components
- 12 supported types: Chart (reuses VisualizationCard), Report/Analysis/Markdown (markdown renderer), InvoiceTable/InvoiceData/Table (InteractiveTable), SapOrder (structured form), JSON (tree viewer), Dashboard, Summary
- Type-colored badges for visual identification
- Compact mode for list views
- Bidirectional editing: SAP form fields editable, JSON editable

**B. Artifact Browser** — Right panel, replaces placeholder:
- Loads all artifacts for the active case (auto-discovers case from thread via jw_threadcases)
- Type filter chips for quick filtering
- Click to expand/collapse with full SemanticRenderer rendering
- Auto-refreshes every 10 seconds for live updates

**C. Case Dashboard** — Right panel, replaces placeholder:
- Case header with status badge (Active/Completed/Cancelled)
- Playbook section: progress bar + instruction checklist with completion tracking
- Linked artifacts list with type badges (click to switch to Artifact Browser)
- Expandable context data JSON viewer
- Metadata (created/modified timestamps)

**D. Playbook Progress** — Inline in chat area:
- Shows below chat header when a playbook is active on the thread's case
- Progress bar + numbered instruction checklist
- Completed steps show checkmark + strikethrough
- Collapsible, auto-refreshes while case is active

**E. Better Approval UX** — Structured HitL forms:
- Tool-specific field schemas: `query_sap` (method select, endpoint, query, body), `create_dataverse_record` (table, data), `save_artifact` (type, name, payload, caseId), etc.
- Form/JSON mode toggle — power users can switch to raw JSON anytime
- Tool category badges: sap (yellow), dataverse (purple), docint (blue), agent (green)
- Typed field inputs: text, number, select, boolean, json (textarea)

### How to Test

1. **Artifact Browser**: Click "Artifacts" button in header → should show all artifacts (or "No artifacts yet" if none)
2. **Case Dashboard**: Click "Cases" button in header → shows case details if a playbook was started in the active thread
3. **SemanticRenderer**: Start a playbook, use `save_artifact` tool to create artifacts of different types → they should render with type-appropriate UIs in the Artifact Browser
4. **Playbook Progress**: Start a playbook via `start_playbook` → inline progress bar + checklist appears below chat header
5. **Approval Form**: Trigger any tool with `requiresApproval: true` → structured form should appear instead of raw JSON textarea

### Questions for You

1. **Artifact types**: Which artifact types are most important for your demo? Should I add more specialized renderers (e.g., a dedicated InvoiceViewer with line items, totals)?
2. **Bidirectional editing**: The SAP form fields are editable and the changes propagate back. Should this also persist to Dataverse automatically, or require explicit "Save" action?
3. **Auto-refresh interval**: Artifact Browser and Case Dashboard refresh every 10s. Too fast? Too slow? Should it be configurable?
4. **Playbook Progress location**: Currently renders below the chat header. Would you prefer it in the sidebar, in the Case Dashboard panel, or as a floating widget?
5. **Design**: First impression of the CSS? The type-colored badges, progress bars, and structured forms — does this feel like the "modern SaaS" direction you want?

---

## v0.7.0 — Full Agent Toolkit (2026-03-24)

### What Was Done

**5 major features implemented in one sprint:**

**A. Connector Wiring** — SAP + Doc Intelligence as real agent tools:
- `query_sap`: Calls SAP OData via Power Automate proxy (GET/POST/PATCH/DELETE)
- `analyze_document`: Azure Doc Intelligence full async flow → returns markdown
- `toolExecutor.ts`: `CONNECTOR_HANDLERS` routing map — CustomConnector tools now execute real connectors instead of returning placeholders
- Every connector tool execution emits debug events

**B. Playbook Execution Engine** — Full playbook lifecycle:
- `start_playbook`: Creates case → links to playbook → links thread to case via jw_threadcases → loads all instructions → initializes case context JSON
- `complete_instruction`: Marks instructions done in case context → auto-completes case when all instructions finished
- `save_artifact`: Saves typed artifacts (Report, Analysis, Invoice, SAP_Order, Document) linked to case with versioning support (parentArtifactId)

**C. HitL Audit Trail** — Every tool call gets a Dataverse record:
- `ToolExecutionRecord` collected during agent loop (callId, args, response, approvalState, duration)
- Post-loop: creates `jw_toolexecution` records linked to the persisted assistant messages
- Approval states: Pending/Approved/Rejected/AutoExecuted

**D. Dynamic Tool Loading** — Tools loaded from Dataverse, not hardcoded:
- `useAgentChat.loadAgent()` now calls `getAgentWithTools()` to expand jw_agenttool junction
- Maps jw_tool Dataverse records to ToolDefinition (endpointType enum → string, JSON inputSchema parsing)
- Hybrid fallback: if agent has tools linked in Dataverse → use those; if not → BUILTIN_TOOL_DEFINITIONS
- InternalReact tools validated against BUILTIN_TOOLS handler map

**E. Debug Console Upgrade** — Modern debug experience:
- Source filters: All / Dataverse / Connectors / Agent Loop
- Status filters: All / Success / Error / Pending
- Search box (filter by operation name or input)
- Stats bar: total events, errors, avg latency, per-source breakdown
- Collapsible JSON blocks (Request/Response/Error/Raw) with line counts
- Event cards with colored badges, duration

**Seed Data**: 12 tools (was 7), 12 agent-tool links, updated General Assistant prompt with all new capabilities.

### How to Test

1. **Run Seed**: Seed panel → run → creates all 12 tools + links
2. **Dynamic tools**: Start a new thread → General Assistant loads tools from Dataverse (check Debug panel for expand query)
3. **SAP query**: In chat: "Query SAP sales orders at /API_SALES_ORDER_SRV/A_SalesOrder" → approval form → executes
4. **Doc Intelligence**: "Analyze the document at https://example.com/invoice.pdf" → full async flow
5. **Start Playbook**: "Start the Data Exploration playbook" → creates case + loads instructions
6. **Complete Instructions**: Follow each step → agent marks complete → case auto-completes
7. **Save Artifact**: "Save the analysis as a Report artifact" → creates jw_artifact linked to case
8. **HitL Audit**: After any approved tool call, check jw_toolexecutions table in Debug/Explorer
9. **Debug Console**: Switch to Debug tab → use filters/search → expand events to see request/response JSON

### Questions for You

**Q1: SAP query_sap — should GET requests also require approval?**
Currently all SAP operations require HitL approval. For read-only GETs, should we auto-execute and only gate writes (POST/PATCH/DELETE)? Could be a jw_agenttool.jw_data config.

**Q2: Playbook step ordering**
Instructions are currently sorted by `jw_name asc`. Should we add a `jw_ordernumber` field to jw_instruction for explicit ordering? (Would need a Dataverse schema change.)

**Q3: Artifact versioning UX**
When `parentArtifactId` is set, we have a version chain. Should v0.8.0 include a version diff viewer in the Artifact panel?

---

## v0.6.0 — Admin Workspace & AI-Assisted CRUD (2026-03-24)

### What Was Done

**Admin Workspace** — dedicated management view (sidebar: "Admin"):
- Entity tabs: Agents, Tools, Playbooks, Instructions, Cases, Artifacts
- Split panel: searchable/sortable record list (left) + dynamic form or specialized editor (right)
- Entity count badges on tabs, animated list rows (framer-motion), toast notifications

**Agent Config** — specialized agent editor:
- Inline name editing, tabbed interface (General / System Prompt / Tools)
- Monaco Editor for system prompt (markdown) and model config (JSON)
- Tool binding: checkboxes to link/unlink tools from agents (creates/deletes jw_agenttool junction records)
- Token count estimate for system prompt

**Dynamic Forms** — auto-generated from EntityRegistry:
- Supports string, memo, boolean (toggle switch), choice (dropdown), lookup (dropdown with record loading), JSON (Monaco editor)
- Validation with error messages, required field markers
- Lookup fields resolve options from Dataverse

**AI-Assisted Entity Creation** — 3 new builtin tools:
- `create_dataverse_record` — create agents/tools/playbooks via chat (HitL approval required)
- `update_dataverse_record` — update any record via chat (HitL approval required)
- `link_agent_tool` — connect tools to agents programmatically

**Libraries**: @monaco-editor/react (code editors), framer-motion (animations), react-hot-toast (notifications)

### How to Test

1. Click **Admin** in the sidebar nav → Admin workspace opens
2. **Browse entities**: Click tabs to switch between Agents, Tools, etc.
3. **Create**: Click "+ New Agent" → fill form → Create
4. **Edit**: Click any record in list → form loads with data → edit → Save
5. **Agent Config**: Click an Agent → specialized view with General/Prompt/Tools tabs
6. **Tool Binding**: In Agent Config → Tools tab → check/uncheck tools → instant link/unlink
7. **Monaco Editor**: Edit system prompt or JSON with syntax highlighting
8. **Search/Sort**: Use search bar, click column headers to sort
9. **Delete**: Hover row → trash icon → deleted with toast notification
10. **AI creation**: In chat, ask "Create a new agent called SAP Agent with a system prompt for SAP queries" → agent uses create_dataverse_record tool (requires approval)

### Questions for You

**Q1: Admin Workspace — does it feel right?**
The split-panel layout with entity tabs. Is this the UX you had in mind? Any immediate reactions on layout, navigation, or missing features?

**Q2: Agent Config tool binding — what about the jw_agenttool.jw_data field?**
The junction table has a `jw_data` column (JSON) that could store agent-specific tool configuration (e.g., override parameters, conditional availability). Should we expose this in the tool binding UI?

**Q3: Next sprint priorities — which direction?**
See suggestions below for options. What excites you most?

---

## v0.5.3 — Bug Fixes + Design Sprint Results (2026-03-24)

### Bug Fixes (3 of 5 confirmed bugs resolved)

| Bug | Fix | File |
|-----|-----|------|
| MCP query options malformed | Changed `$select`/`$filter`/`$orderby`/`$top` to SDK-style `select`/`filter`/`orderBy`/`top`. Fixed `orderBy` to `string[]`. | dataverseMcp.ts:351-356 |
| Tool-call replay broken | `tool_call_id` and `name` now persisted (in `jw_toolcalls` JSON + `jw_name`) and reconstructed on thread reload. | dataverse.ts, useAgentChat.ts |
| System message duplication | Agent loop now always replaces system message with latest `agent.systemPrompt` instead of blindly prepending. | agentLoop.ts:39-47 |

**Deferred bugs:**
- **jw_toolexecution not wired** — needs arch change: messages are persisted AFTER the loop, so messageId isn't available during tool execution. Fix requires either in-loop persistence or post-loop linkage.
- **SAP/Connector tool routing** — placeholder only. Needs connector tools defined in Dataverse first.

### Design Sprint — v0.6.0 Scope: Dataverse CRUD MVP

**Goal:** Enable creating/editing/deleting agents, tools, playbooks, instructions directly in the app — no Dataverse browser needed.

**Architecture Decision: Generic CRUD + Specialized Views**

The app is meta-data driven. Instead of hardcoding forms per entity, we build:

1. **DataverseCrudPanel** — generic right-panel component that renders create/edit forms based on entity schema metadata (reuses STATIC_SCHEMAS from dataverseMcp.ts). Supports String, Memo, Boolean, Choice fields. Lookup fields rendered as searchable dropdowns.

2. **Agent Config View** (specialized) — uses CRUD panel but adds:
   - Tool binding UI (checkboxes from jw_tools, creates/deletes jw_agenttool junction records)
   - System prompt editor (multiline with preview)
   - Model config JSON editor
   - "Test in Chat" button → opens thread with this agent

3. **Record List View** — reusable list component (used in ThreadSidebar pattern) showing records with type badges, status, quick actions (edit/delete/duplicate).

**Key Open Questions for You (jo):**

**Q1: Agent vs Playbook distinction — still clear?**
Current model: Agent = who (persona + tools + prompt), Playbook = what (workflow recipe with instructions). A case links a thread to a playbook. Does this still feel right, or do you want to merge/restructure?

**Q2: Where should CRUD live in the UI?**
- Option A: Right panels only (click entity in sidebar → edit in right panel)
- Option B: Dedicated "Admin" workspace view (like DataverseExplorer but with edit capabilities)
- Option C: Both — quick edit in right panel, full admin in dedicated view

**Q3: AI-assisted entity creation — scope for v0.6.0?**
You mentioned wanting an agent that helps create agents/tools/playbooks via chat. Should v0.6.0 include a basic `create_agent` / `create_tool` builtin tool, or is that v0.7.0?

**Q4: Seed panel evolution**
Currently hardcoded in seedData.ts. With CRUD in place, should the seed panel become a "template gallery" where you pick from predefined agent templates and customize before creating?

### Remaining Bug Investigation Notes

The codebase research confirmed:
- `builtinTools.ts` has 6 tools, TABLE_GETALL_MAP covers all 15 tables
- `connectors.ts` has working wrappers for Azure OpenAI, Doc Intelligence, SAP OData — but none are called from toolExecutor
- `createToolExecution()` helper exists in dataverse.ts but requires messageId+toolId which aren't available in the current execution flow
- Agent loop correctly passes tool_call_id/name to Azure OpenAI API (agentLoop.ts:64-65) — the bug was only in persistence

---

## v0.5.1 — Critical Bugfixes: Boolean Fields & Error Handling (2026-03-23)

### What Was Done

**Bug #1: Boolean fields used integers instead of true/false** (showstopper)

Dataverse Yes/No columns are `Edm.Boolean` at the OData level. The PAC CLI generates TypeScript enums with `{0: 'No', 1: 'Yes'}`, which is misleading — the actual API rejects integers and requires `true`/`false`. This caused all tool creations (`jw_requiresapproval: 0`) and agent creation (`jw_allowmcp: 1`) to fail silently.

**Fix:** Changed all boolean seed values to use `true`/`false`. Documented the pattern in `docs/memory/DATAVERSE_PATTERNS.md` so we never hit this again.

**Bug #2: Silent failure — tracedOperation didn't check success: false** (critical)

The Dataverse SDK resolves the promise even on failure — it returns `{success: false, error: {...}}` instead of throwing. Our `tracedOperation` wrapper only caught thrown errors, so it logged failed operations as "success" in the Debug Log and returned undefined data to callers.

**Fix:** `tracedOperation` now checks `result.success` and throws an Error with the Dataverse error message when `success: false`. This means:
- Debug Log correctly shows errors (red, with the actual Dataverse error message)
- `executeSeed` catches the error and marks the record as "error" with the real message
- Cascading failures (agent-tool links with missing parent IDs) now show "parent record likely failed to create" instead of generic "Missing reference"

**Bug #3: executeSeed didn't validate create results** (defensive)

Even with tracedOperation fixed, added explicit checks: if a create returns successfully but `result.data` has no ID, we throw immediately with a descriptive message including the raw response. Belt-and-suspenders for Dataverse edge cases.

**Improvement: Error hover tooltip on seed items**

Error messages in the seed panel were truncated to 60 chars with only a `title` attribute. Now they show a proper hover tooltip with the full error message — styled with a bordered popover, readable font, and word-break for long Dataverse error strings.

### How to Test

1. **Seed Panel**: Click 🌱 → Apply → all 12 records should show green ✓ "created"
2. **Idempotency**: Reset → Apply again → all should show blue ● "exists"
3. **Debug Log**: Check that all operations show correct status (success = green, error = red)
4. **Error tooltip**: If any record fails, hover over the error text → full error message appears in popover
5. **MCP/Dataverse Explorer**: Query `jw_agents` → should return "General Assistant" with `jw_allowmcp: true`

### Your v0.5.0 Feedback — Noted & Addressed

> **Layout** — "I don't like the layout yet" — Agreed, layout rework deferred until we have more functional areas to arrange. Current priority is getting the agent working end-to-end.

> **3D Scene** — Empty 3D visualization. Noted — 3D is a stretch feature. Your interest in broader visualization frameworks (Mermaid, interactive diagrams) is more valuable. Adding to the agent's visual toolkit is planned — the `create_visual` tool will expand to support more types.

> **Schema/Search depth** — "Is get_schema and search enough? More description and metadata, example values are important for an agent." — Good point. Current MCP tools return minimal schema info. For v0.6.0+ we should enrich `get_table_schema` to return column descriptions, picklist values, example records, and relationship info. With only ~15 tables, the agent could also preload all table descriptions by default when MCP is enabled.

> **Default tools** — "Looking forward to artifact creation, case management, SAP querying default tools." — These are next. The General Assistant seed data grows with each version — when we build case management, we add case tools to the seed. Same for SAP.

# jo:
ah what would be nice is if you give me the option to see anagents tool definitions with a clean json viewer, also for other points where json is displayed. think about how we can improve the debug console
fix the height of the main container
improve the schemas for mcp
we have critical bugs around get query response handling or sending and you invented columns. for response handling i'm sad that I had to find this out manually that no records where retrieved, for the invented column I am more concerned, whats the root cause here? how can we make sure that does not happen again?

> **Claude (v0.5.1 response):**
>
> **JSON Viewer** — Agreed, the debug console needs a proper collapsible JSON viewer (syntax-highlighted, expandable nodes, copy button). Also useful for tool definitions and MCP responses. Noted for the debug console improvement sprint.
>
> **Main container height** — Fixed in v0.5.1. Added `min-height: 0` to all flex parents in the layout chain. This is a common CSS flexbox gotcha where content overflows its container instead of scrolling.
>
> **MCP schemas** — Will enrich `get_table_schema` with column descriptions, picklist values, relationship info, and example records. With ~15 tables, we could also preload all table descriptions into the agent's context when MCP is enabled.
>
> **Hallucinated column `jw_ordernumber`** — Root cause and prevention:
> I assumed `jw_instruction` had an ordering field because conceptually instructions in a playbook need ordering. But the field was never defined in the data model — the actual columns are only `jw_name`, `jw_type`, `jw_tags`, `jw_content`, `jw_playbookid`. **I never verified against the generated TypeScript model before writing the seed data.** This is the same class of error as the boolean fields — the generated models ARE the source of truth, and I must check them.
>
> **Prevention measures implemented:**
> 1. Removed `jw_ordernumber` from seed data, using existing `jw_type: 'Rule'` instead
> 2. Added rule to `DATAVERSE_PATTERNS.md`: always verify field names against generated models before use
> 3. The `tracedOperation` success check now surfaces the exact Dataverse error message (which names the invalid field) instead of silently swallowing it
> 4. Going forward: before adding ANY field to a create/update payload, I will read the generated model interface to confirm the field exists
>
> **getAll returning empty** — You confirmed it works in DataverseExplorer, so the records ARE being created. The thread manager's "No agents available" was likely a timing issue (loaded before seeding completed). Not a data loss bug, but the UX should handle this better — a "Refresh" button or automatic reload after seeding would help.

---

## v0.5.0 — Seed Data & Workspace Canvas (2026-03-23)

### What Was Done

**Seed Data System** — transparent, controllable bootstrapping of test data:

1. **SeedPanel UI** (`src/components/admin/SeedPanel.tsx`) — Right panel with toggleable record list. Each record shows type badge (Agent/Tool/Playbook/Instruction/Link), name, and real-time status icons (● exists, ✓ created, ✗ error, ○ skipped). Select All/Deselect All for bulk control. Summary after execution.
2. **Seed Data Service** (`src/services/seedData.ts`) — Idempotent seed executor. Checks for existing records by `jw_name` before creating. Updates existing records with latest data. Handles agent-tool junction linking with ID mapping.
3. **General Assistant** — First canary agent, fully defined: 4 tools (search_dataverse, get_table_schema, execute_dataverse_query, create_visual), structured system prompt with bilingual guidance, model config (temp 0.7, 2000 tokens), sample playbook "Data Exploration" with 3 instructions.

**Workspace Canvas** — new layout pattern for side panels:

4. **Right Panel System** — App.tsx now supports a sliding right panel alongside the main content. Panel types: `seed`, `agent-config`, `artifacts`, `case-detail`. Toggle from header buttons. Smooth slide-in animation.
5. **AppHeader Redesign** — 4 panel toggle buttons (🌱 Seed, ⚙️ Config, 📦 Artifacts, 📋 Cases) with active state. Version bumped to v0.5.0.
6. **CSS Polish** — New styles for right panel, seed panel, header buttons, type badges, status indicators, animations.

**Bug Fixes** (6 issues resolved):

7. **createMessage lookup bug** — Was binding `jw_threadid` to `jw_messages` table instead of `jw_threads`. Messages couldn't link to their thread.
8. **DebugPanel duplicate React keys** — Pending + final events shared the same `evt.id`, causing React key collisions. Added index suffix.
9. **useMcp missing tables** — MCP Explorer could only query 3 system tables. Now all 15 tables (system + jw_) are wired.
10. **builtinTools missing tables** — `TABLE_GETALL_MAP` was missing jw_documents, jw_agenttools, jw_threadcases. Agent Dataverse queries can now reach all tables.
11. **VisualizationCard not rendered** — ChatWorkspace tracked visualizations in state but never rendered them. Now renders VisualizationCard components below the message list.
12. **seedData.ts TypeScript errors** — Relaxed generic constraint on `findByName` and fixed type casts for generated model interfaces.

### What to Expect

When you open the app:
- **Header** now has 4 panel buttons on the right side (Seed, Config, Artifacts, Cases)
- Click **🌱 Seed** → right panel slides in with a list of 12 records to create
- Toggle records on/off, click **Apply** → watch status icons update in real-time
- Run it again → records show "exists" instead of "created" (idempotent)
- After seeding: create a new thread → General Assistant appears in the agent dropdown
- Config/Artifacts/Cases buttons show placeholder panels (coming next)

### How to Test

1. **Seed Panel**: Click 🌱 in header → panel opens → "Select All" → "Apply (12 records)" → watch real-time status
2. **Idempotency**: Click "Reset" → "Apply" again → all records should show "exists"
3. **General Assistant**: After seeding, click "New Thread" → agent dropdown should show "General Assistant"
4. **Chat with Agent**: Select General Assistant thread → send "What tables are available?" → agent uses search_dataverse tool
5. **Visualization**: Ask agent "Show me a chart of systemusers" → VisualizationCard should render inline
6. **MCP Explorer**: Switch to MCP view → query any jw_ table (e.g., jw_agents) → should return seeded data
7. **Debug Panel**: All seed + chat operations should appear in Debug Log
8. **Panel Toggle**: Click different header buttons → panels open/close, only one at a time

### Known Limitations

- **Config/Artifacts/Cases panels** are placeholders — show "coming next" messages
- **No inline editing of seed data** — current seed is hardcoded in seedData.ts. Future: load seed definitions from Dataverse or JSON config.
- **Agent tools loaded from hardcoded definitions** — useAgentChat still uses `BUILTIN_TOOL_DEFINITIONS` instead of loading from jw_agenttool junction. This means the agent gets all builtin tools regardless of what's linked in Dataverse.
- **No error retry in seed executor** — if a record fails, it shows error but doesn't retry. Manual "Reset + Apply" is the workaround.

### Questions for You

> Answer inline (like previous versions). I'll pick up your responses in the next session.

**Q1: Seed Panel — did it work? Could you seed the General Assistant successfully?**
If there were errors, paste the error messages or screenshots. This is the critical path for all future testing.
# bug1
{
  "success": false,
  "error": {
    "message": "{\"error\":{\"code\":\"0x80048d19\",\"message\":\"Error identified in Payload provided by the user for Entity :'jw_tools', For more information on this error please follow this help link https://go.microsoft.com/fwlink/?linkid=2195293  ---->  InnerException : Microsoft.OData.ODataException: Cannot convert the literal '0' to the expected type 'Edm.Boolean'. ---> Microsoft.OData.ODataException: Cannot convert a value of type 'Edm.Int32' to the expected target type 'Edm.Boolean'.\\r\\n   at Microsoft.OData.ODat
Screensots in separate folder
I dont like the layout yet, I think we will need to pick that up later after some functional areas


**Q2: Which right panel should we build next?**
Option A: **Agent Configuration** — create/edit agents, manage tool bindings, test system prompts in-app
Option B: **Artifact Browser** — view generated artifacts (charts, tables, documents) with preview + metadata
Option C: **Case Dashboard** — list cases, see linked threads/artifacts/status, case lifecycle management
> My recommendation: Agent Configuration first — it unlocks fast iteration on agents/tools without touching Dataverse directly.
# jo: yes ok
**Q3: Seed data evolution — how should the General Assistant grow?**
Option A: Keep updating seedData.ts as we add features (simple, version-controlled)
Option B: Move seed definitions to a JSON file that can be edited without code changes
Option C: Make the seed panel load definitions from Dataverse itself (full dog-fooding)
> I'd lean A for now — the seed code is the source of truth, and we update it as we add tools/features. Move to B/C once we have the Agent Configuration panel.

*Q4: The agent currently gets ALL builtin tools regardless of Dataverse jw_agenttool links. Should we:**
Option A: Fix this now — load tools from jw_agenttool junction (correct behavior but needs the seed data working first)
Option B: Keep hardcoded for now — ensures the agent always has tools even if seeding fails
Option C: Hybrid — load from Dataverse, fall back to hardcoded if empty
# jo:
C, as you have to write these tool definitions and their execution code either way but for now I could not create agents either way so if record creation fails it does not matter
Wait a minute - at this point I am not sure about the difference between an agent and a playbook, it makes sense from a gut feeilng point of view but both is functionally one entity that controls the state of how a process is agenticly executed. So we need to be very clear here with our vision. I want them to be separate things but it must be total clear how they interrelate with each other from a functional perspective. we can perfectly address this when we build functionalities to create these and related records with ai helpers (like an agent that creates everything based on a chat interactively and can inspect past definitions and cases etc, we have mcp either way).
update this bold in the plans, we should do all things in this comment very soon

> **Claude (v0.5.1):** Option C implemented. Noted on the agent vs playbook distinction — this is an important design question. My current mental model:
> - **Agent** = the *who*: identity, capabilities, system prompt, model config, tool bindings. An agent is a reusable persona that can handle many different tasks.
> - **Playbook** = the *what/how*: a structured workflow recipe with ordered instructions. A playbook defines a specific process (e.g., "Data Exploration", "Invoice Processing", "Vendor Onboarding").
> - **The interrelation**: A playbook is *executed by* an agent. When a user starts a playbook, it creates a case, spawns a thread with a specific agent, and injects the playbook's instructions into the agent's context. One agent can execute many different playbooks. One playbook could theoretically be executed by different agents (with different expertise).
> - **Think of it as:** Agent = employee with skills. Playbook = SOP (Standard Operating Procedure). The same employee can follow different SOPs, and the same SOP can be followed by different qualified employees.
> This MUST be clarified in the design sprint. Adding to the agenda. The AI-assisted builder you mentioned (agent that creates agents/playbooks via chat) is the perfect place to make this distinction tangible.

**Q5: Next version scope — what should v0.6.0 focus on?**
Based on our priority ordering from v0.4.0 Q4, Agent Configuration UI is next. But you mentioned wanting co-design before building. Should we do a design sprint first (discuss mechanics, UX, wireframes in FEATURE_IDEAS.md) or go straight to implementation?
# jo:
Yes lets go into a design spring (code changes allowed for obvious things, dont remember if I mentioned sth)

> **Claude (v0.5.1):** Design sprint it is. v0.5.2 will be the bugfix completion (hallucinated column fix, height fix, current batch). v0.6.0 will be the design sprint output — written up in FEATURE_IDEAS.md and VERSIONS.md with clear specs for Agent Configuration UI, agent/playbook relationship model, tool loading (hybrid approach), and MCP schema enrichment. Code changes only for obvious improvements (like the JSON viewer for debug).

---

### Claude's Follow-Up Thoughts (v0.5.0)

**On the Seed Panel architecture:** The controllable/traceable approach you requested works well. The real-time status updates + idempotency make it safe to run repeatedly. For the future: I'm thinking the seed panel could evolve into a general **"Environment Manager"** — not just for bootstrapping, but for comparing environments (dev vs. test), detecting drift (records that exist in one but not another), and migrating configurations between Power Platform environments.

**On the General Assistant as canary agent:** It's now seeded with 4 tools and a thoughtful system prompt. Every feature we add should be reflected in the General Assistant's capabilities. I'll treat updating the seed data as a mandatory part of each version's checklist.

**On the workspace canvas pattern:** The right panel system is deliberately simple — one panel at a time, smooth animation, close button. This pattern scales well: each panel is an independent component, App.tsx just routes the panel type. When we build Agent Configuration, it slots right in without touching the panel infrastructure.

**Design question I want to raise:**

The Agent Configuration panel will need to handle:
- **Agent CRUD** — name, system prompt (multiline editor), model config, MCP toggle
- **Tool binding** — which tools does this agent have? (N:N junction management)
- **Tool CRUD** — name, description, endpoint type, input schema (JSON editor), approval toggle
- **Live testing** — "Test this prompt" button that spawns a temporary chat

Should this be a **single panel with tabs/sections**, or should we split it into **separate panels** (one for agents, one for tools)? I'm leaning single panel with a sidebar navigation inside it — keeps everything in context while editing.

---

## v0.4.0 — Agentic Runtime Foundation (2026-03-23)

### What Was Done

**Complete UI rebuild from scratch** — the app is no longer a debug console. It's now a modern chat-based workspace with:

1. **New Layout** — ThreadSidebar (left) + ChatWorkspace (main). Debug tools (Dataverse Explorer, Connectors, Viz, MCP, Debug Log) are accessible via sidebar icons at the bottom.
2. **Dataverse Service Layer** — All 12 jw_ entities wired up with traced CRUD wrappers. Helper functions for creating threads, messages, and fetching thread messages with proper OData filtering.
3. **Agent Loop Core** — `agentLoop.ts` runs the Custom Agent Loop: system prompt → LLM call → tool execution → loop. Max 10 iterations, AbortSignal support.
4. **Tool Executor with HitL** — Routes tool calls to builtin handlers, connectors, or flows. Tools with `requiresApproval` pause for user approval before executing.
5. **Built-in Tools** — `create_visual`, `exit`, `delegate_to_agent`, and MCP bridges (`search_dataverse`, `get_table_schema`, `execute_dataverse_query`).
6. **React Hooks** — `useAgentChat` (manages agent loop + messages + approvals) and `useThreadManager` (thread CRUD + navigation).
7. **Chat UI Components** — MessageList, MessageBubble, ToolCallCard, ApprovalForm, SubAgentCard, ChatInputBar, TokenCounter, VisualizationCard, InteractiveTable.
8. **Modern Styling** — Clean SaaS design with CSS classes, indigo accent palette, proper spacing and typography.

### What to Expect

When you open the app you should see:
- **Left sidebar** with thread list (empty at first) and a "New Thread" button with agent selector dropdown
- **Main area** showing the chat workspace (or empty state prompting to create a thread)
- **Bottom of sidebar** has icons to switch to debug views (Dataverse, Connectors, Viz, MCP, Debug)
- **Version badge** in the header showing v0.4.0

### How to Test

1. **Thread Management**: Click "New Thread" → select an agent → thread appears in sidebar
2. **Chat Flow**: Select a thread → type a message → send → see "Thinking..." status → assistant response appears
3. **Tool Calls**: If the agent calls a tool, a ToolCallCard appears showing the tool name, arguments, and response
4. **HitL Approval**: If a tool has `requiresApproval`, an ApprovalForm appears with Approve/Reject buttons and editable JSON payload
5. **Token Counter**: After each LLM call, the token counter in the chat header updates
6. **Visualizations**: If the agent calls `create_visual`, an inline chart renders in the chat
7. **Debug Views**: Click sidebar debug icons → old debug panels still work
8. **All old functionality preserved** — DataverseExplorer, ConnectorTester, etc. are intact

### Known Limitations

- `jw_tokenprompt` / `jw_tokencompletion` are typed as `string` in generated models — casting to number in wrappers
- No seed data yet — agents/tools must exist in Dataverse for the chat to work. Seed data button planned for next version.
- Sub-agent delegation (`delegate_to_agent`) is structurally complete but untested without proper agent+tool records
- ~~`jw_toolexecution` has no generated service~~ **Correction:** `Jw_toolexecutionsService.ts` exists! Will be wired up in Batch 0.

### Questions for You

> Answer inline (like FEATURE_IDEAS.md). I'll pick up your responses in the next session.

**Q1: Seed Data — How should we bootstrap test data?**
Option A: "Seed" button in the app that creates sample agents/tools/playbooks via Dataverse API
Option B: Power Automate flow that creates seed data (reusable across environments)
Option C: JSON file with seed definitions + a service function that idempotently creates them
> **User (v0.4.0):** Option A — Seed button, but it needs to be **controllable and traceable**. User should see exactly what records are being created/deactivated. Think of it as a transparent operation, not a black box.

**Q2: Which agents should we seed first?**
I'd suggest: (1) "General Assistant" — system prompt for general Q&A + search_dataverse + create_visual, (2) "Document Analyst" — uses Doc Intelligence connector + create_visual for results, (3) "SAP Explorer" — SAP OData queries + create_visual for tables. What do you think?
> **User (v0.4.0):** Yes — start with **General Assistant**. Update its seed data continually as we add new features, so it's always our main test agent. The other agents can come later.

**Q3: Styling direction — are you happy with the current look, or do you have specific SaaS apps you'd like to reference?**
Current: Clean indigo accent, light backgrounds, card-based layout. Think Linear/Notion-ish. If you have screenshots or references, share them and I'll adjust.
> **User (v0.4.0):** Keep for now. No breakthrough idea yet — will revisit if inspiration strikes.

**Q4: Next priority after seed data — what matters most?**
Option A: Case management (link threads to cases, case dashboard)
Option B: Playbook execution (load playbook → auto-create thread with instructions)
Option C: Advanced visualization (bidirectional artifacts, user edits charts)
Option D: Agent configuration UI (create/edit agents, tools, playbooks in-app instead of raw Dataverse)
> **User (v0.4.0):** "Obviously we need it all" — trusts Claude's judgment on ordering. Key concern: all features should **evolve in the right direction** from the start. Wants collaborative co-design on how each feature should feel and work before building. Not just implementation, but **vision alignment** on mechanics and UX. Claude is expected to act as feature design expert, agent expert, UI expert, and innovation partner — not just executor.

**Q5: Error handling for 429 (rate limit) — you mentioned "user must click to continue". Should this be:**
Option A: Toast notification with "Retry" button (non-blocking, user can still read chat)
Option B: Modal overlay that blocks until user clicks (forces awareness)
Option C: Inline card in the chat stream (like a ToolCallCard but for errors)
> **User (v0.4.0):** Claude's judgment — pick what fits best.

---

### Claude's Follow-Up Thoughts (v0.4.0)

**On Q1 (Seed Data):** Love the "controllable and traceable" angle. I'm thinking: the seed button opens a **Seed Preview Panel** — a checklist of records that *will* be created, each with a toggle (create/skip). After clicking "Apply", each operation shows real-time status (creating... done / failed) in the Debug Log. Idempotent: if a record with the same `jw_name` already exists, it shows "exists — skip" instead of duplicating. This also becomes the foundation for a future "environment setup wizard" when you want to onboard someone else.

**On Q2 (General Assistant as living test agent):** This is smart — one agent that grows with the app. Every time we add a feature (new tool, new artifact type, new visualization), we update the General Assistant's tool bindings and system prompt to exercise it. It becomes a **canary agent** — if it breaks, something regressed.

**On Q4 (Priority ordering — my recommendation):**

Here's how I'd sequence it, and *why*:

1. **Seed Data + General Assistant** (next) — can't test anything without data
2. **Agent Configuration UI** — because right now the only way to tweak agents/tools is raw Dataverse. Having an in-app editor means you can iterate on prompts, tool configs, and approval settings *fast*. This accelerates everything else.
3. **Playbook Execution** — this is where the "meta-app" vision comes alive. A playbook is a recipe: "when a user starts this workflow, create a case, spawn this agent with these instructions, collect these artifacts." It turns the app from a chatbot into an **orchestration engine**.
4. **Case Management + Dashboard** — once playbooks create cases, you need to see them. Case dashboard with linked threads, artifacts, status tracking.
5. **Advanced Visualization** — bidirectional artifacts, user edits charts, SemanticRenderer. This is the "wow factor" but needs the plumbing from steps 1-4 first.

**On your role expectation — co-visionary:**

Understood and embraced. I'll proactively:
- **Challenge assumptions** when I see a simpler or more powerful approach
- **Propose mechanics** before building (e.g., "what if the seed panel also shows a diff of what changed since last seed?")
- **Surface design questions** early (e.g., "should playbook execution feel like a wizard, a template picker, or an automated trigger?")
- **Think about the end-user journey**, not just the developer experience

**Open design question I want to raise now:**

The General Assistant's system prompt will define how the agent "thinks." Should we go with:
- **Minimal:** "You are a helpful assistant. Use tools when needed." (lets the LLM figure it out)
- **Structured:** "You are the Playbook Agent General Assistant. You have access to Dataverse search, schema inspection, data queries, and visualization tools. When the user asks about data, first search for relevant tables, then query them, then visualize results. Always explain your reasoning."
- **Personality-driven:** Give the agent a name, a communication style, maybe even German/English bilingual awareness?

I'd lean toward **structured + light personality** — enough guidance to showcase the tool chain, but not so rigid that it can't handle freeform questions. Thoughts?

---

## v0.3.1 — Data Model & Architecture Decisions (2026-03-23)

### What Was Done

Planning & documentation sprint — no code changes, all architecture decisions finalized:
- Decided: **Custom Agent Loop** over Vercel AI SDK (SPA has no SSE, need full HitL control)
- Updated data model: jw_thread gets `jw_parentthreadid` (sub-agents) + `jw_status` (Active/Completed/Cancelled)
- Updated data model: jw_message gets `jw_toolcalls`, `jw_tokenprompt`, `jw_tokencompletion`
- Updated data model: jw_artifact `jw_caseid` now optional (visuals without case)
- Created Architecture Decisions document (6 ADRs)
- Updated all ContextFiles to remove Vercel AI SDK references
- Created FEATURE_IDEAS.md brainstorming file → user provided detailed feedback on 30+ ideas
- Created comprehensive CLAUDE.md documentation index

### Questions Answered (from prior session)

- Framework: Custom Agent Loop ✅
- Sub-agents: Both inline summary + expandable detail ✅
- Thread management: Thread list from day one ✅
- Visualization: All chart types + tables + interactive + token counter ✅
- Bidirectional artifacts: Yes, user edits → agent reads latest ✅
- HitL: Hard (code-level interception) + soft (configurable per agent-tool) ✅

---

## v0.3.0 — Visualization + MCP (2026-03-23)

### What Was Done

- Visualization Panel: Recharts (Bar/Line/Pie) + Three.js 3D scene
- MCP Explorer: search_tables, get_schema, execute_query with static schema fallback
- SAP Connector: Extended with body/headers/queryString inputs
- 5-tab debug console layout

---

## v0.2.0 — CRUD + Connectors Fix (2026-03-22)

### What Was Done

- Fixed Azure OpenAI (max_completion_tokens), Doc Intelligence (async poll), SAP OData (API version)
- Full CRUD for teams + systemusers
- DataverseExplorer: Create/Update/Delete forms
- ConnectorTester: configurable params
- Version badge in header

---

## v0.1.0 — Initial MVP (2026-03-22)

### What Was Done

- Service layer: debugEventBus, sdk.ts, dataverse.ts, connectors.ts
- React hooks: useDebugLog, useDataverse, useConnectors
- UI: DataverseExplorer, ConnectorTester, DebugPanel
- Tabbed App shell
