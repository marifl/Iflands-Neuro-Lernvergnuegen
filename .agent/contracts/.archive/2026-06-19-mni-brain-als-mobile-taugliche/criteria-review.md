## Bewertung criteria.md — Testbarkeit & Vollständigkeit

Insgesamt solide, aber zwei Kriterien sind **nicht binär** und es gibt **eine Guardrail-Lücke**. Im Detail:

### Pro Kriterium

| # | Testbar? | Befund |
|---|----------|--------|
| **C1** | ⚠️ teilweise | Artefakt-Spalten sind prüfbar (Feld vorhanden/nicht). Aber: (a) **„reproduzierbar"** im Titel wird durch keinen Schritt verifiziert — kein „zweiter Lauf ⇒ gleicher Hash/gleiche Liste". (b) **„relevante Subkortex-/BigBrain-GLBs"** ist vage — die zu inventarisierende Menge ist nicht abgeschlossen, also kein Pass/Fail für *Vollständigkeit der Liste*. Fix: Input als Glob/explizite Dateiliste fixieren + „Re-Run liefert identische Hashes" als Schritt. |
| **C2** | ✅ | Vorbildlich. Harte Zahlen, binär. „blockiert mit Begruendung" testbar. |
| **C3** | ✅ | Network/Runtime-Evidenz, klar. Einziger Schwachpunkt: **wie das Mobile-Profil getriggert wird**, ist als „oder"-Liste offen — für die Eval einen *konkreten* Trigger festnageln (z. B. Viewport-Breite X px). |
| **C4** | ❌ **nicht binär** | „verliert keine **sichtkritische Grossform**" und „**für Mobile akzeptiert**" sind genau die verbotenen vagen Begriffe. Niemand definiert, *wer* akzeptiert und *woran* der Verlust gemessen wird. Fix: entweder objektive Metrik (Hausdorff/Chamfer-Distanz pro ROI, Vertex-Erhalt %) **oder** expliziter Sign-off-Schritt mit benanntem Reviewer + Checkliste der ROIs. |
| **C5** | ✅ | Feld-Existenz-Prüfung, binär. „bekannte Limitierungen" als Pflichtfeld ok. |
| **C6** | ⚠️ | Konzept gut (Negativ-Gate), aber **„Import wird blockiert"** setzt einen real existierenden Blockier-Mechanismus voraus. Wenn das nur prozessual ist, ist es nicht beobachtbar. Klären: technischer Validator vs. Doku-Gate. Außerdem **„im Audit kritisierte Quelle"** referenziert ein Audit-Dokument, das benannt/verlinkt sein muss. |
| **C7** | ✅ | „brain.glb unverändert" → Hash/git-status, binär. „TARO lauffähig" → Smoke. Gut. |
| **C8** | ✅ | Sauberer Negativtest — *sofern* der Validator existiert (gehört in spec.md, nicht nur criteria). „blockierender Fehler statt Silent-Fallback" ist genau richtig formuliert (deckt sich mit der No-Fallbacks-Regel). |

### Vollständigkeit gegen `outcome`

- ✅ „mobile-tauglich" → C2/C3 · „ohne TARO blind ersetzen" → C7/C8 · „Importmanifest" → C5
- ❌ **Guardrail-Lücke:** `guardrail` nennt explizit **„Doku-Drift-Gates dürfen nicht regressieren"** — **kein Kriterium prüft das**. Es fehlt ein C9: „Doku-Drift-Gate läuft grün (Befehl X, Exit 0)".
- ⚠️ „detailreich" aus dem `user_signal` hängt allein an C4 — dem schwächsten Kriterium. Wenn C4 nicht binär wird, ist das Kern-Signal nicht verifizierbar.

### Querschnitt: „blockiert" konsistent definieren
C2, C6, C8 sagen alle „blockiert" — aber meinen sie dasselbe (automatisierter Gate) oder mal Doku, mal Code? Einmal definieren: **wer/was blockiert und wie wird Pass/Fail beobachtet.**

### Empfohlene Mindest-Edits vor `plan-done`
1. **C4 entvaguen** — Metrik oder benannter Sign-off (Pflicht, sonst nicht eval-bar).
2. **C9 ergänzen** — Doku-Drift-Gate-Regression (deckt offenen Guardrail).
3. **C1 schärfen** — Input-Menge fixieren + Reproduzierbarkeit als Schritt.
4. **C6/C8** — Blockier-Mechanismus + Audit-Referenz in spec.md verankern.

Soll ich die vier Edits direkt in die `criteria.md` einarbeiten?
