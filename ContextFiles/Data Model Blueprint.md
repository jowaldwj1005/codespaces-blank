# **2\. Dataverse Data Model Blueprint (Strict Schema)**

**AI DEV DIRECTIVE:** This document is the strict source of truth for the Dataverse schema. When creating entities, you MUST adhere to these exact data types. Pay special attention to fields marked as Multiline Text intended for JSON payloads—ensure their max length is set to the Dataverse maximum (1,048,576 characters). *Note: Standard Dataverse columns (createdon, createdby, ownerid, statecode, statuscode) are omitted here but are assumed to exist.*  
We use the placeholder publisher prefix jw_. Replace this with the actual environment prefix.
jw is set as confirmed prefix, initial plasecolder meta was replaced automatically in this file.
## **2.1 Definition Layer (The Brains & Workflows)**

### **Entity: Agent (jw_agent)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_name | Single Line of Text | The display name of the AI persona. |
| jw_systemprompt | Multiline Text | The base system prompt. Injected at the start of every thread. |
| jw_modelconfig | Multiline Text | **JSON Payload.** Stores LLM parameters like {"temperature": 0.2, "model": "gpt-5.3"}. |
| jw_allowmcp | Yes/No (Boolean) | **Security Flag.** If Yes, the React app automatically appends the Dataverse MCP tools (Search, Schema, Query) to the agent's context. |

### **Entity: Tool (jw_tool)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_name | Single Line of Text | **CRITICAL:** The exact function name the LLM will call (e.g., trigger\_sap\_post). |
| jw_description | Multiline Text | Used by the LLM to understand *when* and *how* to use the tool. |
| jw_inputschema | Multiline Text | **JSON Payload.** The strict JSON schema defining the arguments the LLM must provide. |
| jw_requiresapproval | Yes/No (Boolean) | **HitL Controller.** If Yes, the React app MUST pause the LLM loop and render an approval UI when this tool is called. |
| jw_endpointtype | Choice | Values: CloudFlow, CustomConnector, InternalReact. Tells the frontend how to execute the tool after approval. |
| jw_executiontarget | Single Line of Text | The Flow ID or Connector endpoint reference. |

### **Entity: Playbook (jw_playbook)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_name | Single Line of Text | E.g., "SAP Invoice Processing". Groups instructions together. |
| jw_description | Multiline Text | Human-readable context for the process. |

### **Entity: Instruction (jw_instruction)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_playbookid | Lookup | Lookup to jw_playbook. Can be null for global instructions. |
| jw_type | Single Line of Text | E.g., Rule or CheatSheet. Used by React to decide if it's injected immediately (Rule) or added to the Tool Index (CheatSheet). |
| jw_tags | Single Line of Text | **Index Key.** Comma-separated tags (e.g., SAP, Error 400). Pushed to the LLM as an index so it can fetch the full content on-demand. |
| jw_content | Multiline Text | The actual knowledge/markdown text the LLM needs. |

## **2.2 State & Workspace Layer (The Business Data)**

### **Entity: Case (jw_case)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_title | Single Line of Text | The human-readable identifier (e.g., "Banf Laptop IT"). |
| jw_playbookid | Lookup | Lookup to jw_playbook. If populated, this case follows a strict process. |
| jw_contextdata | Multiline Text | **JSON Payload.** Global variables and state specific to this business case. |

### **Entity: Artifact (jw_artifact)**

**AI DEV NOTE:** This is the most critical entity for the UI. The React app is a rendering engine driven by this table.

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_caseid | Lookup | Lookup to jw_case. **Optional** — artifacts (e.g. visualizations) can exist without a case. |
| jw_parentartifactid | Lookup | Self-referential. Allows grouping (e.g., an extraction artifact with child error artifacts). |
| jw_type | Single Line of Text | **CRITICAL:** MUST be a String, NOT a Choice. Drives the Semantic UI mapping (e.g., Type="SapPayload" maps to \<SapForm /\>). |
| jw_referencekey | Single Line of Text | Escaped string or ID (e.g., "SAP-Vendor-123"). Used for fast OData/FetchXML querying. |
| jw_payload | Multiline Text | **JSON Payload.** (Set Dataverse Max Length: 1,048,576). The raw data. The React UI edits this directly. |

### **Entity: Document (jw_document)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_caseid | Lookup | Lookup to jw_case. |
| jw_file | File | The physical file blob (PDF, Image). |
| jw_mimetype | Single Line of Text | E.g., application/pdf. Used for UI rendering logic. |

## **2.3 Interaction Layer (Audit, Chat & HitL)**

### **Entity: Thread (jw_thread)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_title | Single Line of Text | E.g., "Chat session 10/24". |
| jw_agentid | Lookup | Lookup to jw_agent. The primary AI handling the conversation. |
| jw_parentthreadid | Lookup | **Self-referential.** Links sub-agent threads back to the parent thread for delegation tracking. Null for top-level threads. |
| jw_status | Choice | **Active** (100000000), **Completed** (100000001), **Cancelled** (100000002). Thread lifecycle for sub-agents and thread list UI. |

### **Relationship: Thread to Case (jw_thread\_case)**

* **Type:** N:N (Many-to-Many).  
* **Purpose:** A Thread acts as a Workspace. It can link to multiple Cases, allowing the LLM to query Artifacts and ContextData from multiple business processes within a single conversation.

### **Entity: Message (jw_message)**

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_threadid | Lookup | Lookup to jw_thread. |
| jw_role | Single Line of Text | user, assistant, system, or tool. Required for custom agent loop message reconstruction. |
| jw_content | Multiline Text | The chat string. |
| jw_toolcalls | Multiline Text | **JSON Payload.** Stores the `tool_calls` array from assistant messages. Required for conversation replay and sub-agent audit. |
| jw_tokenprompt | Whole Number | Prompt tokens consumed by the API call that generated this assistant message. |
| jw_tokencompletion | Whole Number | Completion tokens consumed by the API call that generated this assistant message. |

### **Entity: Tool Execution (jw_toolexecution)**

**AI DEV NOTE:** This table is the absolute core of the Human-in-the-Loop (HitL) and Audit architecture.

| Schema Name | Dataverse Type | Feature Role & Description |
| :---- | :---- | :---- |
| jw_messageid | Lookup | Lookup to jw_message. Links the execution to the Assistant message that called it. |
| jw_toolid | Lookup | Lookup to jw_tool. |
| jw_callid | Single Line of Text | The unique tool\_call\_id generated by the LLM. Required to return the response to the LLM. |
| jw_requestpayload | Multiline Text | **JSON Payload.** The arguments generated by the LLM. Displayed in the UI for human review. |
| jw_responsepayload | Multiline Text | **JSON Payload.** The result returned from SAP/Dataverse/API after successful execution. |
| jw_approvalstate | Choice | Pending, Approved, Rejected, AutoExecuted. Controls the React App's blocking UI. |

