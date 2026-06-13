import { useEffect, useMemo } from 'react'
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
  // Geometrie-Basis (Position, Index, Normalen) wird NUR gebaut wenn hemi wechselt.
  // Layer-Wechsel beruehrt Positionen/Normalen NICHT — nur das aLabel-Attribut wird hot-geswapped.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(hemi.pial, 3))
    g.setIndex(new THREE.BufferAttribute(hemi.faces, 1))
    // Initiales Label-Attribut (erstes verfuegbares Layer) — wird sofort per useEffect ueberschrieben.
    const firstLayerKey = Object.keys(hemi.labels)[0]
    if (!firstLayerKey) throw new Error('CanonicalSurface: hemi.labels ist leer')
    const firstLab = hemi.labels[firstLayerKey]
    const labF = new Float32Array(firstLab.length)
    g.setAttribute('aLabel', new THREE.BufferAttribute(labF, 1))
    g.computeVertexNormals()
    return g
  }, [hemi])

  // Label-Attribut-Update: nur wenn geometry oder layer wechselt — kein Positions-/Normalen-Rebuild.
  useEffect(() => {
    const lab = hemi.labels[layer]
    if (!lab) throw new Error(`CanonicalSurface: Layer "${layer}" nicht in hemi.labels`)
    const attr = geometry.getAttribute('aLabel') as THREE.BufferAttribute
    const dst = attr.array as Float32Array
    for (let i = 0; i < lab.length; i++) dst[i] = lab[i]
    attr.needsUpdate = true
  }, [geometry, hemi, layer])

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
