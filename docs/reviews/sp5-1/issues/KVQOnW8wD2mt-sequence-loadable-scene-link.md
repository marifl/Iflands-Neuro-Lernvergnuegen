# KVQOnW8wD2mt — Sequence Loadable Scene Link Code Map

## Betroffene Pfade

1. Build-Pfad
   1. `scripts/atlas/build-config.mjs`
      - Sequenzvalidierung in `validateConfig()` und `validateConfigurationSchema()`.
      - Overlay-Validierung in `validateFigureFields()` (`overlay.scene` optional, nur auf Existenz geprüft wenn gesetzt).
      - Kontext für `overlay.scene` aus `loadScenesContext()` via Verzeichnis-Scan von `apps/brain-app/public/scenes/*.json`.
   2. `scripts/atlas/config.default.toml`
      - Reale Sequenzen: `presentation.kapitel11-vorlesung`, `learning.kapitel11-pfad`.
      - Sequenz-Steps: in `learning` 7 Steps, in `presentation` 4 Steps.
      - Konfigurationen `broca-areal`, `basalganglienschleifen`, `ofc-phineas` haben kein `overlay.scene`.
   3. `scripts/atlas/build-config.test.mjs`
      - Tests zu Tot-Referenzen in Sequenzen, unbekanntem `sequencing.step`-Typ, und unbekannter `overlay.scene`-Referenz.
      - Kein Test für „Sequence-Step ist ladbar (overlay.scene muss vorhanden sein)“.
2. Runtime-Pfad
   1. `apps/brain-app/src/scene/scenes.ts`
      - `loadScenes()` + `DEFAULT_SEQUENCE_KIND = 'learning'`, `DEFAULT_SEQUENCE_NAME = 'kapitel11-pfad'`.
      - `sequenceMap()` prüft Struktur von `learning`/`presentation`.
      - `sceneForStep()` verlangt `configuration` + `overlay.scene`.
      - `scenesForSequence()` prüft doppelte Steps und doppelte Scene-IDs.
      - `loadScene()` prüft zusätzlich `scene.id` gegen Dateinamen-ID.
   2. `apps/brain-app/src/scene/scenes.test.ts`
      - Abbildung der Laufzeit-Invarianten (`fehlender Step`, `fehlendes overlay.scene`, doppelte Steps/Scenes, falsche Scene-ID).

## Runtime-Kontrakt

1. Sequenzladung ist zur Laufzeit strikt:
   1. `loadScenes()` lädt zuerst `atlas-config.json`.
   2. Es wählt Sequenz über `sequenceKind/sequenceName` oder Default `learning.kapitel11-pfad`.
   3. Für jeden Step ruft `scenesForSequence()` → `sceneForStep()`:
      - Step muss als Key in `configurations` vorhanden sein.
      - zugehörige Config muss `overlay.scene` haben.
      - der geladene Scene-Name muss für jeden Step eindeutig sein.
   4. Jede Scene-Datei wird via `/scenes/<id>.json` geladen und validiert (`SceneSchema.parse`) und muss `scene.id === id` liefern.
2. `sceneIndexForLocation()` ergänzt die Navigationsebene, ist aber nicht ursächlich für die Build-Gültigkeit der Sequenz.

## Aktuelle Build-Luecke

1. Build-Zielprüfung für Sequenzen ist unvollständig:
   1. `configuration.sequencing.presentation|learning|step` wird nur als optionale Strings geprüft (`assertOptionalString`) und auf bekannte Schlüssel begrenzt.
   2. Es gibt keine Cross-Checks:
      - auf Existenz der referenzierten Sequenzen in `configuration.sequencing.*`.
      - darauf, dass ein sequenzieller Step ein ladbares `overlay.scene` enthält.
   3. `overlay.scene` ist optional; wird nur auf Existenz im Scene-Katalog geprüft, falls gesetzt.
2. Konkrete Lücke laut Repo-Stand:
   1. In `config.default.toml` sind zwei Sequenz-Steps (`basalganglienschleifen`, `broca-areal`) in `presentation.kapitel11-vorlesung` ohne `overlay.scene`.
   2. Build akzeptiert diese Konfiguration, Runtime bricht erst später in `sceneForStep()`.
3. Cross-Check aus Reviews:
   1. `SP5.1.1` bestätigt dieselbe Lücke bei Sequenz-/Schema-Lautheit.
   2. `SP5.1.2` bewertet dies als High-Risiko, weil ungültiges Runtime-JSON erzeugt wird.

## Minimaler Implementierungspfad

1. Build-seitigen Guard ergänzen in `validateFigureFields()`/`validateConfig()`:
   1. Für jeden durch Sequenzen referenzierten Step prüfen, dass `configurations[step].overlay.scene` existiert.
   2. Optional: prüfen, dass `overlay.scene` leer nur dann erlaubt ist, wenn der Step explizit non-szenisch ausgeflaggt ist.
2. Optionaler Non-Scene-Mechanismus:
   1. Falls non-szenische Steps gewünscht: neues explizites Flag in `sequencing`/`overlay` einführen (z. B. `overlay.kind` + neuer Modus), damit Build und Runtime denselben Intent sehen.
3. Sequenz-Referenzen verbessern:
   1. Validieren, dass `configuration.sequencing.presentation`/`configuration.sequencing.learning` auf existierende Sequenz-Namen zeigen.
   2. Validieren, dass `configuration.sequencing.step` in entsprechender Sequenz vorkommt (oder klar definiert, dass es nur Metadata ist).

## Verifikationsvorschlag

1. Build-Validierung erweitern und Testen:
   1. `scripts/atlas/build-config.test.mjs`: neuer Test, der Konfigurations-Objekt mit Sequenz auf `overlay.scene`-Pflicht prüft.
   2. Test, der `configuration.sequencing.*` auf unbekannte Sequenznamen failen lässt.
2. Runtime-Regressionstest bleibt sinnvoll:
   1. `apps/brain-app/src/scene/scenes.test.ts` mit einem Beispiel-Config-Datensatz, der nur die nicht-szenische Sequenz enthält, bleibt aufbaugleich grün/rot wie gewünscht.
3. CI-Schnellprüfung gegen Issue-Ziel:
   1. `pnpm typecheck`
   2. `pnpm test`
   3. `node --test scripts/atlas/build-config.test.mjs`
   4. `pnpm --dir apps/brain-app exec vitest run src/scene/scenes.test.ts`

## Kritischer Review nach Implementierung

Review-Status: `pass`

Keine Blocker gefunden.

### Findings nach Severity

#### Critical

Keine.

#### High

Keine.

#### Medium

1. `presentation` ist build-seitig jetzt bewusst nicht scene-pflichtig, aber der generische Runtime-Loader behandelt `presentation` weiterhin wie eine ladbare Scene-Sequenz.
   - Build: `validateSequence(..., { requiresScene: seqKind === 'learning' })` in `scripts/atlas/build-config.mjs:498-571` erlaubt fuer `presentation` weiterhin Steps ohne `overlay.scene`.
   - Runtime: `loadScenes()` akzeptiert `sequenceKind?: 'learning' | 'presentation'`, und `sceneForStep()` wirft fuer jeden Step ohne `overlay.scene` laut in `apps/brain-app/src/scene/scenes.ts:44-49`; `scenesForSequence()` macht dabei keinen Sonderfall fuer `presentation` (`apps/brain-app/src/scene/scenes.ts:52-63`).
   - Reale Config: `presentation.kapitel11-vorlesung` enthaelt mit `basalganglienschleifen` und `broca-areal` weiterhin zwei non-szenische Steps (`scripts/atlas/config.default.toml:195-200`, `288-293`, `530-532`).
   - Impact: Der aktuelle App-Pfad ist nicht gebrochen, weil `LearnSidebar` nur den Default `learning.kapitel11-pfad` laedt. Die API-/Vertragslage bleibt aber inkonsistent: `loadScenes({ sequenceKind: 'presentation', sequenceName: 'kapitel11-vorlesung' })` ist weiterhin deterministisch runtime-failend. Fuer den vorliegenden Fix ist das kein Blocker, aber die Implementierung hat den Vertrag auf "nur learning ist loadable" verengt, ohne dass `scenes.ts` diesen engeren Vertrag selbst ausdrueckt oder testet.

#### Low

1. Die neuen `configuration.sequencing.*`-Cross-Checks verhindern tote Referenzen, pruefen aber weiterhin nicht die semantische Mitgliedschaft der realen Config.
   - `validateSequencingRefs()` prueft nur, ob referenzierte Sequenz-/Config-Namen existieren (`scripts/atlas/build-config.mjs:486-495`).
   - Die reale `config.default.toml` enthaelt weiterhin inkonsistente Claims, z. B. `broca-areal.learning = "kapitel11-pfad"`, obwohl `broca-areal` nicht in `learning.kapitel11-pfad` vorkommt; ebenso `ofc-phineas` fuer `presentation` und `learning`, sowie `basalganglienschleifen.learning` (`scripts/atlas/config.default.toml:197-200`, `235-238`, `290-293`, `530-544`).
   - Impact: Fuer den aktuellen Issue-Scope ist das unkritisch, weil `sequencing.*` heute nicht im Runtime-Link-Ladepfad konsumiert wird. Als Integritaets-Check sind die Cross-Checks damit aber bewusst nur "existence-only" und nicht "membership-correct".

### Testbewertung

1. Die neuen Build-Tests sind keine reine Regex-Kulisse. Sie pruefen gezielt negative Faelle fuer unbekannte `sequencing.*`-Referenzen und fuer fehlendes `overlay.scene` auf `learning`-Sequenzen und halten gleichzeitig fest, dass `presentation` ohne Scene weiter erlaubt bleibt (`scripts/atlas/build-config.test.mjs:149-178`).
2. Die Runtime-Tests in `apps/brain-app/src/scene/scenes.test.ts:89-142` bleiben wertvoll, weil sie die fail-loud-Invarianten fuer fehlende Config, fehlendes `overlay.scene`, doppelte Steps, doppelte Scene-IDs und Scene-ID-Mismatch direkt gegen `loadScenes()` absichern.
3. Es fehlt aber weiterhin ein expliziter Test, der den jetzt impliziten Architekturentscheid festschreibt: entweder `presentation` ist absichtlich nicht ueber `loadScenes()` supportet, oder `presentation` muss ebenfalls build-seitig scene-loadable werden.

### Frische Verifikation

1. `node --test scripts/atlas/build-config.test.mjs` -> 25/25 gruen.
2. `cd apps/brain-app && pnpm exec vitest run src/scene/scenes.test.ts src/viewer/atlas/atlasConfig.test.ts` -> 27/27 gruen.
3. `cd apps/brain-app && pnpm typecheck` -> Exit 0.
4. `git diff --check` -> Exit 0.

### Nachreview nach Runtime-Grenze

Review-Status: `pass`

1. Der vorherige `Medium`-Punkt ist im aktuellen Slice geloest.
   - `loadScenes()` akzeptiert typseitig nur noch `learning`, weil `SequenceKind` auf `learning` verengt wurde (`apps/brain-app/src/scene/scenes.ts:9-13`).
   - Die Runtime-Grenze ist jetzt explizit fail-loud formuliert: `sequenceMap()` wirft fuer nicht-ladbare Arten `scenes: Sequenz-Art "<kind>" ist nicht scene-ladbar` (`apps/brain-app/src/scene/scenes.ts:30-37`).
   - Der neue Test `lehnt presentation-Sequenzen als Scene-Quelle laut ab` trifft genau diese Kante mit einem bewusst typ-unsafe Aufruf und belegt, dass der Guard nicht nur nominell im Typsystem existiert (`apps/brain-app/src/scene/scenes.test.ts:108-120`).
   - Damit ist der Build-/Runtime-Vertrag jetzt konsistent genug fuer den Issue-Scope: `presentation` darf in `config.default.toml` non-szenisch bleiben, ist aber keine zulaessige Quelle fuer `loadScenes()`.

2. Der vorherige `Low`-Punkt bleibt ein Rest-Risiko, aber kein Blocker.
   - `validateSequencingRefs()` prueft weiterhin nur Existenz von `sequencing.presentation`, `sequencing.learning` und `sequencing.step`, nicht die reale Mitgliedschaft in der referenzierten Sequenz (`scripts/atlas/build-config.mjs:486-495`).
   - Die reale `config.default.toml` enthaelt diese Inkonsistenzen weiterhin, z. B. `broca-areal.learning = "kapitel11-pfad"`, obwohl `broca-areal` dort nicht in `steps` steht; Gleiches gilt fuer `ofc-phineas` und `basalganglienschleifen`.
   - Das ist nach dem Runtime-Nachfix weiterhin kein akuter Laufzeitfehler im geprueften Pfad, weil `loadScenes()` nur `learning` laedt und dabei ausschliesslich die Sequenzliste konsumiert, nicht die rueckwaertigen `configuration.sequencing.*`-Claims. Es bleibt aber Integritaetsrauschen in der Autorenkonfiguration.

3. Testbewertung nach dem Nachfix:
   - Der neue Runtime-Test ist ausreichend stark und keine Regex-Scheinabsicherung: er baut eine konkrete Config, ruft `loadScenes()` real auf und asserted den expliziten Fehlertext des Guards.
   - Die Build-Validierung bleibt unveraendert konsistent mit dem Architekturentscheid: `learning` braucht `overlay.scene`, `presentation` darf non-szenisch sein (`scripts/atlas/build-config.mjs:498-571`).

4. Frisch verifiziert:
   - `node --test scripts/atlas/build-config.test.mjs` -> 25/25 gruen.
   - `cd apps/brain-app && pnpm exec vitest run src/scene/scenes.test.ts src/viewer/atlas/atlasConfig.test.ts` -> 28/28 gruen.
   - `cd apps/brain-app && pnpm typecheck` -> Exit 0.
   - `git diff --check` -> Exit 0.
