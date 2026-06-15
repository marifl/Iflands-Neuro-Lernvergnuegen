# Read-only mapping for fgrfRRxvkHyz — Config-Exporter-Roundtrip endet nicht im Builder

## Scope reviewed

1. `apps/brain-app/src/viewer/atlas/configExport.ts`
2. `apps/brain-app/src/viewer/atlas/configExport.test.ts`
3. `scripts/atlas/build-config.mjs`
4. `scripts/atlas/build-config.test.mjs` (nur zur Referenz der Validator-/Index-Nutzung)

## Q1) Was serialisiert der Exporter aktuell, und was testet der aktuelle Test?

Der Exporter schreibt nur das, was im Input gesetzt ist, und lässt leere Tabellen weg:

1. Er schreibt den Kopfblock und optionale Felder `title`, `section`, `replaces_figure`; `label_de` wird immer gesetzt.
   - [configExport.ts:39](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts#L39)
2. `pushTable(...)` schreibt je Unterblock nur, wenn mindestens ein Feld einen Wert hat (`present.length > 0`).
   - [configExport.ts:30](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts#L30)
3. `scopes` wird unabhängig von Ordnung als sortierte Tabelle serialisiert.
   - [configExport.ts:128](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts#L128)
4. `toCanonicalTomlConfiguration(...)` serialisiert exakt eine bestehende `file.configurations[name]` via `toTomlConfiguration(...)`.
   - [configExport.ts:138](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts#L138)

Aktuelle Tests prüfen nur Parsbarkeit/Struktur, nicht Builder-Validierung:

1. Reparse gibt erwartete Felder zurück (`label_de`, `scopes`, `view`, `camera`).
   - [configExport.test.ts:19](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L19)
2. Leere `view`/`camera` werden ggf. nicht serialisiert.
   - [configExport.test.ts:30](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L30)
3. „Exportiert alle SP5.1-Config-Felder“ testet nur, dass einzelne Werte nach `parse(...)` erhalten bleiben.
   - [configExport.test.ts:38](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L38)

## Q2) Minimaler Wrapper/Context für `validateConfig()` auf parsed Block

`validateConfig` ist im Builder definiert als:

- `validateConfig(config, idx, ctx = {})`
  - [build-config.mjs:541](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L541)

Sie verlangt mindestens die Root-Keys `preset, presets, mesh_mappings, configurations, presentation, learning` und ruft `assertRequiredKeys` und `validateConfigurationSchema`.

- [build-config.mjs:543-549](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L543)
- [build-config.mjs:377-387](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L377)

Minimaler, zweckgebundener Wrapper ist:

1. `configExport`-Block parsen, daraus eine einzelne Runtime-Config-Node gewinnen.
2. Einen gültigen bestehenden `AtlasConfigFile` laden (`public/assets/atlas-canonical/atlas-config.json` im existierenden Teststil) und nur die `configurations`-Map um den parsed Node ergänzen/ersetzen.
3. `indexCatalog(ontology)` aus `build-config.mjs` mit einem Katalog-Objekt.
4. `validateConfig(mergedConfig, idx)` aufrufen.

Hinweis: `loadValidationContext(...)` ist nicht exportiert, ist also nicht direkt importierbar:
- [build-config.mjs:345](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L345)

Wenn der parsed Node optionale Referenzen nutzt (z. B. `colors.preset`, `scene_regions`, Mesh-Bezug), muss zusätzlich ein minimaler `ctx` mit `bucketMappings`, `sceneRegionMappings`, `colorPresets`, `meshIds`, `sceneIds` etc. bereitgestellt werden.

## Q3) Reicht Test-only oder braucht Produktion Code?

Aus der aktuellen Logik: ohne zusätzliche Feld-Ergänzung im Export kann ein partieller Export nur schwerer im Builder bestehen, weil der Builder viele Pflichtfelder erzwingt.

- `validateConfigurationSchema` verlangt Pflichtfelder inkl. `title`, `section`, `view`, `camera`, `regions`, `colors`, `visibility`, `cuts`, `overlay`, `sequencing`, `scopes`.
  - [build-config.mjs:377-383](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L377)

Damit gilt:

1. Für einen echten End-to-End-Roundtrip-Guard auf Builder-Regeln ist ein zusätzlicher Test sinnvoll und empfohlen.
2. Wenn die Anforderung wirklich lautet: „jede exportierte Partialsicht muss sofort builder-konform sein“, dann ist eine Produktionsänderung im Exporter notwendig (Pflichtfelder/Defaults explizit mit ausgeben).

## Q4) Konkreter fokussierter Test (ohne zweite Schema-Wahrheit)

Vorgeschlagener Test nur im Scope der existierenden `validateConfig`-Schema-Logik:

1. Export in TOML serialisieren (z. B. vorhandenes SP5.1-Feld-Full-Fixture oder eine vollstaendige `toTomlConfiguration(...)`).
2. `parse(...)` des Blocks.
3. Katalog laden + `indexCatalog` aufrufen.
4. `fixture = readFileSync('public/assets/atlas-canonical/atlas-config.json', 'utf8')`.
5. `merged = { ...fixture, configurations: { ...fixture.configurations, ...parsed.configurations } }`.
6. `expect(() => validateConfig(merged, idx)).not.toThrow()`.

Das nutzt die echte Builder-Validierung als einziges Schema, keine parallelen Test- oder Dup-Schemata.

Verwendbare Importpfade je nach Dateiziel:

- `import { indexCatalog, validateConfig } from '../../../../scripts/atlas/build-config.mjs'`
- `import { parse } from 'smol-toml'`

## Q5) Risiko bei Cross-Runtime Import (`.mjs` aus TS-Vitest)

1. Projekt ist ESM (`"type": "module"`).
   - [apps/brain-app/package.json:5](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/package.json#L5)
2. Vitest nutzt Vite-Config mit ESM-Resolver; kein dedizierter `vite/node`-Transpile-Hack vorhanden, aber Standard-ESM-Pfade sind erlaubt.
   - [apps/brain-app/vite.config.ts:24](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/vite.config.ts#L24)
3. Risiko: `build-config.mjs` hängt intern an Pfaden im Repo-Root (z. B. `APP_ASSETS`, `APP_SRC`); bei direkten Importen von `indexCatalog/validateConfig` ist das sicher, weil keine Initialisierung über `buildConfig()` erfolgt.
   - [build-config.mjs:10-17](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L10)
   - [build-config.mjs:620-625](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L620)

Empfohlene minimale Auswirkungsgrenze:

1. Nur Test ergänzen, der parseten Export in echten `validateConfig`-Ablauf einspeist.
2. Keine neue Shadow-Schema-Definition in Tests.

## Post-Implementation Review

Verdikt: PASS

1. Der neue Roundtrip-Test delegiert die eigentliche Aussage an den echten Builder-Validator und baut kein zweites Test-Schema nach. `expectBuilderValid(...)` importiert im Node-ESM-Subprozess direkt `indexCatalog` und `validateConfig` aus `scripts/atlas/build-config.mjs`, und der Test übergibt den aus TOML zurückgeparsten Node genau an diese API. Evidenz: [apps/brain-app/src/viewer/atlas/configExport.test.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L11), [apps/brain-app/src/viewer/atlas/configExport.test.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L104), [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L20), [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L541).
2. Der minimale Root-Wrapper ist korrekt und notwendig, weil `validateConfig(...)` ausdrücklich die Root-Keys `preset`, `presets`, `mesh_mappings`, `configurations`, `presentation` und `learning` verlangt und `mesh_mappings` intern in den Validation-Context faltet. Der Test liefert genau diese Hülle und sonst nichts Zusätzliches. Evidenz: [apps/brain-app/src/viewer/atlas/configExport.test.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L131), [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L543), [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs#L553).
3. Der Subprozess-Ansatz ist hier pragmatisch vertretbar. Er umgeht die bereits belegten Vitest/Vite-Importprobleme, führt aber weiterhin das echte ESM-Modul aus. Restpunkt, aber kein Blocker fuer dieses Issue: der Pfad ist an den erwarteten Test-CWD `apps/brain-app` gekoppelt (`process.cwd() -> ../../scripts/...`). Das passt zum offiziellen App-Testentrypoint `pnpm run test`, ist aber nicht vollkommen launcher-unabhaengig. Evidenz: [apps/brain-app/src/viewer/atlas/configExport.test.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.test.ts#L12), [apps/brain-app/package.json](/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/brain-app-standalone/apps/brain-app/package.json#L12).
4. Frische Verifikation in diesem Review: `pnpm --dir apps/brain-app exec vitest run src/viewer/atlas/configExport.test.ts` war gruen mit `6/6` Tests, und `node --test scripts/atlas/build-config.test.mjs` war gruen mit `29/29` Tests.
