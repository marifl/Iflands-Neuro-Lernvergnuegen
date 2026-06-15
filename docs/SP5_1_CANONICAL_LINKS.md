# SP5.1 Canonical Links und Exporte

Die versionierte Autorenquelle bleibt `scripts/atlas/config.default.toml`.
Runtime-Links referenzieren diese Config explizit; `localStorage` ist nur eine
temporäre Override-Schicht der UI und wird nicht als kanonischer Export gelesen.

## SP3 zu SP5.1: `mesh_mappings`

SP3-Configs ohne Root-Key `mesh_mappings` sind nicht mehr rückwärtslesbar. Das
ist ein absichtlicher Bruch: Bucket- und Scene-Region-Auflösung sind in SP5.1
Teil der kanonischen Config und dürfen nicht aus lokalen Runtime-Defaults
rekonstruiert werden. Fehlt der Key, muss der Builder laut abbrechen:
`build-config: mesh_mappings fehlt oder ist kein Objekt`.

Der neue Autoritätsort ist `scripts/atlas/config.default.toml`:

1. `[mesh_mappings.buckets.<slug>]` beschreibt alle Figure-/Farb-Buckets.
2. `[mesh_mappings.scene_regions.<slug>]` beschreibt alle Scene-Regionen.
3. Jeder Knoten setzt `meshes = [...]`. Bekannte Lücken setzen stattdessen
   `meshes = []`, `known_gap = true` und einen konkreten `gap_reason`.
4. Configurations referenzieren nur die Slugs (`regions.buckets`,
   `regions.scene_regions`, `colors.groups[].buckets`); Mesh-Listen werden dort
   nicht erneut gepflegt.

Migration und Verifikation aus dem Repo-Root:

```bash
node scripts/atlas/build-config.mjs
node --test scripts/atlas/build-config.test.mjs
pnpm --dir apps/brain-app typecheck
```

`build-config.mjs` schreibt daraus
`apps/brain-app/public/assets/atlas-canonical/atlas-config.json` und
`apps/brain-app/src/viewer/meshMappings.generated.json`. Diese Dateien sind
abgeleitete Build-Artefakte; die Source of Truth bleibt die TOML-Datei. Die
App-Scripts `dev`, `build`, `typecheck` und `test` führen den Builder vorab aus,
damit frische Checkouts nicht von einem lokalen JSON-Artefakt abhängen.

## URL-Formate

1. Figure-/Config-Link: `?config=<configuration-id>`
2. Lern-Szenen-Link: `?scene=<scene-id>&step=<n>`
3. Szene mit zugeordneter Config: `?config=<configuration-id>&scene=<scene-id>&step=<n>`

`step` ist bei Szenen kanonisch `0`, wenn kein anderer Schritt gemeint ist.

## Beispiele

1. Abb. 11-04, Drei Basalganglien-Schleifen:
   `http://localhost:5173/?config=basalganglienschleifen`

2. Abb. 11-15(1), P3a Konfliktmonitoring:
   `http://localhost:5173/?config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0`

## Export

Kanonische TOML-Exports werden aus der geladenen Runtime-Config erzeugt, nicht
aus `localStorage`:

1. `toCanonicalTomlConfiguration(file, 'basalganglienschleifen')`
2. `toCanonicalTomlConfiguration(file, 'p3a-konfliktmonitoring')`

Der Export schreibt alle gesetzten SP5.1-Felder sichtbar aus: Metadaten,
Facetten, View, Kamera inklusive Pose, Regionen, Farben, Sichtbarkeit, Schnitte,
Overlay, Sequencing und Scopes.
