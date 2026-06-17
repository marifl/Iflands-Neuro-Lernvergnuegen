import type { ColorMode } from './ontology'
import {
  ANATOMICAL_MATERIAL_COLORS,
  FUNCTION_COLORS,
  LATERALITY_COLORS,
  REGION_COLORS,
} from './atlasColorSystem'
import { useViewerStore } from './viewerStore'
import ColorLegendPanel from './ColorLegendPanel'

type GlobalMode = Exclude<ColorMode, 'preset'>

interface LegendRow {
  label: string
  detail: string
  color: string
}

const LEGENDS: Record<GlobalMode, { title: string; subtitle: string; rows: LegendRow[] }> = {
  anatomical: {
    title: 'Anatomische Materialien',
    subtitle: 'Gewebe, Flüssigkeit, Nerven und Gefäße sind als Materialrollen getrennt.',
    rows: [
      { label: 'Kortex', detail: 'kortikale graue Substanz', color: ANATOMICAL_MATERIAL_COLORS['brain-cortex'] },
      { label: 'Liquor/Ventrikel', detail: 'CSF-Räume und Plexus', color: ANATOMICAL_MATERIAL_COLORS.csf },
      { label: 'Marklager', detail: 'Kommissuren und Bahnen', color: ANATOMICAL_MATERIAL_COLORS['white-matter'] },
      { label: 'Gefäße', detail: 'arteriell/venös getrennt', color: ANATOMICAL_MATERIAL_COLORS.artery },
      { label: 'Hirnnerven', detail: 'craniale Nervenbahnen', color: ANATOMICAL_MATERIAL_COLORS.nerve },
    ],
  },
  function: {
    title: 'Funktionssysteme',
    subtitle: 'Jede sichtbare TARO-Struktur ist einem System zugeordnet; keine stille Restklasse.',
    rows: [
      { label: 'Exekutive Kontrolle', detail: 'PFC/OFC/Frontallappen', color: FUNCTION_COLORS['executive-control'] },
      { label: 'Aufmerksamkeit', detail: 'frontoparietale Netzwerke', color: FUNCTION_COLORS['frontoparietal-attention'] },
      { label: 'Vaskulär', detail: 'arterielle und venöse Versorgung', color: FUNCTION_COLORS.vascular },
      { label: 'Hirnnerven', detail: 'craniale Nerven', color: FUNCTION_COLORS['cranial-nerve'] },
      { label: 'Ventrikel', detail: 'CSF-System', color: FUNCTION_COLORS['csf-ventricular'] },
    ],
  },
  laterality: {
    title: 'Lateralität',
    subtitle: 'Links, rechts und Mittellinie werden unabhängig von der Strukturklasse kodiert.',
    rows: [
      { label: 'Links', detail: 'sinistral', color: LATERALITY_COLORS.left },
      { label: 'Rechts', detail: 'dextral', color: LATERALITY_COLORS.right },
      { label: 'Mittellinie', detail: 'midline oder unpaarig', color: LATERALITY_COLORS.midline },
    ],
  },
  region: {
    title: 'Regionen',
    subtitle: 'Top-Level-Regionen der TARO-Ontologie; Gefäße und Nerven sind eigene Gruppen.',
    rows: [
      { label: 'Großhirn', detail: 'Telencephalon', color: REGION_COLORS.telencephalon },
      { label: 'Zwischenhirn', detail: 'Diencephalon', color: REGION_COLORS.diencephalon },
      { label: 'Gefäße', detail: 'Vasculature', color: REGION_COLORS.vasculature },
      { label: 'Hirnnerven', detail: 'Cranial nerves', color: REGION_COLORS['cranial-nerves'] },
      { label: 'Ventrikel', detail: 'Liquorräume', color: REGION_COLORS.ventricles },
    ],
  },
}

export default function GlobalColorLegend() {
  const colorMode = useViewerStore((s) => s.colorMode)
  if (colorMode === 'preset') return null
  const legend = LEGENDS[colorMode]

  return (
    <ColorLegendPanel title={legend.title} subtitle={legend.subtitle} maxWidth={330}>
      <div style={{ display: 'grid', gap: 5, marginTop: 10 }}>
        {legend.rows.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 8, alignItems: 'start' }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                marginTop: 3,
                background: row.color,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            />
            <span style={{ display: 'grid', gap: 1 }}>
              <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 11, fontWeight: 700 }}>{row.label}</span>
              <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g600)', lineHeight: 1.25 }}>
                {row.detail}
              </span>
            </span>
          </div>
        ))}
      </div>
    </ColorLegendPanel>
  )
}
