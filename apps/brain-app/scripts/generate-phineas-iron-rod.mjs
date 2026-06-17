import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    }, (error) => this.onerror?.(error))
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`
      this.onloadend?.()
    }, (error) => this.onerror?.(error))
  }
}

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const publicRoot = resolve(appRoot, 'public')
const contractPath = resolve(publicRoot, 'assets/phineas/transform-contract.json')

function loadContract() {
  return JSON.parse(readFileSync(contractPath, 'utf8'))
}

function vec3(values, field) {
  if (!Array.isArray(values) || values.length !== 3 || values.some((value) => typeof value !== 'number')) {
    throw new Error(`Phineas rod generator: ${field} muss [x,y,z] sein`)
  }
  return new THREE.Vector3(...values)
}

function generatedRodMesh(contract) {
  const entry = vec3(contract.trajectory.entry, 'trajectory.entry')
  const exit = vec3(contract.trajectory.exit, 'trajectory.exit')
  const axis = exit.clone().sub(entry)
  if (axis.length() === 0) throw new Error('Phineas rod generator: trajectory axis hat Laenge 0')
  axis.normalize()

  const rod = contract.ironRod
  const geometry = new THREE.CylinderGeometry(
    rod.tipDiameterMm / 2,
    rod.shaftDiameterMm / 2,
    rod.lengthMm,
    rod.radialSegments,
    1,
    false,
  )
  geometry.name = `${rod.nodeName}-geometry`

  const material = new THREE.MeshStandardMaterial({
    name: 'phineas-gage-iron',
    color: '#6f7b82',
    roughness: 0.42,
    metalness: 0.72,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = rod.nodeName
  mesh.position.copy(entry.clone().add(exit).multiplyScalar(0.5))
  mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis))
  mesh.userData = {
    contractId: contract.contractId,
    generatedFrom: contractPath.replace(appRoot, 'apps/brain-app'),
    lengthMm: rod.lengthMm,
    shaftDiameterMm: rod.shaftDiameterMm,
    tipDiameterMm: rod.tipDiameterMm,
  }
  return mesh
}

async function exportGlb(scene) {
  const exporter = new GLTFExporter()
  return new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true })
  })
}

const contract = loadContract()
const scene = new THREE.Scene()
scene.name = 'phineas-gage-iron-rod-scene'
scene.add(generatedRodMesh(contract))

const glb = await exportGlb(scene)
const outPath = resolve(publicRoot, contract.ironRod.uri.replace(/^\//, ''))
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, Buffer.from(glb))
console.log(`Wrote ${outPath}`)
