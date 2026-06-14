import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { writeFileSync } from 'node:fs'
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder': await draco3d.createDecoderModule()})
const doc = await io.read('../../apps/brain-app/public/assets/bodyparts3d/brain.glb')
const out = {}
for (const m of doc.getRoot().listMeshes()) {
  const nm = m.getName(); if(!nm) continue
  let sx=0,sy=0,sz=0,n=0
  for (const p of m.listPrimitives()){const a=p.getAttribute('POSITION').getArray();for(let i=0;i<a.length;i+=3){sx+=a[i];sy+=a[i+1];sz+=a[i+2];n++}}
  if(n) out[nm]=[sx/n,sy/n,sz/n]
}
writeFileSync('work/taro_centroids.json', JSON.stringify(out))
console.log('TARO Mesh-Centroide:', Object.keys(out).length)
