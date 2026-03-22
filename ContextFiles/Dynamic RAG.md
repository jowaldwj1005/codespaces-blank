# **4. Dynamic RAG & Agentic Learning (Cheat Sheets)**

## **4.1 The Concept**

Agents need to remember specific learnings (e.g., "SAP OData requires parameter X to be an array for this specific API"). We do not put all learnings into the System Prompt, as this wastes tokens and confuses the model.

## **4.2 The "Index" Injection**

When a Thread starts, the React App queries the prefix_instruction table where type = 'CheatSheet'. Instead of injecting the full content, the App builds an **Index** based on the tags and id columns.  
**Example System Prompt Injection:**  
`Available Knowledge Base (Cheat Sheets):`  
`- ID: 101 | Tags: SAP, OData, Error 400`  
`- ID: 102 | Tags: DocIntel, Vendor Mapping`  
``If you need this information, use the tool `load_cheat_sheet(id)`.``

The LLM decides independently if it needs to fetch the full text of ID 101 before building a payload.

## **4.3 Agentic Learning (save_learning Tool)**

The LLM can self-correct and save knowledge for the future.

1. The LLM figures out how to fix a failing API call based on user chat feedback.  
2. The LLM calls the tool save_learning(tags: "SAP, Navigation Property", content: "Always expand the Vendor entity when querying Invoices.").  
3. Because this is a write operation, the React App creates a ToolExecution in Pending state.  
4. The user sees the proposed "Cheat Sheet" in the UI, can edit the markdown, and approves it.  
5. The App saves it as a new prefix_instruction record. Next time, it appears in the Agent's Index.