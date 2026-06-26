import { hueToHex, type ColorPreset } from './colorPresets'

export function PresetGroupExplanation({ preset }: { preset: ColorPreset }) {
  return (
    <div style={{ display: 'grid', gap: 6, margin: '4px 0 8px' }}>
      <div className="eyebrow">Bedeutungen</div>
      {preset.groups.map((group) => (
        <div
          key={`${group.role}-${group.label}`}
          style={{ display: 'grid', gridTemplateColumns: '11px 1fr', gap: 8, alignItems: 'start' }}
        >
          <span
            aria-hidden="true"
            data-color-role={group.role}
            style={{
              width: 11,
              height: 11,
              marginTop: 2,
              background: hueToHex(group.hue),
              border: '1px solid var(--line-soft)',
            }}
          />
          <span style={{ minWidth: 0 }}>
            <span className="mono-sm" style={{ display: 'block', fontWeight: 700, color: 'var(--g800)' }}>
              {group.label}
            </span>
            <span className="mono-xs" style={{ display: 'block', lineHeight: 1.35, color: 'var(--g600)' }}>
              {group.meaning}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

export function PresetReadOnlyAction({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '4px 8px 6px' }}>
      <span style={{ fontSize: 'var(--fs-md)', color: 'var(--ink)', lineHeight: 1.25 }}>{label}</span>
      <span className="mono-base" style={{ color: active ? 'var(--orange)' : 'var(--g500)' }}>
        {active ? 'An' : 'Aus'}
      </span>
    </div>
  )
}
