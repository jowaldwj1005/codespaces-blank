# Playbook Agent — Design, Issues & Roadmap

**Version:** 0.13.0
**Last Updated:** 2026-03-26
**Purpose:** Single source of truth for UX design, known issues, and implementation plan. Every session reads this FIRST.

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Known Issues (Severity-Ranked)](#2-known-issues)
3. [UX Flow Specification](#3-ux-flow-specification)
4. [Design Proposals & Open Questions](#4-design-proposals)
5. [Implementation Roadmap](#5-roadmap)
6. [Dead Code & Cleanup](#6-dead-code--cleanup)

---

## 1. Current State Audit

### What Works

| Feature | Status | Notes |
|---------|--------|-------|
| Azure OpenAI Responses API | Works | Multi-turn, function calling, web search, reasoning |
| Agent Loop (agentLoop.ts) | Works | Iterates: API call → tool extraction → execution → loop |
| Agent Loop Registry | Works | Survives tab switches; tab notification badges |
| InternalReact tool execution | Works | 16+ builtin handlers (search, query, CRUD, visual, etc.) |
| Dataverse CRUD (SDK-only) | Works | 15 tables with traced wrappers |
| Debug Console | Works | debugEventBus captures all SDK/connector calls |
| Admin Workspace | Works | Entity tabs, record list, create/edit forms, bulk counts |
| AgentConfig | Works | Tool binding, system prompt editor, model config |
| AgentCanvas | Works | Definition experience: overview, prompt, tools, instructions |
| DefinitionBuilder | Works | Step-by-step wizard for new agents and playbooks |
| UnifiedSidebar | Works | Icon rail + panel: cases tree, define section, dev tools |
| SemanticRenderer | Works | Bidirectional artifact rendering (Chart, Report, etc.) |
| Visualization (create_visual) | Works | 9 chart types via Recharts |
| Chat markdown rendering | Works | Custom renderer with code blocks, tables, links |
| Streaming | Works | Plain text during stream, markdown after; module-level dedup |
| Bidirectional artifacts | Works | Change accumulator → prepended summary before next message |
| Interactive cards (ask_user) | Works | choice, confirm, form, rating card types |
| Tab notification badges | Works | Pulsing dot when background agent completes |
| Playbook Progress | Partially works | Checklist renders, read-only, no auto-refresh trigger |
| CaseCanvas | Exists, partially wired | Component exists; sidebar case click may not open tab |
| SeedPanel | Works but buried | In Admin workspace, no auto-detect empty state |

### What's Broken or Missing

| Area | Issue | Severity |
|------|-------|----------|
| **File upload results** | Doc Intelligence results appended to user message text (not a card) | MEDIUM | - do, and can the user open the file/preview? we save the file right? so pdfs etc should easily made viewable by opening in a tab or popup? if complicated store idea for later
| **Markdown spacing** | `<p>` and `<br>` have too much margin in CSS | LOW | - do
| **Seed data not auto-detected** | No banner when no agents exist; user must know to go to Admin → Seed | LOW | - dont do for now

### Component Inventory

```
src/components/
├── chat/
│   ├── ChatWorkspace.tsx       ← Main chat container (header, messages, input)
│   ├── ChatInputBar.tsx        ← Toolbar (reasoning, web search, file upload)
│   ├── MessageList.tsx         ← Renders messages + tool cards + approval forms
│   ├── MessageBubble.tsx       ← Per-message: markdown + streaming (module-level dedup)
│   ├── ToolCallCard.tsx        ← Collapsible tool call display per tool type
│   ├── TokenCounter.tsx        ← Token usage display
│   ├── ApprovalForm.tsx        ← HitL approval UI (approve/reject/edit args)
│   ├── InteractiveCard.tsx     ← ask_user UI (choice, confirm, form, rating)
│   └── VisualizationCard.tsx   ← Recharts wrapper for create_visual results
├── case/
│   └── CaseCanvas.tsx          ← Case overview: header, threads list, artifacts
│                                  ISSUE: may not open from sidebar click
├── define/
│   ├── DefinitionBuilder.tsx   ← Step-by-step creation wizard (agent / playbook)
│   ├── AgentCanvas.tsx         ← Full-page agent editor (prompt, tools, instructions)
│   └── EntityCard.tsx          ← Preview card used in DefinitionBuilder + AgentCanvas
├── semantic/
│   ├── SemanticRenderer.tsx    ← Type → component dispatch for artifacts
│   ├── ArtifactBrowser.tsx     ← Artifact gallery/list (partially wired)
│   ├── CaseDashboard.tsx       ← Case summary dashboard (partially wired)
│   └── PlaybookProgress.tsx    ← Instruction checklist (read-only)
├── sidebar/
│   └── UnifiedSidebar.tsx      ← Icon rail + panel: cases tree, define, dev tools
├── layout/
│   └── WorkspaceTabs.tsx       ← Tab bar + content router
├── admin/
│   ├── AdminWorkspace.tsx      ← Entity management: tabs, list, forms
│   ├── RecordList.tsx          ← Data grid with search/sort
│   ├── RecordForm.tsx          ← Monaco editor for JSON fields, lookup binding
│   ├── AgentConfig.tsx         ← Agent editor with model config (Admin path)
│   ├── EntityRegistry.ts       ← Entity metadata (fields, types, display names)
│   └── SeedPanel.tsx           ← Seed data execution UI
└── dev/
    ├── DataverseExplorer.tsx   ← Mini model-driven app
    ├── ConnectorTester.tsx     ← Test Azure OpenAI, Doc Intel, SAP
    ├── VisualizationPanel.tsx  ← Chart playground
    ├── McpExplorer.tsx         ← MCP tool tester
    └── DebugPanel.tsx          ← Debug event log viewer
```

### Data Model vs UI Coverage

| Entity | Read | Create | Update | Delete | UI Location |
|--------|------|--------|--------|--------|-------------|
| jw_agent | Yes | Yes (DefinitionBuilder) | Yes (AgentCanvas, Admin) | Yes (Admin) | Sidebar Define, AgentCanvas |
| jw_tool | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace |
| jw_playbook | Yes | Yes (DefinitionBuilder) | Yes (Admin) | Yes (Admin) | Sidebar Define, Admin |
| jw_instruction | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace, AgentCanvas (read) |
| jw_agenttool | Yes | Yes (AgentCanvas, Admin) | No | Yes (AgentCanvas, Admin) | AgentCanvas Tools tab |
| jw_case | Yes | Yes (sidebar) | No UI | No UI | Sidebar case tree, CaseCanvas |
| jw_thread | Yes | Yes (case creation) | No UI | No UI | Sidebar, ChatWorkspace |
| jw_message | Yes | Yes (auto, loop) | No | No | ChatWorkspace |
| jw_artifact | Yes | Yes (auto, tools) | Yes (SemanticRenderer) | No UI | CaseCanvas, ArtifactBrowser |
| jw_document | Yes | Yes (file upload) | No | No | Not directly visible |
| jw_toolexecution | Yes | Yes (auto, audit) | No | No | AdminWorkspace (raw) |
| jw_threadcase | Yes | Yes (auto) | No | No | Not visible |

---

## 2. Known Issues

### P0 — None currently open

All P0 issues resolved:
- **ISSUE-001** (ask_user + get_artifact): Already in `seedData.ts` lines 437–511 with junction links. ✓
- **ISSUE-002** (CaseCanvas tab): `UnifiedSidebar.handleSelectCase()` already opens `case-canvas` tab. ✓

### P1 — Degrades User Experience

**ISSUE-005: ~~File upload context appended to user message~~** ✓ FIXED (v0.14)
- `useAgentChat.ts` now splits into `displayMsg` (content only + `attachmentMeta`) and `llmMsg` (content + full context)
- `AttachmentCard` in `MessageList.tsx` renders below the user bubble — shows file icon, name, pages/tables/chars, Analyzed/Failed badge
- LLM still receives full attachment context unchanged
- **Idea (future):** Add "Open" button to view artifact in a tab (requires threading `tabsManager` through `ChatWorkspace` → `MessageList`)

**ISSUE-006: ~~Markdown paragraph spacing too large~~** ✓ FIXED (v0.14)
- `.md-p` margin was already at `0 0 4px` from prior fix
- Added `.md-p:empty { display: none }` to suppress phantom empty paragraphs from invalid HTML nesting

**ISSUE-007: Seed data panel not discoverable**
- SeedPanel lives inside AdminWorkspace as a tab — user must know where to look
- New users with empty state have no guided path
- **Fix:** Auto-detect no agents → show "Run Seed Data" banner on the empty state screen

### P2 — Missing Features

**ISSUE-008: ~~No "New Thread" action in CaseCanvas~~** ✓ FIXED (v0.13)
- CaseCanvas now shows "+ Thread" button in the Threads card header
- Uses `caseManager.addThreadToCase()` — agent picker appears when multiple agents exist
- New thread opens automatically in a chat tab

**ISSUE-009: No artifact preview in chat**
- When an artifact is created via tool call, no inline preview appears
- User must navigate to the artifact tab separately
- **Fix:** Render mini artifact cards inline in chat after the tool call card

**ISSUE-010: ~~Playbook instruction completion not visible in CaseCanvas~~** ✓ FIXED (v0.13)
- PlaybookProgress now rendered directly in CaseCanvas when case has a playbook
- PlaybookProgress accepts `caseId` prop (skips threadCase lookup)
- Steps are interactive checkboxes — clicking marks them complete via `jwCases.update`
- Progress bar + counter always visible

---

## 3. UX Flow Specification

### Flow A: New User First Visit
```
1. App loads → Empty sidebar, no tabs
2. Show welcome / empty state with "Run Seed Data" banner (ISSUE-007)
3. Seed runs → sidebar shows "General Assistant" agent, sample playbook
4. User can click "New Case" to start
```
**Status:** Step 2 missing. User must know to go to Admin → Seed.

### Flow B: Create & Work with a Case
```
1. User clicks "+" in sidebar Cases section → New Case dialog
2. Enters title, selects agent → case + thread created
3. Case Canvas tab opens (or just the thread tab?)
4. Thread tab opens → chat with the agent
5. Agent creates artifacts → appear in Case Canvas
```
**Status:** Partially works. Step 3 may be missing (ISSUE-002). Step 5 works.
**Question:** When creating a case, should Case Canvas auto-open alongside the thread tab?
- yes. did we think about the case layout well enough? how artefacts and their optionally related file, added playboocs and agents etc are shown? I feel like we have a very idea about the usage
### Flow C: Define an Agent
```
1. User clicks "New Agent" in sidebar Define section
2. DefinitionBuilder wizard opens (name → system prompt → model config)
3. Agent created → AgentCanvas opens in new tab
4. User links tools, reviews instructions, tests in chat
```
**Status:** IMPLEMENTED in v0.13. DefinitionBuilder → AgentCanvas flow works.

### Flow D: Chat with Tool Calls
```
1. User sends message → status: "Thinking..."
2. API responds → assistant message appears (streaming plain text → markdown after)
3. If tool calls: tool cards appear inline under the message
4. If requiresApproval: ApprovalForm/InteractiveCard renders, loop pauses
5. User approves → tool executes → result shown in tool card
6. Loop continues → final assistant response with markdown
```
**Status:** Mostly works. ask_user never fires (ISSUE-001). Tool cards appear correctly.

### Flow E: File Upload & Document Analysis
```
1. User clicks paperclip → selects file
2. File uploaded → Doc Intelligence analyzes
3. Result saved as artifact in Dataverse
4. Agent gets meta-summary (MIME, pages, tables, preview, artifact ID)
5. Chat shows: user message + attachment card (ISSUE-005 — currently appended to message text)
6. Agent can use get_artifact to read full content (ISSUE-001 — get_artifact not wired)
```
**Status:** Steps 1-4 work. Steps 5-6 broken.

---

## 4. Design Proposals

### Proposal B: Case Canvas Enhancement

**Current state:** Shows title, status, threads list, artifacts list. Read-only.

**Proposed additions:**
1. PlaybookProgress component when case has a playbook (ISSUE-010)
2. "New Thread" button (ISSUE-008)
3. Case notes field (editable `jw_notes` — field may need to be added to Dataverse)
4. Activity timeline (recent tool executions, artifact changes)

**Priority order:** 1 → 2 → 3 → 4

### Proposal C: Chat Improvements

**C1: Attachment rendering (ISSUE-005)**
- Render as collapsible `<AttachmentCard>` between user message and assistant response
- Shows: filename, page count, table count, artifact link
- Collapsed by default, expandable for preview text

**C2: Inline artifact cards (ISSUE-009)**
- When agent calls save_artifact, show mini card in chat (below tool call card)
- Click opens artifact in new tab

**C3: Seed data empty state (ISSUE-007)**
- Detect no agents on load → show banner: "No agents found. Run seed data to get started."
- Banner links to SeedPanel

### Proposal D: First-Run Experience
- Auto-detect no agents → show "Run Seed Data" banner in empty workspace
- Do NOT auto-run seed (risky: user may have partially set up custom data)

---

## 5. Roadmap

### Now: Chat Polish

- [x] **ISSUE-005** — Attachment card (separate from user message text) ✓ v0.14
- [x] **ISSUE-006** — Markdown spacing CSS tighten ✓ v0.14
- [ ] **ISSUE-007** — Empty state banner → seed data (deferred)

### Next: Remaining Chat

- [ ] **ISSUE-009** — Inline artifact preview cards in chat (mini card below tool call)
- [ ] **IDEA** — AttachmentCard "Open" button → open artifact in tab (requires `tabsManager` prop threading)

### Phase 2: Playbook Execution

- [ ] Make PlaybookProgress interactive (checkbox → calls `complete_instruction`)
- [ ] "Start Playbook" action in CaseCanvas
- [ ] Case notes field (`jw_notes`)
- [ ] Activity timeline (tool executions, state transitions)

### Phase 3: Intelligence

- [ ] Agentic Learning Loop (`save_learning` tool → jw_instruction records)
- [ ] Bounded History with summarization (token budget management)
- [ ] Cost Dashboard (token aggregation per agent/case/user)
- [ ] Conditional Auto-Approval (rules in jw_agenttool.jw_data)
- [ ] Cross-Thread Context (search other threads for relevant knowledge)

---

## 6. Dead Code & Cleanup

### Orphaned Components (verify before deleting)

| File | Likely Status | Reason |
|------|--------------|--------|
| `src/components/layout/ActivitySidebar.tsx` | Orphaned | Replaced by UnifiedSidebar |
| `src/components/layout/activities/ChatActivity.tsx` | Orphaned | Part of old ActivitySidebar |
| `src/components/layout/activities/ConfigActivity.tsx` | Orphaned | Part of old ActivitySidebar |
| `src/components/layout/activities/ContextActivity.tsx` | Orphaned | Part of old ActivitySidebar |
| `src/components/layout/activities/DevToolsActivity.tsx` | Orphaned | Part of old ActivitySidebar |
| `src/components/layout/AppHeader.tsx` | Orphaned | Replaced by sidebar header |

**Action:** Grep for imports before deleting — verify no active references.

### Partially Wired Components (need connection)

| Component | What it does | What's missing |
|-----------|-------------|----------------|
| `ArtifactBrowser.tsx` | Browse case artifacts with type filter | Not in main UI routing |
| `CaseDashboard.tsx` | Case summary dashboard | Not referenced in active workspace |
| `PlaybookProgress.tsx` | Playbook instruction checklist | Read-only; not in CaseCanvas |

### Playbook Execution Gap

The full playbook execution flow has a gap:
1. `start_playbook` tool exists → creates case + thread link ✓
2. `complete_instruction` tool exists → marks steps done ✓
3. **PlaybookProgress is read-only** → user can't click checkboxes to complete steps
4. **No "Start Playbook" UI in CaseCanvas** → user must ask agent to start it via chat

**Fix plan:** Add "Start Playbook" action button + make PlaybookProgress checkboxes call `complete_instruction`.
