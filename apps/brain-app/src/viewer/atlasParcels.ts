/** Darstellung der Atlas-Parzellen, die direkt auf TARO liegen (Carve-Overlay):
 *  stabile Farbe pro Areal + lesbarer Anzeigename. Mesh-Namen sind side-suffigiert
 *  (DKT: `parsopercularis-l`, Julich: `julich3-area-44-ifg-l`). */

/** userData-Flag: markiert ein Mesh als pickbare Atlas-Parzelle (von CutPickBridge erkannt). */
export const ATLAS_PARCEL_FLAG = 'atlasParcel'

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
  return `hsl(${hue}, 52%, 56%)`
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
  // DKT-aparc (lowercase, zusammengeschrieben): nur kapitalisieren.
  return `${base.charAt(0).toUpperCase()}${base.slice(1)}${suffix}`
}
