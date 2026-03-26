# Design Sprint: Tabbed Canvas Workspace

> Phase 1 architecture — Case-centric layout with dynamic tabs

---

## The Problem

Current layout is **Thread-first**: left sidebar lists threads, clicking a thread opens chat. Cases, artifacts, and agent context are secondary panels. This doesn't match how the app is meant to be used — as a **Case-driven orchestration engine** where agents process business cases.

## The Solution: Three-Column Canvas with Dynamic Tabs

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Playbook Agent v0.9                    [Admin] [Debug] [Explore]       │
├─────────────┬───────────────────────────────────┬────────────────────────┤
│  NAVIGATOR  │  WORKSPACE (tabbed)               │  CONTEXT PANEL        │
│  (260px)    │                                   │  (420px, collapsible)  │
│             │  ┌─ Case A ─┬─ Thread 1 ─┬─ 📊 ─┐│                       │
│ ▾ CASES     │  │          │            │      ││ ┌────────────────────┐ │
│  ● Case A   │  │  [Active tab content]  │      ││ │ Case Dashboard     │ │
│  ● Case B   │  │                        │      ││ │ ─ Status badge     │ │
│  ○ Case C   │  │  Chat messages         │      ││ │ ─ Agent info       │ │
│             │  │  Rich markdown         │      ││ │ ─ Playbook steps   │ │
│ ▾ FOR CASE A│  │  Tool call cards       │      ││ │                    │ │
│  💬 Thread 1│  │  Reasoning bubbles     │      ││ │ ─── Artifacts ──── │ │
│  💬 Thread 2│  │                        │      ││ │ 📊 Sales Chart     │ │
│             │  │                        │      ││ │ 📋 Query Results   │ │
│ ▾ AGENTS    │  │                        │      ││ │ 📄 Analysis        │ │
│  🤖 General │  │                        │      ││ │                    │ │
│  🤖 SAP Bot │  │                        │      ││ │ ─── Activity ───── │ │
│             │  └────────────────────────────────┘│ │ Tool calls, HitL   │ │
│ ─────────── │  ┌────────────────────────────────┐│ │ State changes      │ │
│ + New Case  │  │  [Type a message... ]    [Send]││ └────────────────────┘ │
│ + Explore   │  └────────────────────────────────┘│                       │
├─────────────┴───────────────────────────────────┴────────────────────────┤
```

## Navigator (Left Sidebar)

### Structure

```
CASES (primary navigation)
├── Active Cases
│   ├── Case A  ← click to select, shows threads below
│   └── Case B
├── Completed Cases (collapsed)
│   └── Case C
└── Cancelled Cases (collapsed)

THREADS (scoped to selected case)
├── Thread 1 (most recent)
├── Thread 2
└── + New Thread for this case

AGENTS (quick reference)
├── General Assistant
├── SAP Processor
└── + New Agent → Admin

ACTIONS
├── + New Case (dialog: agent + optional playbook + title)
└── + Explore Mode (no case, ephemeral data exploration)
```

### Case Selection Flow

1. User clicks a case → sidebar shows its threads below
2. Most recent thread auto-selected → opens in workspace
3. Right panel auto-opens with CaseDashboard for the case
4. Clicking a different case switches everything

### Explore Mode

- Creates a temporary, unsaved "exploration session"
- No case, no persistent artifacts
- Full access to data exploration tools (search, query, visualize, code analysis)
- Dialog after session: "Save exploration as case?" → creates case + artifacts retroactively

## Workspace (Center — Tabbed)

### Tab Types

| Tab Type | Icon | Opens From | Content |
|----------|------|-----------|---------|
| **Case Canvas** | 📋 | Clicking case name | Living case report — arranged artifacts, status, notes |
| **Thread Chat** | 💬 | Clicking thread in sidebar | Full chat with markdown rendering, tool cards |
| **Artifact View** | 📊/📄 | Clicking artifact in context panel | Full-screen SemanticRenderer for one artifact |
| **Explore** | 🔍 | "+ Explore" button | Ephemeral chat session, no case binding |

### Tab Bar Behavior

- Tabs have close buttons (×), right-click for context menu
- Maximum ~8 visible tabs, then overflow dropdown
- Active tab highlighted with accent color underline
- Unsaved changes indicator (dot) on tab
- Can have multiple threads from same case open as parallel tabs
- Can have threads from different cases open simultaneously
- Tab pinning (optional, later)

### Case Canvas Tab (new concept)

This is the **living report** view — NOT a chat, but a **free-form arrangement** of:
- Case metadata (title, status, assigned agent, timestamps)
- Playbook progress (checklist + progress bar)
- Pinned artifacts arranged as cards on a canvas
- Case notes (editable text area)
- Activity timeline (recent tool executions, approvals, state changes)

Think of it as a **dashboard specific to one case** that the agent and human build together over time. The agent can add artifacts to it, the human can rearrange and annotate.

**Data model mapping:**
- Case metadata → `jw_case` fields
- Playbook → `jw_playbook` + `jw_instruction` linked records
- Artifacts → `jw_artifact` where `jw_caseid` matches
- Notes → `jw_case.jw_notes` (new field needed)
- Activity → `jw_toolexecution` where message's thread is linked to case

## Context Panel (Right)

### Always-On When Case Selected

Shows three collapsible sections:

**1. Case Dashboard (top)**
- Status badge (Active/Completed/Cancelled)
- Agent name + model info
- Playbook progress (if active)
- Created/Modified timestamps

**2. Artifacts (middle)**
- Live list of case artifacts, filterable by type
- Click artifact → opens as tab in workspace
- Type-colored badges
- Auto-refreshes on new artifacts

**3. Activity Stream (bottom)**
- Recent tool calls with status badges
- HitL approvals (pending/approved/rejected)
- State transitions
- Compact feed, expandable entries

### Hidden When No Case Selected

If user is in Explore mode or no case selected, right panel hidden. Chat takes full width.

## Data Model Changes Needed

### New Fields

| Entity | Field | Type | Purpose |
|--------|-------|------|---------|
| `jw_case` | `jw_notes` | Multiline Text | Case notes / timeline entries |
| `jw_instruction` | `jw_ordernumber` | Whole Number | Explicit step ordering in playbooks |

### No New Tables Needed

Everything maps to existing entities:
- Cases → `jw_case`
- Threads → `jw_thread` (linked via `jw_threadcase`)
- Artifacts → `jw_artifact` (via `jw_caseid`)
- Activity → `jw_toolexecution` (via message → thread → threadcase → case)
- Playbook steps → `jw_instruction` (via `jw_playbookid`)

## Component Architecture

### New Components

```
src/components/layout/
├── CaseSidebar.tsx          ← Replaces ThreadSidebar
├── WorkspaceTabs.tsx        ← Tab bar + tab content routing
└── ExploreDialog.tsx        ← "Start Explore" dialog

src/components/case/
├── CaseCanvas.tsx           ← Living report view (new tab type)
├── CaseNotes.tsx            ← Editable notes section
└── ActivityStream.tsx       ← Tool execution timeline

src/hooks/
├── useCaseManager.ts        ← Case CRUD + thread loading + case selection
└── useWorkspaceTabs.ts      ← Tab state management (open/close/switch/reorder)
```

### Modified Components

```
src/App.tsx                  ← New routing: Navigator + Tabbed Workspace + Context Panel
src/components/chat/
  ChatWorkspace.tsx          ← No changes (already works per-thread)
src/components/semantic/
  ArtifactBrowser.tsx        ← Refactor: click → opens tab (not just expand in panel)
  CaseDashboard.tsx          ← Refactor: always-on in context panel (not toggled)
```

### Deleted Components

```
src/components/layout/ThreadSidebar.tsx  ← Replaced by CaseSidebar
```

## State Management

### useCaseManager Hook

```typescript
interface CaseManagerState {
  cases: CaseSummary[];           // All cases (active, completed, cancelled)
  selectedCaseId: string | null;  // Currently selected case
  caseThreads: ThreadSummary[];   // Threads for selected case
  loading: boolean;
}

interface CaseSummary {
  id: string;
  title: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  agentId: string;
  agentName?: string;
  playbookId?: string;
  playbookName?: string;
  artifactCount: number;
  threadCount: number;
  createdOn: string;
  modifiedOn: string;
}
```

### useWorkspaceTabs Hook

```typescript
interface WorkspaceTab {
  id: string;
  type: 'case-canvas' | 'thread-chat' | 'artifact-view' | 'explore' | 'admin' | 'debug';
  label: string;
  icon: string;
  /** Reference ID (caseId for canvas, threadId for chat, artifactId for view) */
  referenceId: string;
  closable: boolean;
  hasUnsavedChanges?: boolean;
}

interface TabsState {
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: Omit<WorkspaceTab, 'id'>) => string;  // returns tabId
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
}
```

## Build Plan

### Step 1: Foundation (hooks + basic routing)
- Create `useCaseManager` hook with case listing, selection, thread loading
- Create `useWorkspaceTabs` hook with tab state management
- Update `App.tsx` to use new layout structure

### Step 2: CaseSidebar
- Replace ThreadSidebar with CaseSidebar
- Cases grouped by status, threads nested under selected case
- Quick actions: + New Case, + Explore

### Step 3: Tab System
- WorkspaceTabs component with tab bar
- Route tab content to: ChatWorkspace, CaseCanvas, ArtifactView
- Tab open/close/switch animations

### Step 4: Context Panel
- Auto-show when case selected
- CaseDashboard + ArtifactBrowser + ActivityStream sections
- Click artifact → open as tab

### Step 5: Case Canvas
- Living report view
- Artifact cards + notes + playbook progress
- Agent activity timeline

### Step 6: Explore Mode
- Ephemeral session without case binding
- "Save as case" flow after exploration

---

## Questions / Decisions Needed

1. **Tab persistence**: Should open tabs be saved to localStorage so they survive page reload?
2. **Case creation**: Should creating a case also auto-create a thread? Or should user create thread separately?
3. **Multiple agents per case**: Can one case have threads with different agents? (The data model supports it via N:M threadcase)
4. **Case canvas artifact arrangement**: Free-form drag? Or fixed grid? Or auto-arranged by type?
5. **Activity stream granularity**: Show every tool call? Or just key events (approvals, errors, completions)?
