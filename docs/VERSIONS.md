# Playbook Agent — Version Notes

> Collaborative version file. Claude documents each release, user answers questions & shapes next steps.
> Format inspired by FEATURE_IDEAS.md — a living conversation, not just a changelog.

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
