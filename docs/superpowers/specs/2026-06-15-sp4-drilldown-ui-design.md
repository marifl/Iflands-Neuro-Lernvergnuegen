# SP4 — Drill-Down-UI + Settings-Menü — Design

> **Status:** Design freigegeben (User delegiert: „mach was Sinn ergibt"). · **Datum:** 2026-06-15
> **Branch-Anker:** `feature/atlas-config-ontologie` · **Baut auf:** SP1 (Katalog) + SP3 (Config-Engine, `useEffectiveConfig`).

## Ziel (in einem Satz)

Der Katalog (`atlas-ontology.json`, Baum Achse→Atlas→Lappen→Areal) wird als hierarchischer
**Tree-Browser** sichtbar und bedienbar: er zeigt den effektiven On/Off-Zustand (aus SP3s
`useEffectiveConfig`), Toggle schreibt die localStorage-Schicht, Areal-Klick treibt fsaverage-Highlight
+ Kamera, die aktive Config filtert die Carve-Parzellen auf TARO, ein Facetten-Panel zeigt den Context,
und ein Save-Loop exportiert den aktuellen Zustand als TOML-Snippet.

## Scope-Entscheidungen (aus Brainstorming, verbindlich)

| Frage | Entscheidung | Konsequenz |
|-------|--------------|-----------|
| Multi-View | **Ein View, Tree synchronisiert** | Kein Split-View-Umbau; Tree-State + refs-Aufloesung konsistent ueber Modi |
| „Areal aus" auf fsaverage | **Nur Tree + Carve, fsaverage voll** | KEIN Shader-Eingriff; Enable-State steuert Tree + Carve-Sichtbarkeit + Highlight |
| Carve auf TARO | **Ja** — aktive Config filtert `AtlasOverlay`-Parzellen | Cross-Mode-Verdrahtung via `isAreaEnabled` |
| Watertight-3D | **Draussen** (Refs fehlen im Katalog, SP1-Luecke) | Eigener SP1-Nachzug spaeter; hier graceful Abwesenheit (kein Fallback) |
| Autoren-Loop (Save) | **TOML-Export** (Copy-Paste-Snippet) | Kein Runtime-Write in config.json; Snippet ist `build-config`-validierbar |

## Architektur — Komponenten (owned)

```
useEffectiveConfig (SP3)                 atlasCatalog (SP1)
        │                                       │
        ▼                                       ▼
  atlasConfigStore  ───writes Schicht 2───►  AtlasTreeBrowser ──Klick──► Highlight/Kamera
   (localStorage)                                │  │
        │                                        │  └─► AtlasFacetPanel (Context/Provenienz)
        │                                        ▼
        └────────────► AtlasOverlay (TARO-Carve, per isAreaEnabled gefiltert)
                                                 ▲
                                          configExport (TOML-Snippet)
```

1. **`atlasConfigStore.ts`** — Zustand-Store fuer die localStorage-Schicht 2 (Key `atlas-config-overrides`,
   den SP3s `loadLocalOverrides` bereits liest). State: `{ preset, configuration, scopes }`.
   API: `toggleScope(key)`, `setScope(key, bool)`, `clearScope(key)`, `setPreset`, `setConfiguration`,
   `reset`. Persistiert via `localStorage`. **KEINE stillen Defaults** — korruptes JSON wirft beim Laden.

2. **`AtlasTreeBrowser.tsx`** — rekursiver Tree auf dem Katalog (Achse→Atlas→Lappen→Areal). Pro Knoten:
   effektiver On/Off-Zustand (Areal via `isAreaEnabled`; Gruppe/Atlas/Achse via Aggregat `groupEnabledState`
   = all/some/none). Checkbox-Toggle schreibt den passenden Scope-Key in den Store. Areal-Klick selektiert
   (Highlight + Kamera-Ziel). Ersetzt die Layer-Liste in `AtlasLayerPanel`; Atlas-Knoten-Auswahl setzt den
   aktiven fsaverage-Layer. Surface/Subkortex-Controls bleiben im Panel.

3. **`AtlasFacetPanel.tsx`** — zeigt `context` (clinic/function/chapter/provenance) + `provenance`
   (source/affine_det/backfill) des gepickten Areals. Context ist bis SP2 `{}` → rendert explizit
   „keine kuratierten Daten" (dokumentierte Abwesenheit, KEIN maskierender Fallback).

4. **`configExport.ts`** — reine Funktion `toTomlConfiguration(name, eff)`: serialisiert den aktuellen
   effective-Zustand (aktive Areal-Scopes + view + camera) als `[configurations.<name>]`-TOML-Block.
   Roundtrip-Garantie: Export → einfuegen in `config.default.toml` → `build-config` validiert ohne Fehler.

5. **Verdrahtung (modify):**
   - `CanonicalAtlasMode.tsx` — konsumiert `useEffectiveConfig`; rendert `AtlasTreeBrowser` + `AtlasFacetPanel`;
     Klick→Highlight/Kamera; Tree-Toggle→Store→Re-Resolve.
   - `AtlasOverlay.tsx` (TARO-Modus) — filtert die eingeblendeten Carve-Parzellen per `isAreaEnabled`
     gegen die effective config (Carve-Sync ueber die Modus-Grenze).

## Datenfluss

1. Mount: `useEffectiveConfig` laedt `config.json` + Katalog, mergt 3 Schichten → effective config.
2. Tree rendert Katalog-Baum; pro Knoten On/Off aus effective config.
3. User togglet Knoten → `atlasConfigStore` schreibt Scope-Key in localStorage → `useEffectiveConfig`
   re-resolved (Store-Subscription) → Tree + Carve + Highlight aktualisieren.
4. User klickt Areal → Highlight-Label + Kamera-Ziel (refs.canonical_lut für fsaverage).
5. Save → `toTomlConfiguration` erzeugt Snippet → Copy.

## Fehlerbehandlung (KEINE FALLBACKS)

- Store-Laden: korruptes localStorage-JSON → `throw` (kein stiller Reset).
- Tree: Areal-ID ohne Katalog-Eintrag → `isAreaEnabled` wirft (SP3-Garantie).
- Facet: leerer Context ist valide („keine Daten"), NICHT geworfen; fehlende `provenance` ist Bug → wirft.
- Carve-Sync: Areal ohne Carve-Ref = legitime Abwesenheit (Destrieux), kein Fehler.

## Testing

- `atlasConfigStore.test.ts` — Toggle/setScope/clearScope/reset + Persist-Roundtrip + Throw bei korruptem JSON.
- `groupEnabledState` (reine Funktion in `AtlasTreeBrowser`-Modul oder eigenem `treeState.ts`) — all/some/none Aggregat.
- `configExport.test.ts` — `toTomlConfiguration` erzeugt Block, der nach Re-Parse + `validateConfig` durchläuft.
- Browser-Smoke: Tree rendert, Toggle persistiert, Carve auf TARO folgt, Facet zeigt „keine Daten".

## Owned Files

- Create: `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts` (+ `.test.ts`)
- Create: `apps/brain-app/src/viewer/atlas/AtlasTreeBrowser.tsx`
- Create: `apps/brain-app/src/viewer/atlas/treeState.ts` (+ `.test.ts`) — reine Aggregat-Logik
- Create: `apps/brain-app/src/viewer/atlas/AtlasFacetPanel.tsx`
- Create: `apps/brain-app/src/viewer/atlas/configExport.ts` (+ `.test.ts`)
- Modify: `apps/brain-app/src/viewer/atlas/AtlasLayerPanel.tsx`, `CanonicalAtlasMode.tsx`, `AtlasOverlay.tsx`

## Bestehende Realität, die respektiert wird

- `useEffectiveConfig`/`isAreaEnabled`/`AreaLookup` aus SP3 sind die Daten-Bruecke — nicht neu erfinden.
- Editorial Design System (`ed-btn`/`eyebrow`/`ed-panel`), `theme-tokens` nicht editieren.
- Code-Identifier ohne Umlaute (ae/oe/ue/ss); Kommentare/Doku deutsch mit Umlauten.
- R3F/Three-Best-Practices: kein React-Tax im Render-Pfad; Material/Geometrie-Sharing; Frameloop.
- `brain.glb` unantastbar; Sub-Patches in separaten GLBs.
