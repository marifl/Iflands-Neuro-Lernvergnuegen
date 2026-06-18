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

function pushVecClose(errors, label, actual, expected, tolerance) {
  for (let index = 0; index < 3; index += 1) {
    pushClose(errors, `${label}[${index}]`, actual[index], expected[index], tolerance)
  }
}

function combinedBounds(...boundsEntries) {
  const min = [0, 1, 2].map((index) => Math.min(...boundsEntries.map((entry) => entry.min[index])))
  const max = [0, 1, 2].map((index) => Math.max(...boundsEntries.map((entry) => entry.max[index])))
  const center = [0, 1, 2].map((index) => (min[index] + max[index]) / 2)
  const size = [0, 1, 2].map((index) => max[index] - min[index])
  return { min, max, center, size }
}

function vec3OrZero(value) {
  if (!Array.isArray(value) || value.length !== 3) return [0, 0, 0]
  return value
}

function translatedBounds(bounds, offset) {
  return {
    min: bounds.min.map((value, index) => value + offset[index]),
    max: bounds.max.map((value, index) => value + offset[index]),
    center: bounds.center.map((value, index) => value + offset[index]),
    size: bounds.size,
  }
}

function manifestAsset(manifest, assetId) {
  const asset = manifest.assets.find((candidate) => candidate.assetId === assetId)
  if (!asset) throw new Error(`Phineas transform: Asset fehlt im Manifest: ${assetId}`)
  return asset
}

function resolvedRootTransform(asset) {
  const { rootTransform, scale } = asset.normalization
  return {
    position: rootTransform.position,
    rotation: rootTransform.rotation,
    scale: rootTransform.scale.map((component) => component * scale),
  }
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

    async function parseGltf(b64) {
      const bin = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0)).buffer
      return await new Promise((resolve, reject) => loader.parse(bin, '', resolve, reject))
    }

    window.__measurePhineasBounds = async (b64, transform) => {
      const gltf = await parseGltf(b64)
      if (transform) {
        gltf.scene.position.set(...transform.position)
        gltf.scene.rotation.set(...transform.rotation)
        gltf.scene.scale.set(...transform.scale)
      }
      gltf.scene.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(gltf.scene)
      return {
        min: box.min.toArray(),
        max: box.max.toArray(),
        center: box.getCenter(new THREE.Vector3()).toArray(),
        size: box.getSize(new THREE.Vector3()).toArray(),
      }
    }

    window.__verifyPhineasTransform = async (b64, input) => {
      const gltf = await parseGltf(b64)
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
    bounds: async (path, transform = null) => page.evaluate(
      ({ b64, transform }) => window.__measurePhineasBounds(b64, transform),
      { b64: Buffer.from(readFileSync(path)).toString('base64'), transform },
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

const skullAlignment = contract.skullAlignment
if (!skullAlignment) errors.push('skullAlignment fehlt im Transform-Contract')
const skullBaseAsset = manifestAsset(manifest, 'phineas-gage-skull-base')
const skullCalvariaAsset = manifestAsset(manifest, 'phineas-gage-skull-calvaria')
const skullBaseTransform = resolvedRootTransform(skullBaseAsset)
const skullCalvariaTransform = resolvedRootTransform(skullCalvariaAsset)
if (skullAlignment) {
  pushVecClose(errors, 'skullBase.rootTransform.position', skullBaseTransform.position, skullAlignment.rootTransform.position, 0.000001)
  pushVecClose(errors, 'skullBase.rootTransform.rotation', skullBaseTransform.rotation, skullAlignment.rootTransform.rotation, 0.000001)
  pushVecClose(errors, 'skullBase.rootTransform.scale', skullBaseTransform.scale, skullAlignment.rootTransform.scale, 0.000001)
  pushVecClose(errors, 'skullCalvaria.rootTransform.position', skullCalvariaTransform.position, skullAlignment.rootTransform.position, 0.000001)
  pushVecClose(errors, 'skullCalvaria.rootTransform.rotation', skullCalvariaTransform.rotation, skullAlignment.rootTransform.rotation, 0.000001)
  pushVecClose(errors, 'skullCalvaria.rootTransform.scale', skullCalvariaTransform.scale, skullAlignment.rootTransform.scale, 0.000001)
  if (Math.abs(skullBaseTransform.rotation[1] - Math.PI) > 0.000001 || skullBaseTransform.rotation[0] !== 0 || skullBaseTransform.rotation[2] !== 0) {
    errors.push(`skullBase.rootTransform.rotation=${skullBaseTransform.rotation.join('/')} expected Y-axis rotation`)
  }
  if (Math.abs(skullCalvariaTransform.rotation[1] - Math.PI) > 0.000001 || skullCalvariaTransform.rotation[0] !== 0 || skullCalvariaTransform.rotation[2] !== 0) {
    errors.push(`skullCalvaria.rootTransform.rotation=${skullCalvariaTransform.rotation.join('/')} expected Y-axis rotation`)
  }
  if (skullBaseTransform.scale.some((component) => component <= 0)) {
    errors.push(`skullBase.rootTransform.scale=${skullBaseTransform.scale.join('/')} expected positive scale`)
  }
  if (skullCalvariaTransform.scale.some((component) => component <= 0)) {
    errors.push(`skullCalvaria.rootTransform.scale=${skullCalvariaTransform.scale.join('/')} expected positive scale`)
  }
}

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

  if (skullAlignment) {
    const referenceSkull = await inspector.bounds(assetPath(skullAlignment.referenceAssets.skullXZ))
    const referenceHead = await inspector.bounds(assetPath(skullAlignment.referenceAssets.headY))
    const brain = await inspector.bounds(assetPath(skullAlignment.referenceAssets.brainFit))
    const skullBase = await inspector.bounds(assetPath(skullBaseAsset.uri), skullBaseTransform)
    const skullCalvaria = await inspector.bounds(assetPath(skullCalvariaAsset.uri), skullCalvariaTransform)
    const skull = combinedBounds(skullBase, skullCalvaria)
    const target = skullAlignment.targetBounds
    const visualOffset = vec3OrZero(skullAlignment.visualOffset)
    const expectedTarget = {
      min: [referenceSkull.min[0], referenceHead.min[1], referenceSkull.min[2]],
      max: [referenceSkull.max[0], referenceHead.max[1], referenceSkull.max[2]],
      center: [referenceSkull.center[0], referenceHead.center[1], referenceSkull.center[2]],
      size: [referenceSkull.size[0], referenceHead.size[1], referenceSkull.size[2]],
    }
    const expectedFinalTarget = translatedBounds(expectedTarget, visualOffset)
    if (skullAlignment.yFitPolicy === 'native-skull-height') {
      expectedFinalTarget.size[1] = skullAlignment.rawBounds.size[1]
      expectedFinalTarget.min[1] = expectedFinalTarget.center[1] - expectedFinalTarget.size[1] / 2
      expectedFinalTarget.max[1] = expectedFinalTarget.center[1] + expectedFinalTarget.size[1] / 2
    }

    pushVecClose(errors, 'skullAlignment.targetBounds.min', target.min, expectedFinalTarget.min, 0.000001)
    pushVecClose(errors, 'skullAlignment.targetBounds.max', target.max, expectedFinalTarget.max, 0.000001)
    pushVecClose(errors, 'skullAlignment.targetBounds.center', target.center, expectedFinalTarget.center, 0.000001)
    pushVecClose(errors, 'skullAlignment.targetBounds.size', target.size, expectedFinalTarget.size, 0.000001)
    pushVecClose(errors, 'skull.bounds.min', skull.min, target.min, skullAlignment.boundsToleranceMm)
    pushVecClose(errors, 'skull.bounds.max', skull.max, target.max, skullAlignment.boundsToleranceMm)
    pushVecClose(errors, 'skull.bounds.center', skull.center, target.center, skullAlignment.boundsToleranceMm)
    pushVecClose(errors, 'skull.bounds.size', skull.size, target.size, skullAlignment.boundsToleranceMm)
    if (skullCalvaria.min[1] <= skullBase.min[1]) errors.push(`skullCalvaria.minY=${skullCalvaria.min[1].toFixed(3)} expected above skullBase.minY=${skullBase.min[1].toFixed(3)}`)
    if (skullCalvaria.max[1] <= skullBase.max[1]) errors.push(`skullCalvaria.maxY=${skullCalvaria.max[1].toFixed(3)} expected above skullBase.maxY=${skullBase.max[1].toFixed(3)}`)
    for (let index = 0; index < 3; index += 1) {
      if (brain.min[index] < skull.min[index] - skullAlignment.brainFitToleranceMm) {
        errors.push(`brain.min[${index}]=${brain.min[index].toFixed(3)} liegt ausserhalb skull.min=${skull.min[index].toFixed(3)}`)
      }
      if (brain.max[index] > skull.max[index] + skullAlignment.brainFitToleranceMm) {
        errors.push(`brain.max[${index}]=${brain.max[index].toFixed(3)} liegt ausserhalb skull.max=${skull.max[index].toFixed(3)}`)
      }
    }
    console.log(
      `${errors.length ? 'FAIL' : 'PASS'} phineas-transform skull center=${skull.center.map((value) => value.toFixed(1)).join('/')} size=${skull.size.map((value) => value.toFixed(1)).join('/')} brainFit=checked`,
    )
  }
} finally {
  await inspector.close()
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL ${error}`)
  process.exit(1)
}
