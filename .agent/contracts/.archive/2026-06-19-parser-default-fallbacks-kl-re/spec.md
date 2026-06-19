---
contract: 2026-06-19-parser-default-fallbacks-kl-re
title: Parser-Default-Fallbacks klären
task: 67dIBiXChW0p
status: planning
---

# Parser-Default-Fallbacks klären

## Frame

```yaml
problem: |
  Parser- und Loader-Pfade dürfen korrupte, alte oder unvollständige
  Authoring-/Snapshot-Daten nicht still als gültigen aktuellen Zustand
  behandeln.
why_now: |
  Das V2-Readiness-Gate bleibt durch No-Fallback-Restklassen blockiert. Nach der
  localStorage-Grenzen-Migration sind die verbleibenden Parser-Defaults der
  nächste High-Priority-Blocker im Epic ZwvSdKghcAmK.
symptom_vs_problem: |
  Symptom sind fallback-Parameter und catch-basierte Reparaturpfade. Das
  eigentliche Problem ist unklare Ownership: ein kaputter lokaler Authoring-
  Snapshot oder ein unvollständiger exportierter Viewer-Snapshot darf nicht
  abhängig vom aktuellen Live-State repariert werden.
smallest_change: |
  Nur die Task-Scope-Dateien anfassen: authoringSnapshotStore.ts,
  viewerStateSnapshot.ts, manifestAuthoringRuntime.ts, die zugehörigen Tests und
  die zentrale No-Fallback-Inventur. Settings und Atlas-Overrides bleiben
  Verifikationsscope, weil sie bereits fail-loud laden.
tradeoffs: |
  Ein korrupter lokaler Authoring-State löst künftig einen harten Fehler aus.
  Das ist gewollt, weil der bestehende App-Reset die bekannten lokalen App-Keys
  löschen kann und stille Reparatur als Endzustand verboten ist.
```

## Ist-Befund

1. `settingsStore.ts` lädt korrupte `brain-app-settings` bereits fail-loud.
   Missing optional fields aus Schema-Version 0 bleiben ein expliziter
   Schema-Default.
2. `atlasConfig.ts` lädt korrupte `atlas-config-overrides` bereits fail-loud.
3. `authoringSnapshotStore.ts` entfernt korrupte
   `brain-app-authoring-snapshot` und `brain-app-authoring-command-history`
   aktuell still und startet mit `null` oder leerer History.
4. `viewerStateSnapshot.ts` nutzt beim Import fehlender Felder den aktuellen
   Live-State als Parser-Fallback. Das macht importierte Snapshots
   nicht-deterministisch.
5. `manifestAuthoringRuntime.ts` nutzt `mergeSceneInstances(current, fallback)`
   für den legitimen Manifest-Refresh, benennt den aktuellen Vertrag aber als
   Fallback.

## Zielzustand

1. Korrupte lokale Authoring-Snapshots und Command-History werfen mit dem
   betroffenen Storage-Key im Fehlertext.
2. Viewer-State-Snapshot-Import verwendet stabile Schema-Defaults statt
   aktuellem Live-State. Fehlerhafte Typen, unbekannte Enum-Werte und
   unvollständige Pflichtstrukturen werfen weiter laut.
3. Der Manifest-Refresh ist als aktueller Primärvertrag benannt, nicht als
   Fallback.
4. Die Inventur dokumentiert NF-Parser-Defaults als migriert, inklusive
   Verifikationskommandos.

## Nicht-Ziele

1. Keine Kamera-, Animation-, Picking-, Phineas- oder Buchbild-Fallbacks.
2. Keine Änderung der Settings- oder Atlas-Override-Schemata.
3. Keine Browser-UI-Änderung.
4. Keine vollständige Unified-Shell-Migration.

## Verifikation

1. Rote Tests für korrupte lokale Authoring-Persistenz und
   live-state-unabhängigen Snapshot-Import schreiben.
2. Focused Vitest:
   `pnpm --dir apps/brain-app exec vitest run src/viewer/authoringSnapshotStore.test.ts src/viewer/viewerStateSnapshot.test.ts src/viewer/manifestAuthoringRuntime.test.ts src/viewer/settingsStore.test.ts src/viewer/atlas/atlasConfigStore.test.ts`
3. `pnpm --dir apps/brain-app typecheck`
4. `pnpm --dir apps/brain-app docs:drift`
5. `git diff --check`
