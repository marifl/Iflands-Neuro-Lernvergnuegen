import { useMemo } from 'react'
import * as THREE from 'three'
import type { HemiData } from './atlasAssets'
import { buildLutTextureData, type AtlasLut } from './atlasLut'

// EIN Mesh pro Hemisphaere: Positionen (pial) + Normalen + Int-Label-Attribut. Farbe aus Color-LUT
// (DataTexture, NearestFilter) im Fragment-Shader; `flat` Label-Varying -> harte Arealgrenzen.
export function CanonicalSurface({
  hemi, layer, lut, onPick,
}: {
  hemi: HemiData
  layer: string
  lut: AtlasLut
  onPick?: (faceIndex: number) => void
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(hemi.pial, 3))
    g.setIndex(new THREE.BufferAttribute(hemi.faces, 1))
    const lab = hemi.labels[layer]
    const labF = new Float32Array(lab.length)
    for (let i = 0; i < lab.length; i++) labF[i] = lab[i]
    g.setAttribute('aLabel', new THREE.BufferAttribute(labF, 1))
    g.computeVertexNormals()
    return g
  }, [hemi, layer])

  const material = useMemo(() => {
    const { data, size } = buildLutTextureData(lut)
    const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat)
    tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter
    tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true
    return new THREE.ShaderMaterial({
      uniforms: { uLut: { value: tex }, uLutSize: { value: size }, uLightDir: { value: new THREE.Vector3(0.4, 0.6, 0.8).normalize() } },
      vertexShader: `
        attribute float aLabel;
        flat varying float vLabel;
        varying vec3 vN;
        void main() {
          vLabel = aLabel; vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uLut; uniform float uLutSize; uniform vec3 uLightDir;
        flat varying float vLabel; varying vec3 vN;
        void main() {
          float u = (vLabel + 0.5) / uLutSize;
          vec4 col = texture2D(uLut, vec2(u, 0.5));
          float diff = clamp(dot(normalize(vN), uLightDir) * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(col.rgb * (0.55 + 0.45 * diff), 1.0);
        }`,
      side: THREE.DoubleSide,
    })
  }, [lut])

  return (
    <mesh
      geometry={geometry}
      material={material}
      onClick={(e) => { e.stopPropagation(); if (onPick && e.faceIndex != null) onPick(e.faceIndex) }}
    />
  )
}
