import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..', '..')
const publicRoot = resolve(appRoot, 'public')
const jsonOut = resolve(repoRoot, 'docs/reviews/mesh-identity-inventory.json')
const markdownOut = resolve(repoRoot, 'docs/reviews/2026-06-17-mesh-identity-inventory.md')
const mode = process.argv.includes('--write') ? 'write' : 'check'

const generatedFiles = new Set([relative(repoRoot, jsonOut), relative(repoRoot, markdownOut), 'apps/brain-app/scripts/mesh-identity-inventory.mjs'])
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.next', 'coverage'])
const textExtensions = new Set('.css .html .js .json .md .mjs .py .sh .toml .ts .tsx .txt .yml .yaml'.split(' '))

function repoPath(path) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function assetPath(uri) {
  if (!uri.startsWith('/assets/')) throw new Error(`Inventory: Asset-URI muss unter /assets/ liegen: ${uri}`)
  return resolve(publicRoot, uri.slice(1))
}

function sha256(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`
}

function duplicates(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }))
}

function t6References() {
  const hits = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.github') continue
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) visit(resolve(dir, entry.name))
        continue
      }
      const path = resolve(dir, entry.name)
      const rel = repoPath(path)
      if (generatedFiles.has(rel)) continue
      if (!textExtensions.has(extname(entry.name))) continue
      if (statSync(path).size > 1024 * 1024) continue
      const text = readFileSync(path, 'utf8')
      const lines = text.split(/\r?\n/)
      for (let index = 0; index < lines.length; index += 1) {
        if (/\bt6-master-brain(?:-v2)?\b/.test(lines[index])) {
          hits.push({ file: rel, line: index + 1, text: lines[index].trim() })
        }
      }
    }
  }
  visit(repoRoot)
  return hits
}

function inventoryTargets() {
  const structures = loadJson(resolve(publicRoot, 'assets/bodyparts3d/structures.json'))
  const skull = loadJson(resolve(publicRoot, 'assets/context/skull.json'))
  const head = loadJson(resolve(publicRoot, 'assets/context/head.json'))
  const phineas = loadJson(resolve(publicRoot, 'assets/phineas/asset-manifest.json'))
  const target = (assetId, contractId, uri, manifest, expectedNodeNames) => ({
    assetId,
    contractId,
    uri,
    manifest,
    expectedNodeNames,
  })
  return [
    target('bodyparts3d-brain', 'bodyparts3d-taro', '/assets/bodyparts3d/brain.glb', '/assets/bodyparts3d/structures.json', Object.keys(structures).sort()),
    target('bodyparts3d-subparcels', 'bodyparts3d-taro-subparcels', '/assets/bodyparts3d/k11-subparcels.glb', 'atlas-config scene_regions', []),
    target('bodyparts3d-skull-context', skull.space, '/assets/context/skull.glb', '/assets/context/skull.json', Object.keys(skull.bones).sort()),
    target('bodyparts3d-head-context', head.space, '/assets/context/head.glb', '/assets/context/head.json', Object.keys(head.structures).sort()),
    ...phineas.assets.map((asset) => ({
      assetId: asset.assetId,
      contractId: asset.normalization.spaceId,
      uri: asset.uri,
      manifest: '/assets/phineas/asset-manifest.json',
      expectedHash: asset.source.hash,
      expectedNodeNames: asset.parts.map((part) => part.nodeName).sort(),
    })),
  ]
}

async function createInspector() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(`<!doctype html>
<script type="importmap">
{"imports":{"three":"https://unpkg.com/three@0.184.0/build/three.module.js"}}
</script>`)
  await page.evaluate(async () => {
    const { GLTFLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/GLTFLoader.js')
    const { DRACOLoader } = await import('https://unpkg.com/three@0.184.0/examples/jsm/loaders/DRACOLoader.js')
    const { MeshoptDecoder } = await import('https://unpkg.com/three@0.184.0/examples/jsm/libs/meshopt_decoder.module.js')
    const draco = new DRACOLoader()
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
    const loader = new GLTFLoader()
    loader.setDRACOLoader(draco)
    await MeshoptDecoder.ready
    loader.setMeshoptDecoder(MeshoptDecoder)
    window.__meshIdentityInspectGlb = async (b64) => {
      const bin = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0)).buffer
      const gltf = await new Promise((resolve, reject) => loader.parse(bin, '', resolve, reject))
      const nodeNames = []
      const meshNames = []
      const materialNames = []
      const materialIds = new Set()
      let nodeCount = 0
      let meshCount = 0
      let unnamedNodeCount = 0
      let unnamedMeshCount = 0
      gltf.scene.traverse((object) => {
        if (object !== gltf.scene) {
          nodeCount += 1
          if (object.name) nodeNames.push(object.name)
          else unnamedNodeCount += 1
        }
        if (!object.isMesh) return
        meshCount += 1
        if (object.name) meshNames.push(object.name)
        else unnamedMeshCount += 1
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          if (!material || materialIds.has(material.uuid)) continue
          materialIds.add(material.uuid)
          materialNames.push(material.name || '(unnamed-material)')
        }
      })
      return {
        nodeCount,
        namedNodeCount: nodeNames.length,
        unnamedNodeCount,
        meshCount,
        namedMeshCount: meshNames.length,
        unnamedMeshCount,
        materialCount: materialIds.size,
        nodeNames: nodeNames.sort(),
        meshNames: meshNames.sort(),
        materialNames: materialNames.sort(),
      }
    }
  })
  return {
    inspect: async (path) => page.evaluate(
      (b64) => window.__meshIdentityInspectGlb(b64),
      Buffer.from(readFileSync(path)).toString('base64'),
    ),
    close: () => browser.close(),
  }
}

async function buildReport() {
  const inspector = await createInspector()
  try {
    const assets = []
    for (const target of inventoryTargets()) {
      const path = assetPath(target.uri)
      const inspected = await inspector.inspect(path)
      const actualNodeNames = new Set(inspected.nodeNames)
      const expectedNodeNames = target.expectedNodeNames
      const missingNodeNames = expectedNodeNames.filter((name) => !actualNodeNames.has(name))
      const duplicateNodeNames = duplicates(inspected.nodeNames)
      const duplicateMeshNames = duplicates(inspected.meshNames)
      const actualHash = sha256(path)
      assets.push({
        assetId: target.assetId,
        contractId: target.contractId,
        uri: target.uri,
        manifest: target.manifest,
        byteSize: statSync(path).size,
        sha256: actualHash,
        hashMatchesManifest: target.expectedHash === undefined ? null : actualHash === target.expectedHash,
        nodeCount: inspected.nodeCount,
        namedNodeCount: inspected.namedNodeCount,
        unnamedNodeCount: inspected.unnamedNodeCount,
        meshCount: inspected.meshCount,
        namedMeshCount: inspected.namedMeshCount,
        unnamedMeshCount: inspected.unnamedMeshCount,
        materialCount: inspected.materialCount,
        manifestNodeCount: expectedNodeNames.length,
        missingNodeNames,
        duplicateNodeNames,
        duplicateMeshNames,
        sampleMeshNames: inspected.meshNames.slice(0, 12),
        sampleMaterialNames: inspected.materialNames.slice(0, 12),
      })
    }
    const allT6References = t6References()
    const staleT6References = allT6References.filter((hit) => !hit.file.startsWith('archive/'))
    const archivedT6References = allT6References.filter((hit) => hit.file.startsWith('archive/'))
    const failures = []
    for (const asset of assets) {
      if (asset.missingNodeNames.length) failures.push(`${asset.assetId}: missing nodeNames ${asset.missingNodeNames.join(', ')}`)
      if (asset.duplicateNodeNames.length) failures.push(`${asset.assetId}: duplicate nodeNames`)
      if (asset.duplicateMeshNames.length) failures.push(`${asset.assetId}: duplicate meshNames`)
      if (asset.hashMatchesManifest === false) failures.push(`${asset.assetId}: sha256 mismatch`)
    }
    if (staleT6References.length) failures.push(`stale t6-master-brain references: ${staleT6References.length}`)
    return {
      schemaVersion: 1,
      contractId: 'brain-app-runtime-mesh-identity-v1',
      runtimeContract: 'bodyparts3d-taro + phineas-gage-taro-fit-v1',
      checkedAssets: assets,
      staleT6References,
      archivedT6References,
      failures,
    }
  } finally {
    await inspector.close()
  }
}

function formatBytes(bytes) {
  return `${(bytes / 1048576).toFixed(2)} MiB`
}

function renderMarkdown(report) {
  const lines = [
    '# Mesh-Identity-Inventory',
    '',
    'Aktueller Runtime-Vertrag: `bodyparts3d-taro` für BodyParts3D-/Context-Assets und `phineas-gage-taro-fit-v1` für die in TARO-Viewer-Space eingepassten Phineas-GLBs. Die alte `t6-master-brain`-Bezeichnung kommt im Repo-Scope nicht mehr vor; der Check bleibt trotzdem als Drift-Gate aktiv.',
    '',
    'Reproduzierbar mit:',
    '',
    '```bash',
    'pnpm --dir apps/brain-app run inventory:mesh-identity',
    '```',
    '',
    '## Zusammenfassung',
    '',
    '| Asset | Contract | Nodes | Meshes | Materials | Manifest-Nodes | Fehlende Nodes | Hash |',
    '|-------|----------|-------|--------|-----------|----------------|----------------|------|',
  ]
  for (const asset of report.checkedAssets) {
    const hash = asset.hashMatchesManifest === null ? 'n/a' : asset.hashMatchesManifest ? 'ok' : 'fail'
    lines.push(`| \`${asset.assetId}\` | \`${asset.contractId}\` | ${asset.nodeCount} | ${asset.meshCount} | ${asset.materialCount} | ${asset.manifestNodeCount} | ${asset.missingNodeNames.length} | ${hash} |`)
  }
  lines.push(
    '',
    '## Details',
    '',
  )
  for (const asset of report.checkedAssets) {
    lines.push(
      `### ${asset.assetId}`,
      '',
      `- URI: \`${asset.uri}\``,
      `- Manifest: \`${asset.manifest}\``,
      `- Größe: ${formatBytes(asset.byteSize)}`,
      `- SHA-256: \`${asset.sha256}\``,
      `- Nodes: ${asset.nodeCount} gesamt, ${asset.namedNodeCount} benannt, ${asset.unnamedNodeCount} unbenannt`,
      `- Meshes: ${asset.meshCount} gesamt, ${asset.namedMeshCount} benannt, ${asset.unnamedMeshCount} unbenannt`,
      `- Materials: ${asset.materialCount}`,
      `- Beispiel-Meshes: ${asset.sampleMeshNames.map((name) => `\`${name}\``).join(', ') || 'n/a'}`,
      `- Beispiel-Materials: ${asset.sampleMaterialNames.map((name) => `\`${name}\``).join(', ') || 'n/a'}`,
      '',
    )
  }
  lines.push(
    '## Drift-Gates',
    '',
    `- Aktive stale \`t6-master-brain\`-Referenzen: ${report.staleT6References.length}`,
    `- Archivierte historische \`t6-master-brain\`-Referenzen: ${report.archivedT6References.length}`,
    `- Fehlende Manifest-Node-Namen: ${report.checkedAssets.reduce((sum, asset) => sum + asset.missingNodeNames.length, 0)}`,
    `- Duplicate Node-/Mesh-Namen: ${report.checkedAssets.reduce((sum, asset) => sum + asset.duplicateNodeNames.length + asset.duplicateMeshNames.length, 0)}`,
    `- Manifest-Hash-Mismatches: ${report.checkedAssets.filter((asset) => asset.hashMatchesManifest === false).length}`,
    '',
  )
  if (report.failures.length) {
    lines.push('## Fehler', '', ...report.failures.map((failure) => `- ${failure}`), '')
  }
  return `${lines.join('\n')}\n`
}

function stableJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`
}

function assertSame(path, expected) {
  if (!existsSync(path)) throw new Error(`Inventory fehlt: ${relative(repoRoot, path)}`)
  const actual = readFileSync(path, 'utf8')
  if (actual !== expected) throw new Error(`Inventory driftet: ${relative(repoRoot, path)} mit --write erneuern`)
}

const report = await buildReport()
const json = stableJson(report)
const markdown = renderMarkdown(report)

if (mode === 'write') {
  writeFileSync(jsonOut, json)
  writeFileSync(markdownOut, markdown)
  console.log(`Wrote ${repoPath(jsonOut)}`)
  console.log(`Wrote ${repoPath(markdownOut)}`)
} else {
  assertSame(jsonOut, json)
  assertSame(markdownOut, markdown)
}

for (const asset of report.checkedAssets) {
  const assetFailures =
    asset.missingNodeNames.length +
    asset.duplicateNodeNames.length +
    asset.duplicateMeshNames.length +
    (asset.hashMatchesManifest === false ? 1 : 0)
  console.log(
    `${assetFailures ? 'FAIL' : 'PASS'} ${asset.assetId} nodes=${asset.nodeCount} meshes=${asset.meshCount} materials=${asset.materialCount} manifest=${asset.manifestNodeCount} missing=${asset.missingNodeNames.length}`,
  )
}
console.log(`PASS active-stale-t6-references count=${report.staleT6References.length}`)
console.log(`PASS archived-t6-references count=${report.archivedT6References.length}`)

if (report.failures.length) {
  for (const failure of report.failures) console.error(`FAIL ${failure}`)
  process.exit(1)
}
