import type { ColorMode } from './ontology'
import {
  ANATOMICAL_MATERIAL_COLORS,
  FUNCTION_SYSTEMS,
  LATERALITY_COLORS,
  REGION_COLORS,
} from './atlasColorSystem'
import { hueToHex } from './colorPresets'
import { useViewerStore } from './viewerStore'
import ColorLegendPanel from './ColorLegendPanel'
import { useIsNarrow } from '../useMediaQuery'
import { COLOR_MODE_LABEL } from './colorModeDefinitions'

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
    rows: Object.values(FUNCTION_SYSTEMS).map((s) => ({ label: s.label, detail: s.detail, color: s.color })),
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

function CompactRows({ rows }: { rows: LegendRow[] }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 6, alignItems: 'center' }}>
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, background: row.color, border: '1px solid var(--line-soft)' }}
          />
          <span
            className="mono-sm"
            style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {row.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function ContextToggle() {
  const defaultVisibility = useViewerStore((s) => s.defaultVisibility)
  const { hideUncolored, contextOpacity } = useViewerStore((s) => s.presetViewOptions)
  const toggleLearnContext = useViewerStore((s) => s.toggleLearnContext)
  const setPresetViewOptions = useViewerStore((s) => s.setPresetViewOptions)
  if (!defaultVisibility) return null
  return (
    <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 10, paddingTop: 8 }}>
      <button
        type="button"
        className={`ed-btn${!hideUncolored ? ' active' : ''}`}
        onClick={toggleLearnContext}
        style={{ width: '100%', textAlign: 'left', padding: '5px 8px', marginBottom: 2 }}
      >
        Anatomischer Kontext
      </button>
      {!hideUncolored ? (
        <div style={{ padding: '4px 8px 0' }}>
          <label className="mono-xs" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--g600)', marginBottom: 2 }}>
            <span>Transparenz</span>
            <span>{Math.round(contextOpacity * 100)} %</span>
          </label>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={contextOpacity}
            onChange={(e) => setPresetViewOptions({ contextOpacity: Number(e.target.value) })}
            aria-label="Kontext-Transparenz"
            style={{ width: '100%', accentColor: 'var(--orange)', cursor: 'ew-resize' }}
          />
        </div>
      ) : null}
    </div>
  )
}

function PresetContent() {
  const preset = useViewerStore((s) => s.activePreset)
  if (!preset) return null
  return (
    <ColorLegendPanel
      title={preset.label}
      subtitle={(
        <>
          {preset.intent}
          {preset.coverage === 'partial' && preset.coverageNote ? (
            <div style={{ marginTop: 4, color: 'var(--orange)' }}>{preset.coverageNote}</div>
          ) : null}
        </>
      )}
      maxWidth={360}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {preset.groups.map((g) => (
          <div key={g.label} style={{ display: 'grid', gridTemplateColumns: '11px 1fr', columnGap: 8, alignItems: 'start' }}>
            <span
              data-color-group={g.label}
              style={{ width: 11, height: 11, marginTop: 2, background: hueToHex(g.hue), border: '1px solid var(--line-soft)' }}
            />
            <span>
              <span className="mono-sm" style={{ display: 'block', color: 'var(--g800)', letterSpacing: '0.01em' }}>
                {g.label}
              </span>
              <span className="mono-xs" style={{ display: 'block', lineHeight: 1.35, color: 'var(--g600)' }}>
                {g.meaning}
              </span>
            </span>
          </div>
        ))}
      </div>
      <ContextToggle />
    </ColorLegendPanel>
  )
}

function ModeContent({ mode }: { mode: GlobalMode }) {
  const legendState = useViewerStore((s) => s.colorLegend)
  const setColorLegend = useViewerStore((s) => s.setColorLegend)
  const atlasHudActive = useViewerStore((s) => s.showCarveJulich || s.showCarveDkt || s.showCarveBrodmann)
  const isNarrow = useIsNarrow()
  const legend = LEGENDS[mode]

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
        <span className="display-lg" style={{ lineHeight: 1.15 }}>
          {COLOR_MODE_LABEL[mode]}
        </span>
        <span className="mono-xs" style={{ color: 'var(--g600)', lineHeight: 1.25 }}>
          aktiver Färbungsmodus
        </span>
        <CompactRows rows={legend.rows} />
      </button>
    )
  }

  return (
    <ColorLegendPanel title={legend.title} subtitle={legend.subtitle} maxWidth={330}>
      <div style={{ display: 'grid', gap: 5 }}>
        {legend.rows.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 8, alignItems: 'start' }}>
            <span
              aria-hidden="true"
              style={{ width: 10, height: 10, marginTop: 3, background: row.color, border: '1px solid var(--line-soft)' }}
            />
            <span style={{ display: 'grid', gap: 1 }}>
              <span className="mono-base" style={{ fontWeight: 700 }}>{row.label}</span>
              <span className="mono-sm" style={{ color: 'var(--g600)', lineHeight: 1.25 }}>
                {row.detail}
              </span>
            </span>
          </div>
        ))}
      </div>
      <ContextToggle />
    </ColorLegendPanel>
  )
}

export default function ColorLegend() {
  const colorMode = useViewerStore((s) => s.colorMode)
  if (colorMode === 'preset') return <PresetContent />
  return <ModeContent mode={colorMode} />
}
