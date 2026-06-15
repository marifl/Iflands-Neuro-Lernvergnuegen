# SP4 — Drill-Down-UI + Settings-Menü · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development oder executing-plans. Checkbox-Steps.

**Goal:** Katalog wird als Tree-Browser sichtbar/bedienbar (effektiver On/Off via SP3-`useEffectiveConfig`, Toggle→localStorage, Klick→Highlight/Kamera), Facetten-Panel, TOML-Export-Save-Loop, Carve-Sync auf TARO.

**Architecture:** Reine Logik (Store, Tree-Aggregat, TOML-Export) unit-getestet zuerst; dann React/R3F-Komponenten + Verdrahtung in CanonicalAtlasMode/AtlasOverlay. Daten-Bruecke = SP3 (`isAreaEnabled`/`AreaLookup`/`useEffectiveConfig`).

**Tech Stack:** React + Zustand, Vitest, TypeScript, R3F (Carve-Shader).

---

## Arbeitsweise / Status / Fortschritt

- Branch: `feature/atlas-config-ontologie` · Backup-Tag: `backup/pre-sp4-drilldown`
- Aktive Wave: SP4 — IN PROGRESS · Letzte Update: 2026-06-15
- Reihenfolge nach Wert/Risiko: rein-logische Module (testbar) → Komponenten → Verdrahtung → Carve-Sync.

## Fortschritt
- [ ] Task 1: `atlasConfigStore.ts` — localStorage-Schicht-2-Store (Zustand) + Tests
- [ ] Task 2: `treeState.ts` — Aggregat all/some/none + Katalog→Baum + Tests
- [ ] Task 3: `configExport.ts` — effective→TOML-Snippet + Roundtrip-Test
- [ ] Task 4: `AtlasTreeBrowser.tsx` + `AtlasFacetPanel.tsx` (Render-Komponenten)
- [ ] Task 5: Verdrahtung `CanonicalAtlasMode.tsx` (Tree/Facet/Highlight/Kamera + Store)
- [ ] Task 6: Carve-Sync `AtlasOverlay.tsx` (LUT-Alpha per `isAreaEnabled`) — abtrennbar
- [ ] Task 7: Verifikation + Plan/Dart-Update

## Daten-Grundlage (verifiziert)
- SP3-API in `apps/brain-app/src/viewer/atlas/atlasConfig.ts`: `ScopeMap`, `isAreaEnabled(areaId, scopes, lookup)`, `buildAreaLookup(catalog)`, `LocalOverrides`, `loadLocalOverrides()`, `computeEffectiveConfig`, `useEffectiveConfig`.
- localStorage-Key (SP3 liest ihn): `atlas-config-overrides`, Shape `{preset, configuration, scopes}`.
- Katalog: `atlasCatalog.ts` (`AtlasCatalog`, Baum atlases→groups→areas; area.id `<atlas>:<code>:<l|r>`).
- Carve-Mesh: `apps/brain-app/src/viewer/AtlasOverlay.tsx` (EIN vertex-Mesh pro Quelle, `parcelRgb(slug)`-LUT; slug == `refs.carve`-Eintrag). Toggles in `viewerStore` (`showCarve{Julich,Dkt,Brodmann}`).

---

## Task 1: `atlasConfigStore.ts` (localStorage-Store)

**Files:** Create `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts` + `.test.ts`

Zustand-Store, der die SP3-`LocalOverrides` schreibt/persistiert. `toggleScope`/`setScope`/`clearScope`/`setPreset`/`setConfiguration`/`reset`. Persist nach `localStorage[atlas-config-overrides]`. Laden wirft bei korruptem JSON (kein stiller Reset).

- [ ] Step 1: Failing-Test (toggle setzt/entfernt Key; setScope; reset leert; persist-Roundtrip via localStorage-Mock; korruptes JSON wirft).
- [ ] Step 2: Test rot.
- [ ] Step 3: Store implementieren (Zustand `create`, `persist`-frei: manuell `localStorage` lesen/schreiben über SP3-`loadLocalOverrides` + eigener Writer; KEINE stillen Defaults).
- [ ] Step 4: Test grün.
- [ ] Step 5: Commit `feat(atlas-ui): atlasConfigStore (localStorage Schicht 2)`.

## Task 2: `treeState.ts` (Aggregat + Baum)

**Files:** Create `treeState.ts` + `.test.ts`

Reine Funktionen: `groupEnabledState(areaIds, isEnabled) -> 'all'|'some'|'none'` und `scopeKeyForNode(kind, ...)`. Liefert dem Tree den Tri-State pro Gruppen/Atlas/Achsen-Knoten.

- [ ] Step 1: Failing-Test (all/some/none; scopeKey-Bau `axis:`/`atlas:`/`group:`/`area:`).
- [ ] Step 2: rot. Step 3: impl. Step 4: grün. Step 5: Commit `feat(atlas-ui): treeState Aggregat (all/some/none)`.

## Task 3: `configExport.ts` (TOML-Export)

**Files:** Create `configExport.ts` + `.test.ts`

`toTomlConfiguration(name, {scopes, view, camera}) -> string`: erzeugt `[configurations.<name>]`-Block (+ `.view`/`.camera`/`.scopes`-Subtabellen, nur aktive `area:`-Scopes als `true`). Roundtrip: Re-Parse via smol-toml + SP3-`validateConfig` läuft durch.

- [ ] Step 1: Failing-Test (Block enthält name/scopes; Re-Parse ergibt erwartete Keys).
- [ ] Step 2: rot. Step 3: impl (string-build, Quoting der Scope-Keys). Step 4: grün. Step 5: Commit `feat(atlas-ui): configExport (effective -> TOML-Snippet)`.

## Task 4: Render-Komponenten

**Files:** Create `AtlasTreeBrowser.tsx`, `AtlasFacetPanel.tsx`

Tree rekursiv über `AtlasCatalog`; pro Areal Checkbox (`isAreaEnabled`), pro Gruppe/Atlas/Achse Tri-State (`groupEnabledState`); Toggle→Store; Areal-Klick→`onPick(areaId)`. Facet zeigt `context`/`provenance`; leerer Context → „keine kuratierten Daten". Editorial-Stil (`ed-btn`/`eyebrow`/`ed-panel`).

- [ ] Step 1: Komponenten schreiben (props-getrieben, keine Datenladung intern). Step 2: typecheck. Step 3: Commit.

## Task 5: Verdrahtung `CanonicalAtlasMode.tsx`

`useEffectiveConfig` + `atlasConfigStore` einhängen; `AtlasLayerPanel`-Layerliste durch `AtlasTreeBrowser` ersetzen (Atlas-Knoten = aktiver Layer); `AtlasFacetPanel` für gepicktes Areal; Klick setzt Highlight (refs.canonical_lut.label_id) + Kamera-Ziel.

- [ ] Step 1: Verdrahten. Step 2: typecheck + bestehende atlas-Tests grün. Step 3: Browser-Smoke. Step 4: Commit.

## Task 6: Carve-Sync `AtlasOverlay.tsx` (abtrennbar)

`CarveSurface`-LUT um Alpha/Desaturierung pro slug erweitern: slug→areaId (reverse aus `refs.carve`), `isAreaEnabled` → deaktivierte Parzellen grau/transparent. Effective config via `useEffectiveConfig` in den TARO-Modus reichen.

- [ ] Step 1: slug→areaId-Map + LUT-Alpha. Step 2: typecheck. Step 3: Browser-Smoke (Carve folgt Toggle). Step 4: Commit. (Falls Risiko zu hoch → dokumentiert auf Folge-Schritt verschieben.)

## Task 7: Verifikation + Update
- [ ] `pnpm typecheck` exit 0; `pnpm test atlas` grün; SP3-Regression grün.
- [ ] Plan→DONE, Dart `XdDuz0JzLZxt`→Done (+Subtasks), Doc nachziehen.

## Scope-Grenzen (explizit)
- Watertight-3D draussen (Refs fehlen, SP1-Nachzug). Split-View draussen. Transitions=SP5. Context-Kuration=SP2.
- Save-Loop = TOML-Export (kein Runtime-Write in config.json).
