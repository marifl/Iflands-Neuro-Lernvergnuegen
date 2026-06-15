// Verifiziert die gebackene Carve-GLB auf die drei User-Anforderungen:
//  1. korrekte Normalen-Richtung (gespeicherte NORMAL vs. lokale Flaechennormale)
//  2. keine neuen T-Junctions/Risse durch den Cut (offene Kanten nach Positions-Weld vs. Basis 2204)
//  3. keine degenerierten/Sliver-Dreiecke
import { NodeIO } from '@gltf-transform/core'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const s = process.argv[2] || 'brodmann'
const doc = await new NodeIO().read(resolve(here, `../../apps/brain-app/public/assets/bodyparts3d/atlas-surface-${s}.glb`))
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0]
const P = prim.getAttribute('POSITION').getArray(), Nr = prim.getAttribute('NORMAL').getArray()
const idx = prim.getIndices() ? prim.getIndices().getArray() : null
const nv = P.length/3, nt = idx ? idx.length/3 : nv/3
const v=i=>[P[i*3],P[i*3+1],P[i*3+2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]]
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], len=a=>Math.hypot(a[0],a[1],a[2]), dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const tri = t => idx ? [idx[t*3],idx[t*3+1],idx[t*3+2]] : [t*3,t*3+1,t*3+2]
// Normalen + Slivers
const faceN=Array.from({length:nv},()=>[0,0,0]); let degen=0, sliver=0
for(let t=0;t<nt;t++){const [a,b,c]=tri(t);const A=v(a),B=v(b),C=v(c);const n=cross(sub(B,A),sub(C,A));const ar=0.5*len(n);if(ar<1e-7)degen++;const e0=len(sub(B,A)),e1=len(sub(C,B)),e2=len(sub(A,C));if((4*Math.sqrt(3)*ar)/((e0*e0+e1*e1+e2*e2)||1)<0.02)sliver++;for(const k of[a,b,c]){faceN[k][0]+=n[0];faceN[k][1]+=n[1];faceN[k][2]+=n[2]}}
let bad=0,zero=0
for(let i=0;i<nv;i++){const sn=[Nr[i*3],Nr[i*3+1],Nr[i*3+2]];if(len(sn)<0.5)zero++;const fl=len(faceN[i]);if(fl<1e-9)continue;const fn=[faceN[i][0]/fl,faceN[i][1]/fl,faceN[i][2]/fl];if(dot(fn,sn)<0.5)bad++}
// T-Junction-Proxy: offene Kanten nach ×64-Positions-Weld
const SCALE=64,pk=p=>Math.round(p[0]*SCALE)+","+Math.round(p[1]*SCALE)+","+Math.round(p[2]*SCALE)
const rep=new Map();const rid=new Int32Array(nv);for(let i=0;i<nv;i++){const k=pk(v(i));let id=rep.get(k);if(id===undefined){id=rep.size;rep.set(k,id)}rid[i]=id}
const ek=(a,b)=>a<b?a+","+b:b+","+a;const ec=new Map()
for(let t=0;t<nt;t++){const [a,b,c]=tri(t);for(const [x,y] of [[a,b],[b,c],[c,a]]){const k=ek(rid[x],rid[y]);ec.set(k,(ec.get(k)||0)+1)}}
let open=0,nonman=0;for(const [,n] of ec){if(n===1)open++;if(n>2)nonman++}
console.log(`${s}: ${nv} V / ${nt} F`)
console.log(`  Normalen >60deg falsch: ${bad} (${(100*bad/nv).toFixed(2)}%) | Null-Normalen: ${zero}`)
console.log(`  degeneriert: ${degen} | Sliver(aspect<0.02): ${sliver}`)
console.log(`  offene Kanten (×64-weld): ${open}  [Basis-Mesh ~2204; >> waere neue T-Junction/Riss] | non-manifold(>2): ${nonman}`)
