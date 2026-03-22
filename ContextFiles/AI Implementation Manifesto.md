# **AI Project Manifesto: Agentic Power Platform jw-App**

## **1. Das Paradigma (Architecture Core)**

* **jw-App:** Keine fixen Screens. Die App ist eine Rendering-Engine für Artifacts.  
* **Decoupled Workspaces:** Threads sind unabhängig von Cases. Eine N:M Beziehung via jw_threadcase ermöglicht Cross-Process-Operationen.  
* **SDK Bridge:** Direkter Zugriff auf fetch ist verboten. Nur das Power Apps SDK (context.webAPI) ist erlaubt.

## **2. Agentic Workflows & Tool Management (Detail-Logik)**

### **2.1 Human-in-the-Loop (HitL)**

* **Tool Interceptor:** Jeder Tool-Call wird abgefangen.  
* **Approval Flow:** Wenn jw_tool.jw_requiresapproval === true:  
  1. LLM-Generierung pausieren.  
  2. jw_toolexecution erstellen (Status: Pending, Payload: JSON).  
  3. UI rendert die passende Semantic Component (z.B. SapApprovalForm).  
  4. Nach User-Edit/Freigabe: Update des Payloads und echter API-Call via Custom Connector.  
  5. Rückgabe des Ergebnisses an das LLM.

### **2.2 Smart Context & Doc Intelligence**

* **Kein Context Dumping:** PDFs werden nicht in den Prompt kopiert.  
* **Workflow:** Upload -> Speichern in jw_document -> System-Message mit DocID -> LLM ruft extract_document(id) -> App nutzt Azure Doc Intel -> Ergebnis wird jw_artifact.

### **2.3 Dataverse MCP (Model Context Protocol)**

* Dynamische Exploration der CRM-Umgebung via:  
  * search_dataverse_tables(intent)  
  * get_table_schema(logical_name)  
  * execute_dataverse_query(fetch_xml)

## **3. Dynamic RAG & Learning**

* **Cheat Sheet Indexing:** Beim Thread-Start wird ein Index aus jw_instruction (Typ: CheatSheet) in den System-Prompt injiziert.  
* **load_cheat_sheet(id):** Das LLM entscheidet selbst, wann es detailliertes Wissen nachlädt.  
* **Agentic Learning:** Das Tool save_learning erlaubt dem LLM, neue Erkenntnisse (z.B. SAP-Fixes) nach User-Review dauerhaft zu speichern.

## **4. Technisches Datenmodell (ERD-Constraints)**

* **N:N Intersections:** Wir nutzen NIEMALS native Dataverse N:N. Wir nutzen jw_agenttool und jw_threadcase mit einer jw_data JSON-Spalte für Overrides (z.B. CompanyCode-Vorgaben für Agenten).  
* **Multiline Text:** Alle JSON-Felder müssen auf das Maximum (1.048.576 Zeichen) eingestellt sein.