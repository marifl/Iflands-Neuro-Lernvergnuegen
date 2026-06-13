import type { AtlasLut } from './atlasLut'

export interface HemiManifest {
  verts: number; faces: number
  pial: string; infl: string; faces_file: string
  labels: Record<string, string>
}
export interface AtlasLayer {
  id: string
  axis: 'macro' | 'cyto'
  label_de: string
}
export interface AtlasManifest {
  space: string
  verts_per_hemi: number
  layers: AtlasLayer[]
  hemis: Record<'L' | 'R', HemiManifest>
  lut: Record<string, AtlasLut>
}
export interface HemiData {
  pial: Float32Array; infl: Float32Array; faces: Uint32Array
  labels: Record<string, Int16Array>
}

const BASE = '/assets/atlas-canonical'

async function buf(file: string): Promise<ArrayBuffer> {
  const r = await fetch(`${BASE}/${file}`)
  if (!r.ok) throw new Error(`atlasAssets: ${file} nicht ladbar (HTTP ${r.status})`)
  return r.arrayBuffer()
}

export async function loadManifest(): Promise<AtlasManifest> {
  const r = await fetch(`${BASE}/manifest.json`)
  if (!r.ok) throw new Error(`atlasAssets: manifest.json nicht ladbar (HTTP ${r.status})`)
  return r.json()
}

export async function loadHemi(m: HemiManifest, layers: string[]): Promise<HemiData> {
  const [pialB, inflB, facesB] = await Promise.all([buf(m.pial), buf(m.infl), buf(m.faces_file)])
  const pial = new Float32Array(pialB), infl = new Float32Array(inflB), faces = new Uint32Array(facesB)
  if (pial.length !== m.verts * 3) throw new Error(`atlasAssets: pial-Laenge ${pial.length} != ${m.verts * 3}`)
  if (faces.length !== m.faces * 3) throw new Error(`atlasAssets: faces-Laenge ${faces.length} != ${m.faces * 3}`)
  const labels: Record<string, Int16Array> = {}
  for (const layer of layers) {
    const file = m.labels[layer]
    if (!file) throw new Error(`atlasAssets: Layer "${layer}" fehlt im Hemi-Manifest`)
    const lab = new Int16Array(await buf(file))
    if (lab.length !== m.verts) throw new Error(`atlasAssets: Label "${layer}" Laenge ${lab.length} != ${m.verts}`)
    labels[layer] = lab
  }
  return { pial, infl, faces, labels }
}
