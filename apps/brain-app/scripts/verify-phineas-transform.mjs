import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const publicRoot = resolve(appRoot, 'public')
const contractPath = resolve(publicRoot, 'assets/phineas/transform-contract.json')
const manifestPath = resolve(publicRoot, 'assets/phineas/asset-manifest.json')

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assetPath(uri) {
  if (!uri.startsWith('/assets/')) throw new Error(`Phineas transform: Asset-URI muss unter /assets/ liegen: ${uri}`)
  return resolve(publicRoot, uri.slice(1))
}

function sha256(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`
}

function pushClose(errors, label, actual, expected, tolerance) {
  if (Math.abs(actual - expected) > tolerance) {
    errors.push(`${label}=${actual.toFixed(3)} expected=${expected} tolerance=${tolerance}`)
  }
}

function manifestAsset(manifest, assetId) {
  const asset = manifest.assets.find((candidate) => candidate.assetId === assetId)
  if (!asset) throw new Error(`Phineas transform: Asset fehlt im Manifest: ${assetId}`)
  return asset
}

async function createInspector() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(`<!doctype html>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.184.0/build/three.module.js"}}
</script>`)
  await page.evaluate(async () => {
    const THREE = await import('three')
    const { GLTFLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/GLTFLoader.js')
    const { DRACOLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/DRACOLoader.js')
    const { MeshoptDecoder } = await import('https://unpkg.com/three@0.184.0/examples/jsm/libs/meshopt_decoder.module.js')
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    await MeshoptDecoder.ready
    loader.setMeshoptDecoder(MeshoptDecoder)

    function vector(values) {
      return new THREE.Vector3(values[0], values[1], values[2])
    }

    window.__verifyPhineasTransform = async (b64, input) => {
      const bin = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0)).buffer
      const gltf = await new Promise((resolve, reject) => loader.parse(bin, '', resolve, reject))
      gltf.scene.updateMatrixWorld(true)

      const entry = vector(input.entry)
      const exit = vector(input.exit)
      const axis = exit.clone().sub(entry).normalize()
      const center = entry.clone().add(exit).multiplyScalar(0.5)
      const mesh = gltf.scene.getObjectByName(input.nodeName)
      if (!mesh?.isMesh) return { ok: false, error: `Mesh fehlt: ${input.nodeName}` }

      const position = mesh.geometry.getAttribute('position')
      const projected = []
      const radial = []
      const point = new THREE.Vector3()
      const world = new THREE.Vector3()
      for (let index = 0; index < position.count; index += 1) {
        point.fromBufferAttribute(position, index)
        world.copy(point).applyMatrix4(mesh.matrixWorld)
        const delta = world.clone().sub(center)
        const along = delta.dot(axis)
        const radialVector = delta.sub(axis.clone().multiplyScalar(along))
        projected.push(along)
        radial.push({ along, radius: radialVector.length() })
      }

      const min = Math.min(...projected)
      const max = Math.max(...projected)
      const lengthMm = max - min
      const shaftBand = min + lengthMm * 0.02
      const tipBand = max - lengthMm * 0.02
      const shaftRadiusMm = Math.max(...radial.filter((sample) => sample.along <= shaftBand).map((sample) => sample.radius))
      const tipRadiusMm = Math.max(...radial.filter((sample) => sample.along >= tipBand).map((sample) => sample.radius))
      const axisMidpointDistanceMm = Math.abs(center.clone().sub(mesh.position).dot(axis))

      return {
        ok: true,
        meshName: mesh.name,
        vertexCount: position.count,
        lengthMm,
        shaftDiameterMm: shaftRadiusMm * 2,
        tipDiameterMm: tipRadiusMm * 2,
        axisMidpointDistanceMm,
        meshPosition: mesh.position.toArray(),
      }
    }
  })
  return {
    inspect: async (path, input) => page.evaluate(
      ({ b64, input }) => window.__verifyPhineasTransform(b64, input),
      { b64: Buffer.from(readFileSync(path)).toString('base64'), input },
    ),
    close: () => browser.close(),
  }
}

const contract = loadJson(contractPath)
const manifest = loadJson(manifestPath)
const errors = []

if (contract.schemaVersion !== 1) errors.push(`schemaVersion=${contract.schemaVersion}`)
if (contract.contractId !== 'phineas-gage-transform-v1') errors.push(`contractId=${contract.contractId}`)
if (contract.unit !== 'millimeter') errors.push(`unit=${contract.unit}`)
if (contract.upAxis !== 'y-up') errors.push(`upAxis=${contract.upAxis}`)

for (const source of contract.sources) {
  if (!existsSync(resolve(appRoot, '..', '..', source.localPath))) errors.push(`source fehlt: ${source.localPath}`)
}

const rodAsset = manifestAsset(manifest, contract.ironRod.assetId)
if (rodAsset.uri !== contract.ironRod.uri) errors.push(`rod.uri=${rodAsset.uri}`)
if (rodAsset.parts[0]?.nodeName !== contract.ironRod.nodeName) errors.push(`rod.nodeName=${rodAsset.parts[0]?.nodeName}`)
const rodPath = assetPath(contract.ironRod.uri)
const actualHash = sha256(rodPath)
if (rodAsset.source.hash !== actualHash) errors.push(`rod.sha256=${actualHash} manifest=${rodAsset.source.hash}`)
if (rodAsset.source.kind !== 'synthetic') errors.push(`rod.source.kind=${rodAsset.source.kind}`)

const inspector = await createInspector()
try {
  const measured = await inspector.inspect(rodPath, {
    entry: contract.trajectory.entry,
    exit: contract.trajectory.exit,
    nodeName: contract.ironRod.nodeName,
  })
  if (!measured.ok) {
    errors.push(measured.error)
  } else {
    pushClose(errors, 'rod.lengthMm', measured.lengthMm, contract.ironRod.lengthMm, contract.ironRod.lengthToleranceMm)
    pushClose(errors, 'rod.shaftDiameterMm', measured.shaftDiameterMm, contract.ironRod.shaftDiameterMm, contract.ironRod.shaftDiameterToleranceMm)
    pushClose(errors, 'rod.tipDiameterMm', measured.tipDiameterMm, contract.ironRod.tipDiameterMm, contract.ironRod.tipDiameterToleranceMm)
    pushClose(errors, 'rod.axisMidpointDistanceMm', measured.axisMidpointDistanceMm, 0, 0.001)
    console.log(
      `${errors.length ? 'FAIL' : 'PASS'} phineas-transform rod length=${measured.lengthMm.toFixed(1)}mm shaft=${measured.shaftDiameterMm.toFixed(1)}mm tip=${measured.tipDiameterMm.toFixed(1)}mm vertices=${measured.vertexCount}`,
    )
  }
} finally {
  await inspector.close()
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`)
  process.exit(1)
}
