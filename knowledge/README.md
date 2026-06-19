# brain-app-standalone — Knowledge Wiki

> Domain: `generic` · Initialisiert: `2026-06-18`

Karpathy-LLM-Wiki: kompoundiertes Wissen aus Rohquellen + LLM-synthesized Pages.

## Quick-Start (neue Session)

1. **Schema lesen:** `knowledge/CLAUDE.md` — Single Source of Truth fuer Struktur, Frontmatter, Operations.
2. **Index lesen:** `knowledge/index.md` — Inhaltsverzeichnis aller Wiki-Seiten.
3. **Log lesen:** `knowledge/log.md` — letzte Aktivitaeten (neueste oben).

## Struktur

```
knowledge/
├── CLAUDE.md      # Schema (immer zuerst lesen)
├── README.md      # Dieses Dokument
├── index.md       # Katalog
├── log.md         # Append-only Journal
├── raw/           # Rohquellen (IMMUTABLE)
└── wiki/          # LLM-generierte Synthese-Seiten
```

## Drei Operations

| Operation | Trigger | Skill |
|-----------|---------|-------|
| **Ingest** | "Lies das ein", neue Datei in `raw/` | `knowledge-ingest` |
| **Query** | "Was sagt der Wiki zu X?" | `knowledge-query` |
| **Lint** | "Lint", "Health-Check" | `knowledge-lint` |

Details in `CLAUDE.md`.
