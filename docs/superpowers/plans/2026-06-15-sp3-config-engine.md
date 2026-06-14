# SP3 — Atlas-Config-Engine (.ini-Style) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine TOML-Config (`config.default.toml`) wird beim Build gegen den Katalog (`atlas-ontology.json`) validiert (jede Areal-/Gruppen-/Atlas-/Achsen-/Config-/Step-Referenz muss existieren, sonst lauter `throw`) zu `config.json`; ein 3-Schichten-Resolver (`config.json` < localStorage < URL) mit Scope-Vererbung (Areal → Gruppe → Atlas → Achse), Presets, Konfigurations-Bibliothek und Sequenzen liefert eine „effective config" + React-Hook.

**Architecture:** Build-Skript (`build-config.mjs`, Node ESM) parst TOML via `smol-toml` (aus `apps/brain-app/node_modules`, aufgeloest via `createRequire(pathToFileURL(app-package.json))`), validiert jede Referenz gegen die Ontologie und schreibt `config.json`. Die App laedt `config.json` (Schicht 1), mergt `localStorage` (Schicht 2) + URL-`?params` (Schicht 3) pro Scope-Key; eine reine Resolver-Funktion (`resolveConfig`) erzeugt die „effective config", ein React-Hook (`useEffectiveConfig`) verpackt sie.

**Tech Stack:** Node ESM (`.mjs`), `smol-toml` (TOML-Parser, bereits Dep), `node:test` (Build-Validierung), Vitest + TypeScript (Resolver + Hook).

---

## Arbeitsweise (Pflicht — bei jeder Session lesen)
- Single Source of Truth fuer Fortschritt: **dieses File** + Dart `UizowmkkldwZ` parallel.
- TDD (fail-loud), kleine Commits pro Task. Code-Identifier ohne Umlaute (ae/oe/ue/ss).
- **KEINE FALLBACKS:** tote Referenz / fehlender Preset / unbekannte Scope-ID → lauter `throw`.
- Branch-Anker: `feature/atlas-config-ontologie`. Backup-Tag: `backup/pre-sp3-config-engine`.

## Status-Header
- Aktive Wave: SP3 — **DONE**
- Letzter Commit: Resolver+Hook (vitest 14/14), config.json deterministisch
- Backup-Tag: `backup/pre-sp3-config-engine`
- Branch: `feature/atlas-config-ontologie`
- Letzte Update: 2026-06-15

## Fortschritt
- [x] Task 1: `config.default.toml` (Presets + Configurations + Sequenzen, reale Area-IDs)
- [x] Task 2+3: `build-config.mjs` — Katalog-Index + Scope-Validierung + TOML→config.json Assembly + Run-Guard (node:test 8/8, Negativ-Probe wirft)
- [x] Task 4+5: `atlasConfig.ts` — 3-Schichten-Resolver + Vererbung + Presets/Sequenzen + `useEffectiveConfig`-Hook (vitest 14/14)
- [x] Task 6: Abschluss-Verifikation (build-config 8/8, SP1-Regression 12/12, vitest 21/21, typecheck 0) + Plan/Dart-Update

## Realisierungs-Abweichungen vom Plan (dokumentiert)
- **Task 2+3 zusammengelegt** (ein File `build-config.mjs`): Index/Validierung + Assembly/main/Run-Guard in einem Schritt geschrieben statt zwei Commits.
- **Task 4+5 zusammengelegt** (ein File `atlasConfig.ts`): Resolver+Typen und Presets/Sequenzen/Hook in einem Commit.
- **Output-Asset:** `apps/brain-app/public/assets/atlas-canonical/atlas-config.json` (neben `atlas-ontology.json`).
- **TOML-Redefine-Quirk:** Eine doppelte `[presets.x.scopes]`-Tabelle wirft bereits beim Parsen (smol-toml), nicht erst in der Scope-Validierung — Negativ-Probe daher via Umbenennen einer existierenden Area-ID auf tote ID gemacht (TOML valide, Ref tot → `tote Scope-Ref`-throw verifiziert).

---

## Daten-Grundlage (verifiziert 2026-06-15)

- **Katalog:** `apps/brain-app/public/assets/atlas-canonical/atlas-ontology.json` — Baum Achse→Atlas→Lappen(group)→Areal.
  - Achsen: `macro`, `cyto`. Atlanten: `dkt`, `destrieux`, `julich`, `brodmann`. Julich-Gruppen (Lappen): `frontal,insula,limbic,occipital,parietal,temporal`.
  - Areal-ID-Form `<atlas>:<code>:<l|r>`, z.B. `julich:area-44:l`, `dkt:parstriangularis:l`, `dkt:lateralorbitofrontal:l`.
- **TOML-Parser:** `smol-toml@1.6.1` liegt in `apps/brain-app/node_modules` (NICHT von repo-root auflösbar). Auflösung im Build-Skript:
  ```js
  import { createRequire } from 'node:module'
  import { pathToFileURL } from 'node:url'
  const appReq = createRequire(pathToFileURL(join(HERE, '../../apps/brain-app/package.json')))
  const { parse: parseToml } = await import(pathToFileURL(appReq.resolve('smol-toml')))
  ```

## Scope-Modell (das Herz der Engine)

Ein **Scope-Key** adressiert eine Vererbungs-Ebene. Vier Arten:

| Key-Form | Beispiel | Bedeutung |
|----------|----------|-----------|
| `axis:<id>` | `axis:cyto` | ganze Achse an/aus |
| `atlas:<id>` | `atlas:julich` | ganzer Atlas an/aus |
| `group:<atlas>:<lobe>` | `group:julich:frontal` | Lappen-Gruppe an/aus |
| `area:<atlas>:<code>:<side>` | `area:julich:area-44:l` | einzelnes Areal an/aus |

**Layer-Merge (Praezedenz):** `config.json(preset < configuration)` < `localStorage` < `URL` — **pro Scope-Key** (spaeterer Layer ueberschreibt denselben Key).

**Vererbung (Spezifizitaet) bei `isAreaEnabled(areaId)`:** laufe Areal → Gruppe → Atlas → Achse auf der gemergten Scope-Map; **erster expliziter Treffer** gewinnt; sonst Default `false`. So schlaegt ein expliziter Areal-Toggle eine geerbte Achse, und ein hoeherer Layer ueberschreibt nur denselben Key (kein „URL-Achse killt Datei-Areal").

---

## Task 1: `config.default.toml` (Presets + Configurations + Sequenzen)

**Files:**
- Create: `scripts/atlas/config.default.toml`

- [ ] **Step 1: Datei anlegen** (reale Area-IDs aus dem Katalog, kapitel11 = PFC-Fokus)

```toml
# Atlas-Config (.ini-Style). Authored TOML -> build-config.mjs -> config.json (validiert).
# Scope-Keys: axis:<id> | atlas:<id> | group:<atlas>:<lobe> | area:<atlas>:<code>:<side>.
# preset = aktive Default-Basis; configurations.* = benannte Atome; presentation/learning.* = Sequenzen.

preset = "kapitel11"

# --- Presets: benannte Default-Toggle-Sets ---------------------------------
[presets.kapitel11]
label_de = "Kapitel 11 (PFC/BG-Fokus)"
[presets.kapitel11.scopes]
"axis:macro" = false
"axis:cyto" = false
"area:julich:area-44:l" = true
"area:julich:area-45:l" = true
"area:dkt:parstriangularis:l" = true
"area:dkt:parsopercularis:l" = true
"area:dkt:lateralorbitofrontal:l" = true
"area:dkt:medialorbitofrontal:l" = true
"area:dkt:rostralanteriorcingulate:l" = true

[presets.explorer]
label_de = "Explorer (Makro sichtbar)"
[presets.explorer.scopes]
"axis:macro" = true
"axis:cyto" = false

[presets.voll]
label_de = "Voll (alle Atlanten)"
[presets.voll.scopes]
"axis:macro" = true
"axis:cyto" = true

# --- Configurations: benannte Atome (Folie / Lernschritt / Abb.-Ersetzung) --
[configurations.broca-areal]
label_de = "Broca-Areal (Abb. 11-7)"
replaces_figure = "11-7"
[configurations.broca-areal.facets]
clinic = true
function = true
chapter = true
provenance = false
[configurations.broca-areal.view]
surface = "pial"
subcortex = false
carve_on_taro = "julich"
[configurations.broca-areal.camera]
target = "julich:area-44:l"
[configurations.broca-areal.scopes]
"area:julich:area-44:l" = true
"area:julich:area-45:l" = true

[configurations.ofc-phineas]
label_de = "OFC / Phineas Gage"
replaces_figure = "11-4"
[configurations.ofc-phineas.facets]
clinic = true
function = true
chapter = true
provenance = false
[configurations.ofc-phineas.view]
surface = "pial"
subcortex = false
carve_on_taro = "dkt"
[configurations.ofc-phineas.camera]
target = "dkt:lateralorbitofrontal:l"
[configurations.ofc-phineas.scopes]
"area:dkt:lateralorbitofrontal:l" = true
"area:dkt:medialorbitofrontal:l" = true

# --- Sequenzen: geordnete Configuration-Namen ------------------------------
[presentation.kapitel11-vorlesung]
label_de = "Kapitel 11 — Vorlesung"
steps = ["broca-areal", "ofc-phineas"]

[learning.kapitel11-pfad]
label_de = "Lernpfad Kapitel 11"
steps = ["ofc-phineas", "broca-areal"]
```

- [ ] **Step 2: Committen**

```bash
git add scripts/atlas/config.default.toml
git commit -m "feat(atlas-config): config.default.toml (presets/configurations/sequenzen)"
```

---

## Task 2: `build-config.mjs` — Katalog-Index + Scope-Validierung

**Files:**
- Create: `scripts/atlas/build-config.mjs` (nur Index + Validierung in diesem Task)
- Test: `scripts/atlas/build-config.test.mjs`

Reine Funktionen: `indexCatalog(catalog)` (liefert Sets valider axis/atlas/group/area), `validateScopeKey(key, idx)`, `validateConfig(config, idx)`.

- [ ] **Step 1: Failing-Test schreiben**

```js
// scripts/atlas/build-config.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { indexCatalog, validateScopeKey, validateConfig } from './build-config.mjs'

const CATALOG = {
  axes: [{ id: 'macro' }, { id: 'cyto' }],
  atlases: [
    { id: 'julich', axis: 'cyto', groups: [
      { id: 'frontal', areas: [{ id: 'julich:area-44:l' }, { id: 'julich:area-45:l' }] },
    ] },
    { id: 'dkt', axis: 'macro', groups: [
      { id: 'frontal', areas: [{ id: 'dkt:parstriangularis:l' }] },
    ] },
  ],
}

test('indexCatalog sammelt valide IDs je Scope-Art', () => {
  const idx = indexCatalog(CATALOG)
  assert.ok(idx.axes.has('macro') && idx.axes.has('cyto'))
  assert.ok(idx.atlases.has('julich') && idx.atlases.has('dkt'))
  assert.ok(idx.groups.has('group:julich:frontal'))
  assert.ok(idx.areas.has('julich:area-44:l'))
})

test('validateScopeKey akzeptiert valide Keys', () => {
  const idx = indexCatalog(CATALOG)
  for (const k of ['axis:cyto', 'atlas:julich', 'group:julich:frontal', 'area:julich:area-44:l']) {
    assert.doesNotThrow(() => validateScopeKey(k, idx))
  }
})

test('validateScopeKey wirft bei toter Referenz', () => {
  const idx = indexCatalog(CATALOG)
  assert.throws(() => validateScopeKey('area:julich:area-99:l', idx), /area:julich:area-99:l/)
  assert.throws(() => validateScopeKey('atlas:nope', idx), /atlas:nope/)
  assert.throws(() => validateScopeKey('group:julich:nope', idx), /group:julich:nope/)
  assert.throws(() => validateScopeKey('axis:nope', idx), /axis:nope/)
  assert.throws(() => validateScopeKey('bogus:x', idx), /Scope-Art/)
})

test('validateConfig wirft bei totem Preset', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = { preset: 'ghost', presets: {}, configurations: {}, presentation: {}, learning: {} }
  assert.throws(() => validateConfig(cfg, idx), /Preset "ghost"/)
})

test('validateConfig wirft bei totem Step-Verweis', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: {} } },
    presentation: { seq: { steps: ['a', 'missing'] } }, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /Step "missing"/)
})

test('validateConfig wirft bei toter Areal-Ref in configuration.scopes', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: { 'area:julich:area-99:l': true } } },
    presentation: {}, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /area:julich:area-99:l/)
})

test('validateConfig wirft bei totem camera.target', () => {
  const idx = indexCatalog(CATALOG)
  const cfg = {
    preset: 'p', presets: { p: { scopes: {} } },
    configurations: { 'a': { scopes: {}, camera: { target: 'julich:area-99:l' } } },
    presentation: {}, learning: {},
  }
  assert.throws(() => validateConfig(cfg, idx), /camera.target/)
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `node --test scripts/atlas/build-config.test.mjs`
Expected: FAIL (Funktionen nicht exportiert).

- [ ] **Step 3: Minimal-Implementierung Index + Validierung**

```js
// scripts/atlas/build-config.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Sammelt valide Scope-IDs aus dem Katalog (axes/atlases/groups/areas). */
export function indexCatalog(catalog) {
  const idx = { axes: new Set(), atlases: new Set(), groups: new Set(), areas: new Set() }
  for (const ax of catalog.axes) idx.axes.add(ax.id)
  for (const a of catalog.atlases) {
    idx.atlases.add(a.id)
    for (const g of a.groups) {
      idx.groups.add(`group:${a.id}:${g.id}`)
      for (const area of g.areas) idx.areas.add(area.id)
    }
  }
  return idx
}

/** Wirft laut bei unbekannter Scope-Art oder toter Referenz. */
export function validateScopeKey(key, idx) {
  if (key.startsWith('axis:')) {
    const id = key.slice('axis:'.length)
    if (!idx.axes.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Achse unbekannt)`)
  } else if (key.startsWith('atlas:')) {
    const id = key.slice('atlas:'.length)
    if (!idx.atlases.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Atlas unbekannt)`)
  } else if (key.startsWith('group:')) {
    if (!idx.groups.has(key)) throw new Error(`build-config: tote Scope-Ref "${key}" (Gruppe unbekannt)`)
  } else if (key.startsWith('area:')) {
    const id = key.slice('area:'.length)
    if (!idx.areas.has(id)) throw new Error(`build-config: tote Scope-Ref "${key}" (Areal unbekannt)`)
  } else {
    throw new Error(`build-config: unbekannte Scope-Art in "${key}"`)
  }
}

const FACET_KEYS = new Set(['clinic', 'function', 'chapter', 'provenance'])
const SURFACES = new Set(['pial', 'inflated'])
const CARVE = new Set(['off', 'dkt', 'julich'])

/** Validiert die ganze Config gegen den Katalog. Jede tote Referenz wirft. */
export function validateConfig(config, idx) {
  if (!config.preset) throw new Error('build-config: kein aktives "preset" gesetzt')
  if (!config.presets?.[config.preset]) {
    throw new Error(`build-config: aktives Preset "${config.preset}" nicht in [presets] definiert`)
  }
  for (const [name, p] of Object.entries(config.presets)) {
    for (const key of Object.keys(p.scopes ?? {})) validateScopeKey(key, idx)
    void name
  }
  for (const [name, c] of Object.entries(config.configurations ?? {})) {
    for (const key of Object.keys(c.scopes ?? {})) validateScopeKey(key, idx)
    for (const fk of Object.keys(c.facets ?? {})) {
      if (!FACET_KEYS.has(fk)) throw new Error(`build-config: configuration "${name}" hat unbekannte Facette "${fk}"`)
    }
    if (c.view?.surface && !SURFACES.has(c.view.surface)) {
      throw new Error(`build-config: configuration "${name}" view.surface "${c.view.surface}" ungueltig`)
    }
    if (c.view?.carve_on_taro && !CARVE.has(c.view.carve_on_taro)) {
      throw new Error(`build-config: configuration "${name}" view.carve_on_taro "${c.view.carve_on_taro}" ungueltig`)
    }
    if (c.camera?.target && !idx.areas.has(c.camera.target)) {
      throw new Error(`build-config: configuration "${name}" camera.target "${c.camera.target}" — Areal unbekannt`)
    }
  }
  for (const seqKind of ['presentation', 'learning']) {
    for (const [seqName, seq] of Object.entries(config[seqKind] ?? {})) {
      for (const step of seq.steps ?? []) {
        if (!config.configurations?.[step]) {
          throw new Error(`build-config: ${seqKind} "${seqName}" referenziert unbekannten Step "${step}"`)
        }
      }
    }
  }
}
```

- [ ] **Step 4: Test laufen lassen — muss PASSEN**

Run: `node --test scripts/atlas/build-config.test.mjs`
Expected: PASS (alle Validierungs-Tests grün).

- [ ] **Step 5: Committen**

```bash
git add scripts/atlas/build-config.mjs scripts/atlas/build-config.test.mjs
git commit -m "feat(atlas-config): Katalog-Index + Scope-Validierung (node:test, fail-loud)"
```

---

## Task 3: `build-config.mjs` — TOML→config.json Assembly + Run-Guard

**Files:**
- Modify: `scripts/atlas/build-config.mjs` (loadToml + buildConfig + main + Run-Guard)
- Modify: `scripts/atlas/build-config.test.mjs` (Assembly-Test gegen echte Dateien)
- Create (Output): `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`

- [ ] **Step 1: Failing-Test ergänzen**

```js
// am Ende von scripts/atlas/build-config.test.mjs
import { buildConfig } from './build-config.mjs'

test('buildConfig: reale config.default.toml validiert gegen echten Katalog', async () => {
  const { config } = await buildConfig()
  assert.equal(config.preset, 'kapitel11')
  assert.ok(config.presets.kapitel11)
  assert.ok(config.configurations['broca-areal'])
  assert.deepEqual(config.presentation['kapitel11-vorlesung'].steps, ['broca-areal', 'ofc-phineas'])
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `node --test scripts/atlas/build-config.test.mjs`
Expected: FAIL (`buildConfig` nicht exportiert).

- [ ] **Step 3: `loadToml` + `buildConfig` + `main` ergänzen**

```js
// scripts/atlas/build-config.mjs — ergänzen

const APP_ASSETS = join(HERE, '../../apps/brain-app/public/assets/atlas-canonical')

/** smol-toml aus apps/brain-app/node_modules aufloesen (nicht von repo-root sichtbar). */
async function loadToml(path) {
  const appReq = createRequire(pathToFileURL(join(HERE, '../../apps/brain-app/package.json')))
  const { parse } = await import(pathToFileURL(appReq.resolve('smol-toml')))
  return parse(readFileSync(path, 'utf8'))
}

/** Parst config.default.toml, validiert gegen Katalog, gibt {config} zurueck. */
export async function buildConfig() {
  const catalog = JSON.parse(readFileSync(join(APP_ASSETS, 'atlas-ontology.json'), 'utf8'))
  const config = await loadToml(join(HERE, 'config.default.toml'))
  const idx = indexCatalog(catalog)
  validateConfig(config, idx)
  return { config }
}

async function main() {
  const { config } = await buildConfig()
  const out = join(APP_ASSETS, 'atlas-config.json')
  writeFileSync(out, JSON.stringify(config, null, 2))
  const nCfg = Object.keys(config.configurations ?? {}).length
  const nPreset = Object.keys(config.presets ?? {}).length
  console.log(`build-config: ${nPreset} Presets, ${nCfg} Configurations -> ${out}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 4: Test + Build laufen lassen**

Run: `node --test scripts/atlas/build-config.test.mjs` → PASS
Run: `node scripts/atlas/build-config.mjs` → `build-config: 3 Presets, 2 Configurations -> .../atlas-config.json`

- [ ] **Step 5: Negativ-Probe (manuell, fail-loud verifizieren)**

Temporär eine tote Areal-Ref in `config.default.toml` einfügen (`"area:julich:area-zzz:l" = true`), `node scripts/atlas/build-config.mjs` → muss mit `tote Scope-Ref` werfen + Exit 1. Danach Änderung zurücknehmen.

- [ ] **Step 6: Committen**

```bash
git add scripts/atlas/build-config.mjs scripts/atlas/build-config.test.mjs apps/brain-app/public/assets/atlas-canonical/atlas-config.json
git commit -m "feat(atlas-config): TOML->config.json Assembly + Run-Guard (validiert gegen Katalog)"
```

---

## Task 4: `atlasConfig.ts` — Resolver (3 Schichten + Vererbung) + Typen

**Files:**
- Create: `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
- Test: `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts`

- [ ] **Step 1: Failing-Test schreiben**

```ts
// apps/brain-app/src/viewer/atlas/atlasConfig.test.ts
import { describe, it, expect } from 'vitest'
import { resolveScopes, isAreaEnabled, type AtlasConfigFile, type ScopeMap } from './atlasConfig'

const FILE: AtlasConfigFile = {
  preset: 'kapitel11',
  presets: {
    kapitel11: { label_de: 'K11', scopes: { 'axis:cyto': false, 'area:julich:area-44:l': true } },
    voll: { label_de: 'Voll', scopes: { 'axis:cyto': true } },
  },
  configurations: {
    'broca-areal': { label_de: 'Broca', scopes: { 'area:julich:area-45:l': true } },
  },
  presentation: {}, learning: {},
}

// Mini-Katalog-Lookup: Areal -> {atlas, lobe, axis}
const LOOKUP = {
  'julich:area-44:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
  'julich:area-45:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
  'julich:area-46:l': { atlas: 'julich', lobe: 'frontal', axis: 'cyto' },
}

describe('resolveScopes: Layer-Merge pro Scope-Key', () => {
  it('localStorage ueberschreibt Datei pro Key, URL ueberschreibt localStorage', () => {
    const merged = resolveScopes(
      { 'axis:cyto': false, 'area:julich:area-44:l': true }, // file (preset+config gemergt)
      { 'area:julich:area-44:l': false },                    // localStorage
      { 'axis:cyto': true },                                 // url
    )
    expect(merged['area:julich:area-44:l']).toBe(false) // localStorage gewinnt ueber file
    expect(merged['axis:cyto']).toBe(true)              // url gewinnt ueber file
  })
})

describe('isAreaEnabled: Vererbung Areal->Gruppe->Atlas->Achse', () => {
  it('expliziter Areal-Toggle gewinnt ueber geerbte Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false, 'area:julich:area-44:l': true }
    expect(isAreaEnabled('julich:area-44:l', scopes, LOOKUP)).toBe(true)
  })
  it('ohne Areal-Toggle erbt das Areal von der Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false }
    expect(isAreaEnabled('julich:area-46:l', scopes, LOOKUP)).toBe(false)
  })
  it('Gruppe schlaegt Atlas schlaegt Achse', () => {
    const scopes: ScopeMap = { 'axis:cyto': false, 'atlas:julich': false, 'group:julich:frontal': true }
    expect(isAreaEnabled('julich:area-46:l', scopes, LOOKUP)).toBe(true)
  })
  it('default false wenn nichts greift', () => {
    expect(isAreaEnabled('julich:area-46:l', {}, LOOKUP)).toBe(false)
  })
  it('wirft bei unbekanntem Areal (kein stiller Default)', () => {
    expect(() => isAreaEnabled('julich:ghost:l', {}, LOOKUP)).toThrow(/unbekannt/)
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `cd apps/brain-app && pnpm test atlasConfig --run`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Resolver + Typen schreiben**

```ts
// apps/brain-app/src/viewer/atlas/atlasConfig.ts
// 3-Schichten-Config-Resolver. Scope-Keys: axis:<id> | atlas:<id> | group:<atlas>:<lobe> | area:<id>.
// Erzeugt von scripts/atlas/build-config.mjs (config.json). KEINE stillen Defaults.

export type ScopeMap = Record<string, boolean>

export interface PresetNode { label_de: string; scopes: ScopeMap }
export interface ConfigFacets { clinic?: boolean; function?: boolean; chapter?: boolean; provenance?: boolean }
export interface ConfigView { surface?: 'pial' | 'inflated'; subcortex?: boolean; carve_on_taro?: 'off' | 'dkt' | 'julich' }
export interface ConfigCamera { target?: string }
export interface ConfigurationNode {
  label_de: string
  replaces_figure?: string
  facets?: ConfigFacets
  view?: ConfigView
  camera?: ConfigCamera
  scopes: ScopeMap
}
export interface SequenceNode { label_de: string; steps: string[] }
export interface AtlasConfigFile {
  preset: string
  presets: Record<string, PresetNode>
  configurations: Record<string, ConfigurationNode>
  presentation: Record<string, SequenceNode>
  learning: Record<string, SequenceNode>
}

/** Areal-ID -> Vererbungs-Koordinaten (aus dem Katalog gebaut). */
export type AreaLookup = Record<string, { atlas: string; lobe: string; axis: string }>

/** Merge der 3 Schichten pro Scope-Key: file < localStorage < url. */
export function resolveScopes(file: ScopeMap, local: ScopeMap, url: ScopeMap): ScopeMap {
  return { ...file, ...local, ...url }
}

/** Vererbung: Areal -> Gruppe -> Atlas -> Achse; erster expliziter Treffer. Default false. */
export function isAreaEnabled(areaId: string, scopes: ScopeMap, lookup: AreaLookup): boolean {
  const co = lookup[areaId]
  if (!co) throw new Error(`isAreaEnabled: Areal "${areaId}" im Katalog unbekannt`)
  const chain = [
    `area:${areaId}`,
    `group:${co.atlas}:${co.lobe}`,
    `atlas:${co.atlas}`,
    `axis:${co.axis}`,
  ]
  for (const key of chain) {
    if (key in scopes) return scopes[key]
  }
  return false
}
```

- [ ] **Step 4: Test laufen lassen — muss PASSEN**

Run: `cd apps/brain-app && pnpm test atlasConfig --run`
Expected: PASS.

- [ ] **Step 5: Committen**

```bash
git add apps/brain-app/src/viewer/atlas/atlasConfig.ts apps/brain-app/src/viewer/atlas/atlasConfig.test.ts
git commit -m "feat(atlas-config): Resolver (3 Schichten + Vererbung) + Typen"
```

---

## Task 5: `atlasConfig.ts` — Presets/Sequenzen + `useEffectiveConfig`-Hook

**Files:**
- Modify: `apps/brain-app/src/viewer/atlas/atlasConfig.ts` (Layer-Quellen + effective config + Hook)
- Modify: `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts` (effective-config-Tests)

- [ ] **Step 1: Failing-Test ergänzen**

```ts
// ergänzen in atlasConfig.test.ts
import {
  buildAreaLookup, fileScopes, parseUrlScopes, computeEffectiveConfig,
} from './atlasConfig'
import type { AtlasCatalog } from './atlasCatalog'

const CATALOG = {
  version: '1', space_note: '', axes: [{ id: 'cyto', label_de: '', sub_de: '' }],
  atlases: [{ id: 'julich', axis: 'cyto', label_de: '', groups: [
    { id: 'frontal', label_de: '', areas: [
      { id: 'julich:area-44:l', label_de: '', side: 'L', hosts: [], taro_present: true, lobe: 'frontal',
        refs: { canonical_lut: { layer: 'julich', label_id: 1, hemi: 'L' }, carve: [] }, context: {},
        provenance: { source: 'julich', affine_det: null, backfill: false } },
    ] },
  ] }],
} as unknown as AtlasCatalog

describe('buildAreaLookup', () => {
  it('mappt Areal -> {atlas,lobe,axis}', () => {
    const lk = buildAreaLookup(CATALOG)
    expect(lk['julich:area-44:l']).toEqual({ atlas: 'julich', lobe: 'frontal', axis: 'cyto' })
  })
})

describe('fileScopes: Preset + aktive Configuration gemergt', () => {
  it('Configuration ueberschreibt Preset pro Key', () => {
    const s = fileScopes(FILE, 'voll', 'broca-areal')
    expect(s['axis:cyto']).toBe(true)              // aus preset voll
    expect(s['area:julich:area-45:l']).toBe(true)  // aus configuration
  })
  it('wirft bei unbekanntem Preset', () => {
    expect(() => fileScopes(FILE, 'ghost', null)).toThrow(/Preset "ghost"/)
  })
  it('wirft bei unbekannter Configuration', () => {
    expect(() => fileScopes(FILE, 'voll', 'ghost')).toThrow(/Configuration "ghost"/)
  })
})

describe('parseUrlScopes', () => {
  it('liest ?on / ?off als Areal-Scopes', () => {
    const s = parseUrlScopes(new URLSearchParams('on=julich:area-44:l&off=julich:area-45:l'))
    expect(s['area:julich:area-44:l']).toBe(true)
    expect(s['area:julich:area-45:l']).toBe(false)
  })
})

describe('computeEffectiveConfig', () => {
  it('liefert preset, activeConfiguration und isAreaEnabled', () => {
    const eff = computeEffectiveConfig(FILE, CATALOG, { preset: null, configuration: 'broca-areal', scopes: {} }, new URLSearchParams())
    expect(eff.preset).toBe('kapitel11')
    expect(eff.activeConfiguration).toBe('broca-areal')
    expect(eff.isAreaEnabled('julich:area-44:l')).toBe(true)
  })
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `cd apps/brain-app && pnpm test atlasConfig --run`
Expected: FAIL.

- [ ] **Step 3: Implementierung ergänzen**

```ts
// atlasConfig.ts — ergänzen
import { useEffect, useState } from 'react'
import { loadCatalog, type AtlasCatalog } from './atlasCatalog'

const CONFIG_URL = '/assets/atlas-canonical/atlas-config.json'
const LS_KEY = 'atlas-config-overrides'

/** Areal-Lookup aus dem Katalog (fuer Vererbung). */
export function buildAreaLookup(catalog: AtlasCatalog): AreaLookup {
  const lk: AreaLookup = {}
  for (const a of catalog.atlases) {
    for (const g of a.groups) {
      for (const area of g.areas) lk[area.id] = { atlas: a.id, lobe: g.id, axis: a.axis }
    }
  }
  return lk
}

/** Datei-Schicht: aktives Preset + aktive Configuration, pro Scope-Key gemergt. */
export function fileScopes(file: AtlasConfigFile, presetName: string, configName: string | null): ScopeMap {
  const preset = file.presets[presetName]
  if (!preset) throw new Error(`fileScopes: Preset "${presetName}" nicht definiert`)
  let scopes: ScopeMap = { ...preset.scopes }
  if (configName) {
    const cfg = file.configurations[configName]
    if (!cfg) throw new Error(`fileScopes: Configuration "${configName}" nicht definiert`)
    scopes = { ...scopes, ...cfg.scopes }
  }
  return scopes
}

/** URL-Schicht: ?on=id,id & ?off=id,id (kommagetrennt) -> Areal-Scopes. */
export function parseUrlScopes(params: URLSearchParams): ScopeMap {
  const scopes: ScopeMap = {}
  for (const id of (params.get('on') ?? '').split(',').filter(Boolean)) scopes[`area:${id}`] = true
  for (const id of (params.get('off') ?? '').split(',').filter(Boolean)) scopes[`area:${id}`] = false
  return scopes
}

/** localStorage-Schicht (Schicht 2): persistierte User-Overrides. */
export interface LocalOverrides { preset: string | null; configuration: string | null; scopes: ScopeMap }
export function loadLocalOverrides(): LocalOverrides {
  if (typeof localStorage === 'undefined') return { preset: null, configuration: null, scopes: {} }
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return { preset: null, configuration: null, scopes: {} }
  return JSON.parse(raw) as LocalOverrides
}

export interface EffectiveConfig {
  preset: string
  activeConfiguration: string | null
  facets: ConfigFacets
  view: ConfigView
  camera: ConfigCamera
  scopes: ScopeMap
  isAreaEnabled: (areaId: string) => boolean
}

/** Mergt die 3 Schichten zu einer effective config. Praezedenz: file < localStorage < url. */
export function computeEffectiveConfig(
  file: AtlasConfigFile,
  catalog: AtlasCatalog,
  local: LocalOverrides,
  url: URLSearchParams,
): EffectiveConfig {
  const lookup = buildAreaLookup(catalog)
  const urlPreset = url.get('preset')
  const urlConfig = url.get('config')
  const preset = urlPreset ?? local.preset ?? file.preset
  if (!file.presets[preset]) throw new Error(`computeEffectiveConfig: Preset "${preset}" nicht definiert`)
  const activeConfiguration = urlConfig ?? local.configuration ?? null
  if (activeConfiguration && !file.configurations[activeConfiguration]) {
    throw new Error(`computeEffectiveConfig: Configuration "${activeConfiguration}" nicht definiert`)
  }
  const scopes = resolveScopes(
    fileScopes(file, preset, activeConfiguration),
    local.scopes,
    parseUrlScopes(url),
  )
  const cfg = activeConfiguration ? file.configurations[activeConfiguration] : null
  return {
    preset,
    activeConfiguration,
    facets: cfg?.facets ?? {},
    view: cfg?.view ?? {},
    camera: cfg?.camera ?? {},
    scopes,
    isAreaEnabled: (areaId: string) => isAreaEnabled(areaId, scopes, lookup),
  }
}

async function loadConfigFile(): Promise<AtlasConfigFile> {
  const r = await fetch(CONFIG_URL)
  if (!r.ok) throw new Error(`loadConfigFile: ${CONFIG_URL} nicht ladbar (HTTP ${r.status})`)
  return (await r.json()) as AtlasConfigFile
}

/** React-Hook: laedt config.json + Katalog, liefert effective config (oder null waehrend Laden). */
export function useEffectiveConfig(): EffectiveConfig | null {
  const [eff, setEff] = useState<EffectiveConfig | null>(null)
  useEffect(() => {
    let alive = true
    Promise.all([loadConfigFile(), loadCatalog()]).then(([file, catalog]) => {
      if (!alive) return
      const url = new URLSearchParams(window.location.search)
      setEff(computeEffectiveConfig(file, catalog, loadLocalOverrides(), url))
    })
    return () => { alive = false }
  }, [])
  return eff
}
```

> **Hinweis:** `?? {}` bei `facets/view/camera` ist KEIN Fehler-maskierender Fallback — eine Configuration ohne `facets` bedeutet fachlich „keine Facetten aktiv". `preset`/`configuration`-Existenz wird hart geprüft (throw).

- [ ] **Step 4: Test + Typecheck**

Run: `cd apps/brain-app && pnpm test atlasConfig --run` → PASS
Run: `cd apps/brain-app && pnpm typecheck` → Exit 0

- [ ] **Step 5: Committen**

```bash
git add apps/brain-app/src/viewer/atlas/atlasConfig.ts apps/brain-app/src/viewer/atlas/atlasConfig.test.ts
git commit -m "feat(atlas-config): Presets/Sequenzen-Selektion + useEffectiveConfig-Hook"
```

---

## Task 6: Abschluss-Verifikation + Plan/Dart-Update

- [ ] **Step 1: Volle Verifikation**

```bash
node --test scripts/atlas/build-config.test.mjs   # exit 0
node scripts/atlas/build-config.mjs               # config.json erzeugt
node --test scripts/atlas/build-catalog.test.mjs  # SP1-Regression grün
cd apps/brain-app && pnpm typecheck               # Exit 0
pnpm test atlasConfig atlasCatalog --run          # grün
```

- [ ] **Step 2: Plan-Header auf DONE, Dart `UizowmkkldwZ` → Done, Doc `vILMe44zy923` nachziehen.**

- [ ] **Step 3: Force-add Plan committen** (`docs/superpowers` ist gitignored)

```bash
git add -f docs/superpowers/plans/2026-06-15-sp3-config-engine.md
git commit -m "docs(atlas-config): SP3-Plan auf DONE"
```

---

## Definition of Done SP3
- `config.default.toml` (Presets/Configurations/Sequenzen) build-validiert → `atlas-config.json`.
- Build wirft laut bei toter Areal-/Gruppen-/Atlas-/Achsen-/Config-/Step-Referenz (verifiziert via Negativ-Probe).
- Resolver: 3 Schichten (file < localStorage < url) + Vererbung (Areal→Gruppe→Atlas→Achse), beide getestet.
- `useEffectiveConfig`-Hook liefert effective config; typecheck + vitest grün.
- SP1-Regression (`build-catalog.test.mjs`, `atlasCatalog`) bleibt grün.

## Scope-Grenzen SP3 (explizit)
- Kein UI (SP4). Kein Transition/Interpolation (SP5). Kein Subkortex.
- `learning.*`/`presentation.*` werden validiert + geladen, aber Sequenz-Navigation (Step-Index, ?step=) ist SP4/SP5.
- localStorage-Schreiben (Settings-Menü) ist SP4; SP3 liefert nur `loadLocalOverrides` (Lesen).
