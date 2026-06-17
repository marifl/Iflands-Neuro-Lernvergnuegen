import type { ColorMode } from './ontology'
import {
  ANATOMICAL_MATERIAL_COLORS,
  FUNCTION_COLORS,
  LATERALITY_COLORS,
  REGION_COLORS,
} from './atlasColorSystem'
import { hueToHex, type ColorRole } from './colorPresets'
import { useViewerStore } from './viewerStore'
import ColorLegendPanel from './ColorLegendPanel'
import { useIsNarrow } from '../useMediaQuery'
import { COLOR_MODE_LABEL } from './colorModeDefinitions'

type GlobalMode = Exclude<ColorMode, 'preset'>
type CoreColorRole = Extract<ColorRole, 'cognition' | 'emotion' | 'motivation'>

interface LegendRow {
  label: string
  detail: string
  color: string
}

interface RoleSwatch {
  role: CoreColorRole
  label: string
  detail: string
  color: string
}

export const CORE_COLOR_ROLE_SWATCHES: readonly RoleSwatch[] = [
  {
    role: 'cognition',
    label: 'Kognition',
    detail: 'DLPFC/parietaler Kortex als kognitive Kontrollschleife.',
    color: hueToHex(210),
  },
  {
    role: 'emotion',
    label: 'Emotion',
    detail: 'OFC/vmPFC mit Amygdala und Hippocampus als affektiver Regelkreis.',
    color: hueToHex(30),
  },
  {
    role: 'motivation',
    label: 'Motivation',
    detail: 'dACC und Nucleus accumbens als motivationaler Handlungsantrieb.',
    color: hueToHex(150),
  },
] as const

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

function CoreRoleSwatches({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: 'grid', gap: compact ? 4 : 6 }}>
      {CORE_COLOR_ROLE_SWATCHES.map((row) => (
        <div
          key={row.role}
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '10px 1fr' : '11px 1fr',
            gap: compact ? 6 : 8,
            alignItems: 'start',
          }}
        >
          <span
            data-color-role={row.role}
            aria-hidden="true"
            style={{
              width: compact ? 10 : 11,
              height: compact ? 10 : 11,
              marginTop: compact ? 2 : 3,
              background: row.color,
              border: '1px solid var(--line-soft)',
            }}
          />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--ed-mono)', fontSize: compact ? 10.5 : 11, fontWeight: 700 }}>
              {row.label}
            </span>
            {compact ? null : (
              <span style={{ display: 'block', fontFamily: 'var(--ed-mono)', fontSize: 10, color: 'var(--g600)', lineHeight: 1.3 }}>
                {row.detail}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GlobalColorLegend() {
  const colorMode = useViewerStore((s) => s.colorMode)
  const legendState = useViewerStore((s) => s.colorLegend)
  const setColorLegend = useViewerStore((s) => s.setColorLegend)
  const atlasHudActive = useViewerStore((s) => s.showCarveJulich || s.showCarveDkt || s.showCarveBrodmann)
  const isNarrow = useIsNarrow()
  if (colorMode === 'preset') return null
  const legend = LEGENDS[colorMode]

  if (!legendState.visible || legendState.minimized) {
    return (
      <button
        type="button"
        className="ed-panel ed-frame"
        aria-label="Färbungsdetails öffnen"
        onClick={() => setColorLegend({ visible: true, minimized: false })}
        style={{
          position: 'absolute',
          top: isNarrow ? 96 : atlasHudActive ? 106 : 16,
          right: isNarrow ? 8 : 16,
          zIndex: 14,
          pointerEvents: 'auto',
          display: 'grid',
          gap: 7,
          width: isNarrow ? 'min(244px, calc(100vw - 16px))' : 238,
          padding: '9px 11px',
          textAlign: 'left',
          cursor: 'pointer',
          color: 'var(--ink)',
        }}
      >
        <span className="eyebrow">Färbung</span>
        <span style={{ fontFamily: 'var(--ed-display)', fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>
          {COLOR_MODE_LABEL[colorMode]}
        </span>
        <span style={{ fontFamily: 'var(--ed-mono)', fontSize: 9.5, color: 'var(--g600)', lineHeight: 1.25 }}>
          aktiver Färbungsmodus
        </span>
        <CoreRoleSwatches compact />
      </button>
    )
  }

  return (
    <ColorLegendPanel title={legend.title} subtitle={legend.subtitle} maxWidth={330}>
      <CoreRoleSwatches />
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
