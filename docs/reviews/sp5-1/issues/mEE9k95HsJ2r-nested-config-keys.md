# mEE9k95HsJ2r — Nested Config Keys Code Map

## Betroffene Pfade

- `scripts/atlas/build-config.mjs`
  - Schlüssel-Sets: `CAMERA_KEYS`, `COLOR_KEYS`, `CUTS_KEYS` definieren nur Parent-Nodes.
  - `validateConfigurationSchema()` prüft `camera`, `colors`, `cuts`-Objekte auf Pflichtfelder und primitive Typen, ruft aber für die verschachtelten Teile nur Teilprüfungen auf.
  - `validateFigureFields()` enthält zusätzliche Semantikprüfungen (`camera.pose.position/look_at`, `cuts.planes.axis/position/keep`) ohne Nested-Key-Whitelists.
  - `validateConfig()` ruft am Ende `assertKnownKeys()` für die Parent-Objekte `camera`, `colors`, `cuts`.
- `scripts/atlas/build-config.test.mjs`
  - Bestehende Negativtests für `camera.pose` prüfen nur die Form von `position` (Länge) via `camera: { pose: { position: [1,2], look_at: [...] } }`.
  - Keine Tests für `camera.pose.roll`, `colors.groups[].alpha`, `cuts.planes[].softness` als unbekannte Unter-Keys.
- `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
  - `ConfigCamera`, `ConfigColors`, `ConfigCuts` Typen erlauben aktuell nur die vorgesehenen Felder.
  - `ConfigCamera.pose` kennt intern `position` und `look_at`; `ConfigCuts.planes[]` kennt `axis`, `position`, optional `keep`.
  - Runtime-Resolver (`computeEffectiveConfig`) konsumiert diese Felder, führt jedoch keine zusätzliche Schema-Validierung pro Nested-Key durch.
- `apps/brain-app/src/viewer/atlas/configExport.ts`
  - `toTomlConfiguration()` serialisiert explizit nur bekannte Subfelder: `camera.pose.position/look_at`, `colors.groups[].label/hue/buckets`, `cuts.planes[].axis/position/keep`.
  - Extra-Keys im Input werden nicht roundtripped, aber Builder-Validierung wird hier nicht nachgeschaltet.
- `docs/reviews/sp5-1/SP5.1.1-schema-review.md`
  - Bestätigt bereits als Key-Lücke: verschachtelte Schlüssel von `camera.pose`, `colors.groups[]`, `cuts.planes[]` werden noch still akzeptiert.
  - Verweist als Folgefehler auch auf fehlende Builder-/Roundtrip-Testabdeckung.

## Aktuelle Luecke

- `camera.pose`
  - Builder: Parent-Key ist erlaubt via `CAMERA_KEYS`.
  - `validateFigureFields()` verlangt nur `pose.position` und `pose.look_at` als Vektoren.
  - Ohne `assertKnownKeys(c.camera.pose, ...)` bleibt `camera.pose.roll` still akzeptiert.
- `colors.groups[]`
  - Builder: `colors` ist über `COLOR_KEYS` erlaubt, Gruppenarray-Typ + `label`/`hue`/`buckets` werden geprüft.
  - Ohne Gruppen-whitelist werden zusätzliche Feldnamen wie `alpha` nicht erkannt/abgelehnt.
- `cuts.planes[]`
  - Builder: `cuts` erlaubt über `CUTS_KEYS`; jeder Plane muss Objekt sein.
  - `validateFigureFields()` prüft `axis`, `position`, optional `keep`, aber nicht, dass keine weiteren Keys vorhanden sind.
  - `cuts.planes[].softness` wird deshalb still akzeptiert.
- Fazit: `validateConfig()` blockiert unbekannte Keys nur auf 1. Ebene der betroffenen Nodes, nicht auf Ebene von `pose`, Gruppen-Objekt oder Plane-Objekt.

## Minimaler Implementierungspfad

1. In `scripts/atlas/build-config.mjs` Nested-Key-Whitelist ergänzen und hart verifizieren:
   - `CAMERA_POSE_KEYS = new Set(['position', 'look_at'])` + `assertKnownKeys(c.camera.pose, CAMERA_POSE_KEYS, 'configuration ... camera.pose')`.
   - `COLOR_GROUP_KEYS = new Set(['label', 'hue', 'buckets'])` + `assertKnownKeys(group, COLOR_GROUP_KEYS, 'configuration ... colors.groups[i]')`.
   - `CUTS_PLANE_KEYS = new Set(['axis', 'position', 'keep'])` + `assertKnownKeys(plane, CUTS_PLANE_KEYS, 'configuration ... cuts.planes[i]')`.
2. In `scripts/atlas/build-config.test.mjs` gezielte Negative-Tests ergänzen:
   - `camera.pose.roll` wird abgelehnt.
   - `colors.groups[].alpha` wird abgelehnt.
   - `cuts.planes[].softness` wird abgelehnt.
3. Optional: kleine Typ-/Smoke-Härtung in bestehenden Tests (z. B. Regression-Test für vorhandene Valid-Konstrukte mit nur erlaubten Nested-Keys).
4. Laufzeit-/Exporter-Änderung
   - Für das gefundene Problem nicht zwingend nötig: `atlasConfig.ts` kennt bereits die erlaubte Form; `configExport.ts` serialisiert nur bekannte Keys und erzeugt keine neuen nested-Unknowns.
   - Sobald Builder-Validierung und Tests geschlossen sind, bleibt der Datenfluss auf Runtime/Export unverändert korrekt.

## Verifikationsvorschlag

- `node --test scripts/atlas/build-config.test.mjs`
- Zusätzliche gezielte Assertions für die neuen Negativfälle (siehe oben) ergänzen und laufen lassen.
- Optionales Folge-Review: prüfen, dass `configExport.test`/Runtime-Tests denselben Nested-Key-Fehler nicht zulassen (oder dokumentiert als out-of-scope markieren).

## Kritischer Review nach Implementierung

Review-Status: `pass`

Keine Blocker gefunden.

### Critical

- Keine Findings.

### High

- Keine Findings.

### Medium

- Keine Findings.

### Low

- Keine Findings.

### Pruefnotizen

1. Die drei Akzeptanzfaelle sind jetzt fail-loud abgedeckt. `validateConfigurationSchema()` validiert `camera.pose`, `colors.groups[i]` und `cuts.planes[i]` explizit per `assertKnownKeys()` in [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:376), [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:391) und [scripts/atlas/build-config.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/scripts/atlas/build-config.mjs:409). Der negative Test deckt genau die drei bisher still akzeptierten Keys `roll`, `alpha`, `softness` ab in [scripts/atlas/build-config.test.mjs](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/scripts/atlas/build-config.test.mjs:169).
2. Im unmittelbaren Scope bleibt keine offensichtliche weitere Nested-Unknown-Key-Luecke offen. Andere Nested-Strukturen sind bereits entweder hart validiert (`mesh_mappings.*.*`), flach genug fuer Parent-Whitelists (`overlay`, `sequencing`, `view`, `visibility`) oder absichtlich offen als Map (`scopes`).
3. Die Regex-Assertions sind fuer diesen Slice stark genug. Sie matchen jeweils den vollqualifizierten Pfad plus den konkreten unbekannten Key; die Fixtures halten alle anderen Pflichtfelder gueltig, dadurch ist kein alternativer frueher Fehlerpfad ersichtlich, der denselben Regex irrefuhrend treffen wuerde.
4. Runtime/Exporter mussten fuer diesen Slice nicht mitgeaendert werden. Die Runtime-Typen erlauben ohnehin nur `pose.position/look_at`, `groups[].label/hue/buckets` und `planes[].axis/position/keep` in [apps/brain-app/src/viewer/atlas/atlasConfig.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/atlasConfig.ts:13), und der Exporter serialisiert ausschliesslich diese bekannten Nested-Felder in [apps/brain-app/src/viewer/atlas/configExport.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts:68), [apps/brain-app/src/viewer/atlas/configExport.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts:83) und [apps/brain-app/src/viewer/atlas/configExport.ts](/Users/marcusifland/CFH_REAL_LOCAL/SEM%204%20LOCAL/brain-app-standalone/apps/brain-app/src/viewer/atlas/configExport.ts:101).
5. Regressionsrisiko fuer gueltige `config.default.toml` wirkt niedrig. Der reale Build-Test laeuft gegen die aktuelle Datei grün und deckt damit die bestehende Konfiguration frisch ab: `node --test scripts/atlas/build-config.test.mjs` lief lokal mit `23/23` grün, inklusive `buildConfig: reale config.default.toml validiert gegen echten Katalog`.
