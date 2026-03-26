# Feature Ideas & Brainstorming

Austausch-Dokument zwischen Dir und Claude. Ideen werden hier gesammelt, du bewertest sie mit Status-Tags.

**Status-Tags:** `[evaluieren]` `[umsetzen]` `[später]` `[verworfen]` `[diskutieren]`

---

## Implementation Status Matrix (v0.11.0)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| - | **Core Agent Loop** | DONE | Responses API, multi-turn, tool execution, HitL |
| - | **Inline Visualizations** | DONE (v0.11) | create_visual → VisualizationCard, 9 chart types |
| - | **Terminal Code Display** | DONE (v0.11) | run_data_code terminal UI |
| - | **Citation Rendering** | DONE (v0.11) | Web search citation pills |
| - | **DataverseExplorer** | DONE (v0.10) | Mini model-driven app, 12+ entities |
| - | **ConnectorTester** | DONE (v0.10) | 3 panels: OpenAI, DocInt, SAP |
| - | **Debug Console** | DONE | debugEventBus, DebugPanel with raw I/O |
| - | **MCP Tools** | DONE | search_dataverse, get_table_schema, execute_dataverse_query |
| - | **Seed Data System** | DONE | Idempotent seeder with all tools + agents |
| - | **SemanticRenderer** | PARTIAL | 12 types registered, but artifact pipeline incomplete |
| - | **CaseDashboard** | PARTIAL | Renders, but artifact display limited |
| - | **PlaybookProgress** | PARTIAL | Checklist works, but auto-refresh limited |
| 1 | Agentic Learning Loop | NOT STARTED | User approved, needs save_learning tool + autonomy settings |
| 2 | Agent Handoff | NOT STARTED | User: "cool but complex, needs use cases" |
| 3 | Agent Persona Playground | NOT STARTED | User wants replay of past cases too |
| 4 | Instruction Auto-Tagging | NOT STARTED | User wants AI help for all entity creation |
| 5 | Bounded History | NOT STARTED | User wants manual trigger + visibility |
| 6 | Cross-Thread Context | NOT STARTED | User wants global system prompts |
| 7 | Case Context Snapshots | NOT STARTED | User: "wenn möglich gerne" |
| 8 | Artifact Version History | NOT STARTED | User approved |
| 9 | Live Artifact Binding | NOT STARTED | User: "ja gut" |
| 10 | NL Queries on Artifacts | NOT STARTED | User wants bidirectional |
| 11 | Artifact Templates | NOT STARTED | User suggests knowledge instructions |
| 12 | Dashboard-Zusammenstellung | NOT STARTED | User wants agent-driven case updates |
| 13 | Playbook Auto-Generation | DEPRIORITIZED | User: "nicht der erwartete Grenznutzen" |
| 14 | Conditional Auto-Approval | NOT STARTED | Hard vs soft HitL distinction needed |
| 15 | Tool Chains | NOT STARTED | User wants markdown-defined flows |
| 16 | Scheduled Agent Tasks | DEFERRED | Azure Function future vision |
| 17 | Cost Dashboard | NOT STARTED | User approved |
| 18 | Performance Scorecard | NOT STARTED | User: part of home dashboards |
| 19 | Thread Health Monitor | NOT STARTED | User approved |
| 20 | Audit Trail Export | NOT STARTED | User approved |
| 21 | Conversation Branching | NOT STARTED | User wants free fork switching |
| 22 | Annotation Layer | NOT STARTED | User added annotation entity |
| 23 | Multi-User Awareness | DEPRIORITIZED | User: "nicht der krasse Mehrwert" |
| 24 | Keyboard-First Chat UX | NOT STARTED | User: "muss erklärt werden" |
| 25 | Mobile-Responsive | LOW PRIORITY | Code apps desktop only for now |
| 26-30 | Integration/External | DEFERRED | User: "nein für now" |

**Next recommended priorities (high impact, builds on existing code):**
1. Agentic Learning Loop (#1) — `save_learning` tool, autonomy settings, knowledge versioning
2. Bounded History (#5) — token budget management, manual trigger, summary visibility
3. Cost Dashboard (#17) — token data already tracked, just needs aggregation UI
4. Conditional Auto-Approval (#14) — agent-tool JSON config, hard/soft HitL gate

---

## Agent Intelligence

### 1. Agentic Learning Loop (save_learning)
Agent erkennt eigene Fehler oder bekommt User-Feedback und erstellt automatisch neue `jw_instruction` Records (via HitL-gated Tool). Nächste Session hat das Wissen automatisch im Index. **Selbst-verbesserndes System.**
# jo: 
ja definitiv. das ist absolut vorgesehen als feature. es sollte autonomiesettings geben in denen man steuern kann wann der agent selbst knowldge sources schreiben darf. diese sollten universell einsetzbar und veränderbar von mensch und agent sein. ich denke an verbesserungen bei api aufrufen, generelle instructions usw. und es wär klasse man sieht welche version etc eines knowledge sources von verschiedenen agents genutzt wurde

### 2. Agent Handoff / Eskalation
Mitten im Thread kann ein Agent erkennen: "Das ist nicht mein Fachgebiet" und die Konversation an einen anderen Agent übergeben — inklusive Kontext-Summary. Unterschied zu delegate_to_agent: Der Parent gibt die Kontrolle komplett ab, nicht nur eine Subtask.
# jo:
puh ja klingt cool, gerne möglich machen. aber das klingt komplizierter und ich weiß nicht wie oft das vorkommt. wenn wir dazu coole use cases im hinterkopf haben gerne mit rein nehmen

### 3. Agent Persona Playground
Ein UI zum Testen von System Prompts. Man schreibt einen System Prompt, wählt Tools, und kann sofort chatten — ohne Dataverse-Record erstellen zu müssen. Quasi ein "Sandbox-Modus" für Agent-Design.
# jo:
ja gerne, cool wäre wenn man vergangene cases auch nochmal testen kann um anpassungen durchzuprobieren. wichtig: auditierbarkeit und nachvollziehbarkeit der bestehenden runs

### 4. Instruction Auto-Tagging
Wenn ein User ein CheatSheet erstellt, analysiert ein Agent den Inhalt und schlägt automatisch Tags vor (die der User bestätigen/editieren kann). Bessere Auffindbarkeit im Index.
# jo: 
gerne ja, generell beim erstellen von dingen wie agents, tools, playbooks usw. gerne viel ki /agent hilfe einbauen. das muss smart sein und die ki echt stark. wenn was möglich wäre wo sie visuelle elemente baut (und ich denke da nicht an sowas simples wie eine multiple choice frage) sondern sowas wie flowcharts, die man als mensch leicht verändern kann und der agent direkt versteht was man macht wie auch datensätze aktuslisiert werden. das wär nice. jetzt aber auf keinen fall auf die flowcharts fokussieren. der agent braucht einfach verschiedenste möglichkeiten solche dinge zu tun innerhalb der verschiedenen feature blöcke

---

## Context & Memory

### 5. Bounded History mit Smart Summarization
Wenn der Message-Kontext zu groß wird (Token-Budget überschritten), fasst der Agent automatisch ältere Messages zusammen und ersetzt sie durch eine kompakte Summary-Message. Der User sieht die vollen Messages, das LLM bekommt die gekürzte Version.
# jo:
ja klingt gut. super wäre wenn man das als mensch selbst anstoßen kann, ab einem konfigurierbaren schwellwert passiert es selber aber man sieht es als tool call und man sieht welche nachrichten wie zusammengefasst wurden oder kann einzelne nachrichten selbst rein oder wieder rausnehmen (einfache steuerung über statecode?)


### 6. Cross-Thread Context
"In meinem letzten Chat mit dem SAP-Agent hatten wir ein Problem mit Vendor 4711 gelöst — nutze das hier auch." → Agent kann per Tool in anderen Threads suchen und relevante Erkenntnisse importieren.
# jo:
ja unbedingt - es muss für den agent ganz klar sein wie er mit welchen records interagieren kann, wo er welche informationen erhält etc bei gleichzeitig maximaler freiheit. unser n:N konstrukt könnte sicher zu problemen führen wenn der agent das nicht checkt wie er beziehungen aufbaut. ich denke es sollte sowas wie einen oder mehrere globale systemprompts geben. agents sollten diesen aber auch selbst kritisieren können und ich als mensch/admin (verschiedene security roles kümmern wir uns später drum) kann diesen auch sehen und anpassen. ich glaub wir haben genug entitäten wo wir sowas speichern können,hoff ich zumindest, dir fällt schon was ein. und das sollte auch über den einen seed button setzbar sein. bei dem button wär auch klasse man sieht genau was passiert, welche records deaktiviert, welche neu erstellt werden usw. nachvollziehbarkeit ist key in dieser lösung (aber es sollte nicht technisch, aussehen, eher wie ein modernes saas produkt mit vielen debug und informationsmöglichkeiten. es ist ein internes projekt mit dem ich die möglichkeiten und macht von agents und code apps präsentieren will)

### 7. Case Context Snapshots
Automatische Snapshots des `jw_case.jw_contextdata` bei wichtigen Ereignissen (Tool-Ausführung, Approval, Artefakt-Erstellung). Ermöglicht Time-Travel-Debugging: "Wie sah der Case-State vor dem SAP-Post aus?"
# jo: 
wenn möglich gerne

### 7b. Runtime Config Changes — What Happens Mid-Conversation? `[diskutieren]`
If an admin changes an agent's system prompt, tool bindings, or capability flags (like allowDelete) while a conversation is active, what should happen?
- **Option A: Lazy reload** — next LLM call picks up the latest config. Simple but may cause mid-conversation inconsistency (tool was available in message 3, gone in message 5).
- **Option B: Session snapshot** — agent config is frozen when the thread starts. Changes only apply to new threads. Predictable but stale.
- **Option C: Explicit refresh** — user clicks "Refresh Agent Config" in the chat header. Agent announces what changed. Most transparent.
- **Related:** Interactive diagrams / flowcharts that change tool definitions or system prompts also need this pattern. If a user edits a Mermaid diagram that represents a playbook, the agent needs to pick up the new structure.
- **Claude's leaning:** Option C for user-initiated changes, Option A for admin changes with a notification badge in the chat header.
# jo:

---

## Visualisierung & Artifacts

### 8. Artifact Version History
Jedes Update an `jw_artifact.jw_payload` erstellt eine Version (child-artifact mit `jw_parentartifactid` + Timestamp). User kann Diff zwischen Versionen sehen. Besonders wichtig wenn Agent und User abwechselnd am Artifact editieren.
# jo:
ja gerne, am meisten interessant für komplexe artefakte denke ich. denk dran dass artefakte komplett unterschiedlich sein können. plane hier verschiedenste elemente und typen ein

### 9. Live Artifact Binding
Artifacts die an einen Case gebunden sind, zeigen sich in einem **Artifact Sidebar Panel** wenn der Case im Thread aktiv ist. User sieht immer die aktuellen Daten neben dem Chat — nicht nur wenn der Agent sie explizit zeigt.
# jo: 
ja gut

### 10. Natural Language Queries auf Artifacts
User tippt: "Zeig mir alle Invoices über 10k€ vom letzten Monat" → Agent nutzt MCP `execute_dataverse_query` und `create_visual` um eine interaktive Tabelle direkt im Chat zu bauen. Quasi ein natürlichsprachliches BI-Tool.
# jo: 
ja gut, aber denk dran du hast mir versprochen dass solche elemente bidirektional auch zur kommunikation genutzt werden können

### 11. Artifact Templates
Vordefinierte Artifact-Typen mit Default-Schemas. Wenn ein Agent `create_visual(type='InvoiceTable')` aufruft, bekommt er automatisch das richtige Schema vorgeschlagen. Reduziert Halluzinations-Risiko bei Payload-Generierung.
# jo: 
ja oder per knowledge instructions? sowas wie ein artefakt/visuals mcp?

### 12. Dashboard-Zusammenstellung
User kann mehrere Artifacts (Charts, Tabellen) zu einem **Dashboard-View** zusammenstellen. Persistent als eigenes Artifact mit Type="Dashboard" und Payload = Array von Artifact-IDs. Wird vom SemanticRenderer als Grid von Visuals gerendert.
# jo:
gute idee, könnte man ja auch dran denken wenn der agent einen case bearbeitet, dass er dann über solche wege den case updatet mit zwischenergebnissen oder informationen zusammenträgt und darstellt für den menschen wenn er eine entscheidung treffen muss. sollte ganz frei steuerbar sein von mensch und agent
---

## Workflow & Automation

### 13. Playbook Auto-Generation
Agent beobachtet wiederkehrende Abläufe (gleiche Tool-Sequenz über mehrere Threads) und schlägt vor: "Du machst immer: extract_invoice → check_vendor → post_sap_order. Soll ich daraus ein Playbook erstellen?" → Generiert `jw_playbook` + `jw_instruction` Records.
# jo:
stell ich mir schwierig vor, wahrscheinlich nciht der erwartete grenznutzen für die komplexität

### 14. Conditional Auto-Approval
Regelbasiertes Auto-Approval: "Wenn der SAP-Betrag unter 500€ ist UND der Vendor auf der Whitelist steht, automatisch genehmigen." Regeln gespeichert als `jw_instruction` (Type: ApprovalRule) mit JSON-Conditions im Content. Agent prüft Bedingungen vor dem HitL-Gate.
# jo:
ja, wobei wir hier zwischen hard und soft hitl unterscheiden müssen. post tools sollten ja erstmal immer code seitig abgefangen werden, aber steuerbar sein, ob dies übersprungen werden kann, z.B. auf agent ebene (könnte ein key im agent-tool value json sein)

### 15. Tool Chains / Multi-Step Execution
Agent definiert eine Kette: "Erst extract_invoice, dann validate_data, dann create_sap_order". User sieht die ganze Chain als Plan und kann einzelne Steps genehmigen oder die ganze Chain auf einmal. Batch-Approval statt Step-by-Step.
# jo:
ja gerne. ich hab so an claude cowork etc gedacht wo man ja per markdown formuliert oder copilot studio work oder so gibts das ja auch, dass man frei einen ablauf definiert. da brauchen wir eine smarte verbindung zwischen diesen instructions im playbook und den einzelnen playbook steps (haben wir glaub ich). ki muss auf jeden fall beim erstellen helfen und es muss intuitiv sein

### 16. Scheduled Agent Tasks
Agent-Threads die sich selbst triggern: "Jeden Montag um 9:00 die offenen Cases prüfen und eine Summary generieren." Gespeichert als `jw_instruction` mit Cron-Expression, ausgeführt von einem Power Automate Flow der den Agent-Thread startet.
# jo:
keine power automate flows. ich überlege später in version X die möglichkeit zu schaffen agents die gut laufen in eine azure function zu übertragen, die von einem flow der auf mails triggert startet und asynchron bis zu interaktion points arbeitet. da wir alles in dataverse speichern wird das ja theoretisch möglich sein. aber vergessen wir das zum jetztigen zeutpunkt, das ist zukunftsmusik die wir nur ganz grob irgendwo im hinterkopf halten

---

## Analytics & Monitoring

### 17. Cost Dashboard
Token-Verbrauch pro Agent, pro Case, pro User. Trends über Zeit. Warnung wenn ein Agent ungewöhnlich viele Tokens verbraucht (z.B. Endlos-Loop). Nutzt `jw_tokenprompt`/`jw_tokencompletion` von Messages aggregiert.
# jo: 
gerne ja

### 18. Agent Performance Scorecard
- Approval Rate (wie oft wird genehmigt vs. abgelehnt?)
- Average Response Time (LLM + Tool Execution)
- Tool Call Accuracy (wie oft muss der User den Payload editieren?)
- Case Completion Rate
Alles ableitbar aus bestehenden Dataverse-Daten.
# jo:
gerne ja, könnte teil von homedashboards sein

### 19. Thread Health Monitor
Erkennt problematische Threads: Stuck in Tool-Loop, exzessiver Token-Verbrauch, lange Wartezeiten auf Approval. Zeigt Warnungen im Thread-Sidebar.
# jo:
ja gerne

### 20. Audit Trail Export
Export aller Tool-Executions eines Cases als PDF/CSV für Compliance. Enthält: Wer hat wann was genehmigt, welche Payloads wurden gesendet, welche Responses kamen zurück.
# jo: 
ja gerne

### jo neue idee:
unbedingt eine debug console einbauen bei der jeder request egal ob dataverse oder ein custom connector oder sonst was mit raw input und output angezeigt wird. so roh wie möglich aber wenn du bestimmte keys immer parsed auch die, je nach connector. sollte einfach helfen dass ich die app monitoren kann und bei bugs direkt bescheid weiß wo probleme sind und dir bescheid geben kann mit guten infromationen
---

## UX & Collaboration

### 21. Conversation Branching (Fork)
User klickt auf eine Message und sagt "Von hier aus nochmal anders versuchen" → Fork erstellt neuen Thread ab diesem Punkt mit kopierter Message-History. A/B-Testing von Agentenverhalten.
# jo:
ja gute idee, sollte möglich sein frei zwischen forks zu wechseln

### 22. Annotation Layer
User kann Messages und Artifacts mit Notizen versehen (ohne den Thread/Payload zu verändern). Z.B. "Dieses Ergebnis war falsch weil..." → Gespeichert als Annotations, sichtbar für andere User und nutzbar für Agentic Learning.
# jo: 
ja gerne, habe annotation als standard system entity hinzugefügt, kann sein dass wir natürlich hier noch was anpssen müssen am datenmodell

### 23. Multi-User Awareness
Wenn mehrere User denselben Thread/Case offen haben, sehen sie Live-Indikatoren ("Jonas schaut gerade auch hier"). Keine Echtzeit-Kollaboration nötig, aber Awareness verhindert Konflikte.
# jo:
nur wenn leicht umsetzbar, müsste ja irgendwo gespeichert werden oder und wir decken das grade nicht ab. eher kein fokus, bringt jetzt nicht den krassen mehrwert.

### 24. Keyboard-First Chat UX
- `Ctrl+Enter` = Send
- `Tab` = Durch Tool-Call-Cards navigieren
- `Enter` auf Tool-Call = Approve
- `Esc` = Reject
- `/` = Command Palette (Agent wechseln, Case verlinken, etc.)
# jo:
ja gerne, muss aber erklärt werden

### 25. Mobile-Responsive Approval
Power Apps läuft auch auf Tablets/Phones. Approval-UI muss Touch-freundlich sein. Einfache Approve/Reject Buttons, keine komplexen Formulare auf Mobile. Detail-View nur auf Desktop.
# jo:
ich glaube code apps laufen noch nicht auf dem handy / innerhalb der power apps app store app. also responsive aber nur desktop fokus.
generell super cleane und durchdachte moderne UI

---

## Integration & Erweiterbarkeit

### 26. Plugin-System für Semantic Components
Externe Devs können eigene Artifact-Type-Renderer registrieren. Z.B. ein SAP-Team baut einen spezialisierten `<SapOrderViewer>` und registriert ihn für Type="SapOrder". Hot-Reload ohne App-Rebuild.
# jo:
nein für now
### 27. Power BI Embedded
Bestehende Power BI Reports als Artifact-Type einbetten. Agent kann "show_power_bi_report(reportId)" aufrufen und der Report erscheint inline im Chat mit den Case-relevanten Filtern.
# jo:
nein für now
### 28. Teams/Outlook Notifications
Wenn ein Approval pending ist, bekommt der User eine Teams-Notification oder Adaptive Card. Klick öffnet direkt den Approval-View in der App. Nutzt Power Automate + Teams Connector.
# jo:
nein für now - ich hab aber http with entra preauthorized mit graph api in der baseurl als connection hinzugefügt, sollte vieles möglich machen
### 29. Webhook-Triggered Threads
Externe Systeme (SAP, ServiceNow, etc.) können per Webhook einen neuen Thread triggern. Z.B. "Neue Invoice eingegangen" → automatisch Thread mit Invoice-Agent starten, Document extrahieren, User zur Review einladen.
# jo:
nein für now
### 30. Export Agent as API
Ein konfigurierter Agent (System Prompt + Tools + Instructions) kann als "API Endpoint" exponiert werden. Andere Apps können den Agent per REST aufrufen. Quasi Agents-as-a-Service aus Dataverse-Konfiguration.
# jo:
nein für now
---

## Noch nicht ausreichend besprochen

### A. Offline/Fallback Verhalten
Was passiert wenn der Azure OpenAI Connector down ist? Graceful degradation? Queue für spätere Verarbeitung?
# jo:
ja aber mvp scope
### B. Multi-Tenant / Environment Strategy
Dev → Test → Prod Deployment der Agent-Konfiguration. Solution-Export/Import der jw_ Records?
# jo:
nein lass das meine sorge sein
### C. Rate Limiting & Quotas
Azure OpenAI hat Token-per-Minute Limits. Wie handeln wir 429s? Retry mit Backoff? Queue? User-Feedback?
# jo:
user muss klicken zum fortfahren
### D. Datenbereinigung / Retention
Alte Threads und Messages aufräumen? Archivierung? DSGVO-Konformität (User-Daten löschen)?
# jo:
nein für now
### E. Testing-Strategie
Wie testen wir Agents? Replay von aufgezeichneten Threads? Mock-LLM-Responses? End-to-End mit echtem OpenAI?
# replay und freies testen, keine hardcodierten mock responses außer zum abgleich