// scripts/atlas/build-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const lobeMap = JSON.parse(readFileSync(join(HERE, 'lobe-map.json'), 'utf8'))
const ATLAS_CONTEXT = join(HERE, 'atlas-context.yaml')
const CONTEXT_KEYS = new Set(['clinic', 'function', 'chapter', 'aliases'])
const ARRAY_CONTEXT_KEYS = new Set(['aliases'])

/** LUT-Name -> Join-Code (lowercase, ohne Seite). Julich nutzt julichSlug (irregulaere Namen). */
export function lutCode(layer, name) {
  if (layer === 'dkt' || layer === 'destrieux') return name.toLowerCase()
  if (layer === 'brodmann') {
    const m = name.match(/^BA([0-9]+[a-z]?)$/i)
    if (!m) throw new Error(`lutCode: brodmann-Name unerwartet: "${name}"`)
    return m[1].toLowerCase()
  }
  throw new Error(`lutCode: unbekannter Layer "${layer}"`)
}

/** Carve-Key -> Join-Code (ohne Seite). Julich nutzt Prefix-Match (julichSlug), nicht diese Funktion. */
export function carveCode(layer, key) {
  const base = key.replace(/-(l|r)$/, '')
  if (layer === 'dkt') return base
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

/** Brodmann-BA-Code -> Lappen (nur fuer BAs ohne Carve-Parzelle; sonst kommt der Lappen vom Carve-Host). */
export function lobeOfBrodmannBA(code) {
  const lobe = lobeMap.brodmann_ba_to_lobe[code]
  if (!lobe) throw new Error(`lobeOfBrodmannBA: kein Lappen fuer BA "${code}" in lobe-map.json (BA ohne Carve braucht Eintrag)`)
  return lobe
}

// --- Julich-Join: Prefix-Match aus LUT-Slug --------------------------------
// Julich-Carve-Namen haben variable Host-Suffixe (julich3-area-44-ifg, julich3-ca1-hippocampus,
// julich3-frontal-to-occipital-gapmap). Ein Code-Split ist nicht robust. Stattdessen: aus dem
// LUT-Namen einen Slug ableiten und die Carve-Keys per Prefix `julich3-<slug>-` matchen.

/** Julich-LUT-Name -> Carve-Slug. 'Area 44 (IFG)' -> 'area-44'; 'CA1 (Hippocampus)' -> 'ca1';
 *  'Frontal-to-Occipital (GapMap)' -> 'frontal-to-occipital'. */
export function julichSlug(name) {
  // Carve normalisiert den Code-Teil: lowercase, Leerzeichen UND Punkt -> Bindestrich
  // ('Area Te 1.0 (HESCHL)' -> julich3-area-te-1-0-heschl).
  const norm = (s) => s.trim().toLowerCase().replace(/[(),]/g, '').replace(/[\s.]+/g, '-')
  const m = name.match(/^Area\s+(.+?)\s*\(/)
  if (m) return 'area-' + norm(m[1])
  return norm(name.split('(')[0])
}

/** LUT-Eintraege ohne echte Region (Medialwand/Kommissur/unkartiert) -> explizit skippen.
 *  Nicht als `medial` geflaggt, aber keine teachable Parzelle (kein Host, kein Lappen). */
const NON_REGION = {
  dkt: /^corpuscallosum$/i,
  destrieux: /^Medial_wall$/i,
  julich: /^nicht kartiert$/i,
}

// --- Katalog-Assembly ------------------------------------------------------

const APP_ASSETS = join(HERE, '../../apps/brain-app/public/assets/atlas-canonical')
const WORK = join(HERE, 'work')
const LAYERS = [
  { id: 'dkt', axis: 'macro', label_de: 'DKT (Gyri)', carve: 'code' },
  { id: 'destrieux', axis: 'macro', label_de: 'Destrieux (Gyri/Sulci)', carve: null },
  { id: 'julich', axis: 'cyto', label_de: 'Julich-Brain v3.1', carve: 'prefix' },
  { id: 'brodmann', axis: 'cyto', label_de: 'Brodmann (klassisch)', carve: 'code' },
]
const LOBE_LABEL = {
  frontal: 'Frontallappen', parietal: 'Parietallappen', temporal: 'Temporallappen',
  occipital: 'Okzipitallappen', insula: 'Insula', limbic: 'Limbisch / Cingulum',
}

function loadJson(p) { return JSON.parse(readFileSync(p, 'utf8')) }

function yamlKey(raw) {
  const key = raw.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    return key.slice(1, -1)
  }
  return key
}

function yamlString(raw, context) {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value)
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1)
  if (!value) throw new Error(`atlas-context: ${context} ist leer`)
  return value
}

function yamlStringArray(raw, context) {
  const value = raw.trim()
  if (!value.startsWith('[') || !value.endsWith(']')) {
    throw new Error(`atlas-context: ${context} muss eine String-Liste sein`)
  }
  const parsed = JSON.parse(value)
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === 'string' && entry.trim())) {
    throw new Error(`atlas-context: ${context} muss nicht-leere Strings enthalten`)
  }
  return parsed
}

export function loadAtlasContext(path = ATLAS_CONTEXT) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const areas = {}
  let section = null
  let areaId = null
  let version = null

  for (const [index, original] of lines.entries()) {
    if (/^\s*(#.*)?$/.test(original)) continue
    const lineNo = index + 1
    const indent = original.match(/^ */)[0].length
    const line = original.slice(indent).trimEnd()

    if (indent === 0) {
      areaId = null
      if (line === 'areas:') {
        section = 'areas'
        continue
      }
      const versionMatch = line.match(/^version:\s*([0-9]+)\s*$/)
      if (versionMatch) {
        version = Number(versionMatch[1])
        continue
      }
      throw new Error(`atlas-context:${lineNo}: unbekannter Top-Level-Key`)
    }

    if (section !== 'areas') throw new Error(`atlas-context:${lineNo}: Eintrag ohne areas-Block`)
    if (indent === 2) {
      const match = line.match(/^(.+):\s*$/)
      if (!match) throw new Error(`atlas-context:${lineNo}: Areal-Key braucht einen Block`)
      areaId = yamlKey(match[1])
      if (!areaId.includes(':')) throw new Error(`atlas-context:${lineNo}: Areal-ID "${areaId}" ist ungueltig`)
      if (areas[areaId]) throw new Error(`atlas-context:${lineNo}: Areal-ID "${areaId}" doppelt`)
      areas[areaId] = {}
      continue
    }

    if (indent === 4 && areaId) {
      const match = line.match(/^([a-z_]+):\s*(.+)$/)
      if (!match) throw new Error(`atlas-context:${lineNo}: Kontext-Feld braucht key: value`)
      const [, key, rawValue] = match
      if (!CONTEXT_KEYS.has(key)) throw new Error(`atlas-context:${lineNo}: unbekanntes Kontext-Feld "${key}"`)
      areas[areaId][key] = ARRAY_CONTEXT_KEYS.has(key)
        ? yamlStringArray(rawValue, `${areaId}.${key}`)
        : yamlString(rawValue, `${areaId}.${key}`)
      continue
    }

    throw new Error(`atlas-context:${lineNo}: ungueltige Einrueckung`)
  }

  if (version !== 1) throw new Error('atlas-context: version muss 1 sein')
  if (Object.keys(areas).length === 0) throw new Error('atlas-context: areas ist leer')
  return { version, areas }
}

/** Carve-Parzellen eines Layers als angereicherte Eintraege (host_stem, backfill, n, side). */
function loadCarveEntries(layer) {
  const labels = loadJson(join(WORK, `atlas_labels_${layer}.json`))
  return Object.entries(labels).map(([key, v]) => ({
    key, side: sideOf(key), host_stem: v.host_stem, backfill: !!v.backfill, n: v.vertex_indices.length,
  }))
}

export function buildCatalog() {
  const manifest = loadJson(join(APP_ASSETS, 'manifest.json'))
  const aggManifest = loadJson(join(WORK, 'atlas-manifest.json'))
  const atlasContext = loadAtlasContext()
  const coordsDkt = loadJson(join(WORK, 'atlas-dkt-coords.json'))
  const coordsJulich = loadJson(join(WORK, 'atlas-julich-coords.json'))
  const coordsBrodmann = loadJson(join(WORK, 'atlas-brodmann-coords.json'))
  const atlases = []
  const orphanCarve = {}            // layer -> [unverbrauchte carveKeys]
  const excluded = {}               // layer -> Anzahl explizit geskippter LUT-Eintraege
  const areaIds = new Set()

  for (const L of LAYERS) {
    const lut = manifest.lut[L.id]
    const carves = L.carve ? loadCarveEntries(L.id) : []
    // Index: code-Layer -> Map "code|side"; prefix-Layer -> Liste je Seite.
    const byKey = new Map()
    const bySide = { L: [], R: [] }
    if (L.carve === 'code') for (const c of carves) {
      const k = `${carveCode(L.id, c.key)}|${c.side}`
      if (!byKey.has(k)) byKey.set(k, [])
      byKey.get(k).push(c)
    }
    if (L.carve === 'prefix') for (const c of carves) bySide[c.side].push(c)

    const used = new Map()          // carveKey -> areaId (faengt Ueber-Konsumption: ein Carve in zwei Arealen)
    const groups = new Map()        // lobe -> areas[]
    let nExcluded = 0

    for (const [labelId, entry] of Object.entries(lut)) {
      if (entry.medial) continue
      if (NON_REGION[L.id]?.test(entry.name)) { nExcluded++; continue }
      const code = L.id === 'julich' ? julichSlug(entry.name) : lutCode(L.id, entry.name)
      for (const side of ['L', 'R']) {
        const areaId = `${L.id}:${code}:${side.toLowerCase()}`
        let matches = []
        if (L.carve === 'code') matches = byKey.get(`${code}|${side}`) || []
        else if (L.carve === 'prefix') {
          const prefix = `julich3-${code}-`
          matches = bySide[side].filter((c) => c.key.startsWith(prefix))
        }
        for (const c of matches) {
          if (used.has(c.key)) {
            throw new Error(`buildCatalog: Carve-Key "${c.key}" doppelt zugeordnet ("${used.get(c.key)}" und "${areaId}") — Prefix-Kollision`)
          }
          used.set(c.key, areaId)
        }
        const hosts = [...new Set(matches.map((c) => c.host_stem))]
        // Lobe: primaer Carve-Host (groesste Parzelle), sonst Name-Tabelle, sonst lauter Fehler.
        let lobe
        if (matches.length) {
          const biggest = matches.slice().sort((a, b) => b.n - a.n)[0]
          lobe = lobeOfHostStem(biggest.host_stem)
        } else if (L.id === 'destrieux') lobe = lobeOfDestrieux(entry.name)
        else if (L.id === 'dkt') lobe = lobeOfDktName(entry.name)
        else if (L.id === 'julich') lobe = lobeOfJulichName(entry.name)
        else if (L.id === 'brodmann') lobe = lobeOfBrodmannBA(code)
        else throw new Error(`buildCatalog: ${L.id}:${code}:${side} ohne Carve-Host und ohne namebasierte Lappenaufloesung`)

        const coordMap = L.id === 'dkt' ? coordsDkt
                       : L.id === 'julich' ? coordsJulich
                       : L.id === 'brodmann' ? coordsBrodmann
                       : null
        let areaCoords = null
        if (coordMap && matches.length > 0) {
          const coordList = []
          for (const c of matches) {
            const entry = coordMap[c.key]
            if (entry) coordList.push(entry)
          }
          if (coordList.length > 0) {
            let min = [Infinity, Infinity, Infinity]
            let max = [-Infinity, -Infinity, -Infinity]
            let sumCentroid = [0, 0, 0]
            for (const c of coordList) {
              for (let i = 0; i < 3; i++) {
                min[i] = Math.min(min[i], c.bbox.min[i])
                max[i] = Math.max(max[i], c.bbox.max[i])
                sumCentroid[i] += c.centroid[i]
              }
            }
            areaCoords = {
              centroid: [
                +(sumCentroid[0] / coordList.length).toFixed(3),
                +(sumCentroid[1] / coordList.length).toFixed(3),
                +(sumCentroid[2] / coordList.length).toFixed(3),
              ],
              bbox: {
                min: min.map((x) => +x.toFixed(3)),
                max: max.map((x) => +x.toFixed(3)),
              },
            }
          }
        }

        const area = {
          id: areaId,
          label_de: prettyArea(L.id, entry.name, side),
          side,
          hosts,
          taro_present: matches.length > 0,
          lobe,
          refs: {
            canonical_lut: { layer: L.id, label_id: Number(labelId), hemi: side },
            carve: matches.map((c) => c.key),
          },
          context: atlasContext.areas[areaId] ?? {},
          provenance: {
            source: L.id,
            affine_det: aggManifest.sources?.[L.id]?.affine_det ?? null,
            backfill: matches.some((c) => c.backfill),
          },
        }
        if (areaCoords) {
          area.coords = areaCoords
        }
        areaIds.add(areaId)
        if (!groups.has(lobe)) groups.set(lobe, [])
        groups.get(lobe).push(area)
      }
    }

    if (L.carve) {
      const unused = carves.map((c) => c.key).filter((key) => !used.has(key))
      if (unused.length) orphanCarve[L.id] = unused.sort()
    }
    if (nExcluded) excluded[L.id] = nExcluded

    atlases.push({
      id: L.id, axis: L.axis, label_de: L.label_de,
      groups: [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([lobe, areas]) => {
          const label_de = LOBE_LABEL[lobe]
          if (!label_de) throw new Error(`buildCatalog: kein LOBE_LABEL fuer Lappen "${lobe}" — LOBE_LABEL ergaenzen`)
          return { id: lobe, label_de, areas: areas.sort((x, y) => x.id.localeCompare(y.id)) }
        }),
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
  const deadContextRefs = Object.keys(atlasContext.areas).filter((id) => !areaIds.has(id)).sort()
  if (deadContextRefs.length) {
    throw new Error(`build-catalog: atlas-context.yaml referenziert unbekannte Areale: ${deadContextRefs.join(', ')}`)
  }
  return { catalog, orphanCarve, excluded }
}

function main() {
  const { catalog, orphanCarve, excluded } = buildCatalog()
  if (Object.keys(orphanCarve).length) {
    throw new Error(`build-catalog: Orphan-Carve-Parzellen (nicht zugeordnet): ${JSON.stringify(orphanCarve)}`)
  }
  const out = join(APP_ASSETS, 'atlas-ontology.json')
  writeFileSync(out, JSON.stringify(catalog, null, 2))
  const n = catalog.atlases.reduce((s, a) => s + a.groups.reduce((t, g) => t + g.areas.length, 0), 0)
  console.log(`build-catalog: ${n} Areale in ${catalog.atlases.length} Atlanten -> ${out}`)
  if (Object.keys(excluded).length) console.log(`build-catalog: explizit ausgeschlossen (keine Region): ${JSON.stringify(excluded)}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch (e) { console.error(e); process.exit(1) }
}
