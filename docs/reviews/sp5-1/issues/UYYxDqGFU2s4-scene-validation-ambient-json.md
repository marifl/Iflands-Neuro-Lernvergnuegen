# [SP5.1] Scene-Validierung liest ambiente lokale JSONs

## Status

Read-only Mapping / Code-Mapping nur (keine Produktänderung).

## Scope

- `scripts/atlas/build-config.mjs`
- `scripts/atlas/build-config.test.mjs`
- `scripts/atlas/config.default.toml`
- `apps/brain-app/public/scenes/*.json`

## Code Mapping (Pfad, Symbol, Zeilen)

1. `loadScenesContext()` lädt **alle** Scene-Dateien aus `apps/brain-app/public/scenes`, filtert nur `*.json` plus `structure-coords.json` aus, parst jede Datei und extrahiert `id` (`scripts/atlas/build-config.mjs:313-323`).
2. `loadValidationContext(config)` ruft `loadScenesContext()` auf und injiziert `sceneIds` in den Validierungskontext (`scripts/atlas/build-config.mjs:326-338`).
3. `validateFigureFields(name, c, idx, ctx)` prüft `overlay.scene` nur bei Vorhandensein und schlägt nur bei fehlendem `ctx.sceneIds`-Treffer fehl (`build-config.mjs:437-493`).
4. Sequenz-Validierung in `validateSequence()` erzwingt für `learning`-Schritte das Vorhandensein eines `overlay.scene` pro Step, aber nicht die Exklusivität/Abgleich gegen verwendete Konfigurationsreferenzen (`build-config.mjs:508-520`).
5. `buildConfig()` führt `validateConfig(..., loadValidationContext(config))` aus, also gilt diese Szene-Validierung als Build-Zeit-Validierung (`build-config.mjs:604-610`).

## Scene-/Config-Mapping

- `config.default.toml` referenziert explicit `overlay.scene` für diese Configurationen:
  - `vcpt` (`config.default.toml:327`)
  - `p3a-konfliktmonitoring` (`config.default.toml:368`)
  - `go-nogo-intro` (`config.default.toml:400`)
  - `ica-uebersicht` (`config.default.toml:430`)
  - `p3b-engagement` (`config.default.toml:459`)
  - `p3z-inhibition` (`config.default.toml:492`)
  - `zusammenfassung` (`config.default.toml:522`)
- Scene-Dateien unter `public/scenes` mit `id`-Feld:
  - `go-nogo-intro.json` → `id: "go-nogo-intro"` (`apps/brain-app/public/scenes/go-nogo-intro.json:2`)
  - `ica-uebersicht.json` → `id: "ica-uebersicht"` (`apps/brain-app/public/scenes/ica-uebersicht.json:2`)
  - `p3a-konfliktmonitoring.json` → `id: "p3a-konfliktmonitoring"` (`apps/brain-app/public/scenes/p3a-konfliktmonitoring.json:2`)
  - `p3b-engagement.json` → `id: "p3b-engagement"` (`apps/brain-app/public/scenes/p3b-engagement.json:2`)
  - `p3z-inhibition.json` → `id: "p3z-inhibition"` (`apps/brain-app/public/scenes/p3z-inhibition.json:2`)
  - `vcpt.json` → `id: "vcpt"` (`apps/brain-app/public/scenes/vcpt.json:2`)
  - `zusammenfassung.json` → `id: "zusammenfassung"` (`apps/brain-app/public/scenes/zusammenfassung.json:2`)
- `structure-coords.json` wird beim Scan bewusst ignoriert (`loadScenesContext` Filter `name !== 'structure-coords.json'`).

## Findings zu Tests (read-only)

1. **Stray/unreferenzierte Scene-JSONs werden durch die aktuelle Testabdeckung nicht explizit verifiziert.**
   - In `build-config.test.mjs` gibt es keine Assertion, die zeigt, dass eine zusätzliche, lokal vorhandene Scene-Datei ohne Config-Referenz build-passend ignoriert wird.
   - Es existiert ein Integrations-Check gegen die reale Config (`buildConfig`), aber kein Negativ-/Drift-Test zu „Ambient JSON not referenced“ (`build-config.test.mjs:415-475`).

2. **`overlay.scene`-ID-Mismatch wird bereits getestet und schlägt fehl (fail-loud).**
   - Test `validateConfig wirft bei unbekannter Overlay-Szene oder Scene-Region` erwartet Fehler auf `overlay.scene "ghost"` (`build-config.test.mjs:379-384`).
   - Dieser Fehler kommt aus `validateFigureFields` + `sceneIds`-Membership-Prüfung (`build-config.mjs:491-493`).

## Minimaler Patch-Vorschlag (ohne zweite Scene-Wahrheit)

1. **Test ergänzen, dass ambient lokale Scene-Dateien ignoriert werden, solange sie nicht referenziert sind** (keine neue Registry):
   - In `scripts/atlas/build-config.test.mjs` temporär eine zusätzliche JSON-Datei in `apps/brain-app/public/scenes` mit neuem `id` anlegen, `buildConfig()` aufrufen, und auf Erfolgs-Exit prüfen; anschließend Dateireste entfernen.
   - Damit wird abgesichert, dass der Build nicht wegen unreferenzierter Scene-JSONs fehlschlägt.
2. **Optionaler Klarheits-Härtungs-Test:**
   - einen gezielten Regressionstest ergänzen, der sicherstellt, dass genau die referenzierten `overlay.scene`-IDs aus `config.default.toml` in der `sceneIds`-Menge auftauchen (und damit weiterhin `ghost` weiterhin failt).
3. **Kein produktives Zweit-Truth-File:**
   - Alle Vorschläge nutzen weiterhin `public/scenes/*.json` als alleinige Referenzquelle; nur Tests dokumentieren / sichern die aktuelle Semantik.

## Post-Implementation Review

### Findings

1. **Kein Blocker: `loadScenesContext()` liest nur noch referenzierte `overlay.scene`-Dateien und ignoriert stray JSONs im Verzeichnis.**
   - `referencedSceneIds(config)` leitet die Zielmenge ausschliesslich aus `config.configurations.*.overlay.scene` ab und dedupliziert sie (`scripts/atlas/build-config.mjs:313-320`).
   - `loadScenesContext(config, scenesRoot)` liest danach nur `${sceneId}.json` fuer diese abgeleiteten IDs; ein Directory-Scan findet nicht mehr statt (`scripts/atlas/build-config.mjs:322-342`).
   - Der neue Regressionstest legt neben `referenziert.json` absichtlich ein unreferenziertes `ambient.json` ohne `id` ab und erwartet trotzdem exakt `['referenziert']` als Ergebnis (`scripts/atlas/build-config.test.mjs:394-404`).

2. **Kein Blocker: fehlende oder kaputte referenzierte Dateien schlagen weiter laut fehl.**
   - Fehlende Datei wirft explizit `configuration overlay.scene "<id>" referenziert fehlende Szene <id>.json` (`scripts/atlas/build-config.mjs:327-330`).
   - Ungueltiges JSON wirft explizit `Szene <id>.json ist kein gueltiges JSON` (`scripts/atlas/build-config.mjs:332-337`).
   - Fehlende `id` und `id`-Mismatch werfen explizit (`scripts/atlas/build-config.mjs:338-339`).
   - Der neue Test deckt den `id`-Mismatch-Fall ueber ein temporaeres Verzeichnis ab (`scripts/atlas/build-config.test.mjs:406-417`).

3. **Kein Blocker: keine zweite Scene-Wahrheit eingefuehrt.**
   - `loadValidationContext(config)` bezieht `sceneIds` direkt aus `loadScenesContext(config)` und damit aus denselben `overlay.scene`-Referenzen, die auch spaeter validiert werden (`scripts/atlas/build-config.mjs:345-357`).
   - Die eigentliche Referenzpruefung bleibt eine Membership-Pruefung gegen diese abgeleitete Menge (`scripts/atlas/build-config.mjs:510-512`).
   - Es wurde kein separates Manifest, keine harte Allowlist und kein alternativer Scan-Pfad fuer Szenen eingefuehrt.

### Rest-Risiko

1. **Nicht-blockierend: Die neuen Tests sichern stray JSON und `id`-Mismatch ab, aber die Fail-Loud-Aeste fuer fehlende Datei, invalides JSON und fehlende `id` sind aktuell nur indirekt durch den Code, nicht durch eigene Regressionstests belegt** (`scripts/atlas/build-config.mjs:327-339`, `scripts/atlas/build-config.test.mjs:394-417`).

### Verifikation

1. `node --test scripts/atlas/build-config.test.mjs` -> 27/27 gruen.
2. `pnpm --dir apps/brain-app typecheck` -> Exit 0.
3. `git diff --check` -> Exit 0.

### Verdikt

Verdikt: PASS
