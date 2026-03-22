# **6\. Entity Relationship Diagram (ERD) & Custom Intersections**

## **6.1 The Dataverse ERD**

This diagram illustrates the logical data model. **CRITICAL AI DEV NOTE:** We DO NOT use native Dataverse N:N relationships. We use custom intersection tables (jw\_agenttool and jw\_threadcase) with a generic jw\_data JSON column to store relationship-specific metadata.  
`erDiagram`  
    `%% DEFINITION LAYER (Brains & Rules)`  
    `jw_agent {`  
        `Guid jw_agentid PK`  
        `String jw_name "Display Name"`  
        `Multiline jw_systemprompt "Base Prompt"`  
        `Multiline jw_modelconfig "JSON (Temp, Model)"`  
        `Boolean jw_allowmcp "Allow Dataverse Explorer"`  
    `}`  
      
    `jw_tool {`  
        `Guid jw_toolid PK`  
        `String jw_name "Function Name"`  
        `Multiline jw_description "Used by LLM"`  
        `Multiline jw_inputschema "JSON Schema"`  
        `Boolean jw_requiresapproval "HitL Flag"`  
        `String jw_endpointtype "Flow/Connector/Internal"`  
        `String jw_executiontarget "Endpoint ID"`  
    `}`

    `jw_agenttool {`  
        `Guid jw_agenttoolid PK`  
        `Guid jw_agentid FK`  
        `Guid jw_toolid FK`  
        `Multiline jw_data "JSON Array (Overrides, Configs)"`  
    `}`

    `jw_playbook {`  
        `Guid jw_playbookid PK`  
        `String jw_name "Process Name"`  
        `Multiline jw_description "Process Context"`  
    `}`

    `jw_instruction {`  
        `Guid jw_instructionid PK`  
        `Guid jw_playbookid FK "Optional"`  
        `String jw_type "Rule vs CheatSheet"`  
        `String jw_tags "Index Keys"`  
        `Multiline jw_content "Markdown/Knowledge"`  
    `}`

    `%% STATE & WORKSPACE LAYER (Business Data)`  
    `jw_case {`  
        `Guid jw_caseid PK`  
        `Guid jw_playbookid FK "Optional"`  
        `String jw_title "Business Identifier"`  
        `String jw_status "Status"`  
        `Multiline jw_contextdata "JSON (Global Case State)"`  
    `}`

    `jw_artifact {`  
        `Guid jw_artifactid PK`  
        `Guid jw_caseid FK`  
        `Guid jw_parentartifactid FK "Self Reference"`  
        `String jw_type "UI Component Router Key"`  
        `String jw_referencekey "Fast Search Index"`  
        `Multiline jw_payload "JSON (Max Length 1M)"`  
    `}`

    `jw_document {`  
        `Guid jw_documentid PK`  
        `Guid jw_caseid FK`  
        `File jw_file "Physical Blob"`  
        `String jw_mimetype "e.g., application/pdf"`  
    `}`

    `%% INTERACTION LAYER (Chat & Audit)`  
    `jw_thread {`  
        `Guid jw_threadid PK`  
        `Guid jw_agentid FK "Primary Persona"`  
        `String jw_title "Chat Title"`  
    `}`

    `jw_threadcase {`  
        `Guid jw_threadcaseid PK`  
        `Guid jw_threadid FK`  
        `Guid jw_caseid FK`  
        `Multiline jw_data "JSON Array (Link Context/Roles)"`  
    `}`

    `jw_message {`  
        `Guid jw_messageid PK`  
        `Guid jw_threadid FK`  
        `String jw_role "user/assistant/system/tool"`  
        `Multiline jw_content "Chat Text"`  
    `}`

    `jw_toolexecution {`  
        `Guid jw_toolexecutionid PK`  
        `Guid jw_messageid FK "Assistant Message Link"`  
        `Guid jw_toolid FK "Executed Tool"`  
        `String jw_callid "LLM Tool Call ID"`  
        `Multiline jw_requestpayload "JSON (HitL Review)"`  
        `Multiline jw_responsepayload "JSON (Result)"`  
        `String jw_approvalstate "Pending/Approved/Rejected"`  
    `}`

    `%% RELATIONSHIPS`  
    `jw_agent ||--o{ jw_agenttool : "has"`  
    `jw_tool ||--o{ jw_agenttool : "used by"`  
      
    `jw_playbook ||--o{ jw_instruction : "defines"`  
    `jw_playbook ||--o{ jw_case : "governs"`  
      
    `jw_case ||--o{ jw_artifact : "stores"`  
    `jw_case ||--o{ jw_document : "contains"`  
    `jw_artifact ||--o{ jw_artifact : "parent of"`  
      
    `jw_agent ||--o{ jw_thread : "runs"`  
      
    `jw_thread ||--o{ jw_threadcase : "links to"`  
    `jw_case ||--o{ jw_threadcase : "linked from"`  
      
    `jw_thread ||--o{ jw_message : "contains"`  
      
    `jw_message ||--o{ jw_toolexecution : "triggers"`  
    `jw_tool ||--o{ jw_toolexecution : "executes"`

## **6.2 Custom Intersection Tables (The "Data Parking Lots")**

To maximize flexibility, we explicitly avoid Dataverse's native N:N relationships. We create standard entities to act as join tables.

### **1\. jw\_agenttool (Agent \<-\> Tool)**

* **Why:** An agent might need to use a generic trigger\_sap\_post tool, but *this specific agent* should always default to CompanyCode: 1000\.  
* **The jw\_data Column (Multiline Text):** Stores a JSON array.  
  * *Example:* \[{"override\_parameter": "CompanyCode", "value": "1000"}\]

### **2\. jw\_threadcase (Thread \<-\> Case)**

* **Why:** A user might pull 3 different cases into a single chat. The agent needs to know *why* they are there.  
* **The jw\_data Column (Multiline Text):** Stores a JSON array defining the role of the case in this specific workspace.  
  * *Example:* \[{"role": "source\_data", "extracted\_from": "invoice"}, {"is\_primary\_context": true}\]

By keeping jw\_data as an unconstrained JSON array of objects, the React App and the LLM can dynamically establish new relationship logic without requiring Dataverse schema updates.