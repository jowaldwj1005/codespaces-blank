# **6. Frameworks & Repository Setup**

## **6.1 The SPA Constraint (CRITICAL)**

This is a Power Platform Code App. It runs entirely in the browser as a Single Page Application (SPA) inside the Power Apps Host.

**DO NOT** write or expect any Node.js backend code. **DO NOT** create Next.js API routes (e.g., /api/chat).

## **6.2 Tech Stack & Libraries**

* **Vite:** The build tool.  
* **React 18+ & TypeScript:** Core framework.  
* **Vercel AI SDK (@ai-sdk/react):** Used strictly for client-side state management (useChat, useObject).  
* **Fluent UI React v9 (@fluentui/react-components):** The primary component library to ensure native Microsoft styling.  
* **Tailwind CSS:** Used for layout utility classes (spacing, flex, grid).  
* **Zod:** Used to validate JSON payloads from Dataverse Artifact records before rendering them.

## **6.3 Adapting the Vercel AI SDK**

Because we lack a Node.js backend, you must intercept the useChat hook's network requests.

Instead of sending requests to a local API, the useChat hook must be configured to use a custom fetch implementation that routes the payload through context.webAPI (calling an Action/Custom API in Dataverse) or triggers a Power Automate flow that handles the Azure OpenAI connection.

*Example pattern:*

const { messages, append, toolInvocations } = useChat({  
  api: 'custom-endpoint', // Ignored because we override fetch  
  fetch: async (url, options) => {  
    // 1. Intercept the payload  
    const body = JSON.parse(options.body as string);  
    // 2. Route via Dataverse WebAPI to your Azure OpenAI Custom API/Connector  
    const response = await dataverseService.callOpenAI(body.messages);  
    // 3. Return a mock Response object so Vercel SDK can parse the stream/result  
    return new Response(response.data);   
  }  
});

## **6.4 The Semantic Renderer Architecture**

Create a folder src/components/semantic/.

This folder will contain all the UI components mapped to meta_artifact types.

* SapApprovalForm.tsx  
* InvoiceDataGrid.tsx (Use AG Grid or Fluent UI DataGrid for tabular JSON data)  
* CheatSheetViewer.tsx

Create a central ArtifactRenderer.tsx that takes (type: string, payload: string) as props, parses the payload with Zod, and returns the correct semantic component.

## **6.5 The Interceptor Hook**

Create a custom hook useToolInterceptor.ts. This hook must observe the toolInvocations array from useChat.

If a tool requires approval (checked via the meta_tool table):

1. Halt the AI response.  
2. Create a meta_toolexecution record in Dataverse (Status: Pending).  
3. Emit state to the UI to render the approval form.