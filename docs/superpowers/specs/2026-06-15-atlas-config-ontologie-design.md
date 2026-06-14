# Atlas-Config & -Ontologie — Design

> **Status:** Design freigegeben (Brainstorming), Sub-Projekt-Specs folgen einzeln.
> **Datum:** 2026-06-15 · **Branch-Anker:** `feature/grundmodi-steuerleiste`

## Ziel (in einem Satz)

Eine **programmierbare Config** (`.ini`-Stil wie ein Triple-A-Spiel) schaltet aus *allen*
Atlas-Kategorien (Atlas → Gruppe → Areal) und allen Facetten (Klinik / Funktion / Kapitel /
Provenienz) klar an/ab — gespeist aus **einem** serialisierten Atlas-Katalog, der alle Atlanten
und das ergänzende Kontext-Material vereint.

## Entscheidungen (aus dem Brainstorming, verbindlich)

| Frage | Entscheidung |
|-------|--------------|
| Scope | **Alle** Atlanten (fsaverage-Layer, TARO-Carve, watertight-3D-Objekte, Subkortex) + Kontext-Material |
| Kontext-Material | Kapitel-11-Lerninhalt **+** Klinik/Läsionen **+** funktionale Zuordnung **+** Provenienz (Vollausbau) |
| Haupt-Rückgrat | **Atlas-Schema** (Achse → Atlas → native Hierarchie → Areal); Anatomie/Funktion/Klinik = Facetten |
| Architektur | **Build-Time gemergte Ontologie** (ein Runtime-Asset, klare Trennung Maschine ↔ Mensch) |
| Toggle-Granularität | **Bis zum einzelnen Areal**, hierarchisch mit Vererbung |
| Steuer-Modus | **Drei Schichten gelayert:** Datei < In-App-Settings < Deep-Link |
| Config-Format | **TOML** (authored) → im Build zu validiertem **JSON** (App lädt JSON) |
| Default-Preset | `kapitel11` (PFC/BG-Fokus) — „voll" ist Opt-in (respektiert Clinical-Scope) |

## Architektur — Drei Schichten

```
atlas-ontology.json   ← KATALOG: alles was es gibt
        │                 (alle Atlanten → Gruppen → Areale, je Knoten Host + Facetten-Kontext)
        ▼
config.toml (default) ← Schicht 1: Basis-Defaults (Datei, .ini-like, build-validiert → config.default.json)
   localStorage       ← Schicht 2: In-App-Settings-Menü (User-Overrides, persistiert)
   URL ?-params       ← Schicht 3: Deep-Link-Override (ephemer, höchste Priorität)
        │
        ▼
   Resolver           ← mergt 3 Schichten → "effective config" (validiert gegen Katalog)
        │
        ▼
   UI                 ← rendert nur Aktiviertes; Tree-Browser IST zugleich das Settings-Menü
```

**Präzedenz:** `URL > localStorage > config.toml > Katalog-Default`.
**Vererbung:** Areal-Zustand = expliziter Toggle, sonst erbt von Gruppe → Atlas → Achse.

## Kern-Herausforderung: kanonische Areal-ID

Dieselbe Region trägt in den drei Ansichten **drei verschiedene Identifier**:

| Ansicht | Beispiel-Identifier | Quelle |
|---------|--------------------|--------|
| fsaverage-Layer (Per-Vertex-LUT) | `name: "parstriangularis"` (+ label-id) | `assets/atlas-canonical/manifest.json` → `lut` |
| TARO-Carve-Mesh | `julich3-area-44-ifg-l` | `assets/bodyparts3d/atlas-carved-julich.glb` (Mesh-Name) |
| Watertight-3D-Objekt | `julich-area-44-ifg-l` / `brodmann-ba38-...` | Ontologie-GLBs (Mesh-Name) |
| Work-Manifest (Host-Mapping) | `julich3-area-45-ifg-l` → host `left-inferior-frontal-gyrus` | `scripts/atlas/work/atlas_labels_*.json` |

→ Der Katalog definiert **eine kanonische Areal-ID** pro Areal und hält ein **`refs`-Objekt**, das
auf den nativen Identifier jeder Ansicht zeigt. Nur so kann ein einziger Config-Toggle gleichzeitig
das fsaverage-Highlight, das TARO-Carve-Mesh und das watertight-Objekt schalten.

Kanonische ID-Form (Vorschlag): `<atlas>:<areal-slug>:<l|r>`, z.B. `julich:area-44-ifg:l`.

## Katalog-Schema (Sub-Projekt 1)

```ts
interface AtlasCatalog {
  version: string
  space_note: string                 // "fsaverage != TARO" Rahmung
  axes: Axis[]                        // macro | cyto (+ ggf. subcortex)
  atlases: AtlasNode[]
}

interface AtlasNode {
  id: 'dkt' | 'destrieux' | 'julich' | 'brodmann' | string
  axis: 'macro' | 'cyto'
  label_de: string
  groups: GroupNode[]                // native Hierarchie (Lappen/Area-Gruppe)
}

interface GroupNode {
  id: string                         // z.B. "frontal", "area-gruppe-broca"
  label_de: string
  areas: AreaNode[]
}

interface AreaNode {
  id: string                         // KANONISCH: "julich:area-44-ifg:l"
  label_de: string                   // "Area 44 · IFG (L)"
  side: 'L' | 'R'
  host: string                       // TARO-Host-Gyrus (aus host_map / atlas_labels)
  refs: {
    canonical_lut?: { layer: string; label_id: number }   // fsaverage
    carve_mesh?: string                                    // TARO-Carve-Mesh-Name
    watertight_mesh?: string                               // 3D-Objekt-Mesh-Name
  }
  context: AreaContext               // Facetten — in SP1 leer, in SP2 kuratiert
  provenance: AreaProvenance
}

interface AreaContext {
  clinic?: string                    // klinische Note (Läsion/Funktion)
  function?: string                  // funktionale Rolle
  chapter?: ChapterRef[]             // { figure?: "11-7", ocr_anchor?: string }
}

interface AreaProvenance {
  source: string                     // Atlas-Quelle + Version
  license?: string
  median_mm?: number                 // Transform-Fehler (aus work/atlas-manifest.json)
  backfill?: boolean                 // Mini-Patch bei Crowding
}
```

### Build-Inputs (maschinell ableitbar)

| Input | Liefert |
|-------|---------|
| `apps/brain-app/public/assets/atlas-canonical/manifest.json` | `layers`, `lut` (label-id → name/rgb) → `refs.canonical_lut`, `label_de` |
| `scripts/atlas/work/atlas_labels_{julich,dkt,brodmann}.json` | Areal → Host-Gyrus, side, backfill |
| `scripts/atlas/host_map.json` | Julich-Suffix → TARO-Host, Combined-Hosts |
| `scripts/atlas/work/atlas-manifest.json` | `n_vertices`, `median_mm` → `provenance` |
| Carve-/Watertight-GLB-Mesh-Namen | `refs.carve_mesh`, `refs.watertight_mesh` |

**Build-Skript:** `scripts/atlas/build-catalog.mjs` (oder `.py` analog zur bestehenden Pipeline)
→ schreibt `apps/brain-app/public/assets/atlas-canonical/atlas-ontology.json`.

### Verify (SP1, hart)

- **Jedes** Areal jeder LUT jedes Atlas löst zu genau einem `AreaNode` auf (kein Areal verwaist).
- **Jeder** `AreaNode` hat einen Host (oder ist explizit als hostlos markiert → lauter Fehler, kein stiller Default).
- `refs`-Identifier sind gegen die echten Mesh-Namen/LUT-IDs geprüft (kein toter Ref).
- Snapshot-Test: Katalog-Knotenzahl pro Atlas == erwartete Parzellenzahl (DKT 84, Julich 292, Brodmann 282, Destrieux 148 — bzw. die real gefundenen Zahlen).

## Config-Schema (Sub-Projekt 3, hier zur Orientierung)

```toml
preset = "kapitel11"          # "kapitel11" | "explorer" | "voll" | "custom"

[facets]
clinic = true
function = true
chapter = true
provenance = false

[view]
surface = "pial"              # "pial" | "inflated"
subcortex = true
carve_on_taro = "julich"      # "off" | "dkt" | "julich"

[atlas.julich]
enabled = true
[atlas.julich.groups]
frontal = true
temporal = false              # ganze Gruppe aus
[atlas.julich.areas]
"julich:area-44-ifg:l" = false  # einzelnes Areal aus (Override gegen Gruppe)

[atlas.dkt]
enabled = false               # ganzer Atlas aus
```

- **Presets** = benannte Toggle-Sets (wie Grafik-Presets Low/Medium/Ultra). `kapitel11` ist Default.
- **`custom`** = User hat im Settings-Menü von einem Preset abgewichen.
- Build validiert jede Areal-/Gruppen-ID im `config.toml` gegen den Katalog → **toter Toggle = lauter Build-Fehler**, kein stilles Ignorieren.

## Dekomposition — 4 Sub-Projekte (geordnet)

Jedes Sub-Projekt bekommt **eigenen Spec → Plan → Implement**. Reihenfolge ist Abhängigkeits-getrieben.

### SP1 — Katalog/Ontologie + Build  *(Start)*
Voll-Baum `Achse → Atlas → Gruppe → Areal`, kanonische IDs + `refs` + Host + Provenienz.
Context-Slots leer. Build-Skript + Runtime-Asset + Verify-Tests.
**Owned:** `scripts/atlas/build-catalog.mjs`, `assets/atlas-canonical/atlas-ontology.json`,
`apps/brain-app/src/viewer/atlas/atlasCatalog.ts` (Typen + Loader).

### SP2 — Context-Overlay (Kuration)
Handgepflegte `scripts/atlas/atlas-context.yaml` (Kapitel-Refs/Klinik/Funktion), im Build in
`context` gemergt. Erst Kapitel-11-Scope (PFC/BG). Bestehende `atlasBridge.ts`/`julichBridgeMap.json`
als Startpunkt der Kuration nutzen.
**Owned:** `scripts/atlas/atlas-context.yaml`, Build-Merge-Erweiterung.

### SP3 — Config-System (die `.ini`-Engine)
TOML-Schema + Build-Validierung (`config.toml` → `config.default.json`) + 3-Schichten-Resolver
(`config.default.json` < localStorage < URL) + Presets + „effective config"-Hook.
**Owned:** `scripts/atlas/config.default.toml`, `scripts/atlas/build-config.mjs`,
`apps/brain-app/src/viewer/atlas/atlasConfig.ts` (Resolver + React-Hook).

### SP4 — Drill-Down-UI + Settings-Menü
`AtlasLayerPanel` → hierarchischer Tree-Browser auf dem Katalog; zeigt effektiven On/Off-Zustand;
Toggle schreibt Schicht 2. Knoten-Klick treibt fsaverage-Highlight **und** TARO-Carve **und**
watertight-Objekt (via `refs`). Facetten-Panel zeigt Funktion/Klinik/Kapitel/Provenienz.
**Owned:** neue `AtlasTreeBrowser.tsx`, `AtlasFacetPanel.tsx`; Anbindung in `CanonicalAtlasMode.tsx`.

## Bestehende Realität, die respektiert wird

- **`brain.glb` unantastbar**, Sub-Patches in separaten GLBs (CLAUDE.md).
- **fsaverage ≠ TARO** — Katalog rahmt das explizit (`space_note`), zwingt keinen Voll-Atlas auf TARO.
- **„KEINE FALLBACKS"** (globale Regel): fehlender Host / toter Ref / unbekannte Toggle-ID → lauter
  Fehler an der Stelle, kein stiller Default.
- **Editorial Design System** (`ed-btn`/`eyebrow`/`ed-panel`), `theme-tokens` nicht editieren.
- **Code-Identifier ohne Umlaute** (`ae/oe/ue/ss`); Kommentare/Doku mit Umlauten.

## Offene Punkte (für SP1-Spec zu klären)

1. Subkortex steht aktuell **nicht** im `atlas-canonical/manifest.json` (`subcortical` leer) — Quelle
   für die Subkortex-Knoten muss im SP1-Spec festgelegt werden.
2. Build-Sprache: `.mjs` (Node, nahe der App) vs `.py` (nahe der bestehenden `scripts/atlas/`-Pipeline) — im SP1-Spec entscheiden.
3. Gruppen-Definition pro Atlas: DKT/Destrieux haben native Lappen/Gyrus-Struktur; Julich/Brodmann
   brauchen eine kuratierte Area-Gruppen-Einteilung — Quelle/Heuristik im SP1-Spec festlegen.
