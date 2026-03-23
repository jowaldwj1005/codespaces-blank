# Architecture Decisions Log

Records key architectural decisions made during planning. Serves as rationale documentation.

## AD-001: Custom Agent Loop (not Vercel AI SDK)

**Date:** 2026-03-23
**Status:** Decided

**Context:** The Vercel AI SDK (`@ai-sdk/react`) provides `useChat` for managing chat state with LLM backends. However, our app is a Power Platform Code App (SPA) that communicates with Azure OpenAI via a Custom Connector, which returns **complete JSON responses** (no SSE streaming).

**Decision:** Build a custom agent loop (`agentLoop.ts` + `useAgentChat` hook) instead of using the Vercel AI SDK.

**Reasons:**
1. **No SSE streaming** — Custom Connector returns full JSON. Vercel's streaming-optimized `useChat` adds complexity without benefit.
2. **Full tool interception control** — Our HitL flow needs to pause the loop, show approval UI, allow payload editing, then resume. Vercel's `toolInvocations` is read-only.
3. **Sub-agent delegation** — Vercel SDK has no concept of nested agent loops. Custom gives us full control over parent-child orchestration.
4. **Debuggability** — Custom loop emits events via existing `debugEventBus` for maximum traceability.
5. **Fewer dependencies** — No `@ai-sdk/react`, no fetch override hack, no response adapter.

---

## AD-002: Sub-Agent Threading

**Date:** 2026-03-23
**Status:** Decided

**Context:** Agents need to delegate tasks to specialized sub-agents.

**Decision:**
- Sub-agents run in **new jw_thread** records linked to parent via `jw_parentthreadid` (self-referential lookup)
- Sub-agents have an `exit` tool to signal completion and return results
- Some agents can use `tool_choice: 'required'` to force tool use every turn
- **Real-time visibility**: All sub-agent events propagate to parent UI
- **UI**: Compact inline summary in parent chat + expandable detail panel

---

## AD-003: Visualization as Agent Tool

**Date:** 2026-03-23
**Status:** Decided

**Context:** Agents need to create visual outputs (charts, tables).

**Decision:**
- Agents get a `create_visual` built-in tool with comprehensive input schema (chartType, data, axes, colors, options)
- Supports: bar, line, pie, area, scatter, radar, treemap, table, 3d
- Tables are interactive (sortable, filterable)
- Charts have hover/click interactivity where possible
- **Case/Artifact binding is optional**: If `caseId` + `artifactType` provided → creates `jw_artifact` record. Otherwise just renders inline.

---

## AD-004: Thread Management

**Date:** 2026-03-23
**Status:** Decided

**Decision:** Thread list with navigation from the start (no single-thread MVP). Sidebar shows all threads with create/delete/select.

---

## AD-005: Token Tracking

**Date:** 2026-03-23
**Status:** Decided

**Decision:**
- Token usage stored per-message (`jw_tokenprompt`, `jw_tokencompletion` on `jw_message`)
- Live token counter displayed in chat header (cumulative for current thread)
- Updated after each API call

---

## AD-006: Data Model Additions (v0.4.0)

**Date:** 2026-03-23
**Status:** Decided

New fields added to existing entities:

| Entity | Field | Type | Reason |
|--------|-------|------|--------|
| jw_thread | jw_parentthreadid | Lookup (self-ref) | Sub-agent thread linking |
| jw_thread | jw_status | Choice (Active/Completed/Cancelled) | Thread lifecycle |
| jw_message | jw_toolcalls | Multiline Text (JSON) | Persist tool_calls array for replay |
| jw_message | jw_tokenprompt | Whole Number | Token tracking |
| jw_message | jw_tokencompletion | Whole Number | Token tracking |

Changed:
| Entity | Field | Change |
|--------|-------|--------|
| jw_artifact | jw_caseid | RequiredLevel: ApplicationRequired → None (visuals without case) |
