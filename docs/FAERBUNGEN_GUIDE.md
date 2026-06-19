# Einfärbungen korrekt authoren

Stand: 2026-06-18. Diese Anleitung beschreibt den aktuellen Runtime-Mechanismus,
nicht alte Planung.

## Kurzfassung

Es gibt zwei unterschiedliche Farbpfade:

1. Globale Farbmodi: `anatomical`, `function`, `laterality`, `region`.
   Sie kommen aus der Ontologie und den zentralen Farbkonstanten.
2. Vortrags-/Figur-Färbungen: `preset` oder `scene`.
   Presets, Buckets und Configs kommen gemeinsam aus
   `scripts/atlas/config.default.toml`; `atlas-config.json` ist nur das
   generierte Runtime-Artefakt.

Für neue Kapitel-11-Färbungen gilt: Bucket-Mapping, `color_presets` und
Configuration in derselben TOML pflegen, Builder und Smokes laufen lassen. Keine
separate Companion-JSON-Quelle und keine Doppelpflege.

## Aktueller Datenfluss

1. `scripts/atlas/config.default.toml`
   ist die kanonische Autorenquelle für `mesh_mappings`, `color_presets`,
   Configurations, Regionen, Sichtbarkeit, Kamera, Schnitte und Farbmetadaten.
2. `node scripts/atlas/build-config.mjs`
   validiert die TOML und schreibt:
   1. `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
   2. `apps/brain-app/src/viewer/meshMappings.generated.json`
3. `apps/brain-app/src/viewer/colorPresets.ts`
   lädt `atlas-config.json`, validiert `color_presets` und löst Presets auf:
   1. `hueToHex(hue)` berechnet die echte Renderfarbe.
   2. `resolvePresetColors(preset)` baut `Map<MeshName, HexColor>`.
   3. `bucketToMeshes(bucket)` wirft laut bei unbekannten oder leeren Buckets.
4. `FooterBar.tsx`
   zeigt `Vortrags-Färbungen` aus `presentation.kapitel11-vorlesung.steps`.
   Der Klick setzt den kanonischen
   `?sequence=presentation.kapitel11-vorlesung&config=...&scene=...&step=0`
   Link. Das Menü ist kein zweiter Preset-Speicher.
5. `BodyParts3DViewer.tsx` aktiviert bei `colors.scheme = "preset"` das
   referenzierte Preset automatisch. Scene-/ERP-Färbungen bleiben explizite
   Scene-Verträge.

## Globale Farbmodi

| Modus | Quelle | Zweck |
|-------|--------|-------|
| `anatomical` | `anatomicalMaterialRole(...)` + `ANATOMICAL_MATERIAL_COLORS` | Gewebe-/Materialrollen |
| `function` | `functionSystem(...)` + `FUNCTION_COLORS` | grobe Funktionssysteme |
| `laterality` | `side` + `LATERALITY_COLORS` | links, rechts, midline |
| `region` | Top-Level-Gruppe + `REGION_COLORS` | Hirnregionen/Strukturgruppen |
| `preset` | `color_presets` + Buckets aus `config.default.toml` | didaktische Vortrags-/Figure-Färbungen |

Neue didaktische Abbildungsfarben nicht in globale Moduslogik einbauen, wenn es
eigentlich um eine konkrete Figur oder Vortragsfolie geht.

## Produktiver Pfad

### 1. Buckets prüfen oder anlegen

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
4. Nicht baubare Strukturen bleiben explizite Lücken mit `known_gap = true`.

### 2. Preset in der TOML definieren

```toml
[color_presets.pfc-petrides]
label = "PFC Petrides (Abb. 11-05)"
sourceFigure = "11-05"
intent = "Arbeitsgedächtnis-Funktionen werden nach dorsolateralem, ventrolateralem und posteriorem Anteil getrennt."
coverage = "full"
dimOthers = true

[[color_presets.pfc-petrides.groups]]
label = "DLPFC (Manipulieren)"
role = "working-memory"
meaning = "Manipulieren und Umordnen mentaler Inhalte."
hue = 210
buckets = ["dlpfc"]
```

Pflichtregeln:

1. `role` muss aus `COLOR_ROLE_VALUES` kommen.
2. `hue` ist der einzige Farbwert. Keine Hex-Farben in Presets eintragen.
3. `meaning` ist die fachliche Erklärung für die Legende.
4. `coverage = "partial"` braucht `coverageNote`.
5. Kein Preset darf auf einen Lücken-Bucket zeigen.

### 3. Configuration verbinden

```toml
[configurations.pfc-petrides.colors]
scheme = "preset"
preset = "pfc-petrides"
dim_others = true
coverage = "full"
review_status = "final"
reason = "Preset deckt alle in regions.buckets deklarierten Petrides-Gruppen ab."
```

Runtime-Regeln:

1. `colors.preset` referenziert einen Eintrag aus `color_presets`.
2. `regions.buckets` ist die prüfbare Erwartungsmenge.
3. Die Bucket-Menge des Presets muss exakt der Bucket-Menge der Configuration
   entsprechen. Zusätzliche Preset-Buckets sind ein Build-Fehler.
4. `colors.groups` ist kein gültiger aktueller Config-Pfad.
5. Scene-/Atlas-Färbungen bleiben explizit `scheme = "scene"` oder
   `scheme = "atlas"`.

## Recap-Folie 93: Coloring-Wiki-Vertrag

Die Folie „Recap am ganzen Hirn“ ist kein Preset-Fallback. Sie ist die
kanonische `zusammenfassung`-Scene und nutzt die Scene-Färbung aus
`apps/brain-app/public/scenes/zusammenfassung.json` plus die prüfbaren
Regionen aus `scripts/atlas/config.default.toml`.

Route:
`?sequence=presentation.kapitel11-vorlesung&config=zusammenfassung&scene=zusammenfassung&step=0`

Eigene Overlay-Überschrift: `Recap am ganzen Hirn`.

| Folienlabel | Bucket-Vertrag | Scene-Region-Vertrag | Anzeige im Overlay |
|-------------|----------------|-----------------------|--------------------|
| DLPFC | `dlpfc` | `dlpfc` | Planung, Flexibilität, Selbstkontrolle |
| VMPFC | `vmpfc` | `vmpfc` | Verhaltenshemmung, Konsequenzen abschätzen |
| PPC · Parietal | `ppc` | `ppc` | Aufmerksamkeit, Eigen-/Fremd |
| Basalganglien | `striatum-dorsal`, `globus-pallidus`, `thalamus`, `nucleus-accumbens` | `basalganglia-recap` | drei Schleifen → drei Syndrome |
| dACC · Cingulum | `dacc` | `dacc`, `acc-cingulum` | Konfliktbearbeitung → Quelle der P3a |
| SMA / pre-SMA | `sma-presma` | `sma-presma` | Inhibition → Quelle der P3z |

Dart-Entscheidungen:

1. [Task Farbkontrakt](https://app.dartai.com/t/lBEWZJxGEOsH-Korrigiere-Legenden-Mesh-Farbk)
2. [Semantik-Audit](https://app.dartai.com/c/PGgkWCaX2HrH)
3. [Recap-Wiki-Plan](https://app.dartai.com/c/qbY8RYAehoGV)

## Verifikation

Nach jeder Änderung an Buckets, Presets oder Figure-Configurations:

```bash
node scripts/atlas/build-config.mjs
node --test scripts/atlas/build-config.test.mjs
pnpm --dir apps/brain-app test -- src/viewer/colorPresets.test.ts src/viewer/FooterBar.test.tsx
pnpm --dir apps/brain-app typecheck
```

Für echte Browser-Prüfung:

```bash
SMOKE_URL=http://localhost:5173 node scripts/atlas/smoke-figures.mjs
```

Der Smoke ist absichtlich streng:

1. Jede aktive Preset-Färbung braucht `colors.preset` und prüfbare
   `regions.buckets`.
2. Jede erwartete Gruppe muss in der Legende auftauchen, und keine zusätzliche
   Gruppe darf dort stehen.
3. Jedes Mesh jedes `regions.buckets`-Buckets muss exakt die erwartete
   `hueToHex`-Farbe haben.
4. Kein sichtbares eingefärbtes Mesh darf außerhalb der erwarteten
   Preset-Bucket-Menge liegen.
5. Browser-`pageerror` ist ein Fehler.

## Agent-Checkliste

1. Lies zuerst diese Datei und `scripts/atlas/config.default.toml`.
2. Entscheide, ob vorhandene Buckets reichen.
3. Ergänze Buckets nur in `config.default.toml`.
4. Ergänze oder ändere genau ein `color_presets.<id>` in derselben TOML.
5. Verbinde die Configuration über `colors.preset` oder markiere sie klar als
   `scheme = "scene"`/`scheme = "atlas"`.
6. Trage `regions.buckets` oder `regions.scene_regions` prüfbar ein.
7. Lasse Builder, Tests, Typecheck und passende Browser-Smokes laufen.
8. Berichte Coverage ehrlich: `full`, `partial` plus `coverageNote`, oder
   `colors.enabled = false`, wenn keine echte Runtime-Färbung existiert.

Nicht tun:

1. Keine generierten JSON-Dateien von Hand editieren.
2. Keine separate Preset-JSON als zweite Wahrheit anlegen.
3. Keine Mesh-Namen direkt in Presets eintragen.
4. Nicht `colors.groups` in aktuellen Configs oder Exporten verwenden.
5. Nicht eine Farbe anhand eines Screenshots raten.
6. Nicht `coverage = "full"` behaupten, wenn ein Bucket nur grob angenähert ist.
7. Nicht `localStorage`-Overrides als kanonische Autorenquelle verwenden.

## Fehlerbilder

| Symptom | Wahrscheinliche Ursache | Fix |
|---------|-------------------------|-----|
| Eintrag taucht nicht unter `Vortrags-Färbungen` auf | Config fehlt in `presentation.kapitel11-vorlesung.steps` | TOML-Sequence ergänzen, Builder laufen lassen |
| `?config=...` aktiviert keine Figur-Färbung | `configuration.colors.preset` fehlt oder `scheme` ist nicht `preset` | TOML-Configuration prüfen |
| Smoke meldet unbekannten Bucket | Bucket fehlt in `[mesh_mappings.buckets]` | Bucket in TOML ergänzen |
| Smoke meldet Bucket ohne Geometrie | Bucket ist bekannte Lücke oder leer | Subparzellierung/Atlas-Regeneration nötig oder Preset nicht produktiv verwenden |
| Legende stimmt, Meshes aber nicht | Runtime-Map oder Mesh-Sichtbarkeit divergiert | `smoke-figures` ernst nehmen |
| Carve-Overlay verdeckt Figure-Färbung | Config nutzt altes Atlas-Carve-Denken | Für Preset-Figuren `view.carve_on_taro = "off"` setzen |

## Relevante Dateien

1. `scripts/atlas/config.default.toml`
2. `scripts/atlas/build-config.mjs`
3. `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`
4. `apps/brain-app/src/viewer/atlasColorSystem.ts`
5. `apps/brain-app/src/viewer/colorPresets.ts`
6. `apps/brain-app/src/viewer/bucketMeshes.ts`
7. `apps/brain-app/src/viewer/FooterBar.tsx`
8. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
9. `apps/brain-app/src/viewer/SubParcels.tsx`
10. `apps/brain-app/src/viewer/PresetLegend.tsx`
11. `scripts/atlas/smoke-figures.mjs`
