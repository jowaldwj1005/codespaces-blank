# **5. PAC CLI Generated Services & Custom Connectors**

## **5.1 The "Look Before You Leap" Rule (CRITICAL)**

The user will use the Power Platform CLI (pac code add ...) to inject Dataverse tables and Custom Connectors (e.g., Azure OpenAI, SAP) into this project.

This CLI generates a specific folder (usually src/generated, src/powerapps, or similar) containing strongly-typed TypeScript clients.

**YOUR DIRECTIVE:**

Before you write ANY data-fetching logic or UI components, you MUST:

1. List the contents of the generated folders.  
2. Read the exported TypeScript interfaces and functions for the Custom Connectors and Dataverse tables.  
3. Use ONLY these exported modules. Do not guess their names.

## **5.2 Handling Custom Connectors (Connection References)**

When a Custom Connector is added, the CLI generates a proxy client based on the connector's OpenAPI spec.

* **NO HTTP CLIENTS:** You MUST NOT use fetch, axios, or standard REST calls to reach these external systems.  
* **NO AUTH LOGIC:** The generated client automatically utilizes the Power Apps Host to append the user's Microsoft Entra ID token and route the request securely.  
* **USAGE:** Import the generated object/class and call its methods directly.  
  *(Example: If the CLI generated a DocIntelConnector, you will use await DocIntelConnector.AnalyzeDocument(payload)).*

## **5.3 Custom Agent Loop (replaces Vercel AI SDK)**

**Decision (v0.4.0):** We do NOT use the Vercel AI SDK. The Azure OpenAI Custom Connector returns full JSON responses (no SSE streaming), making Vercel's `useChat` hook unnecessary overhead. Instead, we use a **custom agent loop** (`src/services/agentLoop.ts`) that gives us full control over:

- Tool call interception and HitL approval
- Sub-agent delegation with real-time UI updates
- Token tracking per API call
- Maximum debuggability via debugEventBus

**Implementation Pattern:**

```typescript
import { azureOpenAI } from '../services/connectors';

// The agent loop calls azureOpenAI.chatCompletion() directly:
const { normalized } = await azureOpenAI.chatCompletion({
  messages: [...systemPrompt, ...history, userMessage],
  tools: agentToolDefinitions,
  tool_choice: agent.modelConfig.tool_choice ?? 'auto',
});

// Parse response → if tool_calls → execute via toolExecutor → loop
// If no tool_calls → done, return assistant message
```

See `src/services/agentLoop.ts` for the full implementation.

## **5.4 Dataverse WebAPI via SDK**

For CRUD operations on our meta_ tables:

* Check if the CLI generated specific entity hooks/services. If yes, use them.  
* If no specific entity services exist, use the globally provided Power Apps context (e.g., context.webAPI.retrieveMultipleRecords).  
* ALWAYS map the stringified meta_payload JSON columns to proper TypeScript interfaces (using Zod for validation) immediately after fetching.