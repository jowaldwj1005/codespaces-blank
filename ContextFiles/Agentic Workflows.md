# **3. Agentic Workflows & Tool Management**

## **3.1 Human-in-the-Loop (HitL) & The Tool Interceptor**

We must never trust the LLM to execute POST requests (like SAP updates) blindly.  
**The Architecture:**

1. The LLM decides to call post_sap_order with a JSON payload.  
2. The React Frontend intercepts this Tool Call.  
3. The App checks the prefix_tool table. If requires_approval == true:  
   * It creates a prefix_toolexecution record in Dataverse.  
   * request_payload = the LLM's generated JSON.  
   * approval_state = Pending.  
4. **The LLM is paused.** No response is sent back to the AI yet.  
5. The React UI observes the Pending state and renders a Semantic UI Component (e.g., <SapApprovalForm data={requestPayload} />).  
6. The user reviews the data in the UI, makes edits if necessary, and clicks "Approve".  
7. The React App updates the request_payload with the user's edits, sets state to Approved, and triggers the actual execution (e.g., calling the Power Automate Cloud Flow via a Custom Connector).  
8. Once the Flow returns a 200 OK, the result is saved to response_payload.  
9. The React App formats this as a Tool Response and resumes the LLM generation loop.

## **3.2 Smart Context & Document Routing (Token Optimization)**

Do not dump entire documents into the LLM context window. The LLM is a router, not a parser.  
**The Workflow:**

1. User uploads a PDF in the chat.  
2. React App saves the file to the prefix_document table.  
3. React App injects a hidden system message: *"User uploaded file 'Invoice.pdf' (DocID: 123). Select an extraction method."*  
4. LLM calls tool: extract_document(doc_id: 123, method: "azure-doc-intel-prebuilt-invoice").  
5. React App intercepts the tool, calls the Azure Doc Intel Custom Connector itself.  
6. React App saves the extracted JSON as a prefix_artifact (Type: "InvoiceData").  
7. React App sends back ONLY the Artifact ID and a brief summary to the LLM.  
8. The UI renders the Artifact JSON as an editable grid for the user.

## **3.3 The Dataverse MCP (Model Context Protocol)**

How does the Agent query Dataverse without having the entire CRM schema in its system prompt? We give it "Explorer Tools" (if allow_dynamic_exploration is enabled for the Agent):

* search_dataverse_tables(intent: string): App maps intent to a whitelisted set of tables and returns logical names.  
* get_table_schema(logical_name: string): App returns a highly minified JSON of the table schema (only essential columns/types).  
* execute_dataverse_query(fetch_xml: string): App executes the read-only query and returns the JSON result. *(Note: Writes MUST use specific tools that enforce the HitL Approval pattern).*