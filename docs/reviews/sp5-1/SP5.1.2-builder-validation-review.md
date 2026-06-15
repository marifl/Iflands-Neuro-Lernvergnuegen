# SP5.1.2 Review — TOML-Builder und Runtime-JSON

Reviewer: `skeptic_reviewer` subagent `019ecb31-24ab-79a0-a1b6-36e0d9133761`

Scope: `[SP5.1.2] TOML-Builder um Figuren, Farben und Szenen erweitern`

## Findings

1. High — Die App importiert ein generiertes File, das nicht Teil der getrackten
   App-Build-Pipeline ist

   `apps/brain-app/src/viewer/bucketMeshes.ts` und
   `apps/brain-app/src/scene/regions.ts` importieren
   `meshMappings.generated.json`. Der einzige Writer ist
   `scripts/atlas/build-config.mjs`, aber `apps/brain-app` führt diesen Builder
   nicht in `dev`, `build`, `typecheck` oder `test` aus.

   Im aktuellen Worktree ist
   `apps/brain-app/src/viewer/meshMappings.generated.json` ungetrackt. Ein
   frischer Checkout oder CI-Job mit nur den dokumentierten App-Scripts hängt
   damit von einem lokalen pregenerierten Artefakt ab.

2. High — Sequenzvalidierung ist einseitig und erzeugt bereits ungültiges
   Runtime-JSON

   Der Builder prüft nur, dass `presentation.*.steps[]` und
   `learning.*.steps[]` vorhandene Configurations benennen. Er prüft nicht, ob
   der Step tatsächlich als Szene ladbar ist oder ob
   `configuration.sequencing.*` auf reale Sequenzen zeigt.

   Das generierte `presentation.kapitel11-vorlesung` enthält
   `basalganglienschleifen` und `broca-areal`, deren Overlays keine `scene`
   enthalten. Die Runtime behandelt das in `loadScenes()` als fatal. Es gibt
   bereits einen Runtime-Test, der diesen Fehlerfall erwartet; der Builder-Test
   deckt nur den simpleren Fall eines fehlenden Config-Steps ab.

3. Medium — Scene-Validierung hängt noch an ambienten lokalen Dateien

   `loadScenesContext()` akzeptiert jedes `*.json` unter
   `apps/brain-app/public/scenes` per Directory-Scan. Ein ungetracktes lokales
   `tmp.json` kann dadurch `overlay.scene = "tmp"` lokal gültig machen, oder
   ein malformed stray JSON kann lokal den Build brechen.

## Evidence Inspected

1. `apps/brain-app/src/viewer/bucketMeshes.ts`
2. `apps/brain-app/src/scene/regions.ts`
3. `scripts/atlas/build-config.mjs`
4. `scripts/atlas/build-config.test.mjs`
5. `apps/brain-app/package.json`
6. `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
7. `apps/brain-app/src/scene/scenes.ts`
8. `apps/brain-app/src/scene/scenes.test.ts`

## Verification Run By Reviewer

1. `node --test scripts/atlas/build-config.test.mjs` — grün.
2. `node scripts/atlas/build-config.mjs` zweimal — identische SHA-1s für
   `atlas-config.json` und `meshMappings.generated.json`.

Der Reviewer hat keinen vollständigen Clean-Checkout-App-Build ausgeführt.
