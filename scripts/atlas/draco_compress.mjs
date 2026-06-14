// Draco-Kompression fuer ein GLB — erhaelt die Topologie (nur Positions-Quantisierung), also bleiben
// watertight-Meshes watertight. Schrumpft die Datei massiv (die App laedt Draco bereits via useGLTF).
// Aufruf: node draco_compress.mjs <glb-pfad> [quantizePosition=14]
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { statSync } from 'node:fs'

const path = process.argv[2]
const qp = Number(process.argv[3] ?? 14)
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })
const before = statSync(path).size
const doc = await io.read(path)
await doc.transform(draco({ quantizePosition: qp, quantizeNormal: 10 }))
await io.write(path, doc)
const after = statSync(path).size
console.log(`Draco: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB (qp=${qp})`)
