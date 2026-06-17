/** Darstellung der Atlas-Parzellen, die direkt auf TARO liegen (Carve-Overlay):
 *  stabile Farbe pro Areal + lesbarer Anzeigename. Mesh-Namen sind side-suffigiert
 *  (DKT: `parsopercularis-l`, Julich: `julich3-area-44-ifg-l`). */
import { ATLAS_PARCEL_LIGHTNESS, ATLAS_PARCEL_SATURATION } from './atlasColorSystem'

/** userData-Flag: markiert ein Mesh als pickbare Atlas-Parzelle (von CutPickBridge erkannt). */
export const ATLAS_PARCEL_FLAG = 'atlasParcel'
/** userData-Flag: durchgehende Atlas-Flaeche (EIN Mesh, Per-Vertex-Label). userData traegt
 *  zusaetzlich `{ slugs: string[]; vlabels: Int16Array }` fuer den Vertex-genauen Pick. */
export const ATLAS_SURFACE_FLAG = 'atlasSurface'

/** Basisname ohne Lateralitaets-Suffix (links/rechts teilen Farbe + Identitaet). */
function baseName(meshName: string): string {
  return meshName.replace(/-(l|r)$/, '')
}

/** Stabile, gedaempfte Farbe pro Areal (HSL aus Namens-Hash). L/R bekommen dieselbe Farbe,
 *  da sie dasselbe Areal sind. Saettigung/Helligkeit fix -> editorial-vertraegliche Daten-Viz. */
export function parcelColor(meshName: string): string {
  const base = baseName(meshName)
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue}, ${Math.round(ATLAS_PARCEL_SATURATION * 100)}%, ${Math.round(ATLAS_PARCEL_LIGHTNESS * 100)}%)`
}

/** Dieselbe Farbe als RGB-Bytes (0-255) — fuer die Label-LUT-DataTexture der Atlas-Flaeche. */
export function parcelRgb(meshName: string): [number, number, number] {
  const base = baseName(meshName)
  let h = 0
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
  const hue = (h % 360) / 360
  const s = ATLAS_PARCEL_SATURATION, l = ATLAS_PARCEL_LIGHTNESS
  const k = (n: number) => (n + hue * 12) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

/** Anzeigename fuer ein Mesh des watertight Julich-Brains (Namen: `julich-area-45-ifg-r`,
 *  `julich-dorsal-dentate-nucleus-cerebellum-l`, `julich-frontal-i-1-gapmap-r`). */
export function prettyJulichRegion(meshName: string): string {
  const s = meshName.endsWith('-r') ? ' (R)' : meshName.endsWith('-l') ? ' (L)' : ''
  const base = meshName.replace(/-(l|r)$/, '')
  if (base.startsWith('julich-area-')) {
    const parts = base.replace('julich-area-', '').split('-')
    const code = parts[0].toUpperCase()
    const host = parts.slice(1).join(' ').toUpperCase()
    return `Area ${code}${host ? ' · ' + host : ''}${s}`
  }
  const rest = base.replace(/^julich-/, '').replace(/-/g, ' ')
  return `${rest.charAt(0).toUpperCase()}${rest.slice(1)}${s}`
}

/** Anzeigename fuer ein watertight-3D-Atlas-Mesh (`<atlas>-<slug>-<l|r>`). Julich behaelt die
 *  Area-Notation (prettyJulichRegion); DKT/Brodmann/Destrieux -> Slug entjargonisiert. */
export function prettyAtlasRegion(meshName: string): string {
  if (meshName.startsWith('julich-')) return prettyJulichRegion(meshName)
  const s = meshName.endsWith('-r') ? ' (R)' : meshName.endsWith('-l') ? ' (L)' : ''
  let base = meshName.replace(/-(l|r)$/, '').replace(/^(dkt|brodmann|destrieux)-/, '')
  const ba = base.match(/^ba(\d+[a-z]?)$/i)
  if (ba) return `BA${ba[1].toUpperCase()}${s}`
  base = base.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
  return `${base}${s}`
}

/** Lateralitaet aus dem Suffix. */
function side(meshName: string): string {
  if (meshName.endsWith('-l')) return 'L'
  if (meshName.endsWith('-r')) return 'R'
  return ''
}

/** Lesbarer Anzeigename. DKT-aparc -> kapitalisiert; Julich -> "Area <code> · <Host>". */
export function prettyParcel(meshName: string): string {
  const s = side(meshName)
  const suffix = s ? ` (${s})` : ''
  let base = baseName(meshName)
  if (base.startsWith('julich3-area-')) {
    const parts = base.replace('julich3-area-', '').split('-')
    const code = parts[0]
    const host = parts.slice(1).join(' ').toUpperCase()
    return `Area ${code}${host ? ' · ' + host : ''}${suffix}`
  }
  // Brodmann-Carve-Slug (`brodmann-ba38-superior-temporal-gyrus`): "BA38 · Superior Temporal Gyrus".
  const ba = base.match(/^brodmann-ba([0-9]+[a-z]?)-?(.*)$/)
  if (ba) {
    const host = ba[2].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return `BA${ba[1].toUpperCase()}${host ? ' · ' + host : ''}${suffix}`
  }
  // DKT-aparc (lowercase, zusammengeschrieben): nur kapitalisieren.
  return `${base.charAt(0).toUpperCase()}${base.slice(1)}${suffix}`
}
