# SP5.1 Runtime-Mapping Sync-Guard

## 1) Mapping der betroffenen Build-/Runtime-Pfade

1. `scripts/atlas/config.default.toml`
   - Definiert die kanonische Quelle `mesh_mappings.buckets` und `mesh_mappings.scene_regions` direkt im TOML.
   - Die `mesh_mappings`-Sektion beginnt bei `Line 45` und enthält Buckets und Scene-Regionen inkl. `known_gap`/`gap_reason` für Lückenfälle (`ifj`) (`Lines 45-165`).

2. `scripts/atlas/build-config.mjs`
   - Konstanten verankern den Generierungs-Output: `GENERATED_MESH_MAPPINGS = join(APP_SRC, 'viewer/meshMappings.generated.json')` (`Line 14`).
   - `buildConfig()` liest `config.default.toml`, validiert gegen Katalog, und liefert `{ config }` zurück (`Lines 604-610`).
   - `main()` schreibt `config.mesh_mappings` deterministisch formatiert in `meshMappings.generated.json` via `formatConfig(config.mesh_mappings)` (`Lines 616-617`).
   - `formatConfig` benutzt `sortedValue` mit sortierten Objekt-Keys (`Lines 586-590`).

3. `scripts/atlas/build-config.test.mjs`
   - Importliste enthält `readFileSync`, `buildConfig`, `formatConfig` etc. (`Lines 2-14`).
   - Bestehender Integrations-Test validiert, dass `buildConfig()` lauffähig ist und einzelne Werte enthält (`Lines 414-428`).
   - Es gibt aktuell **keinen** Test, der den serialisierten Output von `buildConfig().mesh_mappings` gegen `apps/brain-app/src/viewer/meshMappings.generated.json` vergleicht.

4. `apps/brain-app/src/viewer/meshMappings.generated.json`
   - Importierte Runtime-Artefaktdatei für Bucket-/Region-Mappings, inkl. `buckets` und `scene_regions`.
   - Wird zur Laufzeit als JSON-Modul geladen (`bucketMeshes.ts`, `regions.ts`).

5. `apps/brain-app/src/scene/regions.ts`
   - Lädt `meshMappings.generated.json` (`Line 8`) und exponiert `REGION_MAPPINGS` für `mesh_mappings.scene_regions` (`Line 10`).

6. `apps/brain-app/src/viewer/bucketMeshes.ts`
   - Lädt die gleiche generierte Datei (`Line 8`) und mappt `BUCKET_MAPPINGS` aus `meshMappings.generated.json` (`Line 10`).
   - `bucketToMeshes()` wirft nur zur Laufzeit bei unbekanntem Bucket bzw. bekannter Geometrie-Lücke (`Lines 21-35`), also kein Build-/CI-Guard gegen Desynchronisation.

## 2) Check: Existiert bereits ein deterministischer Vergleichstest?

Nein — aus dem vorhandenen Testbestand:

1. `scripts/atlas/build-config.test.mjs` liest `buildConfig()` und prüft einzelne inhaltliche Felder (`Lines 414-428`), aber keinen Abgleich der vollständigen Mapping-Struktur gegenüber der gespeicherten `meshMappings.generated.json`.
2. In diesem Testfile wird `meshMappings.generated.json` nicht importiert/geladen (`Lines 2-14` zeigen die Importe, die Datei ist dort nicht referenziert).

## 3) Minimaler Änderungsvorschlag (nur Test-Guard)

1. Ziel-Datei: `scripts/atlas/build-config.test.mjs`
2. Neue Assertion (konkret):
   - Testname: `buildConfig().mesh_mappings bleibt synchron mit der committeten generated-Datei`
   - Assertion-Form:
   ```ts
   const { config } = await buildConfig()
   const committed = readFileSync('apps/brain-app/src/viewer/meshMappings.generated.json', 'utf8')
   assert.equal(formatConfig(config.mesh_mappings), committed)
   ```
   - Optional robuster als direktes Objekt-DeepEqual, weil `formatConfig` bereits die stabile Sortierung der Serialisierung erzwingt.

3. Zusätzliche Guard-Tests, falls gewünscht:
   - `assert.equal(formatConfig(config.mesh_mappings), readFileSync(...))` + optional JSON-Parse + `assert.deepEqual(config.mesh_mappings, JSON.parse(committed))` falls gewünschte strukturelle Prüfung ohne Textvergleich.

## 4) Verifikationskommandos (Vorschlag)

1. `cd '/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app' && pnpm run atlas:build-config`
   - Erzeugt die aktuelle `apps/brain-app/src/viewer/meshMappings.generated.json`-Datei auf Basis von `config.default.toml`.
2. `cd '/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app' && pnpm test scripts/atlas/build-config.test.mjs`
   - Führt nur den Build-Config-Test aus (mit dem neuen Sync-Guard im Test).
3. `cd '/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app' && pnpm test`
   - Voller App-Testlauf inkl. vorhandener bestehenden Test-Suite.
4. `cd '/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app' && pnpm typecheck`
   - Stellt sicher, dass die neue Assertion/Typenlage sauber kompiliert.

## Post-Implementation Review

Verdikt: PASS

1. `scripts/atlas/build-config.test.mjs:50-52` und `scripts/atlas/build-config.test.mjs:415-429` binden den Test an das echte Runtime-Artefakt `apps/brain-app/src/viewer/meshMappings.generated.json` und vergleichen es direkt mit `formatConfig(config.mesh_mappings)` aus `await buildConfig()`. Damit wird Drift zwischen kanonischer TOML-Konfiguration und committeter Runtime-Datei hart erkannt.

2. `scripts/atlas/build-config.mjs:592-616` macht den Vergleich deterministisch: `formatConfig()` serialisiert rekursiv mit sortierten Objekt-Keys, und `main()` schreibt genau mit dieser Funktion nach `apps/brain-app/src/viewer/meshMappings.generated.json`. Der Test führt also keinen zweiten, manuell gepflegten Mapping-Bestand ein, sondern vergleicht die kanonische Quelle mit ihrem committeten Ableitungsartefakt.

3. `apps/brain-app/src/viewer/bucketMeshes.ts:4-10` und `apps/brain-app/src/scene/regions.ts:4-10` bestätigen, dass die Runtime genau diese generierte JSON-Datei konsumiert. Der Guard schützt damit die reale Importkante der App, nicht nur einen Build-Zwischenschritt.

4. Kein Blocker gefunden. Die Assertion beweist Sync, nicht inhaltliche Fachrichtigkeit der Mapping-Daten; für dieses Issue ist das die richtige Prüftiefe. Die älteren Abschnitte oben dokumentieren den Pre-Implementation-Zustand und sind durch dieses Review fachlich überholt.
