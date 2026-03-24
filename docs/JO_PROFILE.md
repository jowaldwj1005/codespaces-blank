# Jo — Profil aus Claude's Perspektive

> Geschrieben von Claude auf Basis aller bisherigen Interaktionen, Code-Reviews, Feature-Diskussionen und Architektur-Entscheidungen im Playbook Agent Projekt.

---

## Wer bist du

Du bist ein Power Platform Developer / Solution Architect, der gerade den Sprung macht von Low-Code-Welt in echte Software-Architektur. Playbook Agent ist dein Showcase-Projekt — nicht einfach eine App, sondern ein Statement: "Schaut, was mit Code Apps, Dataverse und AI möglich ist." Du denkst in Produkten, nicht in Tickets.

Du arbeitest allein an diesem Projekt, trägst aber die Denkweise eines Teamleads: Du willst Nachvollziehbarkeit, Auditierbarkeit, saubere Versionierung. Nicht weil es dir jemand vorschreibt, sondern weil du weißt, dass es der richtige Weg ist.

---

## Stärken

### Produktvision
Du siehst das Gesamtbild. Während viele Entwickler Feature für Feature abarbeiten, denkst du in Systemen. Die Idee eines Meta-App-Orchestrators, der UIs dynamisch aus Dataverse-Metadaten rendert — das ist kein Anfänger-Konzept. Du verstehst instinktiv, dass die eigentliche Power nicht in hardcodierten Screens liegt, sondern in der Konfigurierbarkeit.

### Bidirektionales Denken
In fast jeder Feature-Diskussion kommt von dir: "Aber das muss auch in die andere Richtung funktionieren." Visuals zur Kommunikation, Flowcharts die der Agent versteht, Artifacts die Mensch UND Maschine editieren. Das ist eine seltene Perspektive — die meisten denken nur in eine Richtung.

### Pragmatismus bei Scope
Du sagst klar Nein. Plugin-System? "Nein für now." Power BI Embedded? "Nein für now." Multi-Tenant? "Lass das meine Sorge sein." Das ist eine unterschätzte Fähigkeit. Du lässt dich nicht von Feature-Creep verführen, obwohl du offensichtlich Lust auf die großen Ideen hast.

### Feedback-Qualität
Dein Feedback ist präzise und handlungsorientiert. Nicht "das gefällt mir nicht", sondern "Booleans müssen true/false sein, nicht 0/1" oder "der Agent muss sehen können welche Records deaktiviert werden." Du gibst mir genau das, was ich brauche, um den nächsten Schritt richtig zu machen.

### Design-Sensibilität
Du willst, dass es "wie ein modernes SaaS-Produkt" aussieht, nicht wie ein internes Tool. Du verstehst, dass UX-Qualität der Unterschied ist zwischen "cool demo" und "Leute wollen das benutzen." Gleichzeitig priorisierst du Debug-Möglichkeiten — du willst Schönheit UND Transparenz.

---

## Schwächen / Wachstumsfelder

### Technische Tiefe bei Laufzeit-Verhalten
Du erkennst Architektur-Muster sofort, aber bei Laufzeit-Details (Race Conditions, Token-Doubling, Silent Failures) verlässt du dich stark auf mich. Das ist kein Vorwurf — du hast den richtigen Instinkt, solche Dinge einzufordern ("Nachvollziehbarkeit ist key"). Aber du entdeckst sie selten selbst im Code. Je mehr du verstehst, wie Promises, Event Loops und State Management tatsächlich funktionieren, desto gezielter werden deine Reviews.

### Spezifikations-Genauigkeit
Deine Feature-Beschreibungen sind visionär, aber manchmal vage in den Details. "Es sollte smart sein und die KI echt stark" — das stimmt als Vision, aber es gibt mir wenig Konkretes zum Implementieren. "Verschiedenste Möglichkeiten solche Dinge zu tun" — welche genau? Je präziser du die erste Interaktion beschreibst ("User klickt hier, sieht das, Agent macht jenes"), desto weniger Iterationen brauchen wir.

### Dataverse als Komfortzone
Du kennst Dataverse extrem gut und denkst deshalb alles durch diese Linse. Das ist meistens richtig für dieses Projekt. Aber manchmal wäre eine rein clientseitige Lösung schneller und einfacher (z.B. lokaler State statt Dataverse-Roundtrip für temporäre UI-Zustände). Nicht alles muss persistiert werden.

### Testing-Lücke
Du hast Testing als Thema benannt ("Replay und freies Testen"), aber es gibt null Tests im Projekt. Kein einziger Unit-Test, kein Integration-Test. Für ein Showcase-Projekt, das Auditierbarkeit und Robustheit predigt, ist das eine offene Flanke. Ich sage das nicht als Kritik — ich sage es, weil du die Person bist, die "Nachvollziehbarkeit" als Kernwert definiert hat.

---

## Wie du besser mit mir arbeiten kannst

### 1. Szenarien statt Visionen
Statt "es sollte smart sein" → "Wenn ein User ein Playbook erstellt, sollte der Agent die Steps vorschlagen basierend auf den verfügbaren Tools. Der User sieht eine editierbare Liste und kann Steps umsortieren." Das gibt mir einen konkreten Startpunkt.

### 2. Bugs mit Kontext melden
Du machst das schon gut ("Booleans true/false"), aber noch besser: "Seed läuft durch, aber in Dataverse steht kein Record. Debug Log zeigt: [Screenshot/Error]." Je mehr Laufzeit-Kontext du mitgibst, desto schneller finde ich die Ursache.

### 3. Akzeptanzkriterien definieren
Bevor wir ein Feature starten: "Es ist fertig, wenn..." — selbst 2-3 Bullet Points helfen enorm. Das verhindert, dass ich über-engineere oder unter-liefere.

### 4. Meine Review-Agents nutzen
Die tiefe Code-Review die gerade lief (14 Issues gefunden) — das kannst du jederzeit triggern. "Review die letzten Änderungen auf Bugs" ist ein Satz, der mir mehr hilft als manuelles Code-Lesen.

### 5. Deutsch für Konzepte, Englisch für Code
Du wechselst natürlich zwischen Deutsch und Englisch. Das funktioniert gut. Mein Vorschlag: Bleib dabei. Deutsche Konzept-Diskussionen fließen natürlicher bei dir, englische Code-Referenzen sind präziser. Misch ruhig weiter.

---

## Mein Gesamteindruck

Du baust etwas Ambitioniertes. Nicht ein weiteres CRUD-Tool, sondern eine Plattform die zeigt, was an der Schnittstelle von Power Platform, AI und custom Code möglich ist. Du hast die Vision, den Geschmack und die Disziplin dafür. Was dir fehlt, ist hauptsächlich Erfahrung mit den Dingen, die man nur durch Bauen lernt — Laufzeitverhalten, Edge Cases, Testing-Kultur. Und genau das lernst du gerade, in diesem Projekt, in Echtzeit.

Du bist kein Junior der Anweisungen braucht. Du bist ein Product Owner mit wachsenden Engineering-Skills, der einen AI-Partner braucht, der mitdenkt statt nur ausführt. Das ist genau die Dynamik, die hier funktioniert.
