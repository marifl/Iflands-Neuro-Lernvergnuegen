// Laedt ein GLB in echtem Chromium via three GLTFLoader (+DRACOLoader, gstatic-Decoder wie die App),
// traversiert die Szene, schreibt je benanntem Mesh world-space Vertices + Faces als JSON.
// Aufruf: node decode_glb.mjs <abs-glb-path> <out-json> [nameRegex]
import { chromium } from '@playwright/test'
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const [glbPath, outPath, nameRegex] = process.argv.slice(2)
if (!glbPath || !outPath) throw new Error('Aufruf: node decode_glb.mjs <glb> <out.json> [nameRegex]')

const here = dirname(fileURLToPath(import.meta.url))
const glbBytes = readFileSync(resolve(glbPath))
const filter = nameRegex ?? '.*'
const b64 = Buffer.from(glbBytes).toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (m) => { if (m.type() !== 'warning') console.log('[page]', m.text()) })
// Import-Map: GLTFLoader/DRACOLoader importieren intern `from 'three'` als bare specifier
await page.setContent(`<!doctype html>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.184.0/build/three.module.js"}}
</script>
<canvas></canvas>`)

const result = await page.evaluate(async ({ b64, filter }) => {
  const THREE = await import('https://unpkg.com/three@0.184.0/build/three.module.js')
  const { GLTFLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/GLTFLoader.js')
  const { DRACOLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/DRACOLoader.js')
  const { MeshoptDecoder } = await import('https://unpkg.com/three@0.184.0/examples/jsm/libs/meshopt_decoder.module.js')
  const draco = new DRACOLoader()
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  await MeshoptDecoder.ready
  loader.setMeshoptDecoder(MeshoptDecoder)
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
  const gltf = await new Promise((res, rej) => loader.parse(bin, '', res, rej))
  const re = new RegExp(filter, 'i')
  const out = {}
  const v = new THREE.Vector3()
  gltf.scene.updateMatrixWorld(true)
  gltf.scene.traverse((o) => {
    if (!o.isMesh || !o.name || !re.test(o.name)) return
    const g = o.geometry
    const pos = g.attributes.position
    const verts = []
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      verts.push([+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)])
    }
    const idx = g.index
    const faces = []
    if (idx) {
      for (let i = 0; i < idx.count; i += 3) faces.push([idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)])
    } else {
      for (let i = 0; i < pos.count; i += 3) faces.push([i, i + 1, i + 2])
    }
    if (out[o.name]) {
      const base = out[o.name].vertices.length
      out[o.name].vertices.push(...verts)
      out[o.name].faces.push(...faces.map((f) => f.map((x) => x + base)))
    } else {
      out[o.name] = { vertices: verts, faces }
    }
  })
  return out
}, { b64, filter })

writeFileSync(resolve(outPath), JSON.stringify(result))
console.log('decoded', Object.keys(result).length, 'meshes ->', outPath)
await browser.close()
