import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { HemiData } from './atlasAssets'
import { buildLutTextureData, type AtlasLut } from './atlasLut'
import { nearestCornerVertex } from './atlasPick'

// EIN Mesh pro Hemisphaere: Positionen (pial/inflated) + Normalen + Curvature + Int-Label-Attribut.
// Curvature-Graustufe als Basis, Arealfarbe (Color-LUT, DataTexture, NearestFilter) darueber gemischt;
// `flat` Label-Varying -> harte Arealgrenzen, Curvature interpoliert (kein flat).
export function CanonicalSurface({
  hemi, layer, surface, lut, offsetX = 0, opacity = 1, onPick,
}: {
  hemi: HemiData
  layer: string
  surface: 'pial' | 'inflated'
  lut: AtlasLut
  offsetX?: number
  opacity?: number
  onPick?: (vertex: number) => void
}) {
  // Geometrie-Basis (Position, Index, Normalen, Curvature) wird gebaut wenn hemi ODER surface wechselt.
  // Layer-Wechsel beruehrt Positionen/Normalen NICHT — nur das aLabel-Attribut wird hot-geswapped.
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = surface === 'inflated' ? hemi.infl : hemi.pial
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setIndex(new THREE.BufferAttribute(hemi.faces, 1))
    // Curvature (Sulcus-Tiefe) haengt nur an hemi -> direkt setzen, NICHT flat (interpoliert).
    g.setAttribute('aCurv', new THREE.BufferAttribute(hemi.curv, 1))
    // Initiales Label-Attribut (erstes verfuegbares Layer) — wird sofort per useEffect ueberschrieben.
    const firstLayerKey = Object.keys(hemi.labels)[0]
    if (!firstLayerKey) throw new Error('CanonicalSurface: hemi.labels ist leer')
    const firstLab = hemi.labels[firstLayerKey]
    const labF = new Float32Array(firstLab.length)
    g.setAttribute('aLabel', new THREE.BufferAttribute(labF, 1))
    g.computeVertexNormals()
    return g
  }, [hemi, surface])

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
      uniforms: { uLut: { value: tex }, uLutSize: { value: size }, uLightDir: { value: new THREE.Vector3(0.4, 0.6, 0.8).normalize() }, uOpacity: { value: 1 } },
      vertexShader: `
        attribute float aLabel;
        attribute float aCurv;
        flat varying float vLabel;
        varying float vCurv;
        varying vec3 vN;
        void main() {
          vLabel = aLabel; vCurv = aCurv; vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D uLut; uniform float uLutSize; uniform vec3 uLightDir; uniform float uOpacity;
        flat varying float vLabel; varying float vCurv; varying vec3 vN;
        void main() {
          // Sulcus dunkler, Gyrus heller (FreeSurfer-Look)
          vec3 base = mix(vec3(0.30), vec3(0.62), vCurv);
          vec4 area = texture2D(uLut, vec2((vLabel + 0.5) / uLutSize, 0.5));
          // Medialwand/0 zeigt nur Curvature; sonst Arealfarbe ueber die Graustufe legen
          vec3 col = mix(base, area.rgb, 0.82);
          float diff = clamp(dot(normalize(vN), uLightDir) * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(col * (0.6 + 0.4 * diff), uOpacity);
        }`,
      side: THREE.DoubleSide,
    })
  }, [lut])

  // Ghost-Modus: bei opacity<1 transparent + depthWrite aus, sonst der Kortex verdeckt die Kerne.
  useEffect(() => {
    material.uniforms.uOpacity.value = opacity
    material.transparent = opacity < 1
    material.depthWrite = opacity >= 1
    material.needsUpdate = true
  }, [material, opacity])

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[offsetX, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        if (!onPick || e.faceIndex == null || !e.face) return
        // Klickpunkt in lokale Mesh-Koordinaten (Mesh hat zwar Identity-Transform, aber korrekt bleiben)
        const p = (e.object as THREE.Mesh).worldToLocal(e.point.clone())
        const pos = (e.object as THREE.Mesh).geometry.getAttribute('position') as THREE.BufferAttribute
        const v = nearestCornerVertex(pos.array as Float32Array, e.face.a, e.face.b, e.face.c, [p.x, p.y, p.z])
        onPick(v)
      }}
    />
  )
}
