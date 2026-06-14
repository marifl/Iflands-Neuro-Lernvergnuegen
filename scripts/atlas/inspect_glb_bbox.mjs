import { NodeIO } from '@gltf-transform/core'
const io = new NodeIO()
const doc = await io.read(process.argv[2])
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]
let nmesh = 0
for (const m of doc.getRoot().listMeshes()) {
  nmesh++
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION').getArray()
    for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) { if (a[i + k] < mn[k]) mn[k] = a[i + k]; if (a[i + k] > mx[k]) mx[k] = a[i + k] }
  }
}
console.log('meshes=' + nmesh, 'X', [mn[0].toFixed(0), mx[0].toFixed(0)], 'Y', [mn[1].toFixed(0), mx[1].toFixed(0)], 'Z', [mn[2].toFixed(0), mx[2].toFixed(0)], 'spans', mx.map((x, i) => (x - mn[i]).toFixed(0)))
