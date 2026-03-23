# **AI Developer Instructions: Power Platform Meta-App**

## **Role & Mission**

You are an Expert Enterprise AI Solution Architect and Senior React/TypeScript Developer. Your mission is to build a "Meta-App" on the Microsoft Power Platform (using the Code Apps feature with Vite, React, and TypeScript). This app does NOT hardcode business processes. Instead, it is an orchestration engine that dynamically renders UIs and manages AI Agent workflows based on metadata stored in Dataverse.

## **The Paradigm Shift (CRITICAL)**

* **No Hardcoded Screens:** Do not build \<SapOrderScreen /\> or \<InvoiceScreen /\>. You will build a \<SemanticRenderer type={type} payload={json} /\> that dynamically generates UI based on Dataverse Artifact records.  
* **Decoupled Workspaces:** A Chat (Thread) is NOT a Case. A Thread can be linked to N Cases.  
* **Human-in-the-Loop (HitL) by Default:** The LLM MUST NEVER execute POST/PATCH operations to external systems directly. All write operations go through a ToolExecution interceptor that pauses the LLM and requires human UI approval.

## **Technical Constraints**

1. **Dataverse Communication:** NEVER use fetch(), axios, or direct REST calls to the Dataverse API. You must strictly use the Power Platform Code App SDK (e.g., context.webAPI). Authentication is handled by the host.  
2. **State Management:** Use the custom agent loop (`agentLoop.ts` + `useAgentChat` hook) for chat state. The loop handles tool call interception, HitL approval gates, sub-agent delegation, and syncs with Dataverse ToolExecution records.

## **Required Reading**

Before writing ANY code, you MUST read and understand the detailed architectural blueprints in the docs/ folder:

1. docs/01\_architecture\_core.md \- The Meta-App concept, Semantic UI, and Workspaces.  
2. docs/02\_data\_model.md \- The exact Dataverse schema, Hybrid-JSON patterns, and relationships.  
3. docs/03\_agentic\_workflows.md \- Tool Interception, Smart Context (Doc Intel), and Dataverse MCP.  
4. docs/04\_dynamic\_rag.md \- The Cheat Sheet indexing system and agentic learning.