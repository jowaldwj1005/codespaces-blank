# PlaybookAgent React App - Folder Structure Audit

**Generated:** 2026-03-26  
**Total Lines of Code:** ~8,213 (src directory)  
**Number of Components:** 35 TSX files

---

## 1. CURRENT DIRECTORY STRUCTURE

### Root Level (`/src`)
```
/src
├── App.tsx (Main app entry)
├── App.css
├── main.tsx (React entry point)
├── index.css
├── assets/
│   └── react.svg
├── components/          (35 TSX files + 1 TS file)
├── hooks/              (9 custom hooks)
├── services/           (11 TS files + tests)
├── types/              (1 centralized types file)
└── generated/          (Auto-generated Dataverse models/services)
```

### Components Directory Structure
```
/components
├── [ROOT LEVEL - 5 FILES] ⚠️ ORGANIZATION ISSUE
│   ├── ConnectorTester.tsx        (574 lines) - Used in DevTools
│   ├── DataverseExplorer.tsx       (330 lines) - Used in DevTools
│   ├── DebugPanel.tsx             (318 lines) - Used in DevTools
│   ├── McpExplorer.tsx            (265 lines) - Used in DevTools
│   └── VisualizationPanel.tsx      (184 lines) - Used in DevTools
│
├── admin/              (5 files - Entity CRUD)
│   ├── AdminWorkspace.tsx
│   ├── AgentConfig.tsx
│   ├── EntityRegistry.ts           (Types for admin system)
│   ├── RecordForm.tsx
│   ├── RecordList.tsx
│   └── SeedPanel.tsx
│
├── case/               (1 file)
│   └── CaseCanvas.tsx
│
├── chat/               (11 files - Chat interface)
│   ├── ApprovalForm.tsx
│   ├── ChatInputBar.tsx
│   ├── ChatWorkspace.tsx
│   ├── InteractiveCard.tsx
│   ├── InteractiveTable.tsx
│   ├── MessageBubble.tsx
│   ├── MessageList.tsx
│   ├── SubAgentCard.tsx
│   ├── TokenCounter.tsx
│   ├── ToolCallCard.tsx
│   └── VisualizationCard.tsx
│
├── layout/             (5 files + activities subfolder)
│   ├── ActivitySidebar.tsx
│   ├── AppHeader.tsx
│   ├── CaseSidebar.tsx             ⚠️ LEGACY - Not imported anywhere
│   ├── ThreadSidebar.tsx           ⚠️ LEGACY - Not imported anywhere
│   ├── WorkspaceTabs.tsx
│   └── activities/
│       ├── ChatActivity.tsx
│       ├── ConfigActivity.tsx
│       ├── ContextActivity.tsx
│       └── DevToolsActivity.tsx
│
└── semantic/           (4 files - Artifact rendering)
    ├── ArtifactBrowser.tsx
    ├── CaseDashboard.tsx
    ├── PlaybookProgress.tsx
    └── SemanticRenderer.tsx
```

### Services Directory Structure
```
/services
├── agentLoop.ts                (12 KB - Core agent orchestration)
├── agentLoopRegistry.ts        (3.3 KB - Registry/event system)
├── artifactChangeAccumulator.ts (2.5 KB - Change tracking)
├── builtinTools.ts             (52 KB - Built-in tool implementations)
├── connectors.ts               (19 KB - Azure/SAP connectors)
├── dataverse.ts                (28 KB - Dataverse domain helpers)
├── dataverseMcp.ts             (21 KB - MCP-specific Dataverse)
├── debugEventBus.ts            (1.6 KB - Debug telemetry)
├── sdk.ts                      (5.2 KB - SDK utilities)
├── seedData.ts                 (31 KB - Seed data generation)
├── toolExecutor.ts             (8.3 KB - Tool execution + HitL)
└── __tests__/                  (3 test files)
```

### Hooks Directory Structure
```
/hooks
├── useAgentChat.ts             (20 KB - Main chat hook)
├── useCaseManager.ts           (11 KB - Case management)
├── useConnectors.ts            (3.1 KB - Connector utilities)
├── useCurrentUser.ts           (2.3 KB - User context)
├── useDataverse.ts             (4.8 KB - Dataverse operations)
├── useDebugLog.ts              (585 B - Debug logging)
├── useMcp.ts                   (4.4 KB - MCP client)
├── useThreadManager.ts         (3.9 KB - Thread management)
├── useWorkspaceTabs.ts         (4.8 KB - Tab management)
└── __tests__/                  (Empty test dir)
```

### Generated Directory (Auto-generated from Dataverse)
```
/generated
├── index.ts
├── models/                     (22 model files)
│   ├── *Model.ts (one per Dataverse entity)
│   └── CommonModels.ts
│
└── services/                   (21 service files)
    └── *Service.ts (one per Dataverse entity)
```

### Types Directory
```
/types
└── agent.ts                    (Centralized agent runtime types)
```

---

## 2. IDENTIFIED ORGANIZATIONAL PROBLEMS

### A. Root-Level Components (CRITICAL ISSUE)
**Files:** `ConnectorTester.tsx`, `DataverseExplorer.tsx`, `DebugPanel.tsx`, `McpExplorer.tsx`, `VisualizationPanel.tsx`

**Problem:**
- These 5 developer/debug tools are stored at `/components/` root level instead of in a logical subfolder
- All are imported only by `WorkspaceTabs.tsx` for the DevTools activity
- They should be grouped in a dedicated folder (e.g., `devtools/` or `debug/`)
- Makes the components directory cluttered and unclear about purpose

**Impact:** Medium - Affects readability and maintainability

---

### B. Legacy Components Not Being Used
**Files:** 
- `components/layout/CaseSidebar.tsx` (exported but never imported)
- `components/layout/ThreadSidebar.tsx` (exported but never imported)

**Problem:**
- Both are completely unused in the codebase
- `CaseSidebar.tsx` has a comment saying it's "replacing ThreadSidebar" but neither is used
- Adds dead code and confusion to the codebase
- Current sidebar is `ActivitySidebar.tsx` and collapsible activities

**Impact:** Low - Just dead code, but indicates incomplete refactoring

---

### C. Types Scattered Across Codebase
**Files:**
- `types/agent.ts` (centralized - good)
- `components/admin/EntityRegistry.ts` (entity type definitions for admin)
- `components/semantic/SemanticRenderer.tsx` (inline artifact types)
- `components/chat/ChatInputBar.tsx` (inline ChatMessageOptions interface)
- Component-local types defined in various TSX files

**Problem:**
- While `types/agent.ts` is the main centralized location, UI-specific types are scattered in components
- Some types like `ArtifactData` in `SemanticRenderer.tsx` should be in a dedicated UI types file
- Entity types in `EntityRegistry.ts` could be centralized with other domain types
- Inconsistent pattern makes imports harder to reason about

**Impact:** Medium - Affects code discoverability

---

### D. Services Folder Organization Issues
**Problem:**
- 11 files without clear separation of concerns:
  - **Agent Loop Logic:** `agentLoop.ts`, `agentLoopRegistry.ts` (these could be in an `agent-loop/` subfolder)
  - **Data Access:** `dataverse.ts`, `dataverseMcp.ts`, `seedData.ts` (could be in a `dataverse/` subfolder)
  - **Tool Execution:** `builtinTools.ts`, `toolExecutor.ts`, `connectors.ts` (could be in a `tools/` subfolder)
  - **Utilities:** `debugEventBus.ts`, `sdk.ts`, `artifactChangeAccumulator.ts` (utilities)

- `builtinTools.ts` is 52 KB (largest file) - should be split into multiple files
- `dataverse.ts` is 28 KB - manages many entity types, could be split by entity domain
- `seedData.ts` is 31 KB - handles initial data, not frequently modified

**Impact:** Medium - Makes navigation harder

---

### E. Hooks Organization
**Current State:**
- 9 hooks in single flat directory
- No clear grouping by feature domain

**Better Structure:**
- `hooks/agent/` - useAgentChat, useThreadManager
- `hooks/data/` - useDataverse, useCaseManager
- `hooks/system/` - useCurrentUser, useDebugLog, useMcp
- `hooks/ui/` - useWorkspaceTabs, useConnectors

**Impact:** Low-Medium - Current size is manageable but pattern unclear

---

### F. Generated Folder
**Current State:**
- 22 model files + 21 service files = 43 files auto-generated from Dataverse
- Useful for keeping them separate but the folder is quite large

**Observation:**
- This is appropriate for auto-generated code
- Should add a `.gitignore` entry or marker indicating it's auto-generated
- Consider adding a README explaining how to regenerate

---

## 3. TOP-LEVEL REPO STRUCTURE ANALYSIS

```
/Playbook_Agent
├── PlaybookAgent/          (React app - main codebase)
├── ContextFiles/           (Documentation & reference files)
│   ├── AI Implementation Manifesto.md
│   ├── Architecture Decisions.md
│   ├── Data Model Blueprint.md
│   ├── customconnectorinformation/
│   ├── entity_creation/
│   └── learningsfromprioragent/
├── docs/                   (Project documentation)
│   ├── DESIGN_SPRINT_CANVAS.md
│   ├── FEATURE_IDEAS.md
│   ├── VERSIONS.md
│   ├── memory/             (Memory/notes for ongoing work)
│   └── VERSIONS-Screenshots/
├── CLAUDE.md               (AI context file)
├── power.config.json       (Power Apps configuration)
└── debug.log
```

**Assessment:**
- ✅ Good separation: app code vs. context/docs vs. configuration
- ⚠️ `ContextFiles/` folder is somewhat duplicate with `docs/` folder
- ✅ Clear purposes: `ContextFiles/` = reference, `docs/` = project docs

---

## 4. DEPENDENCY ANALYSIS

### Circular Dependency Risk: ✅ NONE DETECTED
- Services layer: Does NOT import from components ✅
- Components layer: Safely imports from services/hooks/types ✅
- Hooks layer: Safely imports from services/types ✅
- **Dependency Flow is Clean:** Components ← Hooks ← Services

### Common Import Patterns:
- Components import types from: `types/agent.ts`, `types/admin/EntityRegistry.ts`
- Hooks import services: dataverse, agentLoop, etc.
- Services are mostly standalone utilities

---

## 5. CODE SIZE ANALYSIS

| Category | Files | Total KB | Notes |
|----------|-------|----------|-------|
| Components | 36 | ~22 | Well-distributed |
| Hooks | 9 | ~53 | Reasonable sizes, largest is 20KB |
| Services | 11 | ~152 | 3 files > 25KB (should split) |
| Generated | 43 | ~200+ | Auto-generated, expected |
| Types | 1-2 | ~10 | Could be more centralized |

**Largest Files (candidates for splitting):**
1. `services/builtinTools.ts` - 52 KB (**SPLIT CANDIDATE**)
2. `services/seedData.ts` - 31 KB
3. `services/dataverse.ts` - 28 KB (**SPLIT CANDIDATE**)
4. `hooks/useAgentChat.ts` - 20 KB (okay for a hook)

---

## 6. PROPOSED BETTER FOLDER STRUCTURE

### Recommended Structure (Feature-Based Organization)

```
/src
├── app/                         (App shell, not src/components)
│   ├── App.tsx
│   └── App.css
│
├── features/                    (Feature-based organization)
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatWorkspace.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInputBar.tsx
│   │   │   ├── SubAgentCard.tsx
│   │   │   ├── ToolCallCard.tsx
│   │   │   └── ApprovalForm.tsx
│   │   ├── hooks/
│   │   │   └── useAgentChat.ts
│   │   ├── services/
│   │   │   ├── agentLoop.ts
│   │   │   ├── agentLoopRegistry.ts
│   │   │   └── toolExecutor.ts
│   │   └── types/
│   │       └── chat.ts
│   │
│   ├── cases/
│   │   ├── components/
│   │   │   ├── CaseCanvas.tsx
│   │   │   └── CaseDashboard.tsx
│   │   ├── hooks/
│   │   │   └── useCaseManager.ts
│   │   └── types/
│   │       └── cases.ts
│   │
│   ├── admin/
│   │   ├── components/
│   │   │   ├── AdminWorkspace.tsx
│   │   │   ├── AgentConfig.tsx
│   │   │   ├── RecordForm.tsx
│   │   │   ├── RecordList.tsx
│   │   │   └── SeedPanel.tsx
│   │   ├── types/
│   │   │   └── admin.ts (EntityRegistry types)
│   │   └── services/
│   │       └── entityRegistry.ts
│   │
│   ├── artifacts/
│   │   ├── components/
│   │   │   ├── SemanticRenderer.tsx
│   │   │   ├── ArtifactBrowser.tsx
│   │   │   ├── InteractiveCard.tsx
│   │   │   ├── InteractiveTable.tsx
│   │   │   ├── VisualizationCard.tsx
│   │   │   └── PlaybookProgress.tsx
│   │   └── types/
│   │       └── artifacts.ts
│   │
│   └── devtools/                (Consolidated debug tools)
│       ├── components/
│       │   ├── ConnectorTester.tsx
│       │   ├── DataverseExplorer.tsx
│       │   ├── DebugPanel.tsx
│       │   ├── McpExplorer.tsx
│       │   └── VisualizationPanel.tsx
│       └── hooks/
│           └── useDevTools.ts
│
├── core/                        (App shell, layout, activities)
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   ├── ActivitySidebar.tsx
│   │   ├── WorkspaceTabs.tsx
│   │   └── activities/
│   │       ├── ChatActivity.tsx
│   │       ├── ConfigActivity.tsx
│   │       ├── ContextActivity.tsx
│   │       └── DevToolsActivity.tsx
│   └── hooks/
│       ├── useWorkspaceTabs.ts
│       ├── useCurrentUser.ts
│       └── useDebugLog.ts
│
├── common/                      (Shared utilities)
│   ├── hooks/
│   │   ├── useConnectors.ts
│   │   └── useMcp.ts
│   ├── services/
│   │   ├── dataverse/
│   │   │   ├── dataverse.ts
│   │   │   └── dataverseMcp.ts
│   │   ├── connectors.ts
│   │   ├── debugEventBus.ts
│   │   ├── sdk.ts
│   │   └── artifactChangeAccumulator.ts
│   └── types/
│       ├── agent.ts
│       └── common.ts
│
├── generated/                   (Auto-generated - keep as-is)
│   ├── models/
│   └── services/
│
├── assets/
│   └── react.svg
│
└── main.tsx
```

### Key Improvements:
1. **Feature-based organization** - Easier to understand what each folder does
2. **Co-located related code** - Chat features grouped together
3. **DevTools consolidated** - All debug components in one folder
4. **Types with features** - Types live near their usage
5. **Core/Layout separated** - App shell separate from features
6. **Common layer clear** - Shared services and utilities explicitly marked

---

## 7. FILES THAT SHOULD BE SPLIT

### 1. `services/builtinTools.ts` (52 KB)
**Problem:** Contains all built-in tool implementations
**Solution:** Split into `services/tools/`:
```
services/tools/
├── index.ts (exports all)
├── file.ts
├── math.ts
├── string.ts
├── dataverse-operations.ts
└── web-search.ts
```

### 2. `services/dataverse.ts` (28 KB)
**Problem:** Manages all entity CRUD operations
**Solution:** Split by entity domain:
```
services/dataverse/
├── index.ts (re-exports)
├── agents.ts
├── cases.ts
├── threads.ts
├── tools.ts
├── artifacts.ts
└── common.ts
```

### 3. `services/seedData.ts` (31 KB)
**Status:** Could remain as-is but consider splitting by entity
**Alternative:** Keep as monolithic seed file (appropriate for initialization data)

---

## 8. DEAD CODE TO REMOVE

| File | Status | Action |
|------|--------|--------|
| `components/layout/ThreadSidebar.tsx` | ❌ Unused | DELETE |
| `components/layout/CaseSidebar.tsx` | ❌ Unused | DELETE |

---

## 9. RECOMMENDATIONS SUMMARY

### CRITICAL (Do First)
- [ ] Move 5 root-level component files to `components/devtools/`
- [ ] Delete `ThreadSidebar.tsx` and `CaseSidebar.tsx`
- [ ] Split `services/builtinTools.ts` into organized tool modules

### HIGH PRIORITY (Do Next)
- [ ] Create centralized types structure (separate UI types from domain types)
- [ ] Split `services/dataverse.ts` by entity domain
- [ ] Organize hooks by feature domain (agent, data, system, ui)

### MEDIUM PRIORITY (Nice to Have)
- [ ] Move app shell code to `app/` or `core/` folder
- [ ] Add README files to major feature folders explaining structure
- [ ] Consider feature-based refactoring (migrate to `/features/` structure)

### LOW PRIORITY (Future)
- [ ] Split `services/seedData.ts` if it grows further
- [ ] Add barrel exports (`index.ts`) to feature folders for cleaner imports
- [ ] Create shared component library for common UI patterns

---

## 10. CIRCULAR DEPENDENCY REPORT

**Status:** ✅ **NO CIRCULAR DEPENDENCIES DETECTED**

**Architecture:**
- ✅ Clean unidirectional dependency flow
- ✅ Components don't import services directly (only hooks)
- ✅ Services don't import components
- ✅ Hooks are proper middle layer

**Safe to refactor** - No complex dependency issues to work around

---

## CONCLUSION

The PlaybookAgent codebase has a **reasonable structure** with some organizational issues that affect clarity:

### Strengths:
- ✅ Clean separation of concerns (components, hooks, services)
- ✅ No circular dependencies
- ✅ Types are mostly centralized
- ✅ Auto-generated code properly isolated

### Weaknesses:
- ⚠️ 5 debug components at wrong level
- ⚠️ 2 unused legacy components
- ⚠️ Services layer needs better organization (large files)
- ⚠️ Hooks could be better grouped by feature

### Priority Actions:
1. **Move devtools components** to dedicated folder
2. **Delete legacy components** (ThreadSidebar, CaseSidebar)
3. **Split large services files** (builtinTools, dataverse)
4. **Consider feature-based refactoring** for long-term maintainability

These changes would take ~2-4 hours and significantly improve code organization and navigability.

