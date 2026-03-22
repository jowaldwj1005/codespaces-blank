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

## **5.3 Bridging the Vercel AI SDK to Custom Connectors**

The Vercel AI SDK useChat hook expects an API endpoint. Since we are a Single Page Application (SPA) without a Node.js backend, you must override the fetch property of useChat to route the LLM request through the generated Custom Connector for Azure OpenAI.

**Implementation Pattern:**

import { useChat } from '@ai-sdk/react';  
// IMPORT the exact generated connector after inspecting the generated folder:  
import { AzureOpenAIConnector } from '../generated/connectors/AzureOpenAI'; 

export function useAgentChat() {  
  return useChat({  
    api: 'ignored',   
    fetch: async (url, options) => {  
      const payload = JSON.parse(options.body as string);  
        
      // Route the chat history to the Custom Connector  
      const response = await AzureOpenAIConnector.ChatCompletions({  
        body: payload  
      });  
        
      // You must parse the connector's response and return a mock Web API Response   
      // so the Vercel SDK can process the stream or JSON correctly.  
      return new Response(JSON.stringify(response.data), {  
         headers: { 'Content-Type': 'application/json' }  
      });  
    }  
  });  
}

## **5.4 Dataverse WebAPI via SDK**

For CRUD operations on our meta_ tables:

* Check if the CLI generated specific entity hooks/services. If yes, use them.  
* If no specific entity services exist, use the globally provided Power Apps context (e.g., context.webAPI.retrieveMultipleRecords).  
* ALWAYS map the stringified meta_payload JSON columns to proper TypeScript interfaces (using Zod for validation) immediately after fetching.