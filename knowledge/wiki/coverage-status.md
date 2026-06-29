---
type: meta
title: "Wiki Coverage Status"
aliases: ["coverage-status", "coverage status", "Abdeckungsstatus", "Coverage Source of Truth"]
tags: [coverage, matrix, wiki-status, source-of-truth]
created: 2026-06-29
updated: 2026-06-29
---

# Wiki Coverage Status

Diese Datei ist die **einzige lesbare Source of Truth** für den Coverage-Stand
des Neuropsychologie-Wikis.

Andere Dateien dürfen auf diese Seite verweisen, aber keine konkurrierenden
Coverage-Zahlen pflegen. Die SQLite-Datenbank, Crosswalks, Run-Reports und
Audit-JSONs sind lokal regenerierbare Arbeitsartefakte, nicht die kanonische
Status-Erzählung. Sie werden nicht als Knowledge-Dateien versioniert.

## Autorität

| Ebene | Kanonisch | Zweck |
|---|---|---|
| Wiki-Inhalt | `knowledge/wiki/**/*.md` | Fachseiten, Quellenanker, Aliase und Wikilinks |
| Coverage-Status | `knowledge/wiki/coverage-status.md` | aktueller Gesamtstand, offene Arbeit, Prioritäten |
| Coverage-Matrix-Alias | `knowledge/wiki/coverage-matrix.md` | Kompatibilitätslink auf diese Datei |
| Navigationsindex | `knowledge/index.md` | Seitenkatalog, keine Coverage-Zahlen |
| App-/Lern-Overview | `knowledge/wiki/overview.md` | didaktische Landkarte, keine Coverage-Zahlen |
| Abgeleitete Arbeitsindizes | lokal regeneriert, nicht versioniert | SQL, Audit-JSONs und Batch-Snapshots für laufende Arbeit |

## Aktueller Verdict

Stand: **2026-06-29**

Das Wiki ist **nicht 100% vollständig**.

Die Fachseiten haben flächendeckend Quellenanker, aber der Glossar-/Register-
Backlog ist weiterhin groß. Zusätzlich sind Atlas-/Areal-Reviews, Alias-
Kollisionen und Source-/APA7-Hygiene noch nicht vollständig abgeschlossen.

## Reproduzierbare Evidenz

| Evidenz | Pfad | Ergebnis |
|---|---|---|
| Coverage-Arbeitsindex | lokal regenerierbare SQLite-Auswertung | 6322 Quellterme, 3930 `open`, 156 `partial` |
| Open-Index-Audit | lokal regenerierbare JSON/Markdown-Auswertung | 3930 offene Zeilen triagiert |
| Validation | `wiki_coverage_pipeline.py validate` | JSON ok, Quellenanker ok, Wikilinks ok, SQL-Status ok; Alias-Kollisionen warnen weiter |

## Gesamtumfang

| Bereich | Anzahl | Status |
|---|---:|---|
| Wiki-Dateien gesamt | 1056 | vorhanden |
| Fachseiten in `topics`, `disorders`, `methods`, `pathways`, `brain-regions`, `atlases` | 1038 | mit `sources:`-Ankern |
| Source-Seiten | 15 | 13 lokal/APA belastbar, 2 teilweise |
| Root-Meta-Seiten | 3 | `overview`, `coverage-status`, `coverage-matrix` |
| Nicht-root Wiki-Seiten im SQLite-Index | 1053 | abgeleiteter Index |
| Namen/Aliase im SQLite-Index | 5394 | 169 Cross-Path-Kollisionen als Review-Signal |
| Quellterme aus Glossaren/Registern | 6322 | 2236 matched, 156 partial, 3930 open |

## Buchregister und Glossare

Diese Tabelle ist der aktuelle maschinelle Coverage-Stand aus dem SQLite-
Arbeitsindex. `Open` bedeutet nur: noch kein exakter lokaler Wiki-Match.
Der nachfolgende Open-Index-Audit trennt daraus echte Arbeit von Noise,
Aliases und Review-Fällen.

| Quelle | Inventar | Matched | Anteil | Partial | Anteil | Open | Anteil |
|---|---:|---:|---:|---:|---:|---:|---:|
| Bear Glossar | 774 | 769 | 99,4% | 5 | 0,6% | 0 | 0,0% |
| Bear Sachverzeichnis | 3101 | 974 | 31,4% | 59 | 1,9% | 2068 | 66,7% |
| Jäncke Index | 1667 | 229 | 13,7% | 82 | 4,9% | 1356 | 81,3% |
| Karnath Glossar | 326 | 164 | 50,3% | 1 | 0,3% | 161 | 49,4% |
| Lehrner Sachverzeichnis | 454 | 100 | 22,0% | 9 | 2,0% | 345 | 76,0% |
| **Gesamt** | **6322** | **2236** | **35,4%** | **156** | **2,5%** | **3930** | **62,2%** |

## Open-Index-Audit

Der Audit vom 2026-06-29 klassifiziert alle 3930 aktuell offenen
Glossar-/Registerzeilen gegen bestehende Wiki-Namen und lokale Volltextstellen
außerhalb der Registerbereiche.

| Klasse | Anzahl | Anteil | Bedeutung |
|---|---:|---:|---|
| `true_open` | 2381 | 60,6% | wahrscheinlich echte fehlende Inhalte oder fehlende Alias-/Crosswalk-Arbeit |
| `not_real_open` | 354 | 9,0% | bereits durch bestehende Topics, Aliase, Slash-/Komma-Varianten oder Subentries abgedeckt |
| `bullshit` | 484 | 12,3% | Personenindex, OCR-/Parserfragmente, generische Überschriften oder Seitenzahl-Bleed |
| `needs_review` | 711 | 18,1% | nicht sicher automatisierbar; braucht fachlichen Review |
| **Gesamt** | **3930** | **100,0%** | alle Zeilen mit SQLite-Status `open` |

Nach Quelle:

| Quelle | Echt offen | Nicht echt offen | Bullshit | Review | Gesamt |
|---|---:|---:|---:|---:|---:|
| Bear Sachverzeichnis | 1524 | 5 | 286 | 253 | 2068 |
| Jäncke Index | 499 | 337 | 153 | 367 | 1356 |
| Karnath Glossar | 132 | 4 | 23 | 2 | 161 |
| Lehrner Sachverzeichnis | 226 | 8 | 22 | 89 | 345 |

Konsequenz: **838 der 3930 offenen Zeilen sind aktuell kein echter neuer
Artikelbedarf**. Davon sind 484 klarer Noise und 354 Alias-/Subentry- oder
Duplikatmaterial. Sie sollen nicht als neue Seiten geschrieben werden.

## Atlas-/Areal-Crosswalk

Die App-Ontologie enthält 590 Areal-/Subareal-Zeilen. Der Crosswalk ist
maschinell berechnet und noch `machine_unreviewed`. Deshalb gilt die
Atlas-Areal-Coverage als **teilweise**, nicht erledigt.

| Atlas | Gesamt | Direkter Artikel | Parent-Region | Atlas-Übersicht | Offen |
|---|---:|---:|---:|---:|---:|
| Brodmann | 82 | 0 | 22 | 60 | 0 |
| Destrieux | 148 | 0 | 0 | 148 | 0 |
| DKT | 68 | 4 | 0 | 64 | 0 |
| Julich | 292 | 0 | 4 | 288 | 0 |
| **Gesamt** | **590** | **4** | **26** | **560** | **0** |

## Source-Seiten

| Status | Anzahl | Anteil | Beispiele |
|---|---:|---:|---|
| lokal/APA belastbar | 13 | 86,7% | lokale Volltext-/Extraktbasis oder lokal belegte Source-Datei |
| teilweise | 2 | 13,3% | `herbert-2010-cardiac-awareness-autonomic`, `lead-dbs-mni-spaces` |
| offen | 0 | 0,0% | keine |

## Offene Arbeit in Reihenfolge

1. `bullshit.*` aus dem Open-Index-Audit reviewen und bestätigte Fälle als
   Crosswalk-Exclusions materialisieren, nicht als Wiki-Seiten.
2. `not_real_open.*` reviewen und als Aliase, Subentries oder Redirect-
   Coverage materialisieren.
3. `needs_review.*` durch fachlichen Review entweder auf `true_open`,
   `not_real_open` oder `bullshit` routen.
4. `true_open.*` in kleine Writer-Batches aufteilen und nur mit echten lokalen
   Quellenankern in Wiki-Seiten oder Alias-Patches überführen.
5. Atlas-/Areal-Crosswalk manuell reviewen: direkter Artikel, Parent-Region,
   Atlas-Übersicht oder bewusst out-of-scope.
6. Alias-Kollisionen bereinigen; Parent-Seiten sollen Child-Gyri/Subareale
   verlinken, nicht als Alias beanspruchen.
7. Die zwei teilweisen Source-Seiten lokal nachziehen oder dauerhaft als
   extern-only kennzeichnen.

## Nicht versionieren

Diese Artefakte dürfen lokal für laufende Arbeit erzeugt werden, gehören aber
nicht in den Knowledge-PR und sind keine Source of Truth:

| Artefakt | Grund |
|---|---|
| `.agent/contracts/**/coverage.sqlite` | abgeleiteter Arbeitsindex |
| `.agent/runs/wiki-coverage*/**` | Batch- und Review-Snapshots |
| `book-crosswalk-recomputed.*` | große Term-Level-Zwischenliste |
| `open-index-bullshit-audit.*` | regenerierbarer Review-Export |
