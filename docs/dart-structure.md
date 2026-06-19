# Dart-Struktur — ALRAH-Standard

> Dart = SSOT für Zustand + Kommunikation. git = SSOT für code-nahe Artefakte (spec/plan/ADR/architecture/code). Dart spiegelt und verlinkt, editiert nicht.

## Boards (4, Mensch legt an)

| Board | Zweck | WIP-Limit |
|-------|-------|-----------|
| Backlog | Unsortierte Ideen, rohe Tasks | — |
| Next | Triagiert, Spec existiert, bereit | — |
| Active | Laufende Arbeit | ~3 |
| Issues | Bugs und Review-Findings | — |

## Status-Spalten (workspace-weit)

`To-do` → `Doing` → `In Review` → `Done` (+ `Blocked`)

## Folders (5, Mensch legt an)

| Folder | Inhalt | Schreibregel |
|--------|--------|--------------|
| specs/ | Contract-Spec + Akzeptanzkriterien | Append wenn Scope wächst |
| plans/ | Multi-Session-Pläne (Header-Konvention) | Live-Update pro Step |
| decisions/ | ADRs; Warum-Entscheidungen | Append-only |
| Architecture/ | Soll-Zustand, Architektur-Docs | Überschreiben erlaubt |
| Docs/ | Referenz, Handover, Session-Logs | Ablage |

`decisions/` (warum, unveränderlich) ≠ `Architecture/` (aktueller Soll-Stand).

## Isomorphie — Lokal ↔ Dart

| Lokal (git) | Dart |
|-------------|------|
| `.agent/contracts/{id}/spec.md` | `specs/` Folder |
| `docs/plans/*.md` | `plans/` Folder |
| `docs/decisions/ADR-*.md` | `decisions/` Folder |
| Architektur-Docs | `Architecture/` Folder |
| `docs/END_SESSION_*.md` | `Docs/` Folder |
| Bug/Finding | Board `Issues`, verlinkt auf Ursprungs-Task |

## Contract-Lifecycle ↔ Dart-Task-Status

| Contract-Phase | Board | Status |
|----------------|-------|--------|
| `planning` | Next | To-do |
| `active` | Active | Doing |
| `review` | Active | In Review (reviewBy = Marcus) |
| `done` | Active → Done | Done — **nur nach Verdict** |
| `blocked` | Active | Blocked |

Regel: **Done nie ohne Verdict.** ALRAH setzt `Done` nicht selbst.

## Binding-Schema `.agent/dart.json`

```json
{
  "project": {
    "id": "<dart-project-id>",
    "name": "<project-name>"
  },
  "boards": {
    "backlog": "<board-id>",
    "next":    "<board-id>",
    "active":  "<board-id>",
    "issues":  "<board-id>"
  },
  "folders": {
    "specs":        "<folder-id>",
    "plans":        "<folder-id>",
    "decisions":    "<folder-id>",
    "architecture": "<folder-id>",
    "docs":         "<folder-id>"
  },
  "keyDocs": {
    "plan": "<doc-id-oder-url>"
  }
}
```

Alle Felder Pflicht. Fehlt eines, wirft `alrah dart verify` einen lauten Fehler.

## Setup / Onboarding (Replicate-Workflow)

**API-Limitation:** Die Dart-API kann Boards, Folders und Spaces nicht programmatisch anlegen. Container entstehen ausschließlich per UI.

**Einmalig: ALRAH-Standard-Space aufbauen**

1. Space anlegen: Sidebar "SPACES" → "+" → Name "ALRAH-Standard"
2. Je Board (Backlog/Next/Active/Issues): Space-Titel hovern → "+" → "Create a dartboard" → benennen
3. Je Folder (specs/plans/decisions/Architecture/Docs): Space hovern → "+" → Doc-Folder anlegen

**Pro neues Projekt: Replicate Space**

Space-Titel hovern → "..." → "Replicate space" → Kopie umbenennen auf Projektnamen. Dupliziert alle Boards und Folders in einem Schritt.

**Danach ins ALRAH-System einbinden**

- `alrah dart link` — bindet Boards/Folders per IDs, schreibt `.agent/dart.json`
- `alrah dart detect` + dart-sync-Skill — bei Bestands-/Altstruktur ohne Standard-Layout

## Setup-Ablauf

1. **Mensch** legt Boards + Folders in Dart an (MCP kann Container nicht erstellen).
2. `alrah dart link --from <ids.json>` schreibt `.agent/dart.json`.
3. `alrah dart verify` prüft Erreichbarkeit aller IDs.
4. `alrah dart sync` schreibt den `<alrah-block id="dart">` in CLAUDE.md/AGENTS.md.
