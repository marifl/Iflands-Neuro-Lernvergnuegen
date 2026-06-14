import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  lutCode, carveCode, sideOf, prettyArea, julichSlug,
  lobeOfHostStem, lobeOfDestrieux, lobeOfDktName, lobeOfJulichName, lobeOfBrodmannBA,
  buildCatalog,
} from './build-catalog.mjs'

test('lutCode normalisiert je Layer (dkt/destrieux/brodmann)', () => {
  assert.equal(lutCode('dkt', 'parstriangularis'), 'parstriangularis')
  assert.equal(lutCode('brodmann', 'BA44'), '44')
})

test('carveCode extrahiert den Join-Code (dkt/brodmann)', () => {
  assert.equal(carveCode('dkt', 'parstriangularis-l'), 'parstriangularis')
  assert.equal(carveCode('brodmann', 'brodmann-ba44-cingulate-gyrus-l'), '44')
})

test('julichSlug bildet den Carve-Slug (auch irregulaere Namen)', () => {
  assert.equal(julichSlug('Area 44 (IFG)'), 'area-44')
  assert.equal(julichSlug('Area 6d1 (PreCG)'), 'area-6d1')
  assert.equal(julichSlug('Area s32 (sACC)'), 'area-s32')
  assert.equal(julichSlug('Area Te 1.0 (HESCHL)'), 'area-te-1-0')
  assert.equal(julichSlug('CA1 (Hippocampus)'), 'ca1')
  assert.equal(julichSlug('Frontal-to-Occipital (GapMap)'), 'frontal-to-occipital')
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
  assert.equal(lobeOfBrodmannBA('33'), 'limbic')
})

test('buildCatalog: kein Orphan-Carve (jede Parzelle einem Areal zugeordnet)', () => {
  const { orphanCarve } = buildCatalog()
  assert.deepEqual(orphanCarve, {}, `Orphan-Carve: ${JSON.stringify(orphanCarve)}`)
})

test('buildCatalog: kein Carve-Key doppelt zugeordnet (keine Prefix-Ueber-Konsumption)', () => {
  // buildCatalog wirft bereits intern bei Doppel-Zuordnung; hier zusaetzlich als Daten-Invariante.
  const { catalog } = buildCatalog()
  const seen = new Map()
  for (const atlas of catalog.atlases)
    for (const g of atlas.groups)
      for (const area of g.areas)
        for (const key of area.refs.carve) {
          assert.ok(!seen.has(key), `Carve-Key "${key}" in zwei Arealen: "${seen.get(key)}" und "${area.id}"`)
          seen.set(key, area.id)
        }
})

test('buildCatalog: Areal-Zahl je Atlas (LUT-non-medial minus Non-Region) × 2', () => {
  const { catalog } = buildCatalog()
  const count = (id) => catalog.atlases.find((a) => a.id === id).groups.flatMap((g) => g.areas).length
  assert.equal(count('dkt'), 34 * 2)        // 35 - corpuscallosum
  assert.equal(count('destrieux'), 74 * 2)  // 75 - Medial_wall
  assert.equal(count('julich'), 146 * 2)    // 148 - 2x nicht kartiert
  assert.equal(count('brodmann'), 41 * 2)
})

test('buildCatalog: Non-Region-Eintraege explizit ausgeschlossen', () => {
  const { excluded } = buildCatalog()
  assert.deepEqual(excluded, { dkt: 1, destrieux: 1, julich: 2 })
})

test('buildCatalog: Destrieux ist fsaverage-only (taro_present=false, carve leer)', () => {
  const { catalog } = buildCatalog()
  const areas = catalog.atlases.find((a) => a.id === 'destrieux').groups.flatMap((g) => g.areas)
  assert.ok(areas.every((a) => a.taro_present === false && a.refs.carve.length === 0))
})

test('buildCatalog: kanonische IDs eindeutig + carve seitenkonsistent', () => {
  const { catalog } = buildCatalog()
  const all = catalog.atlases.flatMap((a) => a.groups.flatMap((g) => g.areas))
  const ids = all.map((a) => a.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const a of all) {
    const suffix = a.side === 'L' ? '-l' : '-r'
    assert.ok(a.refs.carve.every((k) => k.endsWith(suffix)), `Seiten-Mismatch in ${a.id}`)
  }
})
