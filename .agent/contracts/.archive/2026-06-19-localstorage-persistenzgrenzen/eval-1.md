---
contract: 2026-06-19-localstorage-persistenzgrenzen
round: 1
verdict: pass
scores:
  - criterion: "C1 Settings werfen bei korrupten lokalen Daten"
    score: 5
    note: "settingsStore.loadSettings wirft mit brain-app-settings im Fehlertext; settingsStore.test prueft korruptes JSON und ungueltiges Schema."
  - criterion: "C2 Atlas-Overrides werfen bei korrupten lokalen Daten"
    score: 5
    note: "atlasConfigStore nutzt loadStoredAtlasConfigOverrides ohne Catch-to-default; atlasConfigStore.test prueft korruptes JSON und ungueltige Override-Form mit atlas-config-overrides im Fehlertext."
  - criterion: "C3 Clear-Local-Data erfasst alle App-Keys"
    score: 5
    note: "localAppStorageKeys.ts definiert die zentrale Key-Liste; localDataActions und AppErrorBoundary nutzen sie; localDataActions.test prueft alle Keys und fremde Keys."
  - criterion: "C4 Architektur dokumentiert Owner und Loeschpfad"
    score: 5
    note: "docs/ARCHITECTURE.md enthaelt Lokale Persistenzgrenzen mit Owner, Zweck, Loeschpfad und Verbot kanonischer lokaler Autorenquellen."
  - criterion: "C5 No-Fallback-Inventur ist synchron"
    score: 5
    note: "docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md markiert NF-005 als migriert und nennt Codepfade sowie Verifikation."
summary: |
  NF-005 ist umgesetzt. Lokale App-Persistenz ist zentral inventarisiert,
  korrupte Settings/Atlas-Overrides werden nicht mehr still repariert, und
  Clear-Flow plus Root-ErrorBoundary nutzen dieselbe Key-Liste.

  Verifikation ausgefuehrt:
  - pnpm --dir apps/brain-app exec vitest run src/viewer/atlas/atlasConfigStore.test.ts src/viewer/settingsStore.test.ts src/viewer/authoringSnapshotStore.test.ts src/viewer/localDataActions.test.ts
  - pnpm --dir apps/brain-app typecheck
  - pnpm --dir apps/brain-app docs:drift
  - git diff --check
---
