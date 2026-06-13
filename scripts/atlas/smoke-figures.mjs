// Smoke W1-C/W1-B: Figur-Faerbungen + Legende. Prueft pfc-petrides (sub-gyral via pars*),
// acc-bush (caudal cingulate) und basalganglienschleifen (nach W1-B freigeschaltet, faerbt
// nucleus-accumbens). Sub-Patches liegen im SubParcels-GLB (Geschwister von __THREE_SCENE__),
// darum vom Wurzelknoten traversieren.
import { chromium } from '@playwright/test'

const BASE = process.env.SMOKE_URL ?? 'http://localhost:5188'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('  [pageerror]', e.message))

await page.goto(`${BASE}/?mode=explore`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => {
  const s = window.__THREE_SCENE__
  if (!s) return false
  let n = 0
  s.traverse((o) => { if (o.isMesh && o.name) n++ })
  return n > 100
}, { timeout: 60000 })

let fails = 0
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++ } else console.log('  ok:', msg) }

async function activate(label) {
  await page.getByText('Farbe', { exact: false }).first().click()
  await page.getByText(new RegExp(label)).click()
  await page.waitForTimeout(350)
}
// Farbe nur wenn das Mesh sichtbar ist (Sub-Patches werden im Preset sichtbar geschaltet).
const meshColor = (name) => page.evaluate((n) => {
  let root = window.__THREE_SCENE__
  while (root.parent) root = root.parent
  let c = null
  root.traverse((o) => { if (o.isMesh && o.name === n && o.visible) c = '#' + o.material.color.getHexString() })
  return c
}, name)

// 1) PFC Petrides (11-05): VLPFC faerbt sub-gyral ueber pars opercularis (hue 30 = #bd854c).
await activate('PFC Petrides')
check((await meshColor('left-parsopercularis')) === '#bd854c', '11-05 VLPFC sub-gyral (pars opercularis) gefaerbt')
const ifg = await meshColor('left-inferior-frontal-gyrus')
check(ifg === null || ifg === '#3a3631', '11-05 IFG-Gyrus selbst gedimmt (Sub-Patches tragen die Farbe)')
const legendText = await page.locator('text=Färbung').first().isVisible().catch(() => false)
check(legendText, '11-05 Legende sichtbar')
const groups05 = await page.locator('.ed-panel:has-text("Färbung")').first().innerText().catch(() => '')
check(/DLPFC/.test(groups05) && /VLPFC/.test(groups05), '11-05 Legende nennt DLPFC + VLPFC')

// 2) ACC Bush (11-13): dACC faerbt sub-gyral ueber das caudale anteriore Cingulum.
await activate('ACC Bush')
const dacc = await meshColor('left-caudal-anterior-cingulate')
check(dacc && dacc !== '#cdbfb6' && dacc !== '#3a3631', '11-13 dACC (caudal anterior cingulate) gefaerbt')
const groups13 = await page.locator('.ed-panel:has-text("Färbung")').first().innerText().catch(() => '')
check(/Dorsales ACC/.test(groups13), '11-13 Legende nennt Dorsales ACC')

// 3) Basalganglienschleifen (11-04): nach W1-B freigeschaltet -> aktivierbar + faerbt accumbens.
await page.getByText('Farbe', { exact: false }).first().click()
await page.waitForTimeout(150)
const bg = page.getByRole('button', { name: /Basalganglienschleifen/ })
const disabled = await bg.isDisabled().catch(() => true)
check(!disabled, '11-04 freigeschaltet (nicht mehr deaktiviert)')
await bg.click()
await page.waitForTimeout(350)
const acc = await meshColor('left-nucleus-accumbens')
check(acc && acc !== '#cdbfb6' && acc !== '#3a3631', '11-04 nucleus-accumbens gefaerbt (Motivations-Gruppe)')
const cogn = await meshColor('left-caudate-nucleus')
check(cogn && cogn !== '#cdbfb6' && cogn !== '#3a3631', '11-04 Striatum (Kognitions-Gruppe) gefaerbt')
// P4: Pallidum-Split — GPi (internus) als echter Sub-Patch sichtbar + in Schleifen-Farbe gefaerbt.
const gpi = await meshColor('left-gpi')
check(gpi && gpi !== '#cdbfb6' && gpi !== '#3a3631', `11-04 GPi (Pallidum-Split) gefaerbt (${gpi})`)
const gpGyrus = await meshColor('left-globus-pallidus')
check(gpGyrus === null || gpGyrus === '#3a3631', '11-04 ganzes Pallidum gedimmt (GPi/GPe-Sub-Patches tragen die Farbe)')

await page.screenshot({ path: 'scripts/atlas/work/smoke-figures.png' })
await browser.close()
console.log(fails === 0 ? '\nSMOKE OK' : `\nSMOKE FAIL (${fails})`)
process.exit(fails === 0 ? 0 : 1)
