# Agent App Connection Management Learnings (Generic Playbook)

This file captures reusable architecture patterns for agent apps that use:
- Dataverse for app/state/config data
- external connectors (LLM, SAP, document AI, etc.)
- tool-calling agent loops in a React/TypeScript frontend

> Scope: generic guidance for future projects where tables/entities are generated or added via PAC CLI.

---

## 1) Core architecture rule: one integration boundary

Keep all platform I/O behind a small service boundary (e.g. `src/services/sdk.ts`).
UI, hooks, and agent code should **not** call platform SDK APIs directly.

Recommended layers:
1. `services/sdk` (raw client + normalization + debug events)
2. `services/dataverse` + connector-specific services (domain-friendly helpers)
3. hooks (`useXyz`) for query/mutation state
4. agent runtime + tools
5. pages/components

Why:
- response-shape variability is isolated
- retries/logging happen once
- app-wide diagnostics are consistent

---

## 2) Dataverse usage patterns

### 2.1 Table constants and primary keys
Define table names and primary key fields in one place.
Avoid string literals scattered through the app.

### 2.2 Lookup handling
Use helper functions for lookup binding paths (`@odata.bind`) instead of hand-building per feature.

### 2.3 OData safety
Escape user-provided values in filters (`escapeOData`) and keep filter logic centralized.

### 2.4 List query reliability
Prefer structured list options (filter/select/top/orderBy) over ad-hoc query strings.
Some SDK paths ignore or reinterpret raw query strings.

### 2.5 Active-version records
For config-like entities:
- read only active rows (`statecode = 0`)
- when creating a new active version, deactivate prior active rows for same key
- verify writes by re-reading updated/created row by ID

### 2.6 Key normalization
Normalize config keys (`trim`, stable casing policy) before mapping to avoid subtle lookup misses.

---

## 3) Connector response normalization

Connector outputs can arrive wrapped in multiple shapes (e.g. `body`, `data`, `result`, `response`, nested `raw.success.data`).
Always normalize before business logic.

Guideline:
- keep a single normalizer per connector/service
- debug log both normalized payload and raw payload for troubleshooting
- treat “missing or empty normalized payload with non-empty raw payload” as warning-level telemetry

---

## 4) Agent config hydration and defaults

Pattern:
1. read active config rows
2. map by key
3. parse values safely
4. merge with defaults

Do not allow health/diagnostics code to throw inside primary config query path.
If diagnostics fail, app should still return usable config rows.

For JSON configs:
- accept either JSON string or already-object payloads
- merge shallow defaults cautiously; deep merge if nested structures can be partial

---

## 5) Human-in-the-loop interaction design

### 5.1 Request schema
Support both:
- free-text input
- structured choices (`value`, `label`, optional `description`, `impact`, `recommended`)

Optional metadata:
- `title`
- `context`
- `severity`
- `recommended_option`

### 5.2 Runtime gating for write actions
Do not rely only on prompts for safety.
At tool execution time, enforce confirmation policies (e.g. always confirm SAP writes, or threshold-based confirmation).

### 5.3 Roundtrip observability
Emit timeline/debug events when:
- human input is requested
- human input is received

This makes UI/agent propagation issues diagnosable.

---

## 6) Streaming UX for agent runs

For chat/case chat:
- append a pending assistant message immediately
- stream reasoning/tool steps/visuals into that pending item
- finalize in place on completion/error

This avoids “nothing happens until done” UX.

---

## 7) Mock strategy for demos

Use deterministic mocks first for core demo scenarios.
If synthetic generation exists, treat it as fallback and keep deterministic stubs for critical flows.

For write mocks:
- return deterministic success envelopes
- keep shapes consistent with real connector responses where possible

For read mocks:
- provide realistic filter support for important entities
- avoid returning ambiguous empty objects (`{}`) where arrays/records are expected

---

## 8) Observability and diagnostics

Emit structured events for:
- Dataverse CRUD/list/get
- connector operations
- agent loop milestones
- tool calls and results
- human-input events

Each event should include:
- operation name
- input params
- normalized result
- raw result (when available)
- duration
- status (`pending` / `success` / `error`)

---

## 9) Guardrails in agent execution

### 9.1 Loop containment
Detect suspicious repeated identical successful tool calls and fail fast with explicit error codes.

### 9.2 Tool argument normalization
Normalize aliases and optional fields before execution (e.g. choice formats, visual payload aliases).

### 9.3 Safe error envelopes
Tool errors should return structured payloads (`error`, optional `code`, `tool`) so UI/timeline can render clearly.

---

## 10) Suggested reusable checklist for new projects

When starting a new PAC CLI-based agent app:

1. Generate/update Dataverse entities via PAC CLI.
2. Update table/key constants and lookup helpers.
3. Add/verify response normalization for each connector.
4. Add config read/write hooks with active-version semantics.
5. Implement human-input schema + UI components + runtime confirmation gates.
6. Ensure chat and case views stream pending assistant updates.
7. Implement deterministic mocks for critical demo entities and write paths.
8. Add debug timeline/network events for Dataverse, connectors, and human input.
9. Add loop containment in agent runner.
10. Validate build and perform smoke tests for save/reload/config hydration and interactive flows.

---

## 11) Anti-patterns to avoid

- Mixing raw SDK calls across pages/components.
- Letting diagnostics code break primary data loading.
- Assuming one fixed connector response shape.
- Depending on prompt instructions alone for write safety.
- Waiting until run completion before showing tool progress.
- Returning empty-object mock payloads where typed arrays are expected.

---

## 12) Portability note

This playbook is table-agnostic and connector-agnostic by design.
For a new project:
- keep the same patterns,
- swap table names/keys and connector operations,
- preserve normalization + observability + HITL safety architecture.
