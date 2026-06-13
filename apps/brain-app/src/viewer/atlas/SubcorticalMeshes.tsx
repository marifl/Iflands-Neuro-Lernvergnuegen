import { useMemo } from 'react'
import * as THREE from 'three'
import type { SubcorticalMesh } from './atlasAssets'

// Subkortikale Kerne (Thalamus/Basalganglien) in MNI152 mm — passt zur pial-Surface (Offset 0).
// Solide MeshStandardMaterial in der Manifest-Farbe; renderOrder 1, damit sie nach dem Ghost-Kortex zeichnen.
export function SubcorticalMeshes({
  meshes, onPick,
}: {
  meshes: SubcorticalMesh[]
  onPick: (name: string) => void
}) {
  const items = useMemo(() => meshes.map((m) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3))
    g.setAttribute('normal', new THREE.BufferAttribute(m.norm, 3))
    g.setIndex(new THREE.BufferAttribute(m.faces, 1))
    const [r, gr, b] = m.entry.color
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(r / 255, gr / 255, b / 255),
      roughness: 0.6,
      metalness: 0,
    })
    return { key: `${m.entry.id}-${m.entry.side}`, name: m.entry.name_de, geometry: g, material: mat }
  }), [meshes])

  return (
    <>
      {items.map((it) => (
        <mesh
          key={it.key}
          geometry={it.geometry}
          material={it.material}
          renderOrder={1}
          onClick={(e) => { e.stopPropagation(); onPick(it.name) }}
        />
      ))}
    </>
  )
}
