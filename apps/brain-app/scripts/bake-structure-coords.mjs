// scripts/bake-structure-coords.mjs
// Laedt die laufende App in echtem Chromium, traversiert die three.js-Szene im Viewer-Raum,
// berechnet pro Mesh centroid/bbox/sphere/extremes/surface und schreibt structure-coords.json.
// Voraussetzung: Dev-Server laeuft (pnpm dev) ODER vite preview; URL via BAKE_URL anpassbar.
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const URL = process.env.BAKE_URL ?? 'http://localhost:5173/?mode=explore'
const SURFACE_SAMPLES = 48

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (msg) => console.log('[page]', msg.text()))
await page.goto(URL, { waitUntil: 'networkidle' })
// Warten bis das GLB geladen ist: der DEV-Scene-Handle ist gesetzt und enthaelt benannte Meshes.
await page.waitForFunction(() => {
  const c = document.querySelector('canvas')
  const s = window.__THREE_SCENE__
  if (!c || !s || !window.__THREE__) return false
  let named = 0
  s.traverse((o) => { if (o.isMesh && o.name) named++ })
  return named > 100
}, { timeout: 90000 })

const coords = await page.evaluate((N) => {
  const THREE = window.__THREE__
  const scene = window.__THREE_SCENE__
  const out = {}
  const v = new THREE.Vector3()
  scene.traverse((o) => {
    if (!o.isMesh || !o.name) return
    o.updateWorldMatrix(true, false)
    const g = o.geometry
    const pos = g.attributes.position
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
    const ext = { xmin: null, xmax: null, ymin: null, ymax: null, zmin: null, zmax: null }
    const c = [0, 0, 0]
    const n = pos.count
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      c[0] += v.x; c[1] += v.y; c[2] += v.z
      const p = [v.x, v.y, v.z]
      for (let a = 0; a < 3; a++) { if (p[a] < min[a]) min[a] = p[a]; if (p[a] > max[a]) max[a] = p[a] }
      if (ext.xmin === null || v.x < ext.xmin[0]) ext.xmin = p
      if (ext.xmax === null || v.x > ext.xmax[0]) ext.xmax = p
      if (ext.ymin === null || v.y < ext.ymin[1]) ext.ymin = p
      if (ext.ymax === null || v.y > ext.ymax[1]) ext.ymax = p
      if (ext.zmin === null || v.z < ext.zmin[2]) ext.zmin = p
      if (ext.zmax === null || v.z > ext.zmax[2]) ext.zmax = p
    }
    const centroid = [c[0] / n, c[1] / n, c[2] / n]
    const sphere = Math.max(
      Math.hypot(max[0] - centroid[0], max[1] - centroid[1], max[2] - centroid[2]),
      Math.hypot(centroid[0] - min[0], centroid[1] - min[1], centroid[2] - min[2]),
    )
    const idx = g.index
    const triCount = idx ? idx.count / 3 : n / 3
    const areas = new Float64Array(triCount)
    const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3()
    const triVert = (t, k) => {
      const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k
      return new THREE.Vector3().fromBufferAttribute(pos, vi).applyMatrix4(o.matrixWorld)
    }
    let total = 0
    for (let t = 0; t < triCount; t++) {
      a.copy(triVert(t, 0)); b.copy(triVert(t, 1)); cc.copy(triVert(t, 2))
      const area = b.clone().sub(a).cross(cc.clone().sub(a)).length() / 2
      areas[t] = area; total += area
    }
    const surface = []
    for (let s = 0; s < N && total > 0; s++) {
      let r = ((s + 0.5) / N) * total, t = 0
      while (t < triCount - 1 && r > areas[t]) { r -= areas[t]; t++ }
      a.copy(triVert(t, 0)); b.copy(triVert(t, 1)); cc.copy(triVert(t, 2))
      let u = ((s * 0.61803398875) % 1), w = ((s * 0.38196601125) % 1)
      if (u + w > 1) { u = 1 - u; w = 1 - w }
      surface.push([a.x + (b.x - a.x) * u + (cc.x - a.x) * w,
                    a.y + (b.y - a.y) * u + (cc.y - a.y) * w,
                    a.z + (b.z - a.z) * u + (cc.z - a.z) * w].map((x) => +x.toFixed(2)))
    }
    out[o.name] = {
      centroid: centroid.map((x) => +x.toFixed(2)),
      bbox: { min: min.map((x) => +x.toFixed(2)), max: max.map((x) => +x.toFixed(2)) },
      sphere: +sphere.toFixed(2),
      extremes: Object.fromEntries(Object.entries(ext).map(([k, p]) => [k, p.map((x) => +x.toFixed(2))])),
      surface,
    }
  })
  return out
}, SURFACE_SAMPLES)

// Output liegt in apps/brain-app/public/scenes/ (Script liegt in apps/brain-app/scripts/).
const here = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(here, '../public/scenes/structure-coords.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(coords))
console.log('baked', Object.keys(coords).length, 'structures ->', outPath)
await browser.close()
