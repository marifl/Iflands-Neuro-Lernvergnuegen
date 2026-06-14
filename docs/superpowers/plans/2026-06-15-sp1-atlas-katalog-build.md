# SP1 — Atlas-Katalog + Build · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Build-Skript mergt die maschinell ableitbaren Atlas-Quellen zu **einem** Runtime-Katalog `atlas-ontology.json` (4 Kortex-Atlanten), plus TS-Typen, Loader und Invarianten-Tests.

**Architecture:** Node-Merge-Skript (`.mjs`, reine JSON-Inputs) erzeugt den Katalog als statisches Asset; die App lädt + validiert ihn über ein TS-Modul. Areal-Einheit = fsaverage-LUT-Eintrag pro Seite; TARO-Carve-Parzellen hängen als `refs` darunter; Host kommt aus den Carve-Labels; Gruppierung nach Lappen via kuratierter `lobe-map.json`.

**Tech Stack:** Node ESM (`.mjs`), `node:test` für Build-Helfer, Vitest + TypeScript für Runtime-Loader/Invarianten.

---

## Status-Header
- Aktive Wave: SP1 — **DONE**
- Letzter Commit: `bef189d` (Review-Haertung)
- Backup-Tag: `backup/pre-sp1-atlas-katalog`
- Branch: `feature/atlas-config-ontologie`
- Letzte Update: 2026-06-15

## Fortschritt
- [x] Task 1: `lobe-map.json` (Gyrus→Lappen + Destrieux/DKT/Julich/Brodmann-Fallbacks) · `c1be6d3`
- [x] Task 2: Parse-/Join-Helfer im Build-Skript (mit `node:test`) · `1cc8d6a`
- [x] Task 3: Katalog-Assembly + `atlas-ontology.json` (590 Areale, Orphan-Check) · `2292521`
- [x] Task 4: TS-Typen + Loader (`atlasCatalog.ts`) · `4328582`
- [x] Task 5: Runtime-Invarianten-Tests (`atlasCatalog.test.ts`, vitest 7/7) · `4328582`
- [x] Review-Haertung: Ueber-Konsumptions-Guard + LOBE_LABEL fail-loud · `bef189d`

## Realisierungs-Abweichungen vom Plan (dokumentiert)
Beim Erden an echten Daten kamen Julich-Eigenheiten hoch, die der Plan unterschaetzte:
- **Julich-Join = Prefix-Match aus `julichSlug`** statt Code-Split. Carve-Namen haben variable
  Host-Suffixe (`julich3-area-te-1-0-heschl`, `julich3-ca1-hippocampus`, `…-gapmap`). Die toten
  `julich`-Zweige in `lutCode`/`carveCode` wurden entfernt.
- **Areal-Zahlen** real: dkt 68, destrieux 148, julich 292, brodmann 82 = **590** (nicht „LUT×2"):
  Non-Region-Eintraege (`corpuscallosum`, `Medial_wall`, 2× `nicht kartiert`) werden explizit +
  geloggt ausgeschlossen (nicht als `medial` geflaggt, aber keine teachable Region).
- **Lobe-Fallbacks** erweitert: DKT-Name-Tabelle (alle 35), Julich-Host-Abbrev, **BA33→limbic**
  (einziger Brodmann ohne Carve), 8 zusaetzliche Destrieux-Sulcus-Praefixe.
- **Run-Guard-Bugfix:** `file://${argv[1]}` scheiterte an Leerzeichen im Pfad → `pathToFileURL`.
- **Review-Haertung:** Ueber-Konsumptions-Guard (Prefix-Kollision), `LOBE_LABEL` wirft statt `?? lobe`.
- **Bekannt/offen (Low, unerreichbar):** `lobeOfJulichName` Multi-Host-Substring ist ordnungs-
  abhaengig — aktuell **nie erreicht** (0 julich-Areale ohne Carve), daher nicht gefixt.

---

## Daten-Grundlage (verifiziert 2026-06-15)

| Quelle | Pfad | Liefert |
|--------|------|---------|
| Canonical-LUTs | `apps/brain-app/public/assets/atlas-canonical/manifest.json` → `lut.<layer>` | `{label_id: {rgb, name, medial?}}`; non-medial: dkt 35, destrieux 75, julich 148, brodmann 41 |
| Carve-Labels | `scripts/atlas/work/atlas_labels_{julich,dkt,brodmann}.json` | `{carveKey: {host, side, host_stem, vertex_indices, backfill}}`; counts: julich 292, dkt 60, brodmann 282 |
| Aggregat-Provenienz | `scripts/atlas/work/atlas-manifest.json` → `sources.<layer>` | `affine_det`, `n_total`, `backfill_parcels[]` |

**Join LUT↔Carve** (verifiziert an echten Namen):
- **dkt**: LUT `parstriangularis` ↔ Carve `parstriangularis-l` → `carveKey.replace(/-(l|r)$/,'')` == `lutName.toLowerCase()`.
- **julich**: LUT `Area 44 (IFG)` / `Area 6d1 (PreCG)` / `Area s32 (sACC)` ↔ Carve `julich3-area-44-ifg-l` → Code = erstes Segment nach `julich3-area-`; LUT-Code = Token nach `Area ` (lowercase).
- **brodmann**: LUT `BA44` ↔ Carve `brodmann-ba44-<host>-l` (**mehrere** pro BA) → Code = BA-Nummer; `refs.carve` ist Array.
- **destrieux**: **kein** Carve → `refs.carve = []`, `hosts = []`, `taro_present = false`.

**Kanonische Areal-ID:** `<layer>:<code>:<l|r>` — z.B. `brodmann:44:l`, `julich:6d1:l`, `dkt:parstriangularis:l`.

**Scope-Grenzen SP1 (explizit):**
- Nur 4 Kortex-Atlanten (kein Subkortex — Folge-Schritt).
- `refs` deckt `canonical_lut` + `carve`; **watertight-Mesh-Refs später** (brauchen GLB-Namens-Extraktion via `list_glb_names.mjs`).
- `context` (Klinik/Funktion/Kapitel) bleibt leer → SP2.
- Areal-Universum = LUT-non-medial × 2 Seiten (die App rendert beide Hemis mit derselben LUT). Kein stiller Default: fehlt ein Host in `lobe-map.json`, wirft der Build laut.

---

## Vorbereitung

- [ ] **Backup-Tag setzen**

Run: `git tag backup/pre-sp1-atlas-katalog && git rev-parse --short HEAD`
Expected: Tag erstellt, SHA ausgegeben.

---

## Task 1: `lobe-map.json` (Gyrus→Lappen + Destrieux-Prefix)

**Files:**
- Create: `scripts/atlas/lobe-map.json`

Die ~25 distinkten `host_stem` (union über julich/dkt/brodmann) + Destrieux-Namens-Präfixe → Lappen.

- [ ] **Step 1: Datei anlegen**

```json
{
  "_doc": "host_stem (aus atlas_labels_*.json) -> Lappen. destrieux_prefix: LUT-Namens-Praefix -> Lappen (Destrieux hat keinen Carve-Host). Lappen-Vokabular: frontal|parietal|temporal|occipital|insula|limbic.",
  "host_stem_to_lobe": {
    "superior-frontal-gyrus": "frontal",
    "middle-frontal-gyrus": "frontal",
    "inferior-frontal-gyrus": "frontal",
    "precentral-gyrus": "frontal",
    "frontal-pole-combined": "frontal",
    "ofc-combined": "frontal",
    "lateral-orbital-gyrus": "frontal",
    "medial-orbital-gyrus": "frontal",
    "posterior-orbital-gyrus": "frontal",
    "postcentral-gyrus": "parietal",
    "superior-parietal-lobule": "parietal",
    "ipl-combined": "parietal",
    "supramarginal-gyrus": "parietal",
    "precuneus": "parietal",
    "superior-temporal-gyrus": "temporal",
    "middle-temporal-gyrus": "temporal",
    "inferior-temporal-gyrus": "temporal",
    "fusiform-gyrus": "temporal",
    "heschl-combined": "temporal",
    "parahippocampal-gyrus": "temporal",
    "hippocampus-proper": "temporal",
    "cuneus": "occipital",
    "lingual-gyrus": "occipital",
    "lateral-occipital-gyrus": "occipital",
    "insula-combined": "insula",
    "first-short-gyrus-of-insula": "insula",
    "cingulate-gyrus": "limbic"
  },
  "destrieux_prefix_to_lobe": [
    ["G_front", "frontal"], ["S_front", "frontal"], ["G_and_S_frontomargin", "frontal"],
    ["G_and_S_transv_frontopol", "frontal"], ["G_and_S_subcentral", "frontal"],
    ["G_precentral", "frontal"], ["S_central", "frontal"], ["G_and_S_paracentral", "frontal"],
    ["G_orbital", "frontal"], ["G_rectus", "frontal"], ["G_subcallosal", "frontal"], ["Lat_Fis-ant", "frontal"],
    ["G_postcentral", "parietal"], ["G_pariet", "parietal"], ["G_parietal", "parietal"],
    ["G_precuneus", "parietal"], ["S_intrapariet", "parietal"], ["S_interm_prim-Jensen", "parietal"],
    ["S_cingul-Marginalis", "parietal"], ["S_subparietal", "parietal"],
    ["G_temp", "temporal"], ["G_temporal", "temporal"], ["S_temporal", "temporal"],
    ["Pole_temporal", "temporal"], ["G_oc-temp", "temporal"], ["S_oc-temp", "temporal"],
    ["S_collat_transv", "temporal"], ["Lat_Fis-post", "temporal"],
    ["G_cuneus", "occipital"], ["G_occipital", "occipital"], ["G_and_S_occipital_inf", "occipital"],
    ["Pole_occipital", "occipital"], ["S_calcarine", "occipital"], ["S_oc_", "occipital"], ["S_oc-", "occipital"],
    ["G_Ins", "insula"], ["G_insular", "insula"], ["S_circular_insula", "insula"],
    ["G_and_S_cingul", "limbic"], ["G_cingul", "limbic"], ["S_cingul", "limbic"]
  ],
  "_doc_name_fallback": "Lobe-Quelle ist primaer der Carve-Host; nur Areale OHNE Carve-Treffer nutzen diese Name->Lappen-Tabellen. dkt_name_to_lobe deckt alle 35 DKT-Gyri; julich_host_abbrev_to_lobe deckt die Parenthese in 'Area X (ABBR)'. Brodmann hat immer Carve -> kein Name-Fallback (sonst lauter Fehler).",
  "dkt_name_to_lobe": {
    "superiorfrontal": "frontal", "rostralmiddlefrontal": "frontal", "caudalmiddlefrontal": "frontal",
    "parsopercularis": "frontal", "parstriangularis": "frontal", "parsorbitalis": "frontal",
    "lateralorbitofrontal": "frontal", "medialorbitofrontal": "frontal", "precentral": "frontal",
    "paracentral": "frontal", "frontalpole": "frontal",
    "postcentral": "parietal", "superiorparietal": "parietal", "inferiorparietal": "parietal",
    "supramarginal": "parietal", "precuneus": "parietal",
    "superiortemporal": "temporal", "middletemporal": "temporal", "inferiortemporal": "temporal",
    "bankssts": "temporal", "fusiform": "temporal", "transversetemporal": "temporal",
    "entorhinal": "temporal", "parahippocampal": "temporal", "temporalpole": "temporal",
    "lateraloccipital": "occipital", "lingual": "occipital", "cuneus": "occipital", "pericalcarine": "occipital",
    "insula": "insula",
    "rostralanteriorcingulate": "limbic", "caudalanteriorcingulate": "limbic",
    "posteriorcingulate": "limbic", "isthmuscingulate": "limbic"
  },
  "julich_host_abbrev_to_lobe": {
    "ifg": "frontal", "mfg": "frontal", "sfg": "frontal", "precg": "frontal", "ifs": "frontal",
    "precs": "frontal", "ofc": "frontal", "fpole": "frontal", "sfs": "frontal",
    "postcg": "parietal", "postcs": "parietal", "spl": "parietal", "ips": "parietal", "ipl": "parietal",
    "cos": "temporal", "fusg": "temporal", "hippocampal region": "temporal", "entorhinal cortex": "temporal",
    "insula": "insula", "acc": "limbic", "sacc": "limbic", "pacc": "limbic"
  }
}
```

> **Hinweis:** Die DKT-Namen ohne medialen Flag sind exakt die 35 aus der LUT (`apps/brain-app/public/assets/atlas-canonical/manifest.json` → `lut.dkt`). `corpuscallosum` ist medial → gefiltert, kein Eintrag nötig.

- [ ] **Step 2: Committen**

```bash
git add scripts/atlas/lobe-map.json
git commit -m "feat(atlas-catalog): lobe-map (host_stem + destrieux-prefix -> Lappen)"
```

---

## Task 2: Parse-/Join-Helfer im Build-Skript

**Files:**
- Create: `scripts/atlas/build-catalog.mjs` (nur die exportierten Helfer in diesem Task)
- Test: `scripts/atlas/build-catalog.test.mjs`

Reine Funktionen, einzeln testbar: `lutCode`, `carveCode`, `sideOf`, `prettyArea`, `lobeOfHostStem`, `lobeOfDestrieux`.

- [ ] **Step 1: Failing-Test schreiben**

```js
// scripts/atlas/build-catalog.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lutCode, carveCode, sideOf, prettyArea, lobeOfHostStem, lobeOfDestrieux, lobeOfDktName, lobeOfJulichName } from './build-catalog.mjs'

test('lutCode normalisiert je Layer', () => {
  assert.equal(lutCode('dkt', 'parstriangularis'), 'parstriangularis')
  assert.equal(lutCode('julich', 'Area 44 (IFG)'), '44')
  assert.equal(lutCode('julich', 'Area 6d1 (PreCG)'), '6d1')
  assert.equal(lutCode('julich', 'Area s32 (sACC)'), 's32')
  assert.equal(lutCode('brodmann', 'BA44'), '44')
})

test('carveCode extrahiert den Join-Code', () => {
  assert.equal(carveCode('dkt', 'parstriangularis-l'), 'parstriangularis')
  assert.equal(carveCode('julich', 'julich3-area-44-ifg-l'), '44')
  assert.equal(carveCode('julich', 'julich3-area-s32-sacc-l'), 's32')
  assert.equal(carveCode('brodmann', 'brodmann-ba44-cingulate-gyrus-l'), '44')
})

test('sideOf liest L/R', () => {
  assert.equal(sideOf('parstriangularis-l'), 'L')
  assert.equal(sideOf('brodmann-ba44-cingulate-gyrus-r'), 'R')
})

test('prettyArea baut Anzeigenamen', () => {
  assert.equal(prettyArea('julich', 'Area 44 (IFG)', 'L'), 'Area 44 (IFG) · L')
  assert.equal(prettyArea('brodmann', 'BA44', 'R'), 'BA44 · R')
})

test('lobeOf* (Carve-Host + Name-Fallbacks)', () => {
  assert.equal(lobeOfHostStem('inferior-frontal-gyrus'), 'frontal')
  assert.equal(lobeOfHostStem('cingulate-gyrus'), 'limbic')
  assert.equal(lobeOfDestrieux('G_front_inf-Triangul'), 'frontal')
  assert.equal(lobeOfDestrieux('S_calcarine'), 'occipital')
  assert.equal(lobeOfDktName('bankssts'), 'temporal')
  assert.equal(lobeOfDktName('parstriangularis'), 'frontal')
  assert.equal(lobeOfJulichName('Area 44 (IFG)'), 'frontal')
  assert.equal(lobeOfJulichName('Area 7A (SPL)'), 'parietal')
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `node --test scripts/atlas/build-catalog.test.mjs`
Expected: FAIL (`build-catalog.mjs` exportiert die Funktionen noch nicht).

- [ ] **Step 3: Minimal-Implementierung der Helfer**

```js
// scripts/atlas/build-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const lobeMap = JSON.parse(readFileSync(join(HERE, 'lobe-map.json'), 'utf8'))

/** LUT-Name -> Join-Code (lowercase, ohne Seite). */
export function lutCode(layer, name) {
  if (layer === 'dkt' || layer === 'destrieux') return name.toLowerCase()
  if (layer === 'julich') {
    const m = name.match(/^Area\s+(\S+)/)
    if (!m) throw new Error(`lutCode: julich-Name unerwartet: "${name}"`)
    return m[1].toLowerCase()
  }
  if (layer === 'brodmann') {
    const m = name.match(/^BA([0-9]+[a-z]?)$/i)
    if (!m) throw new Error(`lutCode: brodmann-Name unerwartet: "${name}"`)
    return m[1].toLowerCase()
  }
  throw new Error(`lutCode: unbekannter Layer "${layer}"`)
}

/** Carve-Key -> Join-Code (ohne Seite). */
export function carveCode(layer, key) {
  const base = key.replace(/-(l|r)$/, '')
  if (layer === 'dkt') return base
  if (layer === 'julich') return base.replace(/^julich3-area-/, '').split('-')[0]
  if (layer === 'brodmann') {
    const m = base.match(/^brodmann-ba([0-9]+[a-z]?)-/)
    if (!m) throw new Error(`carveCode: brodmann-Key unerwartet: "${key}"`)
    return m[1]
  }
  throw new Error(`carveCode: unbekannter Layer "${layer}"`)
}

/** Lateralitaet aus Carve-Key-Suffix. */
export function sideOf(key) {
  if (key.endsWith('-l')) return 'L'
  if (key.endsWith('-r')) return 'R'
  throw new Error(`sideOf: kein -l/-r Suffix: "${key}"`)
}

/** Anzeigename: LUT-Name + Seite. */
export function prettyArea(_layer, name, side) {
  return `${name} · ${side}`
}

export function lobeOfHostStem(stem) {
  const lobe = lobeMap.host_stem_to_lobe[stem]
  if (!lobe) throw new Error(`lobeOfHostStem: kein Lappen fuer host_stem "${stem}" in lobe-map.json`)
  return lobe
}

export function lobeOfDestrieux(name) {
  for (const [prefix, lobe] of lobeMap.destrieux_prefix_to_lobe) {
    if (name.startsWith(prefix)) return lobe
  }
  throw new Error(`lobeOfDestrieux: kein Lappen-Praefix fuer "${name}" in lobe-map.json`)
}

export function lobeOfDktName(name) {
  const lobe = lobeMap.dkt_name_to_lobe[name.toLowerCase()]
  if (!lobe) throw new Error(`lobeOfDktName: kein Lappen fuer DKT-Name "${name}" in lobe-map.json`)
  return lobe
}

/** Julich-LUT-Name 'Area 44 (IFG)' -> Lappen ueber die Parenthese (host-abbrev, lowercase). */
export function lobeOfJulichName(name) {
  const m = name.match(/\(([^)]+)\)/)
  if (!m) throw new Error(`lobeOfJulichName: keine Parenthese in "${name}"`)
  const abbr = m[1].toLowerCase()
  const map = lobeMap.julich_host_abbrev_to_lobe
  if (map[abbr]) return map[abbr]
  // Mehrteilige Parenthese (z.B. 'preSMA, mesial SFG') -> ueber Schluesselwoerter pruefen.
  for (const [key, lobe] of Object.entries(map)) if (abbr.includes(key)) return lobe
  throw new Error(`lobeOfJulichName: kein Lappen fuer Julich-Host-Abbrev "${abbr}" (aus "${name}") in lobe-map.json`)
}
```

- [ ] **Step 4: Test laufen lassen — muss PASSEN**

Run: `node --test scripts/atlas/build-catalog.test.mjs`
Expected: PASS (alle 5 Tests grün).

- [ ] **Step 5: Committen**

```bash
git add scripts/atlas/build-catalog.mjs scripts/atlas/build-catalog.test.mjs
git commit -m "feat(atlas-catalog): Parse-/Join-Helfer (lutCode/carveCode/lobe) + node:test"
```

---

## Task 3: Katalog-Assembly + `atlas-ontology.json` schreiben

**Files:**
- Modify: `scripts/atlas/build-catalog.mjs` (Assembly + `main()` ergänzen)
- Test: `scripts/atlas/build-catalog.test.mjs` (Assembly-Test ergänzen)
- Create (Output): `apps/brain-app/public/assets/atlas-canonical/atlas-ontology.json`

- [ ] **Step 1: Failing-Test für `buildCatalog()` ergänzen**

```js
// am Ende von scripts/atlas/build-catalog.test.mjs
import { buildCatalog } from './build-catalog.mjs'

test('buildCatalog: jedes Carve-Parzelle wird genau einem Areal zugeordnet (kein Orphan)', () => {
  const { catalog, orphanCarve } = buildCatalog()
  assert.deepEqual(orphanCarve, {}, `Orphan-Carve-Parzellen: ${JSON.stringify(orphanCarve)}`)
})

test('buildCatalog: Areal-Zahl je Atlas == LUT-non-medial × 2', () => {
  const { catalog } = buildCatalog()
  const count = (id) => catalog.atlases.find((a) => a.id === id).groups.flatMap((g) => g.areas).length
  assert.equal(count('dkt'), 35 * 2)
  assert.equal(count('destrieux'), 75 * 2)
  assert.equal(count('julich'), 148 * 2)
  assert.equal(count('brodmann'), 41 * 2)
})

test('buildCatalog: Destrieux ist fsaverage-only (taro_present=false, carve leer)', () => {
  const { catalog } = buildCatalog()
  const areas = catalog.atlases.find((a) => a.id === 'destrieux').groups.flatMap((g) => g.areas)
  assert.ok(areas.every((a) => a.taro_present === false && a.refs.carve.length === 0))
})
```

- [ ] **Step 2: Test laufen lassen — muss FAILEN**

Run: `node --test scripts/atlas/build-catalog.test.mjs`
Expected: FAIL (`buildCatalog` nicht exportiert).

- [ ] **Step 3: `buildCatalog()` + `main()` implementieren**

```js
// scripts/atlas/build-catalog.mjs — ergänzen

const APP_ASSETS = join(HERE, '../../apps/brain-app/public/assets/atlas-canonical')
const WORK = join(HERE, 'work')
const LAYERS = [
  { id: 'dkt', axis: 'macro', label_de: 'DKT (Gyri)', carve: true },
  { id: 'destrieux', axis: 'macro', label_de: 'Destrieux (Gyri/Sulci)', carve: false },
  { id: 'julich', axis: 'cyto', label_de: 'Julich-Brain v3.1', carve: true },
  { id: 'brodmann', axis: 'cyto', label_de: 'Brodmann (klassisch)', carve: true },
]
const LOBE_LABEL = {
  frontal: 'Frontallappen', parietal: 'Parietallappen', temporal: 'Temporallappen',
  occipital: 'Okzipitallappen', insula: 'Insula', limbic: 'Limbisch / Cingulum',
}

function loadJson(p) { return JSON.parse(readFileSync(p, 'utf8')) }

/** Carve-Labels eines Layers nach Code+Seite gruppieren. */
function indexCarve(layer) {
  const labels = loadJson(join(WORK, `atlas_labels_${layer}.json`))
  const byKey = new Map()           // "code|L" -> [{key, host_stem, backfill}]
  for (const [key, v] of Object.entries(labels)) {
    const k = `${carveCode(layer, key)}|${sideOf(key)}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push({ key, host_stem: v.host_stem, backfill: !!v.backfill, n: v.vertex_indices.length })
  }
  return { byKey, total: Object.keys(labels).length }
}

export function buildCatalog() {
  const manifest = loadJson(join(APP_ASSETS, 'manifest.json'))
  const aggManifest = loadJson(join(WORK, 'atlas-manifest.json'))
  const atlases = []
  const orphanCarve = {}            // layer -> [unverbrauchte carveKeys]

  for (const L of LAYERS) {
    const lut = manifest.lut[L.id]
    const carveIdx = L.carve ? indexCarve(L.id) : { byKey: new Map(), total: 0 }
    const used = new Set()
    const groups = new Map()        // lobe -> areas[]

    for (const [labelId, entry] of Object.entries(lut)) {
      if (entry.medial) continue
      const code = lutCode(L.id, entry.name)
      for (const side of ['L', 'R']) {
        const k = `${code}|${side}`
        const carves = carveIdx.byKey.get(k) || []
        carves.forEach((c) => used.add(c.key))
        const hosts = [...new Set(carves.map((c) => c.host_stem))]
        // Lobe-Quelle: primaer der Carve-Host (Ground Truth auf TARO); nur ohne Carve-Treffer
        // die explizite Name->Lappen-Tabelle. Kein stiller Default — fehlt die Quelle, wirft der Helfer.
        let lobe
        if (carves.length) {
          const biggest = carves.slice().sort((a, b) => b.n - a.n)[0]
          lobe = lobeOfHostStem(biggest.host_stem)
        } else if (L.id === 'destrieux') {
          lobe = lobeOfDestrieux(entry.name)
        } else if (L.id === 'dkt') {
          lobe = lobeOfDktName(entry.name)
        } else if (L.id === 'julich') {
          lobe = lobeOfJulichName(entry.name)
        } else {
          throw new Error(`buildCatalog: Areal ${L.id}:${code}:${side} ohne Carve-Host und ohne Name-Fallback`)
        }
        const area = {
          id: `${L.id}:${code}:${side.toLowerCase()}`,
          label_de: prettyArea(L.id, entry.name, side),
          side,
          hosts,
          taro_present: carves.length > 0,
          lobe,
          refs: {
            canonical_lut: { layer: L.id, label_id: Number(labelId), hemi: side },
            carve: carves.map((c) => c.key),
          },
          context: {},
          provenance: {
            source: L.id,
            affine_det: aggManifest.sources?.[L.id]?.affine_det ?? null,
            backfill: carves.some((c) => c.backfill),
          },
        }
        if (!groups.has(lobe)) groups.set(lobe, [])
        groups.get(lobe).push(area)
      }
    }

    if (L.carve) {
      const unused = [...carveIdx.byKey.values()].flat().map((c) => c.key).filter((key) => !used.has(key))
      if (unused.length) orphanCarve[L.id] = unused.sort()
    }

    atlases.push({
      id: L.id, axis: L.axis, label_de: L.label_de,
      groups: [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([lobe, areas]) => ({
          id: lobe, label_de: LOBE_LABEL[lobe] ?? lobe,
          areas: areas.sort((x, y) => x.id.localeCompare(y.id)),
        })),
    })
  }

  const catalog = {
    version: '1',
    space_note: 'fsaverage != TARO — Areale praezise im Standardraum definiert, Carve liegt auf TARO.',
    axes: [
      { id: 'macro', label_de: 'Makroanatomie', sub_de: 'Faltung — Gyri & Sulci' },
      { id: 'cyto', label_de: 'Zytoarchitektonik', sub_de: 'Zellaufbau — Areale' },
    ],
    atlases,
  }
  return { catalog, orphanCarve }
}

function main() {
  const { catalog, orphanCarve } = buildCatalog()
  if (Object.keys(orphanCarve).length) {
    throw new Error(`build-catalog: Orphan-Carve-Parzellen (nicht zugeordnet): ${JSON.stringify(orphanCarve)}`)
  }
  const out = join(APP_ASSETS, 'atlas-ontology.json')
  writeFileSync(out, JSON.stringify(catalog, null, 2))
  const n = catalog.atlases.reduce((s, a) => s + a.groups.reduce((t, g) => t + g.areas.length, 0), 0)
  console.log(`build-catalog: ${n} Areale in ${catalog.atlases.length} Atlanten -> ${out}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main() } catch (e) { console.error(e); process.exit(1) }
}
```

> **Note:** `writeFileSync` ist oben im Header importiert (kein dynamisches `import`). Falls der Orphan-Check im Test rot ist, ist die Join-Logik (Task 2) das Problem — nicht den Check aufweichen (KEINE FALLBACKS).

- [ ] **Step 4: Test laufen lassen — muss PASSEN**

Run: `node --test scripts/atlas/build-catalog.test.mjs`
Expected: PASS. Bei FAIL im Orphan-Test: `JSON`-Liste der unverbrauchten Keys zeigt die Join-Lücke.

- [ ] **Step 5: Katalog generieren**

Run: `node scripts/atlas/build-catalog.mjs`
Expected: `build-catalog: <N> Areale in 4 Atlanten -> .../atlas-ontology.json` (N ≈ (35+75+148+41)×2 = 598).

- [ ] **Step 6: Committen**

```bash
git add scripts/atlas/build-catalog.mjs scripts/atlas/build-catalog.test.mjs apps/brain-app/public/assets/atlas-canonical/atlas-ontology.json
git commit -m "feat(atlas-catalog): buildCatalog mergt 4 Kortex-Atlanten -> atlas-ontology.json (Orphan-Check gruen)"
```

---

## Task 4: TS-Typen + Loader (`atlasCatalog.ts`)

**Files:**
- Create: `apps/brain-app/src/viewer/atlas/atlasCatalog.ts`

- [ ] **Step 1: Typen + Loader schreiben**

```ts
// apps/brain-app/src/viewer/atlas/atlasCatalog.ts
export interface AreaRefs {
  canonical_lut: { layer: string; label_id: number; hemi: 'L' | 'R' }
  carve: string[]
}
export interface AreaProvenance { source: string; affine_det: number | null; backfill: boolean }
export interface AreaNode {
  id: string
  label_de: string
  side: 'L' | 'R'
  hosts: string[]
  taro_present: boolean
  lobe: string
  refs: AreaRefs
  context: Record<string, unknown>
  provenance: AreaProvenance
}
export interface GroupNode { id: string; label_de: string; areas: AreaNode[] }
export interface AtlasNode { id: string; axis: 'macro' | 'cyto'; label_de: string; groups: GroupNode[] }
export interface AtlasCatalog {
  version: string
  space_note: string
  axes: { id: string; label_de: string; sub_de: string }[]
  atlases: AtlasNode[]
}

const URL = '/assets/atlas-canonical/atlas-ontology.json'

/** Laedt + validiert den Katalog. Wirft laut bei fehlenden Pflichtfeldern. */
export async function loadCatalog(): Promise<AtlasCatalog> {
  const r = await fetch(URL)
  if (!r.ok) throw new Error(`loadCatalog: ${URL} nicht ladbar (HTTP ${r.status})`)
  const c = (await r.json()) as AtlasCatalog
  if (!c.atlases?.length) throw new Error('loadCatalog: catalog.atlases leer')
  for (const a of c.atlases) {
    for (const g of a.groups) {
      for (const area of g.areas) {
        if (!area.id || !area.lobe || !area.refs?.canonical_lut) {
          throw new Error(`loadCatalog: Areal unvollstaendig: ${JSON.stringify(area).slice(0, 120)}`)
        }
      }
    }
  }
  return c
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/brain-app && pnpm typecheck`
Expected: Exit 0.

- [ ] **Step 3: Committen**

```bash
git add apps/brain-app/src/viewer/atlas/atlasCatalog.ts
git commit -m "feat(atlas-catalog): TS-Typen + validierender Loader (atlasCatalog.ts)"
```

---

## Task 5: Runtime-Invarianten-Tests (`atlasCatalog.test.ts`)

**Files:**
- Create: `apps/brain-app/src/viewer/atlas/atlasCatalog.test.ts`

Lädt das generierte `atlas-ontology.json` und prüft die harten Invarianten im App-Testlauf.

- [ ] **Step 1: Test schreiben**

```ts
// apps/brain-app/src/viewer/atlas/atlasCatalog.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { AtlasCatalog } from './atlasCatalog'

const here = dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(
  readFileSync(join(here, '../../../public/assets/atlas-canonical/atlas-ontology.json'), 'utf8'),
) as AtlasCatalog

const allAreas = (id: string) =>
  catalog.atlases.find((a) => a.id === id)!.groups.flatMap((g) => g.areas)

describe('atlas-ontology.json Invarianten', () => {
  it('hat 4 Kortex-Atlanten', () => {
    expect(catalog.atlases.map((a) => a.id).sort()).toEqual(['brodmann', 'destrieux', 'dkt', 'julich'])
  })

  it('Areal-Zahl je Atlas == LUT-non-medial × 2', () => {
    expect(allAreas('dkt').length).toBe(70)
    expect(allAreas('destrieux').length).toBe(150)
    expect(allAreas('julich').length).toBe(296)
    expect(allAreas('brodmann').length).toBe(82)
  })

  it('jede Areal-ID ist eindeutig', () => {
    const ids = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas.map((x) => x.id)))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('jedes Areal hat einen bekannten Lappen', () => {
    const lobes = new Set(['frontal', 'parietal', 'temporal', 'occipital', 'insula', 'limbic'])
    const all = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas))
    expect(all.every((x) => lobes.has(x.lobe))).toBe(true)
  })

  it('Destrieux ist fsaverage-only (taro_present=false, carve leer)', () => {
    expect(allAreas('destrieux').every((a) => a.taro_present === false && a.refs.carve.length === 0)).toBe(true)
  })

  it('jedes carve-ref ist seitenkonsistent mit dem Areal', () => {
    for (const a of allAreas('brodmann')) {
      const suffix = a.side === 'L' ? '-l' : '-r'
      expect(a.refs.carve.every((k) => k.endsWith(suffix))).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Test laufen lassen**

Run: `cd apps/brain-app && pnpm test atlasCatalog`
Expected: PASS (alle Invarianten grün). Bei FAIL bei „× 2": einzelne Areale fehlen in einer Hemi — im Build prüfen, nicht den Test aufweichen.

- [ ] **Step 3: Committen**

```bash
git add apps/brain-app/src/viewer/atlas/atlasCatalog.test.ts
git commit -m "test(atlas-catalog): Runtime-Invarianten gegen atlas-ontology.json"
```

---

## Abschluss-Verifikation (SP1 „fertig")

```bash
node --test scripts/atlas/build-catalog.test.mjs   # Build-Helfer + Orphan-Check grün
node scripts/atlas/build-catalog.mjs               # Katalog deterministisch neu erzeugt
cd apps/brain-app && pnpm typecheck                # Exit 0
pnpm test atlasCatalog                             # Invarianten grün
```

**Definition of Done SP1:**
- `atlas-ontology.json` existiert, 4 Kortex-Atlanten, ~598 Areale, kanonische IDs.
- Kein Orphan-Carve (jede Carve-Parzelle einem Areal zugeordnet).
- Loader validiert + wirft laut bei Lücken.
- `context` leer (SP2-Hook), Subkortex + watertight-Refs bewusst ausgelassen (dokumentiert).

## Self-Review-Notiz (Plan ↔ Spec)
- Deckt SP1 aus dem Design-Spec vollständig ab (Katalog/Build, kanonische ID + refs, Host, Provenienz, Verify).
- Abweichung vom Spec dokumentiert: `refs.carve` ist Array (nicht single) wegen Brodmann-1:n; `host` → `hosts[]` + `taro_present`; watertight-Refs nach SP1 verschoben (GLB-Namens-Extraktion).
