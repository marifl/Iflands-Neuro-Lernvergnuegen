# SP5.1.3 Review — Config-Sequenzen für Lern-Szenen

Reviewer: `skeptic_reviewer` subagent `019ecb31-50cb-7662-82f8-560b38389d88`

Scope: `[SP5.1.3] Lern-Szenen aus Config-Sequenzen laden`

## Findings

1. High — Canonical Link-Shape ist nicht wirklich autoritativ und der
   Legacy-Deep-Link-`step` wird beim Mount überschrieben

   `parseLocation()` liest `scene` und `config` in
   `apps/brain-app/src/scene/router.ts`, aber `LearnSidebar` bestimmt die
   Initialszene nur aus `sceneId` und schreibt nach `loadScenes()` immer mit
   `step: 0` zurück.

   Repro aus dem Code: `?scene=vcpt&step=2` wird nach dem Laden zu
   `?config=vcpt&scene=vcpt&step=0`. Das verletzt die Akzeptanzanforderung,
   dass `?scene=`-Deep-Links stabil bleiben. Außerdem disambiguiert der
   emittierte `config=`-Parameter noch nichts.

2. Medium — Loader ist weiterhin scene-ID-zentriert statt config-step-zentriert

   `loadScenes()` verwirft zwei Sequenzschritte, die auf dieselbe
   `overlay.scene` zeigen, und die Tests fixieren dieses Verhalten. Für eine
   config-getriebene Sequenz sollte Eindeutigkeit am Config-Step hängen, nicht
   an der Scene-Datei. Sonst kann eine Scene-JSON nicht mit anderer
   Config-Kamera oder anderem Regions-Set wiederverwendet werden.

## Evidence Inspected

1. Kein harter kanonischer `SCENE_IDS`-Orderpfad im geprüften Runtime-Pfad
   gefunden.
2. `loadScenes()` nimmt die Reihenfolge aus der Config-Sequenz.
3. `scripts/atlas/config.default.toml` und `apps/brain-app/scripts/smoke-scenes.mjs`
   nutzen dieselbe Lernpfad-Quelle.
4. Aktuelle `kapitel11-pfad`-Config-Einträge und Scene-JSON-IDs/Kinds passen
   zusammen.

## Residual Risk

1. Overlay-Kind-Drift wird im Smoke geprüft, aber nicht direkt in `loadScenes()`.

## Verification Run By Reviewer

1. `pnpm -C apps/brain-app test -- --runInBand src/scene/scenes.test.ts src/scene/router.test.ts`
   — grün; der Lauf hat dabei die volle Vitest-Suite mit 22 Files / 111 Tests
   ausgeführt.
