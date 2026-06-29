# Spec — wiki coverage matrix glossare areale paper 100 prozent

> Contract-ID: `2026-06-27-wiki-coverage-matrix-glossare-`
> Revision: v2 (2026-06-28)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Das Wiki hat Quellenanker, aber keine beweisbare 100-Prozent-Abdeckung gegen
  alle lokalen Buch-Glossare, Paper-Quellen, Areale/Subareale und Duplikate.
why_now: |
  Die App soll als Lernapp genutzt werden; falsche 100-Prozent-Claims würden
  Studierende und weitere Implementierung in die Irre führen.
symptom_vs_problem: |
  Symptom = viele verstreute Listen und 100-Prozent-Claims. Eigentliches
  Problem = fehlende zentrale, reproduzierbare Coverage-Statusquelle mit Evidenz.
smallest_change: |
  Bestehenden Coverage-Status/Index/Overview erweitern, Extraktion per lokalen MD-Dateien
  belegen, fehlende Einträge nur mit echten Quellen ergänzen und Review laufen
  lassen.
tradeoffs: |
  Kein neues Neben-Wiki und keine neue Listenlandschaft. Keine 100-Prozent-
  Behauptung, solange Glossar-, Paper-, Areal- oder APA7-Prüfung offen ist.
```

## 1. Motivation und Problem

Die Nutzeranforderung ist absolute Evidenztreue: alle relevanten Buch-Glossare,
Paper-Begriffe, Areale/Subareale und App-Konzepte müssen in einer bestehenden
Matrix nachvollziehbar als erledigt, teilweise oder offen markiert sein. Die
aktuelle `sources:`-Abdeckung ist nur ein Quellenanker-Check und reicht nicht
als wissenschaftliches Review-Verdict.

## 2. Scope

### In-Scope

- `knowledge/wiki/coverage-status.md` als zentrale Statusquelle pflegen.
- `knowledge/index.md`, `knowledge/wiki/overview.md` und `knowledge/log.md`
  konsistent aktualisieren.
- Lokale Buch-MDs unter `raw/textbooks/` systematisch für Glossar/Index/
  Sachverzeichnis auswerten.
- Wiki-Slugs und Aliases gegen extrahierte Begriffe mappen.
- Duplicate-Kandidaten markieren und offensichtliche Redirect-Duplikate
  bereinigen.
- Fehlende Seiten nur mit lokalen Zeilenankern oder echten lokal abgelegten
  Paper-/Source-Dateien ergänzen.
- ALRAH-Review/Eval als Abschlussprüfung nutzen.

### Out-of-Scope

- Keine erfundenen Quellen.
- Keine proprietären Inhalte außerhalb der lokalen Rohdaten kopieren.
- Keine App-UI-Änderungen.
- Kein Commit, solange der Worktree fremde, ungeklärte Änderungen enthält.

## 3. Architektur

- Rohdaten: `raw/textbooks/*.md`, `raw/papers/**`.
- Kuratierte Inhalte: `knowledge/wiki/**`.
- Steuerartefakte: `knowledge/wiki/coverage-status.md`,
  `knowledge/wiki/overview.md`, `knowledge/index.md`, `knowledge/log.md`.
- Contract-Artefakte: `.agent/contracts/2026-06-27-wiki-coverage-matrix-glossare-/`.

## 4. Test-Strategie

- Zählcheck: Anzahl Wiki-Seiten und Fachseiten pro Sektion.
- Quellenankercheck: alle Fachseiten haben `sources:` im Frontmatter.
- Wikilinkcheck: Slug-basierter Parser akzeptiert `[[slug|Label]]`.
- Glossar-Crosswalk: extrahierte Begriffe sind als matched/partial/open
  dokumentiert.
- Duplicate-Check: normalisierte Titel/Aliases erzeugen eine Duplicate-Liste.
- Review: `alrah contract review` oder `alrah contract eval` mit Verdict.

## 4b. Beschleunigter Ausführungsplan

Die aktuell 3930 offenen Buchregister-/Glossarzeilen werden nicht als 3930
fehlende Wiki-Seiten
behandelt. Der operative Pfad ist:

1. große Quellen-Slices aus Sachverzeichnissen/Indizes bilden;
2. read-only Subagents klassifizieren in `parser_noise`, `alias_existing`,
   `new_stub` oder `needs_review`;
3. Parser-Rauschen aus der Crosswalk-Zählung entfernen oder als nicht-zählbar
   markieren;
4. kollisionsfreie Aliase in bestehende Wiki-Seiten materialisieren;
5. nur echte Headwords ohne bestehende Zielseite als neue Stub-Seiten schreiben.

Der alte Bear-Glossar-Stub-Modus ist nur noch für echte Glossar-Headwords
zulässig. Für Bear Sachverzeichnis, Jäncke Index und Lehrner Sachverzeichnis
ist Massenklassifikation der Default.

## 5. Pflichtlektuere

- `AGENTS.md`
- `knowledge/CLAUDE.md`
- `knowledge/wiki/coverage-status.md`
- `knowledge/wiki/overview.md`
- `knowledge/index.md`
- `raw/textbooks/README.md`, falls vorhanden
