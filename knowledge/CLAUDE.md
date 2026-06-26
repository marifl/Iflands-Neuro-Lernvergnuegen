# Schema — brain-app-standalone Knowledge Wiki

> Projekt: `brain-app-standalone` · Domain: `generic` · Initialisiert: `2026-06-18`

Single Source of Truth fuer die Pflege dieses Wikis. Bei jeder Session zuerst lesen.

Pattern: Andrej Karpathys "LLM Wiki" — LLM kompiliert Wissen aus Rohquellen einmal in einen strukturierten Wiki, haelt ihn aktuell, ergaenzt bei jedem neuen Source Cross-References + Synthesen.

---

## Rollenverteilung

| Wer | Verantwortung |
|-----|---------------|
| **User** | Quellen sourcen, Fragen stellen, Richtung vorgeben |
| **LLM** | Lesen, summarizen, cross-referencen, filen, mergen, Wiki konsistent halten |

User schreibt nie (oder selten) Wiki-Seiten. LLM schreibt nie in `raw/`.

---

## Architektur — drei Schichten

```
brain-app-standalone/knowledge/
├── CLAUDE.md              # Dieses Dokument (Schema)
├── README.md              # Quick-Start
├── index.md               # Content-Katalog
├── log.md                 # Append-only Journal
│
├── raw/                   # Schicht 1 — Rohquellen (IMMUTABLE)
│   ├── papers/            # PDFs, Gesetze, offizielle Dokumente
│   ├── articles/          # Fach-Artikel, Blog-Posts
│   ├── notes/             # Eigene Notizen, CONTEXT-Files
│   └── assets/            # Bilder, Diagramme, Skizzen
│
└── wiki/                  # Schicht 2 — LLM-generiert (synthesized pages)
    ├── overview.md        # Top-Level-Synthese: Stand der Domaene
    ├── sources/           # Eine Seite pro ingestierter Quelle (1:1 mit raw/)
    ├── topics/            # Multi-Source-Synthesen, Vergleiche, Deep Dives
    └── <project-types>/   # Per-Project: vom Projekt selbst deklarierte Kategorien
```

**Wichtig:** Die Kategorien innerhalb `wiki/` sind **per-project** und werden in diesem Schema-Dokument deklariert (siehe Sektion "Projekt-Schema" unten). Es gibt kein hartes Vokabular — das Projekt waehlt seine eigene Ontologie.

---

## Projekt-Schema (vom Projekt zu pflegen)

> Diese Sektion wird vom Projekt selbst gefuellt. Default-Template enthaelt keine Hardcoded-Types.

### Type-Deklaration

Neben den kanonischen `sources/` und `topics/` verwendet dieses Projekt:

| Type | Ordner | Beschreibung |
|------|--------|--------------|
| `brain-region` | `wiki/brain-regions/` | Hirnregionen, Areale, Kerne (z.B. PFC, BA44, STN, Amygdala) |
| `pathway` | `wiki/pathways/` | Fasertrakte, Schaltkreise, funktionelle Netzwerke (z.B. Cortico-BG-Loop, SLF) |
| `method` | `wiki/methods/` | Mess-/Analyse-/Bildgebungsverfahren (z.B. EEG, fMRI, Source Localization) |
| `atlas` | `wiki/atlases/` | Hirn-Atlanten, Koordinatensysteme, Parcellierungen (z.B. MNI, Julich-Brain, DKT) |
| `disorder` | `wiki/disorders/` | Stoerungsbilder, klinische Syndrome (z.B. ADHS, Aphasie, Neglect) |

Die canonical `sources/` und `topics/` Kategorien sind immer vorhanden.

### Naming-Konvention

- **kebab-case** durchgaengig
- **Source-Seiten:** Dateiname spiegelt Raw-File-Slug
- **Andere Seiten:** kanonischer Begriff der Domaene

### Frontmatter-Schema (YAML)

Jede Wiki-Seite **muss** Frontmatter haben:

```yaml
---
type: source | topic | <project-declared-type>
title: "<Anzeigetitel>"
aliases: ["<Variante>"]
tags: [<projekt-tags>]
created: YYYY-MM-DD
updated: YYYY-MM-DD
sources: ["[[<source-slug>]]"]      # bei wiki-Pages: aus welchen Quellen synthetisiert
source_path: "raw/papers/<file>"    # nur bei type=source
---
```

### Cross-Referencing

- **Immer `[[wikilinks]]`** bei Verweisen auf andere Wiki-Seiten
- Display-Pipe nutzen wenn Anzeigeform abweicht: `[[grz|Grundflaechenzahl (GRZ)]]`

---

## Operations

### Ingest

Trigger: User legt Datei in `raw/` und sagt "ingest" / "lies das ein".

1. **Pfad bestaetigen**
2. **Lesen** — komplett
3. **Klassifizieren** — welcher project-declared `type:`?
4. **TL;DR** im Chat ausgeben, User kann lenken
5. **Source-Seite** anlegen (`wiki/sources/<slug>.md`)
6. **Cross-Walk:** welche existierenden Seiten beruehrt? Anlegen/updaten.
7. **Contradictions / Versionsunterschiede** explizit dokumentieren
8. **`index.md`** updaten
9. **`log.md`** updaten (siehe Format unten)
10. **`updated:`** in allen beruehrten Seiten auf heute setzen
11. **Zusammenfassung** an User: was angelegt/geupdated, offene Fragen

**Bilanz:** Eine Quelle beruehrt typisch 5–15 Wiki-Seiten. Wenn nur die Source-Seite entstand: Cross-Walk fehlt.

### Query

Trigger: Fachfrage, Vergleich, Suche nach Verbindungen.

1. `index.md` lesen → relevante Seiten finden
2. Seiten lesen, ggf. Source-Seite + Raw bei Bedarf
3. Antwort synthetisieren mit `[[…]]`-Zitaten
4. **Filing-Frage** bei substantieller Synthese: als Topic-Seite speichern?
5. `log.md` updaten

### Lint

Health-Check ohne Auto-Fixes — Bericht im Chat:

- Contradictions / Versionsunterschiede ohne Doku
- Stale Claims (alte `updated:`-Daten, ueberholte Aussagen)
- Orphan-Seiten (keine eingehenden Links)
- Broken Links: `[[xy]]` ohne existierende Datei
- Frontmatter unvollstaendig
- Data Gaps (offene Fragen → Recherche moeglich)

Bericht im Chat, User entscheidet ueber Aktionen.

---

## `index.md` — Pflicht-Struktur

Sektionen (mindestens):
1. **Overview** → `wiki/overview.md`
2. **Sources** — chronologisch, neueste zuerst
3. **Topics** — neueste zuerst
4. **<weitere project-declared types>** — Reihenfolge vom Projekt waehlbar

Format: `- [[<slug>]] — <one-liner>`

---

## `log.md` — Pflicht-Format

Append-only. Neueste oben. Praefix `## [YYYY-MM-DD]`.

```markdown
## [YYYY-MM-DD] ingest | <Source Title>
- **Quelle:** `raw/papers/<file>`
- **Klassifikation:** <project-type>
- **Neue Seiten:** [[…]], [[…]]
- **Geupdated:** [[…]], [[…]]
- **Findings:** …
- **Offene Punkte:** …
```

---

## Anti-Patterns

- Source-Seite ohne Cross-Walk
- Klartext-Verweise statt `[[wikilinks]]`
- Wiki-Inhalt direkt in `index.md`
- `raw/` editieren (Schicht 1 ist IMMUTABLE)
- Frontmatter weglassen
- Stille Aenderungen ohne `log.md`-Eintrag
- Hardcoded Type-Liste statt Projekt-Deklaration

---

## Quick-Reference fuer User-Eingaben

| User sagt | LLM tut |
|-----------|---------|
| "Ingest <Datei>" / "Lies das ein" | Vollstaendiger Ingest mit Cross-Walk |
| "Was sagt der Wiki zu X?" / "Vergleiche A und B" | Query mit `[[wikilinks]]`, optional als Topic filen |
| "Lint" / "Health-Check" | Lint-Bericht im Chat |
| "Update overview" | `wiki/overview.md` neu synthetisieren |
