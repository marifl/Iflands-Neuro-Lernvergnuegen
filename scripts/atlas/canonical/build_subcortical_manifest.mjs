// Assembliert die `subcortical`-Sektion von atlas-canonical/manifest.json reproduzierbar
// aus den committeten Subkortex-Binaries. Hintergrund: Die Geometrie wird von den
// Python-Extraktoren extract_subcortex.py (Thalamus/Caudate/Putamen/Accumbens, Harvard-Oxford)
// und extract_pallidum_cit168.py (GPe/GPi, CIT168) gebacken. Beide schreiben ihre
// Manifest-Sektion selbst, aber ein spaeterer Kortex-Manifest-Rebuild (extract_fsaverage.py)
// ueberschreibt manifest.json und verliert dabei `subcortical` (Build-Order-Konflikt).
//
// Dieser Schritt stellt die Sektion deterministisch wieder her, OHNE die schwere
// Python/nilearn-Pipeline neu laufen zu lassen: verts/faces kommen aus der Byte-Laenge
// der committeten Dateien (f32: 12 B/Vertex, u32-faces: 12 B/Face), die Metadaten
// (name_de, color) spiegeln die kanonischen Python-Quellen. Kein Handpatch — re-runnable.
//
// Fail-loud: fehlende Datei, inkonsistente Normalen-Laenge oder nicht teilbare Byte-Laenge
// bricht hart ab. Hippocampus/Amygdala sind nicht gebacken -> explizite Gaps, kein stilles
// Weglassen.
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '../../../apps/brain-app/public/assets/atlas-canonical')

// Kanonische Metadaten (Spiegel der Python-NUCLEI-Tabellen). Reihenfolge = Bake-Reihenfolge.
const NUCLEI = [
  { id: 'thalamus', name_de: 'Thalamus', color: [210, 90, 90] },
  { id: 'caudate', name_de: 'Nucleus caudatus', color: [90, 170, 210] },
  { id: 'putamen', name_de: 'Putamen', color: [230, 150, 70] },
  { id: 'accumbens', name_de: 'Nucleus accumbens', color: [110, 200, 120] },
  { id: 'gpe', name_de: 'Globus pallidus externus (GPe)', color: [150, 100, 195] },
  { id: 'gpi', name_de: 'Globus pallidus internus (GPi)', color: [185, 130, 215] },
]

// Nicht gebackene Kapitel-11-relevante Kerne -> explizite Gaps (kein stilles Fehlen).
const GAPS = [
  { id: 'hippocampus', name_de: 'Hippocampus', reason: 'nicht gebacken; HO-Quelle vorhanden, Bake ausstehend' },
  { id: 'amygdala', name_de: 'Amygdala', reason: 'nicht gebacken; HO-Quelle vorhanden, Bake ausstehend' },
]

function sizeOf(file) {
  const path = join(OUT, file)
  try {
    return statSync(path).size
  } catch {
    throw new Error(`build_subcortical_manifest: Datei fehlt: ${file}`)
  }
}

function countsFromFiles(id, side) {
  const pos = `subcort_${id}_${side}.f32`
  const norm = `subcort_${id}_${side}_norm.f32`
  const faces = `subcort_${id}_${side}_faces.u32`
  const posBytes = sizeOf(pos)
  const normBytes = sizeOf(norm)
  const facesBytes = sizeOf(faces)
  if (posBytes % 12 !== 0) throw new Error(`${pos}: ${posBytes} B nicht durch 12 teilbar`)
  if (facesBytes % 12 !== 0) throw new Error(`${faces}: ${facesBytes} B nicht durch 12 teilbar`)
  if (normBytes !== posBytes) throw new Error(`${norm}: ${normBytes} B != pos ${posBytes} B (Normalen-Mismatch)`)
  return {
    verts: posBytes / 12,
    faces: facesBytes / 12,
    pos,
    norm,
    faces_file: faces,
  }
}

const subcortical = []
for (const nuc of NUCLEI) {
  for (const side of ['L', 'R']) {
    const c = countsFromFiles(nuc.id, side)
    subcortical.push({
      id: nuc.id,
      name_de: nuc.name_de,
      side,
      color: nuc.color,
      verts: c.verts,
      faces: c.faces,
      pos: c.pos,
      norm: c.norm,
      faces_file: c.faces_file,
    })
  }
}

const manifestPath = join(OUT, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.subcortical = subcortical
manifest.subcortical_gaps = GAPS
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')

console.log(`build_subcortical_manifest: ${subcortical.length} Eintraege (6 Kerne x L/R), ${GAPS.length} Gaps -> manifest.json`)
