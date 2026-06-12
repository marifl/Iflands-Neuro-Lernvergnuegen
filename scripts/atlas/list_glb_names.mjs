// Listet nur die Mesh-Node-Namen eines (ggf. Draco-komprimierten) GLB — ohne Geometrie.
// Aufruf: node list_glb_names.mjs <abs-glb-path> [nameRegex]
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [glbPath, nameRegex] = process.argv.slice(2)
if (!glbPath) throw new Error('Aufruf: node list_glb_names.mjs <glb> [nameRegex]')

const glbBytes = readFileSync(resolve(glbPath))
const filter = nameRegex ?? '.*'
const b64 = Buffer.from(glbBytes).toString('base64')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(`<!doctype html>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.184.0/build/three.module.js"}}
</script>
<canvas></canvas>`)

const names = await page.evaluate(async ({ b64, filter }) => {
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
  const out = []
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.name && re.test(o.name)) out.push(o.name)
  })
  return out.sort()
}, { b64, filter })

console.log(names.length, 'meshes')
for (const n of names) console.log(n)
await browser.close()
