# Playbook Agent — Version Notes

> Collaborative version file. Claude documents each release, user answers questions & shapes next steps.
> Pre-v0.10 notes archived in `docs/legacy/VERSIONS_ARCHIVE.md`. Full technical changelog in `docs/memory/CHANGELOG.md`.

---

## v0.13.0-draft — Definition Experience & Navigation (2026-03-26)

### What Was Done

**Unified sidebar, agent/playbook creation wizards, and AgentCanvas.**

**UnifiedSidebar:**
- VS Code-style icon rail with collapsible panel
- Cases tree (active/completed/cancelled), threads nested under selected case
- Define section: lists agents and playbooks with tool/instruction counts
- Dev tools section: Admin, Debug, MCP Explorer, Seed

**DefinitionBuilder (New Agent / New Playbook wizard):**
- Step-by-step creation flow: name → system prompt → model config
- Live preview card on the right
- Creates the record in Dataverse → opens in AgentCanvas on success

**AgentCanvas (new tab type):**
- Full-page agent configuration view opened from sidebar or DefinitionBuilder
- Tabs: Overview (model config, MCP toggle), System Prompt (Monaco editor), Tools (bind/unbind with checkbox cards), Instructions (read list)
- Save button persists directly to `jw_agents` via SDK

**Bug Fixes:**
- `_jw_agentid_value` filter on `jw_instructions` removed — that relationship doesn't exist on the entity. Instructions load without agent filter now.
- Admin entity count race: parallel `Promise.all` with per-entity functional state updates

### Questions for User

- AgentCanvas: want an "Add Instruction" button to create instructions directly from there?
- DefinitionBuilder: currently 3 steps for agents (name, prompt, config). Enough or too many?
- Sidebar: should clicking an existing agent open AgentCanvas or Admin?

---

## v0.12.0 — UX Polish, Chat Persistence & Interactive Cards (2026-03-26)

### What Was Done

**Chat Input Toolbar:**
- Reasoning effort selector (cycles off → low → med → high) with brain icon
- Web search toggle with globe icon
- File upload button (reads text files, appends to message)
- Per-message options override the agent's default config

**Interactive Cards (ask_user tool):**
- Agent can present structured questions inline in chat
- 4 card types: choice (single/multi-select), confirm (yes/no), form (text/number/select/boolean fields), rating (stars)
- Uses existing HitL approval-resolver pattern — agent loop pauses until user responds
- Fully styled cards with hover states, selection feedback

**Agent Loop Registry:**
- Global singleton tracks running agent loops across tab switches
- Tab notification badges (pulsing dot) when background agent completes
- Acknowledged automatically when user switches to the tab

**Bidirectional Artifact Interaction:**
- Change accumulator tracks user edits to interactive artifacts (Table, SAP_Order, Form, Invoice)
- Before next user message, accumulated changes prepended as compact summaries
- Agent sees what changed without full payload bloat
- ArtifactViewTab now uses SemanticRenderer (was raw JSON dump)

**Bug Fixes:**
- Streaming markdown: deferred `renderMarkdown()` to post-streaming. Plain text during stream, full markdown after. No more layout thrashing.
- Config entity counts: parallel fetches with per-entity state updates. Each count appears independently as data loads.

### How to Test
1. Open chat → toolbar appears above textarea → click brain icon to cycle reasoning effort
2. Toggle web search → globe icon highlights → send message → agent uses web search
3. Ask agent to call `ask_user` tool → interactive card appears inline → respond → agent continues
4. Start a chat → agent begins tool calls → switch to another tab → pulsing dot appears when done
5. Open an artifact (SAP Order) → edit fields → send next message → agent sees "[Artifact Update]" prefix
6. Send a message that produces markdown → streams as plain text → renders with markdown after done

### Questions for User
- Interactive cards: choice/confirm/form/rating sufficient? Or need more card types?
- File upload: currently reads text files and appends to message. Want full binary upload via Doc Intelligence?
- Agent loop registry: want to show a "running" indicator on tabs while agent is active?

---

## v0.11.0 — Wire It Together (2026-03-26)

### What Was Done

**Connected existing features** that were built but never wired together. Focus: make things actually work end-to-end.

**Inline Visualizations:**
- `create_visual` tool now renders real recharts visualizations directly in the chat message stream
- `toolExecutor` emits `visual_created` event → `useAgentChat` picks it up → `VisualizationCard` renders inline in `ToolCallCard`
- Supports all 9 chart types: bar, line, pie, area, scatter, radar, treemap, table, 3d

**Terminal-Style Code Execution:**
- `run_data_code` results now render in a dark terminal UI (Catppuccin-inspired)
- Shows: code input, console.log output (grey), return value (green), errors (red), execution duration
- macOS-style window dots header

**Citation Rendering:**
- Web search citations from Responses API now display as clickable pill-style links below assistant messages
- Shows hostname or title, opens in new tab

**Bug Fixes:**
- `jw_status` string type fixed across 6 files (was number, broke comparisons)
- Seed data `jw_requiresapproval` and `jw_allowmcp` now use integers (0/1) instead of booleans
- `THREAD_STATUS_MAP` changed from number-keyed to string-keyed

### How to Test
1. Ask the agent to "query systemusers and show me a bar chart of their data" → should see inline chart
2. Ask the agent to "run some code to calculate 2+2" → should see terminal-style output
3. Enable web search on an agent and ask a web question → should see citation pills below the answer
4. Run seed data → check that choice fields are integers, not booleans
5. Start a playbook → case status should display correctly in CaseDashboard

### Questions for User
- Terminal design: Catppuccin dark theme good? Or prefer something lighter?
- Citations: pill-style links work? Or prefer inline footnote-style?
- Next priority: Agentic Learning Loop or Bounded History with Smart Summarization?

---

## v0.10.0 — Responses API Migration (2026-03-25)

### What Was Done

**Complete migration** from Chat Completions API to Azure OpenAI Responses API.

**Azure OpenAI Responses API:**
- Switched to `CustCon_AzureOpenAI_ResponsesService` connector (POST `/openai/responses`)
- API version `2025-04-01-preview`
- Request uses `input` array + `instructions` field instead of `messages`
- Response uses typed `output` items: `reasoning`, `message`, `function_call`, `web_search_call`
- Multi-turn via `previous_response_id` — avoids resending full conversation
- **Web search**: Built-in `{ type: 'web_search' }` tool, toggle via `ModelConfig.web_search`
- Default model: `gpt-5.2`, `max_output_tokens: 4096`

**Bug Fixes:**
- `jw_status` string type fix — case creation was broken
- Seed data N:N dedup — queries before creating agent-tool links
- `reasoning_effort` default `undefined` instead of `'medium'` — was blocking non-reasoning models
- CloudFlow tools now throw explicit errors instead of fake success
- Doc Intelligence saves full `analyzeResult` as artifact

### Connector Setup

- **New connector required**: `CustCon_AzureOpenAI_Responses` pointing to `/openai/responses` endpoint
- Sample payloads in `ContextFiles/customconnectorinformation/azureopenai_responses.txt`
- The old `CustomConnector_AzureOpenAIService` (Chat Completions) is no longer used

### How to Test
1. Basic chat: open a thread, send a message. Response via Responses API.
2. Web search: agent with `web_search: true` in ModelConfig → search results appear as tool calls
3. Reasoning: with o-series model and `reasoning_effort` set, thought bubbles appear
4. Tool calls: function calls work as before — same tool execution pipeline
5. Token counter: shows Input/Output/Total (was Prompt/Completion/Total)

### Questions for User
1. Keep old Chat Completions connector as fallback, or fully remove?
2. Web search toggle — per-agent in AdminWorkspace, or global setting?
3. ConnectorTester: keep a Chat Completions test mode?
