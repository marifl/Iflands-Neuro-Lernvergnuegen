# Einfärbungen korrekt authoren

Stand: 2026-06-18. Diese Anleitung beschreibt den aktuellen Runtime-Mechanismus,
nicht alte Planung.

## Kurzfassung

Es gibt zwei unterschiedliche Farbpfade:

1. Globale Farbmodi: `anatomical`, `function`, `laterality`, `region`.
   Sie kommen aus der Ontologie und den zentralen Farbkonstanten.
2. Figur-Färbungen: `preset`.
   Sie kommen aus `color-presets.json`, werden über Buckets auf konkrete Meshes
   aufgelöst und über `?config=<configuration-id>` automatisch aktiviert.

Für neue Kapitel-11-Figur-Färbungen ist fast immer der zweite Pfad richtig:
Bucket-Mapping in der TOML pflegen, Preset in JSON definieren, Configuration in
der TOML mit `colors.preset` verbinden, Builder und Smoke laufen lassen.

## Aktueller Datenfluss

1. `scripts/atlas/config.default.toml`
   ist die kanonische Autorenquelle für `mesh_mappings`, Configurations,
   Regionen, Sichtbarkeit, Kamera, Schnitte und Farb-Metadaten.

2. `node scripts/atlas/build-config.mjs`
   validiert die TOML und schreibt abgeleitete Runtime-Dateien:

   1. `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
   2. `apps/brain-app/src/viewer/meshMappings.generated.json`

   Diese Dateien nicht von Hand editieren.

3. `apps/brain-app/public/companion/config/color-presets.json`
   definiert die didaktischen Figur-Färbungen:

   1. Preset-ID
   2. Anzeigename
   3. fachliche Intention
   4. Gruppen mit `label`, `role`, `meaning`, `hue`, `buckets`

4. `apps/brain-app/src/viewer/colorPresets.ts`
   validiert die JSON-Datei und löst Presets auf:

   1. `hueToHex(hue)` berechnet die echte Renderfarbe.
   2. `resolvePresetColors(preset)` baut `Map<MeshName, HexColor>`.
   3. `bucketToMeshes(bucket)` wirft laut, wenn ein Bucket unbekannt ist oder
      als bekannte Geometrie-Lücke markiert wurde.

5. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
   rendert im Preset-Modus:

   1. Mesh ist in der Preset-Map: Gruppenfarbe aus `hueToHex`.
   2. Mesh ist nicht in der Preset-Map: `PRESET_DIM_COLOR`, wenn `dimOthers`
      aktiv ist.
   3. Auswahl, Hover und Animation bleiben Emissive-Overlays und überlagern die
      Basisfarbe.

6. `apps/brain-app/src/viewer/SubParcels.tsx`
   nutzt dieselbe Preset-Map für Subparzellen. Sub-Patches außerhalb des
   aktiven Presets werden unsichtbar, damit subgyrale Figuren sauber wirken.

7. `apps/brain-app/src/viewer/PresetLegend.tsx`
   rendert die Legende aus demselben Preset: `label`, `meaning`, `hueToHex`.

## Globale Farbmodi

Globale Modi sind Viewer-Modi, keine Figure-Presets.

| Modus | Quelle | Zweck |
|-------|--------|-------|
| `anatomical` | `anatomicalMaterialRole(...)` + `ANATOMICAL_MATERIAL_COLORS` | Gewebe-/Materialrollen |
| `function` | `functionSystem(...)` + `FUNCTION_COLORS` | grobe Funktionssysteme |
| `laterality` | `side` + `LATERALITY_COLORS` | links, rechts, midline |
| `region` | Top-Level-Gruppe + `REGION_COLORS` | Hirnregionen/Strukturgruppen |
| `preset` | `color-presets.json` + Buckets | didaktische Figure-Färbungen |

Die globalen Modi hängen an `buildColorIndex(...)` in
`apps/brain-app/src/viewer/ontology.ts`. Farben und Rollen liegen zentral in
`apps/brain-app/src/viewer/atlasColorSystem.ts`.

Neue didaktische Abbildungsfarben nicht in globale Moduslogik einbauen, wenn es
eigentlich um eine konkrete Figur geht.

## Produktiver Figure-Pfad

### 1. Buckets prüfen oder anlegen

Buckets liegen in `scripts/atlas/config.default.toml`:

```toml
[mesh_mappings.buckets.dlpfc]
meshes = [
  "left-middle-frontal-gyrus", "right-middle-frontal-gyrus",
  "left-superior-frontal-gyrus", "right-superior-frontal-gyrus",
]
```

Regeln:

1. Bucket-Slugs sind fachliche Gruppen, keine UI-Labels.
2. Presets referenzieren Buckets, nicht Mesh-Namen.
3. Mesh-Namen müssen echte Runtime-Meshes sein.
4. Wenn eine Struktur noch nicht baubar ist, explizit als Lücke markieren:

```toml
[mesh_mappings.buckets.ifj]
meshes = []
known_gap = true
gap_reason = "Inferior frontal junction ist kein eigenes TARO-Mesh"
```

Produktive Presets dürfen solche Lücken-Buckets nicht verwenden. Der Builder
und `bucketToMeshes(...)` brechen sonst laut ab.

### 2. Preset in `color-presets.json` definieren

Datei:
`apps/brain-app/public/companion/config/color-presets.json`

Minimales Muster:

```json
{
  "id": "pfc-petrides",
  "label": "PFC Petrides (Abb. 11-05)",
  "sourceFigure": "11-05",
  "intent": "Arbeitsgedächtnis-Funktionen werden nach dorsolateralem, ventrolateralem und posteriorem Anteil getrennt.",
  "coverage": "full",
  "groups": [
    {
      "label": "DLPFC (Manipulieren)",
      "role": "working-memory",
      "meaning": "Manipulieren und Umordnen mentaler Inhalte.",
      "hue": 210,
      "buckets": ["dlpfc"]
    }
  ],
  "dimOthers": true
}
```

Pflichtregeln:

1. `role` muss aus `COLOR_ROLE_VALUES` in
   `apps/brain-app/src/viewer/atlasColorSystem.ts` kommen.
2. `hue` ist der einzige Farbwert. Keine Hex-Farben in Presets eintragen.
3. `meaning` ist die fachliche Erklärung für die Legende.
4. `coverage = "partial"` braucht `coverageNote`.
5. `dimOthers` beschreibt die Preset-Absicht; die Footer-Optionen
   `Andere ausblenden` und `Eingefärbte fokussieren` sind nur Ansichtsschalter.

### 3. Configuration mit Preset verbinden

Auch das passiert in `scripts/atlas/config.default.toml`:

```toml
[configurations.pfc-petrides]
label_de = "PFC Petrides (Abb. 11-05)"
title = "PFC-Funktionen nach Petrides"
section = "11.3.3"
replaces_figure = "11-05"

[configurations.pfc-petrides.view]
surface = "pial"
subcortex = false
carve_on_taro = "off"

[configurations.pfc-petrides.regions]
buckets = ["dlpfc", "vlpfc", "ppc", "pcc-praecuneus"]

[configurations.pfc-petrides.colors]
scheme = "preset"
preset = "pfc-petrides"
dim_others = true
coverage = "full"
review_status = "final"
reason = "Preset deckt alle in regions.buckets deklarierten Petrides-Gruppen ab."
```

Runtime-Regel:

1. `colors.preset` ist der aktive produktive Pfad.
2. `regions.buckets` ist die prüfbare Erwartungsmenge für diese Configuration.
3. `scripts/atlas/smoke-figures.mjs` prüft genau diese Buckets gegen das Preset.
4. `colors.groups` ist aktuell validierte Config-/Export-Metadaten, aber nicht
   der aktive Figure-Renderpfad. Für echte Figure-Färbungen also
   `colors.preset` verwenden.

Wenn `?config=<id>` geladen wird, aktiviert `ConfigLinkStateApplier` das
referenzierte Preset automatisch. Der User muss im Footer kein Preset manuell
anklicken.

## Verifikation

Nach jeder Änderung an Buckets, Presets oder Figure-Configurations:

```bash
node scripts/atlas/build-config.mjs
node --test scripts/atlas/build-config.test.mjs
pnpm --dir apps/brain-app test -- src/viewer/colorPresets.test.ts src/viewer/atlas/atlasConfig.test.ts
pnpm --dir apps/brain-app typecheck
```

Für echte Browser-Prüfung:

```bash
cd apps/brain-app
pnpm dev
```

In einem zweiten Terminal aus dem Repo-Root:

```bash
SMOKE_URL=http://localhost:5173 node scripts/atlas/smoke-figures.mjs
```

Der Smoke ist absichtlich streng:

1. Jede Figure-Config mit `replaces_figure` und aktiver Farbe braucht
   `colors.preset`.
2. Jede erwartete Gruppe muss in der Legende auftauchen.
3. Jedes Mesh jedes `regions.buckets`-Buckets muss exakt die erwartete
   `hueToHex`-Farbe haben.
4. Browser-`pageerror` ist ein Fehler.

Manuelle Sichtprüfung:

1. `http://localhost:5173/?config=<configuration-id>` öffnen.
2. Footer `Färbung` muss das Preset-Label zeigen.
3. Die Preset-Legende muss Gruppen, Bedeutung und Farben zeigen.
4. `Andere ausblenden` darf nur nicht eingefärbte Strukturen verstecken.
5. `Eingefärbte fokussieren` darf nicht die Preset-Daten verändern, sondern nur
   die Ansicht dimmen.

## AI-Agent-Checkliste

Wenn du eine neue Einfärbung authorst:

1. Lies zuerst diese Datei, `scripts/atlas/config.default.toml`,
   `apps/brain-app/public/companion/config/color-presets.json` und die
   vorhandene Ziel-Figure-Config.
2. Entscheide, ob vorhandene Buckets reichen.
3. Falls nicht: ergänze Buckets nur in `scripts/atlas/config.default.toml`.
4. Ergänze oder ändere genau ein Preset in `color-presets.json`.
5. Verbinde die Figure-Configuration über `colors.preset`.
6. Trage `regions.buckets` so ein, dass der Smoke alle fachlich erwarteten
   Buckets prüfen kann.
7. Lasse Builder, Tests, Typecheck und `smoke-figures` laufen.
8. Berichte Coverage ehrlich: `full`, `partial` plus `coverageNote`, oder
   `colors.enabled = false`, wenn keine echte Runtime-Färbung existiert.

Nicht tun:

1. Keine generierten JSON-Dateien von Hand editieren.
2. Keine Mesh-Namen direkt in `color-presets.json` eintragen.
3. Keine Hex-Farben in Presets eintragen.
4. Nicht `colors.groups` als produktiven Renderpfad verwenden.
5. Nicht eine Farbe anhand eines Screenshots raten; Erwartung kommt aus
   `hueToHex` und Runtime-Config.
6. Nicht `coverage = "full"` behaupten, wenn ein Bucket nur grob angenähert ist.
7. Nicht `localStorage`-Overrides als kanonische Autorenquelle verwenden.

## Fehlerbilder

| Symptom | Wahrscheinliche Ursache | Fix |
|---------|-------------------------|-----|
| Preset taucht im Footer nicht auf | `color-presets.json` lädt nicht oder Schemafehler | `colorPresets.test.ts` laufen lassen |
| `?config=...` aktiviert keine Figur-Färbung | `configuration.colors.preset` fehlt | TOML-Configuration ergänzen, Builder laufen lassen |
| Smoke meldet unbekannten Bucket | Bucket fehlt in `[mesh_mappings.buckets]` | Bucket in TOML ergänzen |
| Smoke meldet Bucket ohne Geometrie | Bucket ist bekannte Lücke oder leer | Subparzellierung/Atlas-Regeneration nötig oder Preset nicht produktiv verwenden |
| Legende stimmt, Meshes aber nicht | Runtime-Map oder Mesh-Sichtbarkeit divergiert | `smoke-figures` ernst nehmen, nicht per Screenshot absegnen |
| Carve-Overlay verdeckt Figure-Färbung | Config nutzt altes Atlas-Carve-Denken | Für Preset-Figuren `view.carve_on_taro = "off"` setzen |

## Relevante Dateien

1. `scripts/atlas/config.default.toml`
2. `scripts/atlas/build-config.mjs`
3. `apps/brain-app/public/companion/config/color-presets.json`
4. `apps/brain-app/src/viewer/atlasColorSystem.ts`
5. `apps/brain-app/src/viewer/colorPresets.ts`
6. `apps/brain-app/src/viewer/bucketMeshes.ts`
7. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
8. `apps/brain-app/src/viewer/SubParcels.tsx`
9. `apps/brain-app/src/viewer/PresetLegend.tsx`
10. `scripts/atlas/smoke-figures.mjs`
