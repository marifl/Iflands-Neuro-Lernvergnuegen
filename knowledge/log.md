# brain-app-standalone — Wiki Log

> Append-only. Neueste Eintraege oben. Praefix `## [YYYY-MM-DD]`.

Jeder Ingest / Query / Lint bekommt einen Eintrag. User-Editierungen optional ebenfalls.

## Format

```markdown
## [YYYY-MM-DD] ingest | <Source Title>
- **Quelle:** `raw/papers/<file>`
- **Klassifikation:** <type>
- **Neue Seiten:** [[…]], [[…]]
- **Geupdated:** [[…]]
- **Findings:** …
- **Offene Punkte:** …

## [YYYY-MM-DD] query | <Frage>
- **Geantwortet aus:** [[…]]
- **Gefilet als:** [[…]] / nicht gefilet

## [YYYY-MM-DD] lint
- **Gefunden:** …
- **Behoben:** …
- **Offen:** …
```

---

## [2026-06-18] init
- **Aktion:** Knowledge-Wiki-Scaffold initialisiert ueber `alrah knowledge init`
- **Projekt:** `brain-app-standalone`
- **Domain:** `generic`
- **Naechster Schritt:** erste Quelle in `raw/` ablegen + `knowledge-ingest` Skill triggern.
