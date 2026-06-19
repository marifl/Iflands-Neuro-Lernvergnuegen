---
outcome:
  user_signal: |
    NF-005 kann geschlossen werden, weil lokale App-Daten explizit
    inventarisiert sind und korrupte Persistenz nicht mehr still repariert wird.
  observable_in: |
    settingsStore, atlasConfigStore, localDataActions, ARCHITECTURE,
    NO_FALLBACK_ARCHITECTURE_INVENTORY und Dart-Task 1Hbpo13ABwto.
  guardrail: |
    Keine neue lokale kanonische Autorenquelle, kein Lernfortschritt als stiller
    localStorage-Endzustand und keine temporäre Migrationsbrücke.
  read_horizon: |
    Vor V2-Code-Go und vor jedem neuen localStorage-Key.
---

# Akzeptanzkriterien

## C1 — Settings werfen bei korrupten lokalen Daten

Szenario: `brain-app-settings` enthält korruptes JSON oder ein ungültiges
Settings-Schema.

Erwartet: `loadSettings()` wirft laut und nennt den Storage-Key.

## C2 — Atlas-Overrides werfen bei korrupten lokalen Daten

Szenario: `atlas-config-overrides` enthält korruptes JSON oder ungültige
Override-Form.

Erwartet: Der Atlas-Override-Store schluckt den Fehler nicht still; die
Meldung nennt den Storage-Key.

## C3 — Clear-Local-Data erfasst alle App-Keys

Szenario: bekannte App-eigene Persistenzkeys sind befüllt.

Erwartet: `clearLocalBrainAppData()` entfernt Settings, Atlas-Overrides,
Authoring-State, Last-App-Mode und Theme, lässt fremde Keys aber unangetastet.

## C4 — Architektur dokumentiert Owner und Löschpfad

Szenario: `docs/ARCHITECTURE.md` wird als Einstieg gelesen.

Erwartet: die erlaubten lokalen Keys haben Owner, Zweck, Persistenzklasse und
Löschpfad. Lokale Daten sind ausdrücklich nicht kanonische Autorenquelle.

## C5 — No-Fallback-Inventur ist synchron

Szenario: `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` wird gelesen.

Erwartet: NF-005 ist als migriert beschrieben, sobald C1-C4 erfüllt sind.

## Verifikation

1. `pnpm --dir apps/brain-app exec vitest run src/viewer/atlas/atlasConfigStore.test.ts src/viewer/settingsStore.test.ts src/viewer/authoringSnapshotStore.test.ts src/viewer/localDataActions.test.ts`
2. `pnpm --dir apps/brain-app typecheck`
3. `pnpm --dir apps/brain-app docs:drift`
4. `git diff --check`
