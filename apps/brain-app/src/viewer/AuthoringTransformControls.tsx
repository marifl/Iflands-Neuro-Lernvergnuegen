import type { CSSProperties, ReactNode } from 'react'
import {
  Box,
  Globe2,
  History,
  Lock,
  Magnet,
  MousePointer2,
  Move3D,
  Redo2,
  Rotate3D,
  RotateCcw,
  Scale3D,
  Undo2,
  Unlock,
} from 'lucide-react'
import {
  AUTHORING_TRANSFORM_MODES,
  AUTHORING_TRANSFORM_SPACES,
  useViewerStore,
  type AuthoringTransformMode,
  type AuthoringTransformSpace,
} from './viewerStore'
import { useAuthoringSnapshotStore } from './authoringSnapshotStore'
import {
  IDENTITY_AUTHORING_TRANSFORM,
  activeAuthoringTransformTarget,
  applyAuthoringTransformCommand,
  nudgeAuthoringTransform,
} from './authoringTransformRuntime'
import type { AuthoringTransform } from './authoringScene'
import type { AuthoringCommand } from './authoringCommands'
import { ShellControlButton } from './ShellStatePrimitives'

export const TRANSFORM_MODE_LABEL: Record<AuthoringTransformMode, string> = {
  translate: 'Verschieben',
  rotate: 'Drehen',
  scale: 'Skalieren',
}

export const TRANSFORM_SPACE_LABEL: Record<AuthoringTransformSpace, string> = {
  world: 'Welt',
  local: 'Lokal',
}

type AuthoringControlsLayout = 'menu' | 'toolbar'
type TransformVectorKey = 'position' | 'rotation' | 'scale'
type AxisIndex = 0 | 1 | 2

interface AuthoringTransformControlsProps {
  layout?: AuthoringControlsLayout
  includeEditToggle?: boolean
  includeNudgeAction?: boolean
  includeResetAction?: boolean
}

const ICON_PROPS = { size: 16, strokeWidth: 1.9, 'aria-hidden': true } as const
const AXES = ['X', 'Y', 'Z'] as const
const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180
const MODE_ICON = {
  translate: <Move3D {...ICON_PROPS} />,
  rotate: <Rotate3D {...ICON_PROPS} />,
  scale: <Scale3D {...ICON_PROPS} />,
} satisfies Record<AuthoringTransformMode, ReactNode>
const SPACE_ICON = {
  world: <Globe2 {...ICON_PROPS} />,
  local: <Box {...ICON_PROPS} />,
} satisfies Record<AuthoringTransformSpace, ReactNode>

const MENU_BUTTON_STYLE: CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '6px 10px',
  marginBottom: 2,
}

const TOOLBAR_ROOT_STYLE: CSSProperties = {
  position: 'absolute',
  top: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  maxWidth: 'calc(100% - 24px)',
  padding: 6,
  pointerEvents: 'auto',
  overflowX: 'auto',
  overscrollBehaviorX: 'contain',
  background: 'color-mix(in srgb, var(--shell-panel-bg) 88%, transparent)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 26px rgba(0, 0, 0, 0.22)',
}

const TOOLBAR_GROUP_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flex: '0 0 auto',
}

const TOOLBAR_SEPARATOR_STYLE: CSSProperties = {
  width: 1,
  height: 26,
  flex: '0 0 auto',
  background: 'var(--line)',
  opacity: 0.7,
}

const TOOLBAR_BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minHeight: 32,
  minWidth: 34,
  padding: '5px 9px',
  flex: '0 0 auto',
}

const TOOLBAR_NUMBER_FIELDS_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto repeat(3, 54px)',
  alignItems: 'center',
  gap: 4,
  flex: '0 0 auto',
}

const MENU_NUMBER_FIELDS_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto repeat(3, minmax(0, 1fr))',
  alignItems: 'center',
  gap: 6,
  marginTop: 8,
}

const NUMBER_GROUP_LABEL_STYLE: CSSProperties = {
  color: 'var(--muted)',
  fontFamily: 'var(--ed-mono)',
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0,
}

const NUMBER_INPUT_STYLE: CSSProperties = {
  minWidth: 0,
  height: 30,
  padding: '4px 6px',
  color: 'var(--fg)',
  background: 'var(--shell-panel-bg)',
  border: '1px solid var(--line)',
  borderRadius: 0,
  fontFamily: 'var(--ed-mono)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
}

const HISTORY_SELECT_STYLE: CSSProperties = {
  minWidth: 112,
  height: 32,
  padding: '4px 8px',
  color: 'var(--fg)',
  background: 'var(--shell-panel-bg)',
  border: '1px solid var(--line)',
  borderRadius: 0,
  fontFamily: 'var(--ed-mono)',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
}

const MENU_HISTORY_STYLE: CSSProperties = {
  ...HISTORY_SELECT_STYLE,
  width: '100%',
  marginBottom: 2,
}

const VECTOR_FIELD_CONFIG: readonly {
  key: TransformVectorKey
  shortLabel: string
  label: string
  step: number
  toDisplay: (value: number) => number
  fromDisplay: (value: number) => number
}[] = [
  {
    key: 'position',
    shortLabel: 'P',
    label: 'Position',
    step: 0.5,
    toDisplay: (value) => value,
    fromDisplay: (value) => value,
  },
  {
    key: 'rotation',
    shortLabel: 'R',
    label: 'Rotation',
    step: 1,
    toDisplay: (value) => value * RAD_TO_DEG,
    fromDisplay: (value) => value * DEG_TO_RAD,
  },
  {
    key: 'scale',
    shortLabel: 'S',
    label: 'Skalierung',
    step: 0.01,
    toDisplay: (value) => value,
    fromDisplay: (value) => value,
  },
]

function buttonStyle(layout: AuthoringControlsLayout, disabled: boolean): CSSProperties {
  const base = layout === 'toolbar' ? TOOLBAR_BUTTON_STYLE : MENU_BUTTON_STYLE
  return {
    ...base,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function ControlButton({
  active,
  children,
  disabledReason,
  icon,
  label,
  layout,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  disabledReason?: string
  icon?: ReactNode
  label: string
  layout: AuthoringControlsLayout
  onClick: () => void
}) {
  return (
    <ShellControlButton
      active={active}
      aria-label={label}
      disabledReason={disabledReason}
      title={disabledReason ?? label}
      onClick={onClick}
      style={buttonStyle(layout, Boolean(disabledReason))}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 }}>
        {icon}
        <span>{children}</span>
      </span>
    </ShellControlButton>
  )
}

function ToolbarSeparator() {
  return <span aria-hidden="true" style={TOOLBAR_SEPARATOR_STYLE} />
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return Number(value.toFixed(4)).toString()
}

function transformWithAxisValue(
  transform: AuthoringTransform,
  vectorKey: TransformVectorKey,
  axis: AxisIndex,
  displayValue: number,
): AuthoringTransform {
  const next: AuthoringTransform = {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  }
  const config = VECTOR_FIELD_CONFIG.find((candidate) => candidate.key === vectorKey)!
  next[vectorKey][axis] = config.fromDisplay(displayValue)
  return next
}

function commandHistoryLabel(command: AuthoringCommand, index: number): string {
  if (command.label) return command.label
  if (command.kind === 'set-transform') return `Transform ${command.targetRef.instanceId}`
  return `Batch ${index + 1}`
}

function TransformNumberFields({
  disabledReason,
  layout,
  onCommitAxis,
  transform,
}: {
  disabledReason?: string
  layout: AuthoringControlsLayout
  onCommitAxis: (vectorKey: TransformVectorKey, axis: AxisIndex, displayValue: number) => void
  transform?: AuthoringTransform
}) {
  const rootStyle = layout === 'toolbar' ? TOOLBAR_NUMBER_FIELDS_STYLE : MENU_NUMBER_FIELDS_STYLE
  const disabled = Boolean(disabledReason || !transform)
  return (
    <div role="group" aria-label="Transform-Zahlen" style={rootStyle}>
      {VECTOR_FIELD_CONFIG.map((config) => (
        <span key={`${config.key}-row`} style={{ display: 'contents' }}>
          <span aria-hidden="true" style={NUMBER_GROUP_LABEL_STYLE}>{config.shortLabel}</span>
          {AXES.map((axis, axisIndex) => {
            const index = axisIndex as AxisIndex
            const rawValue = transform?.[config.key][index] ?? (config.key === 'scale' ? 1 : 0)
            return (
              <input
                key={`${config.key}-${axis}`}
                aria-label={`${config.label} ${axis}`}
                disabled={disabled}
                inputMode="decimal"
                step={config.step}
                title={disabledReason ?? `${config.label} ${axis}`}
                type="number"
                value={formatNumber(config.toDisplay(rawValue))}
                onChange={(event) => {
                  const raw = event.currentTarget.value.trim()
                  if (raw === '') return
                  const value = Number(raw)
                  if (!Number.isFinite(value)) return
                  onCommitAxis(config.key, index, value)
                }}
                style={{
                  ...NUMBER_INPUT_STYLE,
                  opacity: disabled ? 0.55 : 1,
                  cursor: disabled ? 'not-allowed' : 'text',
                }}
              />
            )
          })}
        </span>
      ))}
    </div>
  )
}

function AuthoringHistoryControls({
  disabledReason,
  history,
  layout,
  onJump,
  onRedo,
  onUndo,
}: {
  disabledReason?: string
  history: ReturnType<typeof useAuthoringSnapshotStore.getState>['authoringCommandHistory']
  layout: AuthoringControlsLayout
  onJump: (cursor: number) => void
  onRedo: () => void
  onUndo: () => void
}) {
  const undoDisabledReason = disabledReason ?? (history.cursor === 0 ? 'Kein Undo' : undefined)
  const redoDisabledReason = disabledReason ?? (history.cursor >= history.commands.length ? 'Kein Redo' : undefined)
  const historyDisabled = Boolean(disabledReason || history.commands.length === 0)
  return (
    <>
      <ControlButton
        disabledReason={undoDisabledReason}
        icon={<Undo2 {...ICON_PROPS} />}
        label="Undo"
        layout={layout}
        onClick={onUndo}
      >
        Undo
      </ControlButton>
      <ControlButton
        disabledReason={redoDisabledReason}
        icon={<Redo2 {...ICON_PROPS} />}
        label="Redo"
        layout={layout}
        onClick={onRedo}
      >
        Redo
      </ControlButton>
      <label style={{ display: layout === 'toolbar' ? 'inline-flex' : 'flex', alignItems: 'center', gap: 6 }}>
        <History {...ICON_PROPS} />
        <select
          aria-label="Transform-History"
          disabled={historyDisabled}
          title={disabledReason ?? (history.commands.length === 0 ? 'Keine History' : 'Transform-History')}
          value={history.cursor}
          onChange={(event) => {
            const cursor = Number(event.currentTarget.value)
            if (Number.isFinite(cursor)) onJump(cursor)
          }}
          style={{
            ...(layout === 'toolbar' ? HISTORY_SELECT_STYLE : MENU_HISTORY_STYLE),
            opacity: historyDisabled ? 0.55 : 1,
            cursor: historyDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          <option value={0}>{history.commands.length === 0 ? 'Keine History' : 'Start'}</option>
          {history.commands.map((command, index) => (
            <option key={command.commandId} value={index + 1}>
              {index + 1}. {commandHistoryLabel(command, index)}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function applyTransform(transform: AuthoringTransform, label: string) {
  const current = useAuthoringSnapshotStore.getState().authoring
  const target = activeAuthoringTransformTarget(current)
  if (!current || !target) return
  const result = applyAuthoringTransformCommand(
    current,
    target,
    transform,
    `cmd:transform:${target.instance.instanceId}:${Date.now()}`,
    label,
  )
  const store = useAuthoringSnapshotStore.getState()
  store.setAuthoringSnapshotState(result.authoring)
  store.recordAuthoringCommand(result.command)
  if (import.meta.env.DEV) {
    ;(window as unknown as { __BRAIN_LAST_AUTHORING_COMMAND__?: unknown }).__BRAIN_LAST_AUTHORING_COMMAND__ = result.command
  }
}

export function AuthoringTransformControls({
  layout = 'menu',
  includeEditToggle = false,
  includeNudgeAction = false,
  includeResetAction = false,
}: AuthoringTransformControlsProps) {
  const authoringTransformMode = useViewerStore((s) => s.authoringTransformMode)
  const setAuthoringTransformMode = useViewerStore((s) => s.setAuthoringTransformMode)
  const authoringTransformSpace = useViewerStore((s) => s.authoringTransformSpace)
  const setAuthoringTransformSpace = useViewerStore((s) => s.setAuthoringTransformSpace)
  const authoringTransformSnap = useViewerStore((s) => s.authoringTransformSnap)
  const setAuthoringTransformSnap = useViewerStore((s) => s.setAuthoringTransformSnap)
  const authoringTransformFrozen = useViewerStore((s) => s.authoringTransformFrozen)
  const setAuthoringTransformFrozen = useViewerStore((s) => s.setAuthoringTransformFrozen)
  const authoringEditMode = useViewerStore((s) => s.authoringEditMode)
  const setAuthoringEditMode = useViewerStore((s) => s.setAuthoringEditMode)
  const authoring = useAuthoringSnapshotStore((s) => s.authoring)
  const authoringCommandHistory = useAuthoringSnapshotStore((s) => s.authoringCommandHistory)
  const undoAuthoringCommand = useAuthoringSnapshotStore((s) => s.undoAuthoringCommand)
  const redoAuthoringCommand = useAuthoringSnapshotStore((s) => s.redoAuthoringCommand)
  const jumpAuthoringCommandHistory = useAuthoringSnapshotStore((s) => s.jumpAuthoringCommandHistory)
  const activeTransformTarget = activeAuthoringTransformTarget(authoring)
  const transformSettingDisabledReason = authoringEditMode ? undefined : 'Asset-Edit einschalten'
  const activeTransformDisabledReason = !authoringEditMode
    ? 'Asset-Edit einschalten'
    : !activeTransformTarget
      ? 'Erst ein Asset auswählen'
      : authoringTransformFrozen
        ? 'Gizmo ist fixiert'
        : undefined

  if (layout === 'toolbar' && !authoringEditMode) return null

  const controls = (
    <>
      {includeEditToggle ? (
        <>
          <ControlButton
            active={authoringEditMode}
            icon={<MousePointer2 {...ICON_PROPS} />}
            label={`Asset-Edit ${authoringEditMode ? 'an' : 'aus'}`}
            layout={layout}
            onClick={() => setAuthoringEditMode(!authoringEditMode)}
          >
            Asset-Edit {authoringEditMode ? 'an' : 'aus'}
          </ControlButton>
          {layout === 'toolbar' ? <ToolbarSeparator /> : <div style={{ height: 10 }} />}
        </>
      ) : null}
      {layout === 'menu' ? <div className="eyebrow" style={{ marginBottom: 4 }}>Transform</div> : null}
      {AUTHORING_TRANSFORM_MODES.map((mode) => (
        <ControlButton
          key={mode}
          active={authoringTransformMode === mode}
          disabledReason={transformSettingDisabledReason}
          icon={MODE_ICON[mode]}
          label={TRANSFORM_MODE_LABEL[mode]}
          layout={layout}
          onClick={() => setAuthoringTransformMode(mode)}
        >
          {TRANSFORM_MODE_LABEL[mode]}
        </ControlButton>
      ))}
      {layout === 'toolbar' ? <ToolbarSeparator /> : null}
      {AUTHORING_TRANSFORM_SPACES.map((space) => (
        <ControlButton
          key={space}
          active={authoringTransformSpace === space}
          disabledReason={transformSettingDisabledReason}
          icon={SPACE_ICON[space]}
          label={TRANSFORM_SPACE_LABEL[space]}
          layout={layout}
          onClick={() => setAuthoringTransformSpace(space)}
        >
          {TRANSFORM_SPACE_LABEL[space]}
        </ControlButton>
      ))}
      {layout === 'toolbar' ? <ToolbarSeparator /> : null}
      <ControlButton
        active={authoringTransformSnap}
        disabledReason={transformSettingDisabledReason}
        icon={<Magnet {...ICON_PROPS} />}
        label={`Snap ${authoringTransformSnap ? 'an' : 'aus'}`}
        layout={layout}
        onClick={() => setAuthoringTransformSnap(!authoringTransformSnap)}
      >
        Snap {authoringTransformSnap ? 'an' : 'aus'}
      </ControlButton>
      <ControlButton
        active={authoringTransformFrozen}
        disabledReason={transformSettingDisabledReason}
        icon={authoringTransformFrozen ? <Lock {...ICON_PROPS} /> : <Unlock {...ICON_PROPS} />}
        label={authoringTransformFrozen ? 'Gizmo fixiert' : 'Gizmo frei'}
        layout={layout}
        onClick={() => setAuthoringTransformFrozen(!authoringTransformFrozen)}
      >
        {authoringTransformFrozen ? 'Gizmo fixiert' : 'Gizmo frei'}
      </ControlButton>
      {layout === 'toolbar' ? <ToolbarSeparator /> : null}
      <AuthoringHistoryControls
        disabledReason={transformSettingDisabledReason}
        history={authoringCommandHistory}
        layout={layout}
        onJump={jumpAuthoringCommandHistory}
        onRedo={redoAuthoringCommand}
        onUndo={undoAuthoringCommand}
      />
      {layout === 'toolbar' ? <ToolbarSeparator /> : <div style={{ height: 8 }} />}
      <TransformNumberFields
        disabledReason={activeTransformDisabledReason}
        layout={layout}
        transform={activeTransformTarget?.instance.transform}
        onCommitAxis={(vectorKey, axis, displayValue) => {
          if (!activeTransformTarget || activeTransformDisabledReason) return
          applyTransform(
            transformWithAxisValue(activeTransformTarget.instance.transform, vectorKey, axis, displayValue),
            `${VECTOR_FIELD_CONFIG.find((candidate) => candidate.key === vectorKey)?.label ?? 'Transform'} ${AXES[axis]}`,
          )
        }}
      />
      {includeNudgeAction ? (
        <ControlButton
          disabledReason={activeTransformDisabledReason}
          label="X +5"
          layout={layout}
          onClick={() => {
            if (!activeTransformTarget || activeTransformDisabledReason) return
            applyTransform(nudgeAuthoringTransform(activeTransformTarget.instance.transform, 0, 5), 'Nudge X')
          }}
        >
          X +5
        </ControlButton>
      ) : null}
      {includeResetAction ? (
        <ControlButton
          disabledReason={activeTransformDisabledReason}
          icon={<RotateCcw {...ICON_PROPS} />}
          label="Reset Transform"
          layout={layout}
          onClick={() => {
            if (activeTransformDisabledReason) return
            applyTransform(IDENTITY_AUTHORING_TRANSFORM, 'Reset Transform')
          }}
        >
          Reset Transform
        </ControlButton>
      ) : null}
    </>
  )

  if (layout === 'toolbar') {
    return (
      <div className="ed-panel ed-frame" role="toolbar" aria-label="Asset-Edit-Werkzeuge" style={TOOLBAR_ROOT_STYLE}>
        <div role="group" aria-label="Transform-Modus" style={TOOLBAR_GROUP_STYLE}>
          {controls}
        </div>
      </div>
    )
  }

  return <>{controls}</>
}
