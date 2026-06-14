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
