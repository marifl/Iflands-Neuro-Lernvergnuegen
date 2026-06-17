import { useRef, useState } from 'react'
import { useIsNarrow } from '../useMediaQuery'
import {
  clearLocalBrainAppData,
  downloadViewerSnapshot,
  importViewerSnapshotFile,
  summarizeStudentProgress,
} from './localDataActions'
import {
  SETTINGS_CATEGORIES,
  useSettingsStore,
  type BrainAppSettings,
  type SettingsCategory,
} from './settingsStore'
import { useStudentProgressStore } from './studentProgress'
import { ShellControlButton } from './ShellStatePrimitives'

type CategoryData = Omit<BrainAppSettings, 'schemaVersion'>
type Option<T extends string> = { value: T; label: string }
type UpdateCategory = <T extends SettingsCategory>(category: T, patch: Partial<CategoryData[T]>) => void

const CATEGORY_LABEL: Record<SettingsCategory, string> = {
  display: 'Darstellung',
  accessibility: 'Barrierefreiheit',
  start: 'Start & Modus',
  viewport: '3D-Viewport',
  coloring: 'Färbung',
  learning: 'Lernpfad',
  language: 'Sprache',
  atlas: 'Atlas',
  presenter: 'Presenter',
  dataAccount: 'Daten & Konto',
}

const VISIBLE_SETTINGS_CATEGORIES: SettingsCategory[] = SETTINGS_CATEGORIES.filter((category) => category !== 'presenter')

const PANEL_STYLE = {
  display: 'grid',
  gap: 10,
  width: 'min(720px, calc(100vw - 24px))',
} as const

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6, padding: '7px 6px' }}>
      <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.25 }}>{label}</span>
      {children}
    </div>
  )
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <ControlRow label={label}>
      <span role="group" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 4 }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`ed-btn${value === option.value ? ' active' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            style={{ minWidth: 0, padding: '6px 7px', textAlign: 'center', fontSize: 11 }}
          >
            {option.label}
          </button>
        ))}
      </span>
    </ControlRow>
  )
}

function SwitchControl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '7px 6px' }}>
      <span style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.25 }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        aria-label={label}
        style={{ width: 18, height: 18, accentColor: 'var(--orange)' }}
      />
    </label>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <ControlRow label={`${label}: ${Math.round(value * 100)}%`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={label}
        style={{ width: '100%', accentColor: 'var(--orange)', cursor: 'ew-resize' }}
      />
    </ControlRow>
  )
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <ControlRow label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        aria-label={label}
        style={{
          width: '100%',
          color: 'var(--ink)',
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          padding: '7px 8px',
        }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </ControlRow>
  )
}

function SwatchControl({ label }: { label: string }) {
  return (
    <ControlRow label={label}>
      <button
        type="button"
        className="ed-btn active"
        aria-pressed="true"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}
      >
        <span aria-hidden style={{ width: 14, height: 14, background: 'var(--orange)', border: '1px solid var(--line)' }} />
        Orange
      </button>
    </ControlRow>
  )
}

function DataAccountPanel({ settings, update }: { settings: BrainAppSettings; update: UpdateCategory }) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const progress = useStudentProgressStore((state) => state.progress)
  const resetStudentProgress = useStudentProgressStore((state) => state.resetStudentProgress)
  const [importError, setImportError] = useState<string | null>(null)
  const importSnapshot = async (file: File | null | undefined) => {
    if (!file) return
    try {
      await importViewerSnapshotFile(file)
      setImportError(null)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error))
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  return (
    <>
      <SegmentedControl label="Rolle" value={settings.dataAccount.role} options={[{ value: 'student', label: 'Student' }, { value: 'dozent', label: 'Dozent' }, { value: 'presenter', label: 'Presenter' }, { value: 'developer', label: 'Dev' }]} onChange={(role) => update('dataAccount', { role })} />
      <ControlRow label="Unterrichts-Snapshot">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" className="ed-btn" onClick={() => downloadViewerSnapshot()}>Snapshot exportieren</button>
          <button type="button" className="ed-btn" onClick={() => importInputRef.current?.click()}>Snapshot importieren</button>
        </div>
        <input
          ref={importInputRef}
          aria-label="Unterrichts-Snapshot importieren"
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => { void importSnapshot(event.currentTarget.files?.[0]) }}
        />
        {importError ? <div role="alert" style={{ color: 'var(--red)', fontSize: 12 }}>{importError}</div> : null}
      </ControlRow>
      <ControlRow label="Lernfortschritt">
        <span style={{ fontSize: 12, color: 'var(--g700)', lineHeight: 1.35 }}>{summarizeStudentProgress(progress)}</span>
        <ShellControlButton disabledReason={progress ? null : 'Kein Lernfortschritt gespeichert'} onClick={resetStudentProgress}>
          Lernfortschritt zurücksetzen
        </ShellControlButton>
      </ControlRow>
      <ControlRow label="Lokale Daten">
        <button type="button" className="ed-btn" onClick={clearLocalBrainAppData}>Lokale Daten leeren</button>
      </ControlRow>
    </>
  )
}

function categoryPanel<K extends SettingsCategory>({
  category,
  settings,
  update,
}: {
  category: K
  settings: BrainAppSettings
  update: UpdateCategory
}) {
  if (category === 'display') return (
    <>
      <SegmentedControl label="Theme" value={settings.display.theme} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Hell' }, { value: 'dark', label: 'Dunkel' }]} onChange={(theme) => update('display', { theme })} />
      <SwatchControl label="Akzentfarbe" />
      <SegmentedControl label="Kontrast" value={settings.display.contrast} options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'Hoch' }]} onChange={(contrast) => update('display', { contrast })} />
      <SelectControl label="Schriftgröße" value={settings.display.fontSize} options={[{ value: 'standard', label: 'Standard' }, { value: 'large', label: 'Groß' }, { value: 'extra-large', label: 'Sehr groß' }]} onChange={(fontSize) => update('display', { fontSize })} />
    </>
  )
  if (category === 'accessibility') return (
    <>
      <SwitchControl label="Ruhemodus" checked={settings.accessibility.quietMode} onChange={(quietMode) => update('accessibility', { quietMode })} />
      <SegmentedControl label="Bewegung" value={settings.accessibility.motion} options={[{ value: 'system', label: 'System' }, { value: 'reduce', label: 'Reduziert' }, { value: 'allow', label: 'An' }]} onChange={(motion) => update('accessibility', { motion })} />
      <SwitchControl label="Fokus-Ringe" checked={settings.accessibility.focusRings} onChange={(focusRings) => update('accessibility', { focusRings })} />
      <SwitchControl label="Lesefreundliche Schrift" checked={settings.accessibility.readableFont} onChange={(readableFont) => update('accessibility', { readableFont })} />
    </>
  )
  if (category === 'start') return (
    <>
      <SelectControl label="Default-Modus" value={settings.start.defaultMode} options={[{ value: 'learn', label: 'Lernen' }, { value: 'explore', label: 'Explorer' }, { value: 'phineas', label: 'Phineas' }, { value: 'last', label: 'Zuletzt' }]} onChange={(defaultMode) => update('start', { defaultMode })} />
      <SwitchControl label="Onboarding anzeigen" checked={settings.start.showOnboarding} onChange={(showOnboarding) => update('start', { showOnboarding })} />
    </>
  )
  if (category === 'viewport') return (
    <>
      <SegmentedControl label="Standardansicht" value={settings.viewport.defaultCameraView} options={[{ value: 'lateral-left', label: 'Lateral' }, { value: 'anterior', label: 'Anterior' }, { value: 'superior', label: 'Superior' }]} onChange={(defaultCameraView) => update('viewport', { defaultCameraView })} />
      <SelectControl label="Schädelkontext" value={settings.viewport.skullContext} options={[{ value: 'hidden', label: 'Aus' }, { value: 'transparent', label: 'Transparent' }, { value: 'solid', label: 'Solide' }]} onChange={(skullContext) => update('viewport', { skullContext })} />
      <SwitchControl label="Auto-Rotate" checked={settings.viewport.autoRotate} onChange={(autoRotate) => update('viewport', { autoRotate })} />
      <SegmentedControl label="Renderqualität" value={settings.viewport.renderQuality} options={[{ value: 'auto', label: 'Auto' }, { value: 'battery', label: 'Sparsam' }, { value: 'quality', label: 'Qualität' }]} onChange={(renderQuality) => update('viewport', { renderQuality })} />
    </>
  )
  if (category === 'coloring') return (
    <>
      <SelectControl label="Standard-Färbung" value={settings.coloring.defaultColorMode === 'preset' ? 'region' : settings.coloring.defaultColorMode} options={[{ value: 'anatomical', label: 'Anatomisch' }, { value: 'function', label: 'Funktion' }, { value: 'laterality', label: 'Lateralität' }, { value: 'region', label: 'Region' }]} onChange={(defaultColorMode) => update('coloring', { defaultColorMode })} />
      <SwitchControl label="Andere dimmen" checked={settings.coloring.dimOthers} onChange={(dimOthers) => update('coloring', { dimOthers })} />
      <SliderControl label="Dim-Stärke" value={settings.coloring.dimOpacity} min={0} max={1} step={0.01} onChange={(dimOpacity) => update('coloring', { dimOpacity })} />
    </>
  )
  if (category === 'atlas') {
    const toggleCollection = (id: string, checked: boolean) => {
      const current = settings.atlas.visibleCollections.filter((entry) => entry !== id)
      update('atlas', { visibleCollections: checked ? [...current, id].sort() : current })
    }
    return (
      <>
        <SelectControl label="Standard-Atlas" value={settings.atlas.defaultLayer === 'destrieux' ? 'off' : settings.atlas.defaultLayer} options={[{ value: 'off', label: 'Aus' }, { value: 'dkt', label: 'DKT' }, { value: 'julich', label: 'Jülich' }, { value: 'brodmann', label: 'Brodmann' }]} onChange={(defaultLayer) => update('atlas', { defaultLayer })} />
        {['dkt', 'julich'].map((id) => <SwitchControl key={id} label={`Collection ${id}`} checked={settings.atlas.visibleCollections.includes(id)} onChange={(checked) => toggleCollection(id, checked)} />)}
      </>
    )
  }
  if (category === 'dataAccount') return (
    <DataAccountPanel settings={settings} update={update} />
  )
  if (category === 'learning') return (
    <>
      <SwitchControl label="Fortschritt speichern" checked={settings.learning.saveProgress} onChange={(saveProgress) => update('learning', { saveProgress })} />
    </>
  )
  if (category === 'language') return (
    <>
      <SegmentedControl label="Sprache" value={settings.language.primary} options={[{ value: 'de', label: 'DE' }, { value: 'la', label: 'LA' }, { value: 'en', label: 'EN' }]} onChange={(primary) => update('language', { primary })} />
    </>
  )
  return (
    <>
      <SegmentedControl label="Sync" value={settings.presenter.syncDefault} options={[{ value: 'off', label: 'Aus' }, { value: 'follow-presenter', label: 'Folgen' }, { value: 'broadcast', label: 'Senden' }]} onChange={(syncDefault) => update('presenter', { syncDefault })} />
      <SwitchControl label="Timer" checked={settings.presenter.timer} onChange={(timer) => update('presenter', { timer })} />
      <SwitchControl label="Notizen" checked={settings.presenter.notes} onChange={(notes) => update('presenter', { notes })} />
    </>
  )
}

export default function SettingsPanel() {
  const isNarrow = useIsNarrow()
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('display')
  const settings = useSettingsStore()
  const update = useSettingsStore((state) => state.updateCategory)
  const resetCategory = useSettingsStore((state) => state.resetCategory)
  const resetSettings = useSettingsStore((state) => state.resetSettings)

  return (
    <div
      role="group"
      aria-label="Einstellungen"
      data-layout={isNarrow ? 'stack' : 'split'}
      style={{ ...PANEL_STYLE, gridTemplateColumns: isNarrow ? '1fr' : '190px minmax(0, 1fr)' }}
    >
      <nav aria-label="Einstellungskategorien" style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
        {VISIBLE_SETTINGS_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={`ed-btn${activeCategory === category ? ' active' : ''}`}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            style={{ justifyContent: 'flex-start', textAlign: 'left' }}
          >
            {CATEGORY_LABEL[category]}
          </button>
        ))}
      </nav>
      <section aria-label={`${CATEGORY_LABEL[activeCategory]} Defaults`} style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <div className="eyebrow">{CATEGORY_LABEL[activeCategory]}</div>
          <button type="button" className="ed-btn" onClick={() => resetCategory(activeCategory)}>Zurücksetzen</button>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {categoryPanel({ category: activeCategory, settings, update })}
        </div>
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <button type="button" className="ed-btn" onClick={resetSettings}>Alles zurücksetzen</button>
        </div>
      </section>
    </div>
  )
}
