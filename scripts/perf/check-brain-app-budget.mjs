import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const appRoot = resolve(repoRoot, 'apps/brain-app')
const distAssetsRoot = resolve(appRoot, 'dist/assets')
const publicAssetsRoot = resolve(appRoot, 'public/assets')

const MiB = 1024 * 1024
const KiB = 1024

const BUDGETS = {
  jsRawTotal: 1.6 * MiB,
  jsGzipTotal: 450 * KiB,
  jsLargestRaw: 800 * KiB,
  cssGzipTotal: 80 * KiB,
  publicAssetsTotal: 120 * MiB,
  publicAssetLargest: 24 * MiB,
  brainModelReviewAssetsTotal: 45 * MiB,
  brainModelReviewAssetLargest: 20 * MiB,
  // Skull base, calvaria and rod are separate runtime assets so they can be
  // toggled and transformed independently in the authoring path.
  phineasAssetsTotal: 2.25 * MiB,
}

function assertDir(path) {
  try {
    if (statSync(path).isDirectory()) return
  } catch {
    // handled below
  }
  throw new Error(`Performance-Budget: ${relative(repoRoot, path)} fehlt. Erst pnpm --dir apps/brain-app build ausführen.`)
}

function filesUnder(root) {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) out.push(path)
    }
  }
  walk(root)
  return out
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function bytes(path) {
  return statSync(path).size
}

function formatBytes(value) {
  if (value >= MiB) return `${(value / MiB).toFixed(2)} MiB`
  return `${(value / KiB).toFixed(1)} KiB`
}

function check(label, value, budget, failures) {
  const ok = value <= budget
  const line = `${ok ? 'OK  ' : 'FAIL'} ${label}: ${formatBytes(value)} / ${formatBytes(budget)}`
  console.log(line)
  if (!ok) failures.push(line)
}

assertDir(distAssetsRoot)
assertDir(publicAssetsRoot)

const distAssets = filesUnder(distAssetsRoot)
const jsFiles = distAssets.filter((path) => extname(path) === '.js')
const cssFiles = distAssets.filter((path) => extname(path) === '.css')
const publicAssets = filesUnder(publicAssetsRoot)
const brainModelReviewAssets = publicAssets.filter((path) => path.includes('/assets/brain-models/'))
const runtimePublicAssets = publicAssets.filter((path) => !path.includes('/assets/brain-models/'))
const phineasAssets = publicAssets.filter((path) => path.includes('/assets/phineas/'))
const largestPublicAsset = runtimePublicAssets
  .map((path) => ({ path, size: bytes(path) }))
  .sort((a, b) => b.size - a.size)[0]
const largestBrainModelReviewAsset = brainModelReviewAssets
  .map((path) => ({ path, size: bytes(path) }))
  .sort((a, b) => b.size - a.size)[0]

if (jsFiles.length === 0) {
  throw new Error('Performance-Budget: keine JS-Bundles in apps/brain-app/dist/assets gefunden.')
}

const jsRawSizes = jsFiles.map(bytes)
const jsGzipSizes = jsFiles.map((path) => gzipSync(readFileBytes(path)).byteLength)
const cssGzipSizes = cssFiles.map((path) => gzipSync(readFileBytes(path)).byteLength)
const failures = []

console.log('brain-app performance budget')
check('JS raw total', sum(jsRawSizes), BUDGETS.jsRawTotal, failures)
check('JS gzip total', sum(jsGzipSizes), BUDGETS.jsGzipTotal, failures)
check('JS largest raw chunk', Math.max(...jsRawSizes), BUDGETS.jsLargestRaw, failures)
check('CSS gzip total', sum(cssGzipSizes), BUDGETS.cssGzipTotal, failures)
check('runtime public/assets total', sum(runtimePublicAssets.map(bytes)), BUDGETS.publicAssetsTotal, failures)
check('public/assets largest file', largestPublicAsset.size, BUDGETS.publicAssetLargest, failures)
check(
  'BrainModel review assets total',
  sum(brainModelReviewAssets.map(bytes)),
  BUDGETS.brainModelReviewAssetsTotal,
  failures,
)
if (largestBrainModelReviewAsset) {
  check(
    'BrainModel review largest file',
    largestBrainModelReviewAsset.size,
    BUDGETS.brainModelReviewAssetLargest,
    failures,
  )
}
check('Phineas assets total', sum(phineasAssets.map(bytes)), BUDGETS.phineasAssetsTotal, failures)

console.log(`largest runtime asset: ${relative(repoRoot, largestPublicAsset.path)} (${formatBytes(largestPublicAsset.size)})`)
if (largestBrainModelReviewAsset) {
  console.log(
    `largest BrainModel review asset: ${relative(repoRoot, largestBrainModelReviewAsset.path)} (${formatBytes(largestBrainModelReviewAsset.size)})`,
  )
}

if (failures.length > 0) {
  process.exitCode = 1
}

function readFileBytes(path) {
  return readFileSync(path)
}
