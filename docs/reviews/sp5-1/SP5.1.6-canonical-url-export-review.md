# Scope

Review von SP5.1.6: `[SP5.1.6] Canonical URL-/Export-Pfad für Darstellungen bauen`.

Geprüft wurden die fokussierten Dateien `apps/brain-app/src/scene/router.ts`, `apps/brain-app/src/scene/router.test.ts`, `apps/brain-app/src/main.tsx`, `apps/brain-app/src/scene/LearnSidebar.tsx`, `apps/brain-app/src/viewer/atlas/configExport.ts`, `apps/brain-app/src/viewer/atlas/configExport.test.ts`, `docs/SP5_1_CANONICAL_LINKS.md`, `scripts/atlas/config.default.toml` plus die direkt beteiligten Runtime-Pfade `atlasConfig.ts`, `CameraRig.tsx`, `BodyParts3DViewer.tsx`, `StructureTree.tsx`, `scenes.ts` und `viewerStore.ts`.

# Findings

## Critical: `?config=`-Links rekonstruieren die Darstellung nicht

`docs/SP5_1_CANONICAL_LINKS.md:9` definiert `?config=<configuration-id>` als Figure-/Config-Link, und das Beispiel `docs/SP5_1_CANONICAL_LINKS.md:17-18` verspricht `?config=basalganglienschleifen` als kanonische Abb.-11-04-Darstellung. Die Runtime schaltet bei `?config` aber nur in den Explorer-Modus (`apps/brain-app/src/main.tsx:22-25`); dort rendert `BodyParts3DViewer` die normale `StructureTree`-Sidebar statt einer config-gesteuerten Szene (`apps/brain-app/src/viewer/BodyParts3DViewer.tsx:605-610`). `StructureTree` liest keine `useEffectiveConfig`-Daten und bietet nur manuelle Baum-/Overlay-Kontrollen (`apps/brain-app/src/viewer/StructureTree.tsx:215-232`).

Damit werden die nicht-default Felder der Config nicht in den sichtbaren Zustand angewendet. Gerade `basalganglienschleifen` deklariert Kamera, Regionen, Farb-Preset, Overlay und Sichtbarkeit (`scripts/atlas/config.default.toml:242-289`), aber der einzige Runtime-Consumer von `useEffectiveConfig` ist `CameraRig`, und der liest daraus nur `camera` (`apps/brain-app/src/scene/CameraRig.tsx:31-38`). Selbst diese Kamera wird nur gesetzt, wenn bereits ein Highlight existiert (`apps/brain-app/src/scene/CameraRig.tsx:62-69`); ein reiner Explorer-Start über `?config=` setzt aber kein Highlight. Ergebnis: Der dokumentierte kanonische Config-Link landet in einer Explorer-Shell und rekonstruiert weder Regionen noch Farben noch Overlay noch Schnitte noch verlässlich die Kamera.

## High: `localStorage` kann kanonische `?config=`-Scopes weiterhin überschreiben

`computeEffectiveConfig` macht `?config=` zwar zur aktiven Configuration (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:157-163`), merged danach aber weiterhin persistierte `local.scopes` über die Datei-Scopes (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:165-168`). Die Merge-Funktion ist ausdrücklich `file < localStorage < url` (`apps/brain-app/src/viewer/atlas/atlasConfig.ts:76-78`), und bestehende Tests fixieren dieses Verhalten sogar als Erwartung (`apps/brain-app/src/viewer/atlas/atlasConfig.test.ts:38-47`).

Damit ist ein Link wie `?config=p3a-konfliktmonitoring` nicht autoritativ: ein alter `atlas-config-overrides`-Eintrag kann z. B. `area:dkt:rostralanteriorcingulate:l = false` speichern und die von der Configuration gesetzte Region ausblenden. Das verletzt die Acceptance, weil die kanonische Repräsentation nicht allein aus Query + Runtime-Config rekonstruierbar ist; lokaler UI-State verändert sie weiterhin.

## High: `config`/`scene`-Mismatches werden nicht validiert und können Hybrid-Zustände erzeugen

Der Router parst `config` und `scene` separat (`apps/brain-app/src/scene/router.ts:7-12`), aber `LearnSidebar` nutzt beim Start nur `sceneId` zur Szenenauswahl (`apps/brain-app/src/scene/LearnSidebar.tsx:24-31`). Gleichzeitig bevorzugt `CameraRig` bei vorhandener URL-Config die `effectiveConfig.camera` gegenüber der zur geladenen Szene gehörenden `sceneCameraConfig` (`apps/brain-app/src/scene/CameraRig.tsx:36-38`).

Ein Link wie `?config=vcpt&scene=p3a-konfliktmonitoring&step=0` kann deshalb P3a-Overlay und P3a-Highlight aus der Szene laden (`apps/brain-app/src/scene/LearnSidebar.tsx:35-40`), aber die Kamera aus der VCPT-Config nehmen. Danach ersetzt `LearnSidebar` die URL still mit der Scene-eigenen Config (`apps/brain-app/src/scene/LearnSidebar.tsx:54-56`), ohne den ursprünglichen Mismatch als Fehler zu behandeln. Das ist für kanonische Links gefährlich, weil ein fehlerhafter Link nicht laut scheitert, sondern je nach Effekt-Timing einen gemischten Zustand anzeigen kann.

## Medium: `step` wird beim URL-Rewrite immer auf `0` zurückgesetzt

`parseLocation` liest `step` aus der URL (`apps/brain-app/src/scene/router.ts:7-12`), und `LearnSidebar` übergibt ihn initial an `goto` (`apps/brain-app/src/scene/LearnSidebar.tsx:28-30`). Beim kanonischen Rewrite wird aber immer `step: 0` geschrieben (`apps/brain-app/src/scene/LearnSidebar.tsx:54-56`), statt den aktuellen `sceneStore.step` zu serialisieren. `toCanonicalQuery` unterstützt explizit nicht-null Steps (`apps/brain-app/src/scene/router.ts:29-32`), aber der UI-Pfad verliert jeden nicht-default Step beim ersten Szenen-Effekt.

Für aktuelle Ein-Schritt-Szenen ist das vermutlich noch nicht sichtbar. Sobald mehrstufige Szenen oder nicht-default Steps wirklich genutzt werden, ist `?scene=<id>&step=<n>` nicht mehr roundtrip-fähig, weil die URL selbst auf `step=0` normalisiert wird.

# Evidence Inspected

1. Uncommitted Worktree-Diff und Status für die fokussierten Dateien sowie angrenzende Runtime-Dateien.
2. `apps/brain-app/src/scene/router.ts` und `router.test.ts`: Query-Parsing, Canonical-Query-Serialisierung, Roundtrip-Tests.
3. `apps/brain-app/src/main.tsx`, `BodyParts3DViewer.tsx`, `StructureTree.tsx`, `LearnSidebar.tsx`: Startmodus, Shell-Auswahl, Szenenstart, URL-Rewrite.
4. `apps/brain-app/src/viewer/atlas/atlasConfig.ts` und `atlasConfig.test.ts`: Config/localStorage/URL-Merge und Effektiv-Config.
5. `apps/brain-app/src/scene/CameraRig.tsx`, `scenes.ts`, `sceneStore.ts`: Kamera-Priorität, Config-zu-Szene-Brücke.
6. `apps/brain-app/src/viewer/atlas/configExport.ts` und `configExport.test.ts`: TOML-Export deckt die SP5.1-Felder ab und liest bei `toCanonicalTomlConfiguration` aus der übergebenen Runtime-Config, nicht aus `localStorage`.
7. `docs/SP5_1_CANONICAL_LINKS.md` und `scripts/atlas/config.default.toml`: dokumentierte Linkformen und deklarierte nicht-default Felder der Beispiel-Configs.

# Verification Run

```bash
cd /Users/marcusifland/CFH_REAL_LOCAL/SEM\ 4\ LOCAL/brain-app-standalone/apps/brain-app
pnpm exec vitest run src/scene/router.test.ts src/viewer/atlas/configExport.test.ts src/viewer/atlas/atlasConfig.test.ts src/scene/scenes.test.ts src/scene/cameraResolve.test.ts
```

Ergebnis: 5 Test Files passed, 38 Tests passed.

# Residual Risk

Kein Browser-Smoke ausgeführt. Die Unit-Tests decken Router, Export, Config-Merge, Scene-Loading und Kamera-Resolver ab, aber nicht den tatsächlichen Browser-Start über `?config=`/`?scene=` und nicht die sichtbare Rekonstruktion von Farben, Overlays, Schnitten oder lokal persistierten Overrides.
