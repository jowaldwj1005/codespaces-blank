# Feature Ideas & Brainstorming

Austausch-Dokument zwischen Dir und Claude. Ideen werden hier gesammelt, du bewertest sie mit Status-Tags.

**Status-Tags:** `[evaluieren]` `[umsetzen]` `[später]` `[verworfen]` `[diskutieren]`

---

## Agent Intelligence

### 1. Agentic Learning Loop (save_learning)
Agent erkennt eigene Fehler oder bekommt User-Feedback und erstellt automatisch neue `jw_instruction` Records (via HitL-gated Tool). Nächste Session hat das Wissen automatisch im Index. **Selbst-verbesserndes System.**

### 2. Agent Handoff / Eskalation
Mitten im Thread kann ein Agent erkennen: "Das ist nicht mein Fachgebiet" und die Konversation an einen anderen Agent übergeben — inklusive Kontext-Summary. Unterschied zu delegate_to_agent: Der Parent gibt die Kontrolle komplett ab, nicht nur eine Subtask.

### 3. Agent Persona Playground
Ein UI zum Testen von System Prompts. Man schreibt einen System Prompt, wählt Tools, und kann sofort chatten — ohne Dataverse-Record erstellen zu müssen. Quasi ein "Sandbox-Modus" für Agent-Design.

### 4. Instruction Auto-Tagging
Wenn ein User ein CheatSheet erstellt, analysiert ein Agent den Inhalt und schlägt automatisch Tags vor (die der User bestätigen/editieren kann). Bessere Auffindbarkeit im Index.

---

## Context & Memory

### 5. Bounded History mit Smart Summarization
Wenn der Message-Kontext zu groß wird (Token-Budget überschritten), fasst der Agent automatisch ältere Messages zusammen und ersetzt sie durch eine kompakte Summary-Message. Der User sieht die vollen Messages, das LLM bekommt die gekürzte Version.

### 6. Cross-Thread Context
"In meinem letzten Chat mit dem SAP-Agent hatten wir ein Problem mit Vendor 4711 gelöst — nutze das hier auch." → Agent kann per Tool in anderen Threads suchen und relevante Erkenntnisse importieren.

### 7. Case Context Snapshots
Automatische Snapshots des `jw_case.jw_contextdata` bei wichtigen Ereignissen (Tool-Ausführung, Approval, Artefakt-Erstellung). Ermöglicht Time-Travel-Debugging: "Wie sah der Case-State vor dem SAP-Post aus?"

---

## Visualisierung & Artifacts

### 8. Artifact Version History
Jedes Update an `jw_artifact.jw_payload` erstellt eine Version (child-artifact mit `jw_parentartifactid` + Timestamp). User kann Diff zwischen Versionen sehen. Besonders wichtig wenn Agent und User abwechselnd am Artifact editieren.

### 9. Live Artifact Binding
Artifacts die an einen Case gebunden sind, zeigen sich in einem **Artifact Sidebar Panel** wenn der Case im Thread aktiv ist. User sieht immer die aktuellen Daten neben dem Chat — nicht nur wenn der Agent sie explizit zeigt.

### 10. Natural Language Queries auf Artifacts
User tippt: "Zeig mir alle Invoices über 10k€ vom letzten Monat" → Agent nutzt MCP `execute_dataverse_query` und `create_visual` um eine interaktive Tabelle direkt im Chat zu bauen. Quasi ein natürlichsprachliches BI-Tool.

### 11. Artifact Templates
Vordefinierte Artifact-Typen mit Default-Schemas. Wenn ein Agent `create_visual(type='InvoiceTable')` aufruft, bekommt er automatisch das richtige Schema vorgeschlagen. Reduziert Halluzinations-Risiko bei Payload-Generierung.

### 12. Dashboard-Zusammenstellung
User kann mehrere Artifacts (Charts, Tabellen) zu einem **Dashboard-View** zusammenstellen. Persistent als eigenes Artifact mit Type="Dashboard" und Payload = Array von Artifact-IDs. Wird vom SemanticRenderer als Grid von Visuals gerendert.

---

## Workflow & Automation

### 13. Playbook Auto-Generation
Agent beobachtet wiederkehrende Abläufe (gleiche Tool-Sequenz über mehrere Threads) und schlägt vor: "Du machst immer: extract_invoice → check_vendor → post_sap_order. Soll ich daraus ein Playbook erstellen?" → Generiert `jw_playbook` + `jw_instruction` Records.

### 14. Conditional Auto-Approval
Regelbasiertes Auto-Approval: "Wenn der SAP-Betrag unter 500€ ist UND der Vendor auf der Whitelist steht, automatisch genehmigen." Regeln gespeichert als `jw_instruction` (Type: ApprovalRule) mit JSON-Conditions im Content. Agent prüft Bedingungen vor dem HitL-Gate.

### 15. Tool Chains / Multi-Step Execution
Agent definiert eine Kette: "Erst extract_invoice, dann validate_data, dann create_sap_order". User sieht die ganze Chain als Plan und kann einzelne Steps genehmigen oder die ganze Chain auf einmal. Batch-Approval statt Step-by-Step.

### 16. Scheduled Agent Tasks
Agent-Threads die sich selbst triggern: "Jeden Montag um 9:00 die offenen Cases prüfen und eine Summary generieren." Gespeichert als `jw_instruction` mit Cron-Expression, ausgeführt von einem Power Automate Flow der den Agent-Thread startet.

---

## Analytics & Monitoring

### 17. Cost Dashboard
Token-Verbrauch pro Agent, pro Case, pro User. Trends über Zeit. Warnung wenn ein Agent ungewöhnlich viele Tokens verbraucht (z.B. Endlos-Loop). Nutzt `jw_tokenprompt`/`jw_tokencompletion` von Messages aggregiert.

### 18. Agent Performance Scorecard
- Approval Rate (wie oft wird genehmigt vs. abgelehnt?)
- Average Response Time (LLM + Tool Execution)
- Tool Call Accuracy (wie oft muss der User den Payload editieren?)
- Case Completion Rate
Alles ableitbar aus bestehenden Dataverse-Daten.

### 19. Thread Health Monitor
Erkennt problematische Threads: Stuck in Tool-Loop, exzessiver Token-Verbrauch, lange Wartezeiten auf Approval. Zeigt Warnungen im Thread-Sidebar.

### 20. Audit Trail Export
Export aller Tool-Executions eines Cases als PDF/CSV für Compliance. Enthält: Wer hat wann was genehmigt, welche Payloads wurden gesendet, welche Responses kamen zurück.

---

## UX & Collaboration

### 21. Conversation Branching (Fork)
User klickt auf eine Message und sagt "Von hier aus nochmal anders versuchen" → Fork erstellt neuen Thread ab diesem Punkt mit kopierter Message-History. A/B-Testing von Agentenverhalten.

### 22. Annotation Layer
User kann Messages und Artifacts mit Notizen versehen (ohne den Thread/Payload zu verändern). Z.B. "Dieses Ergebnis war falsch weil..." → Gespeichert als Annotations, sichtbar für andere User und nutzbar für Agentic Learning.

### 23. Multi-User Awareness
Wenn mehrere User denselben Thread/Case offen haben, sehen sie Live-Indikatoren ("Jonas schaut gerade auch hier"). Keine Echtzeit-Kollaboration nötig, aber Awareness verhindert Konflikte.

### 24. Keyboard-First Chat UX
- `Ctrl+Enter` = Send
- `Tab` = Durch Tool-Call-Cards navigieren
- `Enter` auf Tool-Call = Approve
- `Esc` = Reject
- `/` = Command Palette (Agent wechseln, Case verlinken, etc.)

### 25. Mobile-Responsive Approval
Power Apps läuft auch auf Tablets/Phones. Approval-UI muss Touch-freundlich sein. Einfache Approve/Reject Buttons, keine komplexen Formulare auf Mobile. Detail-View nur auf Desktop.

---

## Integration & Erweiterbarkeit

### 26. Plugin-System für Semantic Components
Externe Devs können eigene Artifact-Type-Renderer registrieren. Z.B. ein SAP-Team baut einen spezialisierten `<SapOrderViewer>` und registriert ihn für Type="SapOrder". Hot-Reload ohne App-Rebuild.

### 27. Power BI Embedded
Bestehende Power BI Reports als Artifact-Type einbetten. Agent kann "show_power_bi_report(reportId)" aufrufen und der Report erscheint inline im Chat mit den Case-relevanten Filtern.

### 28. Teams/Outlook Notifications
Wenn ein Approval pending ist, bekommt der User eine Teams-Notification oder Adaptive Card. Klick öffnet direkt den Approval-View in der App. Nutzt Power Automate + Teams Connector.

### 29. Webhook-Triggered Threads
Externe Systeme (SAP, ServiceNow, etc.) können per Webhook einen neuen Thread triggern. Z.B. "Neue Invoice eingegangen" → automatisch Thread mit Invoice-Agent starten, Document extrahieren, User zur Review einladen.

### 30. Export Agent as API
Ein konfigurierter Agent (System Prompt + Tools + Instructions) kann als "API Endpoint" exponiert werden. Andere Apps können den Agent per REST aufrufen. Quasi Agents-as-a-Service aus Dataverse-Konfiguration.

---

## Noch nicht ausreichend besprochen

### A. Offline/Fallback Verhalten
Was passiert wenn der Azure OpenAI Connector down ist? Graceful degradation? Queue für spätere Verarbeitung?

### B. Multi-Tenant / Environment Strategy
Dev → Test → Prod Deployment der Agent-Konfiguration. Solution-Export/Import der jw_ Records?

### C. Rate Limiting & Quotas
Azure OpenAI hat Token-per-Minute Limits. Wie handeln wir 429s? Retry mit Backoff? Queue? User-Feedback?

### D. Datenbereinigung / Retention
Alte Threads und Messages aufräumen? Archivierung? DSGVO-Konformität (User-Daten löschen)?

### E. Testing-Strategie
Wie testen wir Agents? Replay von aufgezeichneten Threads? Mock-LLM-Responses? End-to-End mit echtem OpenAI?
