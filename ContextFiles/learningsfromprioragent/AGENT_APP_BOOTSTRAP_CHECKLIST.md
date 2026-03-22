# Agent App Bootstrap Checklist (PAC CLI Projects)

A compact first-week checklist for spinning up a new agent app using Dataverse + connectors.

---

## 0) Project setup baseline

- [ ] Create app shell (React/TS + routing + query/cache layer).
- [ ] Add a single integration boundary module (`services/sdk`) for Dataverse + connector calls.
- [ ] Add global debug event bus and a basic debug console page/panel.

---

## 1) Dataverse foundation (after PAC CLI entity generation)

- [ ] Add table constants and primary-key map.
- [ ] Add lookup-binding helper(s) for `@odata.bind` writes.
- [ ] Add OData escaping helper for filter values.
- [ ] Add generic `list/get/create/update/delete` wrappers.
- [ ] Ensure list reads support structured options (`filter/select/top/orderBy`).
- [ ] Verify `orderBy` format is compatible with target SDK.

Quick checks:
- [ ] list 1 row from each critical table
- [ ] create + get-by-id + update + delete on a non-critical table

---

## 2) Config model + hydration

- [ ] Define expected config keys (constants, typed union).
- [ ] Read only active records (`statecode=0`) for runtime config.
- [ ] Implement active-versioning policy (deactivate prior active rows for same key).
- [ ] Add write verification (read updated/created record by ID).
- [ ] Normalize keys (`trim`) and parse value payload safely (string/object).
- [ ] Keep diagnostics/health checks from breaking primary config read path.

Quick checks:
- [ ] Save autonomy config -> reload app -> value persists
- [ ] Save prompt override -> reload -> prompt appears in runtime

---

## 3) Connector setup + normalization

For each connector (LLM/SAP/DocAI/etc.):
- [ ] Add service module with one normalize function for response shapes.
- [ ] Handle common wrappers (`body`, `data`, `result`, `response`, nested `raw.success.data`).
- [ ] Emit debug events with both normalized and raw payloads.
- [ ] Add explicit error when normalized result is invalid.

Quick checks:
- [ ] one happy-path request per connector
- [ ] one malformed/empty payload path surfaces useful error/debug output

---

## 4) Agent runtime scaffolding

- [ ] Implement loop runner with max-iteration guard.
- [ ] Add tool execution boundary (`toolExecutor`) separate from runner.
- [ ] Append full assistant/tool messages to history for continuity.
- [ ] Add repeated-tool-call containment guard.
- [ ] Emit timeline/debug events for reasoning/tool/human-input stages.

Quick checks:
- [ ] run with no tools
- [ ] run with 1 tool
- [ ] run with repeated tool scenario (guard triggers)

---

## 5) Human-in-the-loop UX

- [ ] Add `HumanInputRequest` schema for text/choice/confirm flows.
- [ ] Support rich options (`value`, `label`, `description`, `impact`, `recommended`).
- [ ] Support card metadata (`title`, `context`, `severity`, `recommended_option`).
- [ ] Add runtime confirmation gating for write operations (policy-based, not prompt-only).
- [ ] Emit request/response observability events.

Quick checks:
- [ ] agent asks choice -> user click -> answer returns to tool
- [ ] reject SAP write -> write call is canceled
- [ ] approve SAP write -> write call executes once

---

## 6) Chat UX responsiveness

- [ ] Add pending assistant message immediately on user send.
- [ ] Stream steps/visuals/content into pending message during run.
- [ ] Finalize pending message in place on success/error.
- [ ] Persist chat + llm history with bounded size.

Quick checks:
- [ ] tool calls visible before run completion
- [ ] visuals appear incrementally
- [ ] refresh restores latest chat state correctly

---

## 7) Mock strategy (demo reliability)

- [ ] Implement deterministic mocks for key entities and scenarios.
- [ ] Add realistic filter behavior for frequently-used endpoints.
- [ ] For write mocks, return deterministic success envelopes.
- [ ] If synthetic mock generation exists, keep deterministic fallback for empty/non-meaningful outputs.

Quick checks:
- [ ] critical demo flow runs with network off / mock on
- [ ] mock never returns ambiguous empty object when rows expected

---

## 8) Prompt and tool schema alignment

- [ ] Ensure tool schemas match runtime-normalized fields (aliases included when needed).
- [ ] Add examples in system prompts for high-impact tool calls (human input, confirmation, visuals).
- [ ] Keep write-safety policy in both prompt and runtime guard.

Quick checks:
- [ ] model emits valid arguments for each required tool
- [ ] malformed args are normalized or fail with clear error envelopes

---

## 9) Smoke test matrix before first handoff

- [ ] Build passes
- [ ] Config save + reload works (autonomy + prompt keys)
- [ ] Chat tool calls stream live
- [ ] Human confirmation blocks/allows write correctly
- [ ] Mock mode supports core read/write demo paths
- [ ] Debug panel shows request + normalized/raw response for each connector

---

## 10) Handoff artifacts

- [ ] `AGENT_APP_CONNECTION_MANAGEMENT.md` (patterns + rationale)
- [ ] this bootstrap checklist
- [ ] short architecture diagram (optional but recommended)
- [ ] “known fragile points” section in project guide

---

## Optional starter conventions

- Naming:
  - `useXxxConfig`, `useSaveXxxConfig`, `useSetXxxVersionActive`
  - `executeXxxRequest`, `normalizeXxxPayload`
- Debug operation naming:
  - `ConnectorName Operation`
  - `Human Input Requested/Received`
  - `Agent Run Started/Completed/Error`

