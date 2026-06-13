export interface AtlasLutEntry { rgb: [number, number, number]; name: string; medial?: boolean }
export type AtlasLut = Record<number, AtlasLutEntry>

/** Baut eine luekenlose RGBA-Uint8-LUT (Breite = hoechste LabelId + 1) fuer eine DataTexture.
 *  Luecken (IDs ohne Eintrag) werden transparent (0,0,0,0). */
export function buildLutTextureData(lut: AtlasLut): { data: Uint8Array; size: number } {
  const ids = Object.keys(lut).map(Number)
  const size = Math.max(...ids) + 1
  const data = new Uint8Array(size * 4)
  for (const id of ids) {
    const e = lut[id]
    data[id * 4] = e.rgb[0]; data[id * 4 + 1] = e.rgb[1]; data[id * 4 + 2] = e.rgb[2]; data[id * 4 + 3] = 255
  }
  return { data, size }
}

/** Areal-Name fuer eine LabelId; leerer String wenn unbekannt. */
export function labelName(lut: AtlasLut, id: number): string {
  return lut[id]?.name ?? ''
}
