# SCzoov2mBCxF Code Mapping

## Betroffene Pfade
1. `apps/brain-app/src/scene/regions.ts:5-9` importiert `../viewer/meshMappings.generated.json`.
2. `apps/brain-app/src/viewer/bucketMeshes.ts:5-12` importiert `./meshMappings.generated.json`.
3. `scripts/atlas/build-config.mjs` erzeugt die Datei via `writeFileSync(GENERATED_MESH_MAPPINGS, ...)` in `main()` (`const GENERATED_MESH_MAPPINGS = join(APP_SRC, 'viewer/meshMappings.generated.json')`, Zeilen 14 und 14/606-610).
4. `apps/brain-app/package.json` definiert `typecheck`, `build`, `test`, aber keine `pretypecheck`, `prebuild` oder `pretest`-Hooks; diese Skripte rufen keinen Generator.
5. `.gitignore` (Root + `apps/brain-app`) enthält keinen Eintrag, der `meshMappings.generated.json` oder `*.generated.json` ignoriert.
6. `git status --short` zeigt `?? apps/brain-app/src/viewer/meshMappings.generated.json`; `git ls-files apps/brain-app/src/viewer/meshMappings.generated.json` liefert keine Ausgabe (nicht getrackt).

## Aktueller Clean-Checkout-Vertrag
1. Das App-SDK importiert das JSON zur Laufzeit-Kompilierung, aber die Datei ist im aktuellen Arbeitsbaum nicht versioniert.
2. Die bestehende Build- und Testkette in `apps/brain-app/package.json` kann den Import nicht liefern, weil der Generator nicht Teil der Skripte ist.
3. Ergebnis: In einem frischen Checkout ist `meshMappings.generated.json` nicht vorhanden; Modulauflösung für `bucketMeshes.ts` und `regions.ts` ist damit nicht deterministisch reproduzierbar.

## Artefakt-Luecke
1. Pfad `scripts/atlas/build-config.mjs` ist der einzige Writer für `meshMappings.generated.json` und läuft als CLI-Task (`node scripts/atlas/build-config.mjs`) außerhalb der App-Skripte.
2. Die Datei ist weder durch `.gitignore` geschuetzt noch als Git-Tracking gesichert.
3. SP5-Reviews, die denselben Befund bestätigen:
   - `docs/reviews/sp5-1/SP5.1.2-builder-validation-review.md` (High, App-import ohne Builder in App-`build/typecheck/test`).
   - `docs/reviews/sp5-1/SP5.1.4-region-bucket-mapping-review.md` (High, `meshMappings.generated.json` ungetrackt).
   - `docs/reviews/sp5.1.7-config-generated-smokes-review.md` (High, Typecheck/Vitest laufen nur wegen lokal vorhandener Datei).

## Minimaler Implementierungspfad
1. Option A – **Tracken** (schnell, niedrigster Immediate-Invasionsgrad): `apps/brain-app/src/viewer/meshMappings.generated.json` committen.
   - Risiko: Drift bei zukünftigen Änderungen an `scripts/atlas/config.default.toml`, weil manuelle Aktualisierung/Review nötig bleibt.
   - Erkennung: CI kann trotz Versionskontrolle nicht automatisch drifflimitieren.
2. Option B – **pre-script generieren** (drift-sicherer): `prebuild`, `pretypecheck`, `pretest` in `apps/brain-app/package.json` auf `node ../../scripts/atlas/build-config.mjs` setzen.
   - Risiko: Skripte schreiben deterministisch `atlas-config.json` + `meshMappings.generated.json` in Repo-Workspace; in CI kann Working-Tree-Dirty entstehen, wenn keine saubere Prüfung folgt.
3. Chirurgische Empfehlung: **Option B (pre-script)**, da sie den Zustand bei jedem App-Lauf reproduzierbar macht und Abhängigkeit nicht auf vergessene lokale Artefakte verschiebt.
4. Zusätzliche Absicherung: einmalig prüfen, dass `meshMappings.generated.json` exakt `buildConfig().mesh_mappings` entspricht (z. B. in einem kleinen CI-Check), damit Generierungs-/Runtime-Sync formal gesichert ist.

## Verifikationsvorschlag
1. Sauberer Checkout-Check: `git status --short` vor/ nach `node scripts/atlas/build-config.mjs` auf Root.
2. Laufzeitimport-Check: ohne vorhandene Generierungsdatei führt `pnpm --dir apps/brain-app typecheck` zu einem reproduzierbaren Fehler; nach Generator-Durchlauf müssen beide App-Imports aufgelöst werden.
3. Drift-Check: `node scripts/atlas/build-config.mjs`; anschließend diff gegen `apps/brain-app/src/viewer/meshMappings.generated.json` und `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`.
4. CI-Simulation: `pnpm --dir apps/brain-app typecheck && pnpm --dir apps/brain-app test` in einem frischen Temp-Checkout.

## Kritischer Review nach Implementierung

### Findings

#### Medium
1. `README.md:172-179` bewirbt fuer Einmal-Ausfuehrungen weiterhin `pnpm exec vitest run`. Dieser Pfad umgeht den neuen Vorab-Generator in `apps/brain-app/package.json:12` und ist damit im frischen Checkout weiterhin nicht geschlossen. Reproduktion: `apps/brain-app/src/viewer/meshMappings.generated.json` in einem sauberen Checkout fehlt, dann `pnpm --dir apps/brain-app exec vitest run src/scene/brainBridge.test.ts src/viewer/atlas/atlasConfig.test.ts` ausfuehren; anders als `pnpm --dir apps/brain-app test --run ...` startet dabei kein `atlas:build-config`, sodass die JSON-Imports aus `apps/brain-app/src/scene/regions.ts:8` und `apps/brain-app/src/viewer/bucketMeshes.ts:8` weiter von einem lokalen Artefakt abhaengen.

#### Low
1. `meshMappings.generated.json` ist jetzt funktional kein Source-of-Truth-Problem mehr, bleibt aber ein unignored generated file. `scripts/atlas/build-config.mjs:14,605-606` schreibt die Datei nach `apps/brain-app/src/viewer/meshMappings.generated.json`, und `git status --short -- apps/brain-app/src/viewer/meshMappings.generated.json` zeigt weiterhin `??`. Das ist fuer die Laufzeit dank deterministischer Generierung akzeptabel, hinterlaesst aber nach jedem Scriptlauf einen dauerhaft schmutzigen Worktree und erhoeht das Risiko versehentlichen Stagings.

### Testbewertung
1. Der Clean-Checkout-Pfad fuer die App-Skripte `dev`, `build`, `typecheck` und `test` ist im Code selbst sauber verdrahtet: `apps/brain-app/package.json:7-12` fuehrt den Builder jeweils vor Vite, `tsc` und Vitest aus.
2. `scripts/atlas/config.default.toml` bleibt die einzige Autorenquelle. `scripts/atlas/build-config.mjs:593-606` laedt genau diese TOML-Datei, validiert sie und schreibt daraus sowohl `atlas-config.json` als auch `meshMappings.generated.json`; damit gibt es keine zweite editierbare Wahrheit, sondern nur zwei Projektionen derselben In-Memory-Config.
3. `test:e2e` ist konzeptionell mit abgedeckt: `apps/brain-app/playwright.config.ts:21-25` startet den Webserver ueber `pnpm dev --port 5174 --host 127.0.0.1`, und `dev` enthaelt den Vorab-Builder. Es fehlt in der vorliegenden Evidenz aber ein frischer gruener `pnpm --dir apps/brain-app test:e2e`-Lauf; die Absicherung ist hier also Konfigurations- statt Laufzeitevidenz.
4. Die vom Hauptagenten gemeldeten Verifikationen fuer `node --test scripts/atlas/build-config.test.mjs`, `pnpm --dir apps/brain-app test --run ...`, `pnpm --dir apps/brain-app typecheck` nach geloeschter JSON und `pnpm --dir apps/brain-app build` sind fuer den Issue-Kern stark und sprechen dafuer, dass die Hauptpfade reproduzierbar geschlossen wurden.

### Verifikationseinschaetzung
1. Frage 1: Fuer die offiziell verdrahteten App-Skripte ja, fuer den in `README.md` weiterhin empfohlenen direkten `pnpm exec vitest run`-Pfad nein.
2. Frage 2: Ja. `scripts/atlas/config.default.toml` bleibt Source of Truth; die beiden JSON-Dateien sind reine Ableitungen derselben Builder-Ausfuehrung.
3. Frage 3: Als Wiring nein, als frische Testevidenz ja. Playwright ist korrekt angehaengt, aber nicht neu gruengemeldet.
4. Frage 4: Ja, mit Restvorbehalt. Der ungetrackte Status ist fachlich vertretbar, weil die Datei deterministisch aus der TOML erzeugt wird und die App-Skripte sie vor Nutzung materialisieren; operativ bleibt der Worktree dadurch aber noisy.

### Finaler Status
fail

## Nachreview

### Findings

Keine neuen Findings im Issue-Scope.

### Bewertung des frueheren README-Blockers
1. Der fruehere Medium-Befund ist geschlossen. `README.md:172-179` beschreibt jetzt `pnpm build` und `pnpm typecheck` explizit mit vorangestellter Atlas-Config-Erzeugung und empfiehlt fuer Einmal-Laeufe `pnpm test --run` statt `pnpm exec vitest run`; damit verweist die Doku nicht mehr auf einen Generator-umgehenden Testpfad.
2. Die Skriptverdrahtung bleibt korrekt: `apps/brain-app/package.json:7-12` fuehrt `atlas:build-config` weiterhin vor `dev`, `build`, `typecheck` und `test` aus.
3. Die frische Verifikation deckt den Clean-Checkout-Pfad fuer den Issue-Kern erneut ab: geloeschtes `apps/brain-app/src/viewer/meshMappings.generated.json` wurde durch `pnpm --dir apps/brain-app typecheck` deterministisch regeneriert; zusaetzlich sind `node --test scripts/atlas/build-config.test.mjs`, `pnpm --dir apps/brain-app test --run src/scene/brainBridge.test.ts src/viewer/atlas/atlasConfig.test.ts`, `pnpm --dir apps/brain-app build` und `git diff --check` laut vorliegender Evidenz gruen.
4. Der bereits bekannte ungetrackte/generated Status von `meshMappings.generated.json` bleibt als operative Restbeobachtung bestehen, ist fuer dieses Issue aber akzeptabel, weil `scripts/atlas/build-config.mjs:593-606` die Datei deterministisch aus `scripts/atlas/config.default.toml` ableitet und die relevanten App-Skripte sie vor Nutzung materialisieren.

### Finaler Status Nachreview
pass

## Zweiter Nachreview

### Findings

Keine neuen Findings im Issue-Scope.

### Bewertung des frueheren Low-Hinweises
1. Der fruehere Low-Hinweis ist geschlossen. `.gitignore:58` ignoriert jetzt explizit `apps/brain-app/src/viewer/meshMappings.generated.json`, und `git check-ignore -v apps/brain-app/src/viewer/meshMappings.generated.json` bestaetigt genau diesen Eintrag.
2. Der Worktree-Restbefund ist damit entfallen: `git status --short -- apps/brain-app/src/viewer/meshMappings.generated.json` liefert keine Ausgabe mehr, obwohl die Datei weiterhin generated und untracked bleibt.
3. Die Clean-Checkout-Eigenschaft bleibt erhalten. Laut vorliegender frischer Evidenz wird ein geloeschtes `apps/brain-app/src/viewer/meshMappings.generated.json` durch `pnpm --dir apps/brain-app typecheck` deterministisch und nun ignored regeneriert; `git diff --check` bleibt dabei gruen.
4. Die Source-of-Truth-Lage bleibt korrekt unveraendert: `scripts/atlas/build-config.mjs:593-606` leitet `meshMappings.generated.json` weiterhin aus `scripts/atlas/config.default.toml` ab. Das Ignorieren aendert nicht die Autoritaet der TOML-Datei und fuehrt keine zweite Wahrheit ein.

### Finaler Status Zweiter Nachreview
pass
