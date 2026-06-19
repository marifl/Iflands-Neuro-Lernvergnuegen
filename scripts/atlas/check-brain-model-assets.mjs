import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

const BRAIN_MODELS = [
  {
    id: 'taro',
    path: 'apps/brain-app/public/assets/bodyparts3d/brain.glb',
    expectedMeshes: 600,
    maxBytes: 7_000_000,
    maxFaceNormalBadRatio: 0.001,
  },
  {
    id: 'mni-mobile-r05',
    path: 'apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r05.glb',
    expectedMeshes: 544,
    maxBytes: 8_000_000,
    maxFaceNormalBadRatio: 0.03,
  },
  {
    id: 'mni-mobile-r06',
    path: 'apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r06.glb',
    expectedMeshes: 544,
    maxBytes: 9_000_000,
    maxFaceNormalBadRatio: 0.03,
  },
  {
    id: 'mni-mobile-r08',
    path: 'apps/brain-app/public/assets/brain-models/mni152/mni152-mobile-r08.glb',
    expectedMeshes: 544,
    maxBytes: 11_000_000,
    maxFaceNormalBadRatio: 0.03,
  },
  {
    id: 'mni-desktop-r18',
    path: 'apps/brain-app/public/assets/brain-models/mni152/mni152-desktop-r18.glb',
    expectedMeshes: 544,
    maxBytes: 20_000_000,
    maxFaceNormalBadRatio: 0.02,
  },
]

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function length(vector) {
  return Math.hypot(vector[0], vector[1], vector[2])
}

function normalize(vector) {
  const vectorLength = length(vector)
  if (!vectorLength) return [0, 0, 0]
  return [vector[0] / vectorLength, vector[1] / vectorLength, vector[2] / vectorLength]
}

function readVec3(accessor, index) {
  const out = [0, 0, 0]
  accessor.getElement(index, out)
  return out
}

async function inspectBrainModel(model) {
  const absolutePath = resolve(repoRoot, model.path)
  if (!existsSync(absolutePath)) {
    throw new Error(`${model.id}: missing asset ${model.path}`)
  }

  const document = await io.read(absolutePath)
  const root = document.getRoot()
  let meshCount = 0
  let primitiveCount = 0
  let normalMeshCount = 0
  let badNormalLength = 0
  let faceNormalChecks = 0
  let faceNormalBad = 0
  let uploadVertexCount = 0
  let renderVertexCount = 0
  let inwardLikelyMeshes = 0
  let ambiguousMeshes = 0
  let worstOutward = { name: '', ratio: 1, faces: 0 }

  for (const mesh of root.listMeshes()) {
    meshCount += 1
    for (const primitive of mesh.listPrimitives()) {
      primitiveCount += 1
      const position = primitive.getAttribute('POSITION')
      const normal = primitive.getAttribute('NORMAL')
      if (!position) throw new Error(`${model.id}/${mesh.getName()}: missing POSITION`)

      uploadVertexCount += position.getCount()
      const indices = primitive.getIndices()
      renderVertexCount += indices?.getCount() ?? position.getCount()

      if (!normal) continue
      normalMeshCount += 1

      const center = [0, 0, 0]
      for (let index = 0; index < position.getCount(); index += 1) {
        const vertex = readVec3(position, index)
        center[0] += vertex[0]
        center[1] += vertex[1]
        center[2] += vertex[2]

        const normalLength = length(readVec3(normal, index))
        if (normalLength < 0.5 || normalLength > 1.5) badNormalLength += 1
      }
      center[0] /= position.getCount()
      center[1] /= position.getCount()
      center[2] /= position.getCount()

      let outwardFaces = 0
      let inwardFaces = 0
      const triangleCount = indices ? indices.getCount() / 3 : position.getCount() / 3
      for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const aIndex = indices ? indices.getScalar(triangle * 3) : triangle * 3
        const bIndex = indices ? indices.getScalar(triangle * 3 + 1) : triangle * 3 + 1
        const cIndex = indices ? indices.getScalar(triangle * 3 + 2) : triangle * 3 + 2
        const a = readVec3(position, aIndex)
        const b = readVec3(position, bIndex)
        const c = readVec3(position, cIndex)
        const faceNormal = normalize(cross(sub(b, a), sub(c, a)))
        const vertexNormal = normalize(readVec3(normal, aIndex))

        faceNormalChecks += 1
        if (dot(faceNormal, vertexNormal) < 0.25) faceNormalBad += 1

        const faceCenter = [
          (a[0] + b[0] + c[0]) / 3,
          (a[1] + b[1] + c[1]) / 3,
          (a[2] + b[2] + c[2]) / 3,
        ]
        if (dot(faceNormal, sub(faceCenter, center)) >= 0) outwardFaces += 1
        else inwardFaces += 1
      }

      const outwardRatio = outwardFaces / Math.max(1, outwardFaces + inwardFaces)
      if (outwardRatio < 0.45) inwardLikelyMeshes += 1
      else if (outwardRatio <= 0.55) ambiguousMeshes += 1
      if (outwardRatio < worstOutward.ratio) {
        worstOutward = {
          name: mesh.getName(),
          ratio: Number(outwardRatio.toFixed(4)),
          faces: outwardFaces + inwardFaces,
        }
      }
    }
  }

  const faceNormalBadRatio = faceNormalBad / Math.max(1, faceNormalChecks)
  return {
    id: model.id,
    path: model.path,
    sizeBytes: statSync(absolutePath).size,
    meshCount,
    primitiveCount,
    normalMeshCount,
    badNormalLength,
    uploadVertexCount,
    renderVertexCount,
    faceNormalChecks,
    faceNormalBad,
    faceNormalBadRatio: Number(faceNormalBadRatio.toFixed(6)),
    inwardLikelyMeshes,
    ambiguousMeshes,
    worstOutward,
  }
}

function assertBrainModel(model, result) {
  const failures = []
  if (result.sizeBytes > model.maxBytes) {
    failures.push(`size ${result.sizeBytes} > budget ${model.maxBytes}`)
  }
  if (result.meshCount !== model.expectedMeshes) {
    failures.push(`mesh count ${result.meshCount} != expected ${model.expectedMeshes}`)
  }
  if (result.normalMeshCount !== result.primitiveCount) {
    failures.push(`normal coverage ${result.normalMeshCount}/${result.primitiveCount}`)
  }
  if (result.badNormalLength !== 0) {
    failures.push(`bad normal lengths ${result.badNormalLength}`)
  }
  if (result.faceNormalBadRatio > model.maxFaceNormalBadRatio) {
    failures.push(`face/normal bad ratio ${result.faceNormalBadRatio} > ${model.maxFaceNormalBadRatio}`)
  }
  return failures
}

const summaries = []
const failures = []
for (const model of BRAIN_MODELS) {
  const result = await inspectBrainModel(model)
  summaries.push(result)
  const modelFailures = assertBrainModel(model, result)
  if (modelFailures.length) failures.push(`${model.id}: ${modelFailures.join('; ')}`)
}

for (const summary of summaries) {
  console.log(
    [
      summary.id,
      `size=${summary.sizeBytes}`,
      `meshes=${summary.meshCount}`,
      `normals=${summary.normalMeshCount}/${summary.primitiveCount}`,
      `uploadVertices=${summary.uploadVertexCount}`,
      `faceNormalBadRatio=${summary.faceNormalBadRatio}`,
      `inwardLikely=${summary.inwardLikelyMeshes}`,
      `ambiguous=${summary.ambiguousMeshes}`,
      `worst=${summary.worstOutward.name}:${summary.worstOutward.ratio}`,
    ].join(' '),
  )
}

if (failures.length) {
  console.error(`brain model asset gate failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exit(1)
}

console.log(`brain model asset gate passed (${summaries.length} assets)`)
