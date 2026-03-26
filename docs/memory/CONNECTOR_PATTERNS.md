# Connector Patterns & Learnings

Reference for working with custom connectors in Playbook Agent.

## General Pattern

All connectors are accessed via PAC CLI generated services that use `client.executeAsync()` with a `connectorOperation` config. Auth is handled by the Power Apps host.

Response shapes vary per connector — always normalize before business logic.

## Azure OpenAI — Responses API

**Service:** `CustCon_AzureOpenAI_ResponsesService`
**Operations:** `response_post` (create), `response_get` (retrieve)

### API Version
- `api_version`: `'2025-04-01-preview'` (Responses API)

### Critical: Responses API format (NOT Chat Completions)
The Responses API is a **completely different format** from Chat Completions:

| Chat Completions | Responses API |
|---|---|
| `messages` array | `input` array + `instructions` for system prompt |
| System message in `messages` | `instructions` field (top-level) |
| `choices[0].message.content` | `output` array with typed items |
| `max_completion_tokens` | `max_output_tokens` |
| `prompt_tokens` / `completion_tokens` | `input_tokens` / `output_tokens` |
| N/A | `previous_response_id` for multi-turn |

### Request Format
```typescript
{
  model: 'gpt-5.2',
  instructions: 'System prompt here',
  input: [
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: '...' }] }
  ],
  tools: [
    { type: 'web_search' },
    { type: 'function', name: '...', description: '...', parameters: {...} }
  ],
  reasoning: { effort: 'medium', summary: 'auto' },
  max_output_tokens: 4096,
  // NOTE: Do NOT send temperature — Responses API defaults to 1 internally
  previous_response_id: '...',  // multi-turn continuation
  store: true,
}
```

### Response Output Items (typed)
The `output` array contains typed items processed in order:
- **`reasoning`** — Chain-of-thought with `summary[]` containing `summary_text` items
- **`web_search_call`** — Web search actions with queries/URLs
- **`function_call`** — Tool calls with `call_id`, `name`, `arguments`
- **`message`** — Assistant text with optional `annotations` (url_citation)

### Tool Results
Send tool results back as `function_call_output` input items:
```typescript
{ type: 'function_call_output', call_id: 'call_xxx', output: '...' }
```

### Web Search
Add `{ type: 'web_search' }` to tools array. Toggle via `ModelConfig.web_search`. Do NOT include `search_context_size` — the API defaults to `medium`.

### CRITICAL: Do NOT send temperature
The Responses API does NOT accept a `temperature` parameter in the request. The API defaults to `temperature: 1` internally. Sending temperature will cause errors.

### Central Defaults
Managed in `OPENAI_DEFAULTS` in `connectors.ts`:
```typescript
export const OPENAI_DEFAULTS = {
  apiVersion: '2025-04-01-preview',
  model: 'gpt-5.2',
  max_output_tokens: 4096,
  temperature: 0.7,
  reasoningEffort: undefined,
  reasoningSummary: 'auto',
  store: true,
};
```

### Token Usage
```typescript
usage.input_tokens              // total input
usage.output_tokens             // total output
usage.input_tokens_details.cached_tokens      // cache hits
usage.output_tokens_details.reasoning_tokens  // CoT tokens
```

## Azure Document Intelligence

**Service:** `CustCon_AzureDocIntService`
**Operations:** `AnalyzeDocument`, `GetAnalyzeResult`

### Async Pattern (Critical)
Document analysis is asynchronous:
1. **Submit:** `AnalyzeDocument` returns immediately with an `Operation-Location` header
2. **Extract ID:** Parse the result ID from Operation-Location URL: `.../analyzeResults/<id>`
3. **Poll:** Call `GetAnalyzeResult(id)` every 2s until `status === 'succeeded'` or `'failed'`
4. **Result:** `analyzeResult.content` contains the extracted text (markdown format)

The `analyzeAndWait()` helper in `connectors.ts` handles the full flow automatically.

### Operation-Location Extraction
The ID can appear in multiple places depending on the connector wrapper:
- `headers['Operation-Location']`
- `body.operationLocation`
- `data.resultId`
The `extractOperationId()` helper checks all known locations.

## SAP OData

**Service:** `CustCon_SAP_OdataService`
**Operation:** `ExecuteSapODataRequest`

### Critical: POST-Only Connector
The custom connector **always sends POST** to the Power Automate proxy flow.
The `method` field *inside* the request body tells the flow which HTTP verb to execute against SAP.
This is NOT a REST passthrough — it's an RPC-style envelope.

### Key Parameters
- `api_version`: `'1'` (just the number — NOT a date-based version string)
- `sp`: `'/triggers/manual/run'` (NOT `/triggers/manual/paths/invoke` — that returns AuthorizationFailed 401)
- `sv`: `'1.0'`
- `body`: `{ method, relativePath, queryString?, body?, headers? }`

### Error: AuthorizationFailed on `/triggers/manual/paths/invoke`
Using the wrong `sp` path returns 401: `You do not have permissions to perform action 'run' on scope '/triggers/manual/paths/'`.
The correct path for the Power Automate proxy flow trigger is `/triggers/manual/run`.

### Request Body Structure (RPC Envelope)
The connector POSTs this envelope to the flow. The flow unpacks it and executes against SAP:
```typescript
{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',  // HTTP verb for SAP
  relativePath: '/API_SALES_ORDER_SRV/A_SalesOrder',  // SAP OData path
  queryString: '$top=10&$filter=SalesOrder eq \'123\'',  // OData query
  body: { ... },  // POST/PATCH payload for SAP
  headers: { ... }  // NOTE: may not be fully supported by connector config
}
```

### Headers Support
The `headers` field is part of the interface but **may not be fully supported** depending on the Power Automate flow configuration. Test with the Debug Log tab to verify if headers are forwarded to SAP.

## Response Normalization

Connectors wrap responses differently. The `normalizeConnectorResponse()` helper unwraps in order:
1. `raw.success.data`
2. `raw.data`
3. `result`
4. `data`
5. `body`
6. Return as-is

Always log both normalized AND raw payloads in debug events.
