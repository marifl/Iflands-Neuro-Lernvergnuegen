---
outcome:
  user_signal: |
    Der Nutzer sieht in einer bestehenden Matrix, was erledigt, teilweise oder
    offen ist, ohne falsche 100-Prozent-Claims.
  observable_in: |
    knowledge/wiki/coverage-status.md, knowledge/wiki/overview.md,
    knowledge/index.md und ALRAH-Review/Eval-Artefakte.
  guardrail: |
    Keine ausgedachten Quellen, keine approximierten APA7-Angaben, keine neue
    parallele Listenlandschaft, keine App-UI-Änderungen.
  read_horizon: |
    Unmittelbar nach frischer Extraktion, Lint, Matrixupdate und Review-Verdict.
---

# Akzeptanzkriterien — wiki coverage matrix glossare areale paper 100 prozent

> Contract-ID: `2026-06-27-wiki-coverage-matrix-glossare-`
> Revision: v2 (2026-06-28)

## C1 — Fachseiten-Coverage ist reproduzierbar
- Szenario: Fachseiten werden gezählt.
  - Input: `knowledge/wiki/{topics,disorders,methods,pathways,brain-regions,atlases}/*.md`
  - Erwartet: `coverage-status.md` nennt dieselben Counts und weist fehlende `sources:` als offen aus.

## C2 — Glossar-/Index-Crosswalk ist vollständig inventarisiert
- Szenario: Lokale Lehrbuch-MDs werden nach Glossar, Index oder Sachverzeichnis ausgewertet.
  - Input: `raw/textbooks/*.md`
  - Erwartet: Für jedes Buch liegt ein gespeichertes Inventar im Contract-Verzeichnis vor; `coverage-status.md` enthält je Buch `total`, `matched`, `partial`, `open`, und es gilt exakt `total = matched + partial + open`.

## C3 — Paper-Crosswalk ist vollständig inventarisiert
- Szenario: Lokale Paper- und Source-Dateien werden ausgewertet.
  - Input: `raw/papers/**` und `knowledge/wiki/sources/*.md`
  - Erwartet: Für jede lokale Paper-/Source-Datei gibt es genau einen Status `matched`, `partial` oder `open`; URL-only oder fehlende Volltexte zählen niemals als `matched`.

## C4 — Areal-/Subareal-Crosswalk ist vollständig inventarisiert
- Szenario: Areale und Subareale werden gegen lokale Atlas-/Brain-Region-Quellen geprüft.
  - Input: `knowledge/wiki/brain-regions/*.md`, `knowledge/wiki/atlases/*.md`, `apps/brain-app/public/assets/atlas-canonical/atlas-ontology.json`
  - Erwartet: Inventar enthält alle extrahierten Atlas-/Region-Labels mit Status; `100%` für Areale/Subareale ist nur zulässig, wenn `partial=0` und `open=0`.

## C5 — Keine falsche 100-Prozent-Behauptung
- Szenario: Source-Seiten oder Glossare sind nicht vollständig lokal/APA7 belegt.
  - Input: Teilweise Quellen wie `herbert-2010-cardiac-awareness-autonomic` oder URL-only Quellen wie `lead-dbs-mni-spaces`.
  - Erwartet: Matrix/Overview markieren diese als teilweise, nicht als erledigt. Jede 100%-Aussage ist domänenspezifisch und nur zulässig, wenn die jeweilige Inventarliste `open=0` und `partial=0` ausweist.

## C6 — Null ungelöste Duplikate
- Szenario: normalisierte Titel oder Aliases kollidieren.
  - Input: alle `knowledge/wiki/**/*.md`
  - Erwartet: `coverage-status.md` listet Duplicate-Kandidaten oder verweist auf das aktuelle Duplicate-Artefakt; PASS nur bei 0 ungelösten Kollisionen. `redirect` braucht ein kanonisches Ziel, `merged` braucht dokumentierte Inhaltskonsolidierung.

## C7 — APA7 und Quellen-Echtheit sind testbar
- Szenario: bestehende oder neue Source-/Fachseiten werden geprüft.
  - Input: `knowledge/wiki/**/*.md`
  - Erwartet: Quellen gelten nur als erledigt, wenn Autor/Institution, Jahr, Titel, Publikation/Verlag oder lokale Quelle, DOI/URL falls vorhanden und lokaler `source_path` oder Zeilenanker angegeben sind. Approximierte Quellen, URL-only ohne lokale Rohdatei oder Abstract-only ohne Kennzeichnung zählen als `partial`.

## C8 — Neue Inhalte haben echte Evidenz
- Szenario: eine fehlende Wiki-Seite wird ergänzt.
  - Input: lokaler Zeilenanker aus `raw/textbooks/*.md` oder lokale Paper-Datei aus `raw/papers/**`.
  - Erwartet: Frontmatter `sources:` enthält echte Quelle; Prosa überschreitet die Evidenz nicht.

## C9 — Prüfartefakte sind gespeichert
- Szenario: Coverage wird bewertet.
  - Input: Extraktions- und Prüfskripte/Kommandos.
  - Erwartet: Contract-Verzeichnis enthält die genaue Eingabeliste, Counts, Duplicate-Report, APA7-/Source-Report und Link-/Sources-Check, auf die sich der Verdict bezieht.

## C10 — Review ist abgeschlossen
- Szenario: Implementation ist fertig.
  - Input: `alrah contract review 2026-06-27-wiki-coverage-matrix-glossare-` oder `alrah contract eval 2026-06-27-wiki-coverage-matrix-glossare-`
  - Erwartet: Review/Eval-Artefakt liegt im Contract-Verzeichnis und nennt `PASS` oder konkrete offene Findings.

## C11 — Negativfall: Tool-Lint mit Alias-Bug zählt nicht als harte Evidenz
- Szenario: ein Link-Linter markiert gültige `[[slug|Label]]`-Links als broken.
  - Input: `alrah knowledge lint-links --all`
  - Erwartet: Ergebnis wird als Tool-Limit dokumentiert; harte Link-Evidenz kommt aus einem Parser, der Alias-Wikilinks korrekt behandelt.

## C12 — Massenklassifikation ersetzt Stub-Flut
- Szenario: ein Sachverzeichnis- oder Index-Batch wird verarbeitet.
  - Input: mindestens 300 offene Terme aus `Bear Sachverzeichnis`, `Jäncke Index` oder `Lehrner Sachverzeichnis`.
  - Erwartet: Das gespeicherte reviewed-plan-Artefakt klassifiziert jeden Term exakt als `parser_noise`, `alias_existing`, `new_stub` oder `needs_review`; neue Wiki-Seiten werden nur für `new_stub` geschrieben, und Parser-/Alias-Fälle werden nicht als neue Seiten materialisiert.
