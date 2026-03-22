# Connector Patterns & Learnings

Reference for working with custom connectors in Playbook Agent.

## General Pattern

All connectors are accessed via PAC CLI generated services that use `client.executeAsync()` with a `connectorOperation` config. Auth is handled by the Power Apps host.

Response shapes vary per connector — always normalize before business logic.

## Azure OpenAI

**Service:** `CustomConnector_AzureOpenAIService`
**Operation:** `chat_completion`

### Key Parameters
- `api_version`: `'2025-01-01-preview'` (current)
- `body`: Chat completion request object

### Critical: Use `max_completion_tokens`, NOT `max_tokens`
The Azure OpenAI API requires `max_completion_tokens`. Using `max_tokens` will be silently ignored or error.

### Central Defaults
Managed in `OPENAI_DEFAULTS` in `connectors.ts`:
```typescript
export const OPENAI_DEFAULTS = {
  apiVersion: '2025-01-01-preview',
  max_completion_tokens: 800,
  temperature: 0.7,
};
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

### Key Parameters
- `api_version`: `'2024-10-01'` (NOT `2024-01-01` — that returns "version not supported")
- `sp`: `'/triggers/manual/paths/invoke'`
- `sv`: `'1.0'`
- `body`: `{ method, relativePath, queryString?, body?, headers? }`

### Request Structure
```typescript
{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  relativePath: '/sap/opu/odata/sap/...',
  queryString: '$top=10&$filter=...',
  body: { ... },  // for POST/PATCH
  headers: { 'X-Custom': 'value' }
}
```

## Response Normalization

Connectors wrap responses differently. The `normalizeConnectorResponse()` helper unwraps in order:
1. `raw.success.data`
2. `raw.data`
3. `result`
4. `data`
5. `body`
6. Return as-is

Always log both normalized AND raw payloads in debug events.
