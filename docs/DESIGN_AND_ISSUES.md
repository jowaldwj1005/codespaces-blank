# Playbook Agent — Design, Issues & Roadmap

**Version:** 0.13.0-draft
**Last Updated:** 2026-03-26
**Purpose:** Single source of truth for UX design, known issues, and implementation plan. Every future session reads this FIRST.

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Known Issues (Severity-Ranked)](#2-known-issues)
3. [UX Flow Specification](#3-ux-flow-specification)
4. [Design Proposals & Open Questions](#4-design-proposals)
5. [Implementation Roadmap](#5-roadmap)

---

## 1. Current State Audit

### What Works

| Feature | Status | Notes |
|---------|--------|-------|
| Azure OpenAI Responses API integration | Works | Multi-turn, function calling, web search, reasoning |
| Agent Loop (agentLoop.ts) | Works | Iterates: API call -> tool extraction -> execution -> loop |
| InternalReact tool execution | Works | 16 builtin handlers (search, query, CRUD, visual, etc.) |
| Dataverse CRUD (SDK-only) | Works | 15 tables with traced wrappers |
| Debug Console | Works | debugEventBus captures all SDK/connector calls |
| Admin Workspace | Works | Entity tabs, record list, create/edit forms, bulk counts |
| SemanticRenderer | Works | Bidirectional artifact rendering (Chart, Report, etc.) |
| Visualization (create_visual) | Works | 9 chart types via Recharts |
| Chat markdown rendering | Works | Custom renderer with code blocks, tables, links |
| Streaming simulation | Partially works | Re-streams ALL messages on tab switch (should only stream new) |
| Playbook Progress | Partially works | Checklist renders but no auto-refresh |
| CaseCanvas | EXISTS but unreachable | Component exists, not wired into sidebar |
| SeedPanel | EXISTS but buried | In admin workspace, but no obvious entry point |

### What's Broken or Missing

| Area | Issue | Severity |
|------|-------|----------|
| **ask_user tool** | Not in seed data tool records or junction links → never sent to API → LLM can't call it | CRITICAL |
| **get_artifact tool** | Same — missing from seed data + junction links | CRITICAL |
| **Case Canvas tab** | Sidebar click only loads case data, doesn't open a `case-canvas` tab | CRITICAL |
| **No creation wizards** | "New Agent", "New Playbook" in sidebar do nothing useful | HIGH |
| **SAP tool approval UX** | Tool requires approval but user may not see/understand the approval form | HIGH |
| **File upload results** | Doc Intelligence results appended directly to user message text | MEDIUM |
| **Tab switch loses state** | Incremental persistence added (v0.13) but streaming re-triggers | MEDIUM |
| **Markdown spacing** | `<p>` and `<br>` have too much margin in CSS | LOW |
| **Seed data not visible** | No obvious button to run seed data from main UI | LOW |

### Component Inventory

```
src/components/
├── chat/
│   ├── ChatWorkspace.tsx      ← Main chat container (header, messages, input)
│   ├── ChatInputBar.tsx       ← Input with toolbar (reasoning, web search, file upload)
│   ├── MessageList.tsx        ← Renders messages + tool cards + approval forms
│   ├── MessageBubble.tsx      ← Individual message with markdown + streaming
│   ├── ToolCallCard.tsx       ← Collapsible tool call display
│   ├── TokenCounter.tsx       ← Token usage display
│   ├── ApprovalForm.tsx       ← HitL approval UI (approve/reject/edit args)
│   ├── InteractiveCard.tsx    ← ask_user UI (choice, confirm, form, rating)
│   └── VisualizationCard.tsx  ← Recharts wrapper for create_visual results
├── case/
│   └── CaseCanvas.tsx         ← Case overview: header, threads list, artifacts list
│                                 PROBLEM: Not reachable from sidebar
├── semantic/
│   ├── SemanticRenderer.tsx   ← Type → component dispatch for artifacts
│   ├── ArtifactBrowser.tsx    ← Artifact gallery/list view
│   ├── CaseDashboard.tsx      ← Case summary dashboard
│   └── PlaybookProgress.tsx   ← Instruction checklist for active playbook
├── sidebar/
│   └── UnifiedSidebar.tsx     ← Lucid sidebar: recent threads, cases tree, define, dev tools
├── layout/
│   └── WorkspaceTabs.tsx      ← Tab bar + content router (thread-chat, case-canvas, admin, etc.)
├── admin/
│   ├── AdminWorkspace.tsx     ← Entity management: tabs, list, forms
│   ├── RecordList.tsx         ← Data grid with search/sort
│   ├── RecordForm.tsx         ← Monaco editor for JSON fields, lookup binding
│   ├── AgentConfig.tsx        ← Agent creation/edit with model config
│   ├── EntityRegistry.ts      ← Entity metadata (fields, types, display names)
│   └── SeedPanel.tsx          ← Seed data execution UI
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
| jw_agent | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace, sidebar "Define" |
| jw_tool | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace |
| jw_playbook | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace, sidebar "Define" |
| jw_instruction | Yes | Yes (Admin) | Yes (Admin) | Yes (Admin) | AdminWorkspace |
| jw_agenttool | Yes | Yes (seed) | No | Yes (Admin) | AdminWorkspace (raw junction) |
| jw_case | Yes | Yes (sidebar) | No UI | No UI | Sidebar case tree, CaseCanvas |
| jw_thread | Yes | Yes (case creation) | No UI | No UI | Sidebar, ChatWorkspace |
| jw_message | Yes | Yes (auto, loop) | No | No UI | ChatWorkspace |
| jw_artifact | Yes | Yes (auto, tools) | Yes (SemanticRenderer) | No UI | CaseCanvas, ArtifactBrowser |
| jw_document | Yes | Yes (file upload) | No | No | Not directly visible |
| jw_toolexecution | Yes | Yes (auto, audit) | No | No | AdminWorkspace (raw) |
| jw_threadcase | Yes | Yes (auto) | No | No | Not visible |

---

## 2. Known Issues

### P0 — Blocks Core Functionality

**ISSUE-001: ask_user tool never available to LLM**
- `ask_user` has a handler in `builtinTools.ts:818` and a definition in `BUILTIN_TOOL_DEFINITIONS:1146`
- But it has NO seed data tool record (not in `seedData.ts` tool list)
- And NO `agent_tool_link` junction record
- When dynamic tools load from Dataverse (junction records exist), ask_user is excluded
- The API never sees it as an available tool → can't call it
- **Fix:** Add `ask_user` and `get_artifact` to seed tool records + junction links

**ISSUE-002: Case Canvas unreachable**
- `CaseCanvas.tsx` exists and renders threads, artifacts, metadata
- But `UnifiedSidebar.handleSelectCase()` (line 275) only calls `selectCase(caseId)` — loads data, doesn't open tab
- No `case-canvas` tab ever opens from the sidebar
- **Fix:** `handleSelectCase` should also open a `case-canvas` tab

**ISSUE-003: No creation wizards in sidebar**
- Sidebar "Define" section shows agents and playbooks
- Clicking "New agent" in the sidebar → does nothing meaningful
- No inline creation flow, no redirect to admin
- User expects: click "New Agent" → opens a creation form/wizard
- **Fix:** Multiple options (see Design Proposals section)

### P1 — Degrades User Experience

**ISSUE-004: Streaming re-triggers on tab switch**
- `MessageBubble.renderedRef` is a `useRef` inside the component
- When component unmounts (tab switch) and remounts, the ref resets
- All assistant messages are treated as "new" → full re-stream animation
- **Fix:** Track rendered message IDs in a module-level Set or localStorage

**ISSUE-005: File upload context appended to user message**
- `useAgentChat.ts:365`: `content + attachmentContext` creates one giant user message
- User sees the raw Doc Intelligence summary in their own message bubble
- Looks ugly, pollutes the conversation
- **Fix:** Separate into a system-level context message, or render as a collapsible attachment card

**ISSUE-006: Markdown paragraph spacing too large**
- Custom `renderMarkdown` wraps in `<p class="md-p">` with `</p><p>` for double newlines
- CSS margins on `.md-p` and `<br/>` create excessive whitespace
- **Fix:** Tighten CSS margins

**ISSUE-007: Seed data panel not discoverable**
- SeedPanel is inside AdminWorkspace as a dedicated tab
- But admin needs to be opened first, then navigate to seed tab
- New users have no idea it exists
- **Fix:** Auto-detect empty state (no agents) → show seed data prompt

### P2 — Missing Features

**ISSUE-008: No "Add Thread" action in CaseCanvas**
- CaseCanvas shows existing threads but has no button to create a new thread for the case
- **Fix:** Add "New Thread" button that creates a thread linked to the case

**ISSUE-009: No artifact preview in chat**
- When an artifact is created/referenced in chat, there's no inline preview
- User has to navigate to artifact tab separately
- **Fix:** Render mini artifact cards inline in chat (after tool call cards)

**ISSUE-010: Playbook instruction completion not visible in case view**
- CaseCanvas shows playbook name but not instruction progress
- PlaybookProgress component exists but isn't in CaseCanvas
- **Fix:** Add PlaybookProgress to CaseCanvas when case has a playbook

---

## 3. UX Flow Specification

### Flow A: New User First Visit
```
1. App loads → Empty sidebar, no tabs
2. Show welcome screen with "Get Started" button
3. Button triggers seed data execution (or points to Admin → Seed)
4. After seed: sidebar shows "General Assistant" agent, sample playbook
5. User can click "New Case" to start
```
**Status:** Not implemented. User currently must know to go to Admin → run seed.
**Question for User:** Should seed auto-run on first visit? Or prompt?

### Flow B: Create & Work with a Case
```
1. User clicks "+" in sidebar Cases section → New Case dialog
2. Enters title, selects agent → case + thread created
3. Case Canvas tab opens (overview: no threads yet message, playbook selector?)
4. Thread tab also opens (chat with the agent)
5. Agent conversations create artifacts → appear in Case Canvas
6. User can open Case Canvas anytime to see overview
```
**Status:** Partially works. Step 3 missing (no Case Canvas tab opens). Step 5 works.
**Question for User:** When creating a case, should Case Canvas auto-open? Or just the thread?

### Flow C: Define an Agent
```
1. User clicks "New Agent" in sidebar Define section
2. Options:
   a. Opens Admin with create form pre-selected for jw_agent
   b. Opens an inline creation wizard (name, system prompt, model config)
   c. Opens a dedicated "Agent Builder" canvas (future)
3. After creation, user can link tools (from tool library)
4. Agent appears in sidebar
```
**Status:** Not implemented. Clicking does nothing.
**Question for User:** Which option (a/b/c) for v0.14? Option (a) is fastest to implement.

### Flow D: Chat with Tool Calls
```
1. User sends message → status: "Thinking..."
2. API responds → assistant message appears (with streaming)
3. If tool calls: tool cards appear inline under the message
4. If requiresApproval: ApprovalForm/InteractiveCard renders, loop pauses
5. User approves → tool executes → result shown in tool card
6. Loop continues → final assistant response with markdown
```
**Status:** Mostly works. Issues:
- ask_user never fires (ISSUE-001)
- Streaming is slow and re-triggers (ISSUE-004)
- Tool cards appear correctly for non-approval tools

### Flow E: File Upload & Document Analysis
```
1. User clicks paperclip → selects file
2. File uploaded → Doc Intelligence analyzes (status: "Executing tools...")
3. Result saved as artifact in Dataverse
4. Agent gets: meta-summary (MIME, pages, tables, preview, artifact ID)
5. Chat shows: user message + attachment summary (separate card?)
6. Agent can use get_artifact to read full content
```
**Status:** Steps 1-4 work. Step 5 broken (summary appended to user message text).
Step 6 broken (get_artifact not in agent tools → ISSUE-001).
**Question for User:** Should attachment show as a separate card above the user message? Or collapsible section?

---

## 4. Design Proposals

### Proposal A: Sidebar "Define" Experience

**Current state:** Shows agents and playbooks with tool/instruction counts. Click does nothing useful.

**Option A1: Admin Redirect** (1-2 hours)
- Click agent/playbook → opens Admin tab with that entity pre-selected
- Click "New Agent" → opens Admin tab in create mode for jw_agent
- Pros: Fast, reuses existing UI
- Cons: Admin is raw CRUD, not a great UX

**Option A2: Inline Quick-Create** (4-6 hours)
- Click "New Agent" → inline form in sidebar (name + system prompt)
- Creates record, then opens in Admin for full editing
- Pros: Faster workflow, discoverable
- Cons: Limited space in sidebar

**Option A3: Dedicated Builder Canvas** (2-3 days)
- New tab type: "agent-builder" or "playbook-builder"
- Full-page creation experience with tool linking, preview, testing
- Pros: Best UX, aligns with "definition experience" vision
- Cons: Significant development time

**Recommendation:** A1 now (unblock the flow), A3 as a future milestone.
**Question:** Which option?

### Proposal B: Case Canvas Enhancement

**Current state:** Shows title, status, threads list, artifacts list.

**Proposed additions:**
1. PlaybookProgress component when case has a playbook
2. "New Thread" button (creates thread linked to case + agent)
3. Case notes/description field (editable)
4. Activity timeline (recent tool executions, artifact changes)
5. Quick actions: "Link existing thread", "Run playbook step"

**Question:** Which additions are most valuable? Priority order?

### Proposal C: Chat Improvements

**C1: Attachment rendering**
- Option: Render as collapsible `<AttachmentCard>` between user message and assistant response
- Shows: filename, page count, table count, artifact link
- Collapsed by default, expandable for preview text

**C2: Inline artifact cards**
- When agent calls save_artifact, show mini card in chat (below tool call card)
- Click opens artifact in a new tab

**C3: Streaming fix**
- Module-level `Set<string>` tracks rendered message IDs
- Only stream the LAST assistant message if it just appeared
- Speed: 4ms per char (3x faster than current 12ms)

**Question:** All good? Any priorities?

### Proposal D: First-Run Experience

**Options:**
1. Auto-detect no agents → show "Run Seed Data" banner
2. Auto-run seed data on first visit (risky: what if user has custom data?)
3. Show onboarding wizard with explanations

**Recommendation:** Option 1.
**Question:** Preference?

---

## 5. Roadmap

### Phase 0: Critical Fixes (This Session)
- [ ] Add `ask_user` + `get_artifact` to seed data + junction links
- [ ] Wire sidebar case click → case-canvas tab
- [ ] Fix streaming (module-level rendered set, faster speed)
- [ ] Fix markdown spacing CSS
- [ ] Sidebar "New Agent"/"New Playbook" → Admin redirect (Option A1)

### Phase 1: Chat Polish (Next Session)
- [ ] Separate file upload from user message (attachment card)
- [ ] Inline artifact preview cards in chat
- [ ] First-run seed data banner
- [ ] Error retry button in chat

### Phase 2: Case Canvas Enhancement
- [ ] PlaybookProgress in CaseCanvas
- [ ] "New Thread" button in CaseCanvas
- [ ] Case notes field
- [ ] Activity timeline

### Phase 3: Definition Experience
- [ ] Agent Builder canvas (tab type)
- [ ] Tool linker UI (drag-and-drop or checkbox)
- [ ] Playbook Builder with instruction ordering
- [ ] System prompt testing sandbox

### Phase 4: Intelligence
- [ ] Agentic Learning Loop (save_learning tool)
- [ ] Bounded History with summarization
- [ ] Cost Dashboard (token aggregation)
- [ ] Conditional Auto-Approval rules

---

## Appendix: Why Progress Feels Slow

### Pattern Identified
1. Session starts → AI rebuilds mental model from scattered docs (20+ files)
2. AI implements feature → misses 2-3 edge cases or UX details
3. User reports issues → debugging + fix cycle (50% of session time)
4. Next session → context lost, repeat

### How to Break the Cycle
1. **This document** — single design spec that every session reads first
2. **Smaller, testable increments** — fix 3 issues per session, not redesign the sidebar
3. **Question-first approach** — before implementing, list assumptions and get user validation
4. **Issue tracker in this doc** — numbered issues with status, not scattered across conversations
5. **Visual mockups** — describe UX flows in text with click-by-click detail

### What NOT to Do Next Session
- Don't redesign the layout again
- Don't add new features before fixing ISSUE-001 through ISSUE-007
- Don't implement anything without checking this document first
