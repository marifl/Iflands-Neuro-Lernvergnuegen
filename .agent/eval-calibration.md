# Evaluator-Kalibrierung

Dieses Dokument enthaelt projektspezifische Few-Shot-Beispiele für den Evaluator.
Der Evaluator liest diese Datei und kalibriert seine Scores entsprechend.

## Karpathy-Bewertungsachsen (zusaetzlich zur Score-Skala)

Bei jedem Criterion neben der Pass-Skala die folgenden 4 Karpathy-Achsen als Soft-Faktoren mitlaufen lassen. Sie veraendern den Score nicht direkt, fliessen aber in `note:` und `recommendation:` ein:

- **Think First** — Wurde die Implementation gegen explizite Annahmen gebaut, oder wurde geraten? (Frame-Drift = Hinweis auf P1-Verletzung)
- **Simplicity** — Loest die Implementation das Problem mit minimalem Code, oder wurde over-engineered? (Code-Volume + LOC-Limits)
- **Surgical** — Wurden nur die noetigen Files angefasst, oder gab es Scope-Creep / Adjacent-Refactor?
- **Goal-Driven** — Ist das `outcome:` Frontmatter beobachtbar (gibt es einen Verify-Command)?

Bei systematischer Verletzung einer Achse: `recommendation: pivot` statt `refine`.

## Scoring-Beispiele

### Score 5 — Exakt erfüllt
**Criterion:** "Login-Endpoint gibt JWT bei korrekten Credentials zurück"
**Beobachtung:** POST /login mit validen Daten gibt 200 + JWT. Token ist decodierbar,
enthaelt user_id und exp. Refresh-Endpoint existiert. Rate-Limiting aktiv.
**Score:** 5 — Edge-Cases (expired token, invalid credentials) getestet und korrekt behandelt.

### Score 3 — Grundsätzlich erfüllt mit Luecken
**Criterion:** "Dark-Mode-Toggle persistiert Auswahl"
**Beobachtung:** Toggle funktioniert visuell. localStorage wird gesetzt. ABER: beim
Reload flasht die Seite kurz im Light-Mode bevor Dark-Mode angewendet wird.
**Score:** 3 — Grundfunktion vorhanden, Flash-of-Wrong-Theme ist eine relevante Lücke.

### Score 1 — Nicht erfüllt
**Criterion:** "Drag-and-Drop Reorder der Aufgaben-Liste"
**Beobachtung:** Kein Drag-Handle sichtbar. Kein mousedown/touchstart Event-Listener.
Die Reorder-API im Backend existiert, aber kein Frontend-Wiring.
**Score:** 1 — Feature nicht implementiert, nur Backend-Stub.

## Projekt-spezifische Hinweise

Ergaenze hier projektspezifische Kalibrierungs-Beispiele:
- Was bedeutet Score 5 in DEINEM Projekt?
- Welche Luecken sind akzeptabel (Score 3) vs. inakzeptabel (Score 1)?
