# SP5.1.4 Review — Region-/Bucket-Mappings

Reviewer: `skeptic_reviewer` subagent `019ecb31-722a-7c32-88c8-c4fc145d8e3b`

Scope: `[SP5.1.4] Region- und Bucket-Mappings aus Code in Config ziehen`

## Findings

1. High — `meshMappings.generated.json` ist noch ungetrackt

   Die Runtime importiert das generierte Mapping direkt:
   `apps/brain-app/src/viewer/bucketMeshes.ts` und
   `apps/brain-app/src/scene/regions.ts` hängen an
   `apps/brain-app/src/viewer/meshMappings.generated.json`.

   `scripts/atlas/build-config.mjs` schreibt diese Datei nur im CLI-Pfad. Im
   aktuellen Worktree ist sie laut `git status --short` ungetrackt. Wenn dieser
   Diff ohne diese Datei committed wird, bricht ein frischer Checkout bei der
   Modulauflösung.

2. Medium — Sync-Guard zwischen TOML und Runtime-Mapping fehlt

   `scripts/atlas/build-config.test.mjs` validiert `buildConfig()` in memory,
   prüft aber nicht, dass `config.mesh_mappings` identisch mit dem von der
   Runtime importierten `meshMappings.generated.json` ist.

   `apps/brain-app/src/viewer/colorPresets.test.ts` testet das vorhandene JSON.
   Dadurch könnte `scripts/atlas/config.default.toml` von der importierten
   Runtime-Datei driften, solange das stale JSON die aktiven Preset-Checks noch
   erfüllt.

## Evidence Inspected

1. TS-seitige kanonische Mapping-Listen sind aus den fokussierten Runtime-Dateien
   entfernt.
2. `ifj` bleibt als expliziter Known Gap in `scripts/atlas/config.default.toml`
   markiert.
3. `bucketToMeshes()` und `regionsToMeshes()` failen weiterhin laut auf
   unbekannte oder leere Mappings.
4. Ein In-Memory-Vergleich von `buildConfig().mesh_mappings` gegen das aktuelle
   generierte JSON war im Worktree gleich.

## Verification Run By Reviewer

1. `node --test scripts/atlas/build-config.test.mjs` — grün.
2. `pnpm --dir apps/brain-app test -- --run colorPresets.test.ts` — grün; dabei
   wurden bestehende `act(...)`-Warnings in `FooterBar.test.tsx` beobachtet.
