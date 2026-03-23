# **6. Frameworks & Repository Setup**

## **6.1 The SPA Constraint (CRITICAL)**

This is a Power Platform Code App. It runs entirely in the browser as a Single Page Application (SPA) inside the Power Apps Host.

**DO NOT** write or expect any Node.js backend code. **DO NOT** create Next.js API routes (e.g., /api/chat).

## **6.2 Tech Stack & Libraries**

* **Vite:** The build tool.  
* **React 18+ & TypeScript:** Core framework.  
* **Custom Agent Loop:** Replaces Vercel AI SDK — full control over tool interception, sub-agents, and token tracking. No SSE streaming needed (Custom Connector returns full JSON).
* **Fluent UI React v9 (@fluentui/react-components):** The primary component library to ensure native Microsoft styling.
* **Tailwind CSS:** Used for layout utility classes (spacing, flex, grid).
* **Zod:** Used to validate JSON payloads from Dataverse Artifact records before rendering them.
* **Recharts + Three.js:** Visualization library for agent-generated charts and 3D scenes.

## **6.3 Custom Agent Loop Architecture**

Since the Azure OpenAI Custom Connector returns complete JSON responses (no SSE/streaming), we use a custom agent loop instead of Vercel AI SDK:

```
User Message → Build messages array → azureOpenAI.chatCompletion()
  → If tool_calls: execute tools (HitL gate if needed) → loop back
  → If no tool_calls: return assistant message → done
```

Key hooks:
- `useAgentChat(agentId, threadId)` — manages the loop, messages, tool calls, token tracking
- `useThreadManager()` — thread CRUD and navigation

See `src/services/agentLoop.ts` and `src/hooks/useAgentChat.ts`.

## **6.4 The Semantic Renderer Architecture**

Create a folder src/components/semantic/.

This folder will contain all the UI components mapped to meta_artifact types.

* SapApprovalForm.tsx  
* InvoiceDataGrid.tsx (Use AG Grid or Fluent UI DataGrid for tabular JSON data)  
* CheatSheetViewer.tsx

Create a central ArtifactRenderer.tsx that takes (type: string, payload: string) as props, parses the payload with Zod, and returns the correct semantic component.

## **6.5 Tool Execution & HitL**

Tool execution is handled by `src/services/toolExecutor.ts`. The agent loop passes each tool call through this executor:

1. Check `jw_tool.jw_requiresapproval`
2. If no approval needed → execute directly (builtin or connector)
3. If approval needed → create `jw_toolexecution` record (Pending) → emit event to UI → wait for approve/reject callback
4. On approve: execute tool, save response, return to agent loop
5. On reject: return rejection message to LLM, loop continues

Built-in tools (InternalReact): `create_visual`, `exit`, `delegate_to_agent`, `load_cheat_sheet`, MCP bridges.

See `src/services/toolExecutor.ts` and `src/services/builtinTools.ts`.