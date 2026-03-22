# **1. Architecture Core: The CasePlaybookAgent-App**

## **1.1 The Problem**

Traditional Power Apps (Canvas/Model-driven) require developers to build specific screens for specific processes (e.g., a screen for SAP PR creation). This is rigid. AI agents typically operate in silos, isolated from the UI data.

## **1.2 The Solution: Semantic Component Mapping**

The React application acts solely as a rendering and orchestration engine.

* The AI Agent produces JSON data.  
* This data is saved in Dataverse as an Artifact record.  
* The Artifact has a Type field (e.g., Type = "SapApprovalPayload" or Type = "InvoiceExtractedItems").  
* The React App uses a switch statement (or registry) to map the Type string to a specific React Component, passing the JSON as props.  
* **Benefit:** If the user updates the data in the UI (e.g., correcting an extracted invoice amount), the React app updates the Artifact JSON in Dataverse. The Agent always reads the latest JSON.

## **1.3 Decoupled Workspaces (Thread N:M Case)**

Do not bind a chat session to a single business process.

* **Case (_case):** The business state (e.g., "Onboarding Employee X", "SAP Order 123").  
* **Thread (_thread):** The interaction layer (The Chat).  
* **Architecture:** A Thread has an N:M relationship with Cases.  
* **UX Flow:** The user can "tag" or "link" multiple Cases into their current chat via the UI. The Agent then has access to the ContextData and Artifacts of ALL linked cases, allowing cross-process operations (e.g., "Compare the invoice in Case A with the SAP order in Case B").

## **1.4 The SDK Wrapper Rule**

Because this is a Power Platform Code App, it runs inside a secure Microsoft host. You must build custom React Hooks (e.g., useDataverseCRUD) that wrap context.webAPI.retrieveMultipleRecords, createRecord, updateRecord. Do not attempt to handle OAuth or API keys for Dataverse.