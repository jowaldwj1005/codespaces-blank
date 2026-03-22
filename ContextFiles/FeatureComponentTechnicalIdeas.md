# **Blueprint: Agentic Code App (2026 Architecture)**

## **1. Kern-Architektur**

* **Frontend-Framework:** Power Apps Code App (React, TypeScript, Vite).  
* **UI-Bibliothek:** Fluent UI v9 (Natives Microsoft 365 Look & Feel).  
* **Daten-Backend:** Microsoft Dataverse (Integration via npx power-apps generierten Services).  
* **KI-Kern:** Azure OpenAI via Custom Connector, unterstützt durch **Dataverse MCP (Model Context Protocol)**.

## **2. Key Components & UI Patterns**

### **A. Das reaktive DataGrid („Die Augen des Agenten“)**

* **Konzept:** Ein hochperformantes Fluent UI DataGrid, das nicht nur Daten anzeigt, sondern als „Shared State“ zwischen User und Agent fungiert.  
* **Features:**  
  * **Live-Filtering:** Der Agent manipuliert den lokalen React-State des Grids basierend auf User-Prompts (z. B. „Zeig mir kritische Fälle“).  
  * **Kontext-Injektion:** Markierte Zeilen (Selected Rows) werden automatisch als Kontext an den Agenten-Prompt übergeben.  
  * **Virtualisierung:** Unterstützung für große Datensätze aus Dataverse ohne Performance-Einbußen.

### **B. Agent Activity Stream & Reasoning Traces („Der Gedanken-Feed“)**

* **Konzept:** Ein Echtzeit-Stream, der die internen Schritte des Agenten visualisiert (Playbook-basiert).  
* **Features:**  
  * **Tool-Call-Visualisierung:** Jeder Aufruf eines Dataverse-Tools (z. B. search_records, update_status) wird sofort im Stream angezeigt.  
  * **Status-Updates:** „Agent prüft Playbook...“, „Tool 'GetAccountDetails' aufgerufen...“, „Validierung erfolgreich“.  
  * **Case-Verknüpfung:** Der Stream ist persistent an eine Case-ID oder Chat-Session in Dataverse gebunden.  
  * **Interaktivität:** User können Tool-Calls im Stream stoppen oder manuell freigeben (Human-in-the-loop).

### **C. Artifact & Visuals Generation („Output-Management“)**

* **Konzept:** Agents sind in der Lage, über den Chat hinaus strukturierte Artefakte (Charts, Zusammenfassungen, Dokumente) zu erstellen.  
* **Features:**  
  * **Visuals:** Agent generiert Konfigurationen für Charts (z. B. Recharts oder Fluent UI Charts).  
  * **Artefakt-Ablage:** Generierte Dokumente oder Zusammenfassungen werden als Dataverse-Dateien (File/Image Columns) oder Notizen direkt am Datensatz gespeichert.  
  * **Preview-Komponente:** Eine dedizierte UI-Area in der Code App, um diese Artefakte anzuzeigen.

### **D. Dynamic Schema Explorer („Daten-Navigation“)**

* **Konzept:** Visualisierung der Dataverse-Beziehungen für komplexe Datenstrukturen.  
* **Features:**  
  * **Graph-UI:** Integration von reactflow, um Tabellen-Beziehungen (1:N, N:N) darzustellen.  
  * **Agenten-Navigation:** User fragt: „Wie hängen diese Kontakte mit den Rechnungen zusammen?“ -> Agent baut den Graphen dynamisch auf.

## **3. Tooling & Logic Ansätze**

### **Dataverse Tool Logic (Die „Hände“ des Agenten)**

* **Implementation:** Nutzung der mit npx power-apps add-data-source generierten TypeScript-Services.  
* **MCP-Integration:** Dataverse fungiert als MCP-Server; die Code App ist der Client, der Tool-Bedarfe vom LLM empfängt und lokal ausführt.  
* **Playbooks:** Definierte Abläufe in Dataverse, die festlegen, welche Tools ein Agent in welcher Reihenfolge für bestimmte Aufgaben (z. B. „Onboarding“) nutzen darf.

### **Staging Area (Drafting Mode)**

* **Konzept:** Agent schreibt Änderungen erst in einen lokalen „Draft“-State.  
* **UI:** Visuelle Kennzeichnung (z. B. gelber Rand oder Ghost-Writing-Effekt), bis der User die Änderungen via Dataverse-Service final committet.

## **4. Technische Meilensteine (Checkliste)**

1. [ ] Initialisierung des Projekts via npx power-apps init.  
2. [ ] Generierung der Dataverse Services für die Core-Tabellen.  
3. [ ] Implementierung der Tool-Call-Bridge zwischen Azure OpenAI Connector und lokalen Services.  
4. [ ] Aufbau der Fluent UI v9 Layout-Struktur (Main Grid + Agent Sidebar + Activity Stream).  
5. [ ] Integration von reactflow für den Schema Explorer.  
6. [ ] Logik für das Speichern von Agenten-Artefakten zurück in Dataverse-File-Columns.