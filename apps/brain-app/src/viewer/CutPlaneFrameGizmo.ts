import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector2,
  Vector3,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CUT_AXIS_COLORS } from './atlasColorSystem'
import {
  CUT_GIZMO_HELPER_FLAG,
  clampCutPosition,
  type CutAxis,
  type CutConfig,
} from './cutCapsMerged'
import {
  CUT_FRAME_TAB_HEIGHT_PX,
  CUT_FRAME_TAB_WIDTH_PX,
  configureCutPlaneFrameTabButton,
  updateCutPlaneFrameTabButton,
  type CutFrameTabDirection,
} from './cutPlaneFrameTab'

/**
 * Schlanke Schnittstelle, die die Gizmo vom Cut-Zustand braucht — im Original der
 * brain-core CutPlaneManager, hier ein Adapter auf den viewerStore (siehe CutPlaneGizmoBridge).
 */
export interface CutController {
  getCut: (axis: CutAxis) => CutConfig
  setCuts: (configs: Partial<Record<CutAxis, CutConfig>>) => void
  onCutChange: (cb: (axis: CutAxis, config: CutConfig) => void) => () => void
}

const AXES: CutAxis[] = ['sagittal', 'coronal', 'axial']
const AXIS_COLORS: Record<CutAxis, number> = CUT_AXIS_COLORS

const FRAME_SIZE = 170
const FRAME_TAB_GAP_PX = 18
const POINTER_DRAG_THRESHOLD_PX = 4

const SCREEN_A = new Vector2()
const SCREEN_B = new Vector2()
const SCREEN_C = new Vector2()
const POINTER_START = new Vector2()
const POINTER_NOW = new Vector2()
const WORLD_A = new Vector3()
const WORLD_B = new Vector3()
const WORLD_C = new Vector3()
const AXIS_VECTOR = new Vector3()

type FrameDragState = {
  axis: CutAxis
  source: HTMLElement
  pointerId: number
  pointerStart: Vector2
  rootStart: Vector3
  moved: boolean
}

export class CutPlaneFrameGizmo {
  private readonly _scene: Scene
  private readonly _camera: Camera
  private readonly _renderer: WebGLRenderer
  private readonly _orbitControls: OrbitControls
  private readonly _cutPlaneManager: CutController
  private readonly _requestRender: () => void
  private readonly _root = new Group()
  private readonly _axisVisuals = {} as Record<CutAxis, {
    group: Group
    frame: LineSegments
    tabAnchor: Object3D
  }>
  private readonly _overlay = document.createElement('div')
  private readonly _axisButtons: Record<CutAxis, HTMLButtonElement>
  private readonly _unsubscribeCutChange: () => void
  private _drag: FrameDragState | null = null
  private _state: Record<CutAxis, CutConfig> = {
    sagittal: { on: false, pos: 0 },
    coronal: { on: false, pos: 0 },
    axial: { on: false, pos: 0 },
  }
  private _syncing = false
  private _disposed = false

  constructor(
    scene: Scene,
    camera: Camera,
    renderer: WebGLRenderer,
    orbitControls: OrbitControls,
    cutPlaneManager: CutController,
    requestRender: () => void,
  ) {
    this._scene = scene
    this._camera = camera
    this._renderer = renderer
    this._orbitControls = orbitControls
    this._cutPlaneManager = cutPlaneManager
    this._requestRender = requestRender
    this._axisButtons = this._createAxisButtons()

    this._root.name = 'CutPlaneFrameGizmo'
    this._root.visible = false
    markHelper(this._root)

    this._buildFrames()
    this._scene.add(this._root)
    this._mountOverlay()

    this._orbitControls.addEventListener('change', this._onOrbitChange)
    this._unsubscribeCutChange = this._cutPlaneManager.onCutChange((axis, config) => {
      this._state[axis] = { ...config }
      this._syncFromState()
    })
    this._syncFromManager()
  }

  isPointerActive(): boolean {
    return this._root.visible && this._drag !== null
  }

  private _buildFrames(): void {
    for (const axis of AXES) {
      const color = AXIS_COLORS[axis]
      const frameMat = new LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      })
      const frame = new LineSegments(createFrameLineGeometry(axis), frameMat)
      const tabAnchor = new Group()
      const group = new Group()

      group.name = `CutPlaneFrameAxis_${axis}`
      frame.name = `CutPlaneFrameRail_${axis}`
      tabAnchor.name = `CutPlaneFrameTabAnchor_${axis}`
      markHelper(group)
      markHelper(frame)
      markHelper(tabAnchor)
      group.add(frame, tabAnchor)

      this._axisVisuals[axis] = { group, frame, tabAnchor }
      this._root.add(group)
    }
  }

  private _syncFromManager(): void {
    for (const axis of AXES) this._state[axis] = this._cutPlaneManager.getCut(axis)
    this._syncFromState()
  }

  private _syncFromState(): void {
    if (this._syncing) return
    this._syncing = true
    this._root.visible = AXES.some((axis) => this._state[axis].on)
    for (const axis of AXES) {
      const active = this._state[axis].on
      const visual = this._axisVisuals[axis]
      visual.group.position.set(0, 0, 0)
      setCutAxisWorldPosition(axis, visual.group.position, this._state[axis].pos)
      visual.frame.visible = active
      setMaterialOpacity(visual.frame.material, active ? 0.5 : 0.18)
    }
    this._syncing = false
    this._updateOverlay()
    this._requestRender()
  }

  private _createAxisButtons(): Record<CutAxis, HTMLButtonElement> {
    const buttons = {} as Record<CutAxis, HTMLButtonElement>
    for (const axis of AXES) {
      const button = document.createElement('button')
      configureCutPlaneFrameTabButton(button, axis)
      button.addEventListener('pointerdown', (event) => this._onTabPointerDown(axis, button, event))
      button.addEventListener('pointermove', (event) => this._onTabPointerMove(event))
      button.addEventListener('pointerup', (event) => this._onTabPointerUp(event))
      button.addEventListener('pointercancel', (event) => this._onTabPointerUp(event))
      buttons[axis] = button
    }
    return buttons
  }

  private _mountOverlay(): void {
    this._overlay.style.position = 'absolute'
    this._overlay.style.inset = '0'
    this._overlay.style.pointerEvents = 'none'
    this._overlay.style.zIndex = '40'
    this._overlay.style.display = 'none'
    const parent = this._renderer.domElement.parentElement
    if (parent) {
      const style = getComputedStyle(parent)
      if (style.position === 'static') parent.style.position = 'relative'
      parent.appendChild(this._overlay)
    }
    for (const axis of AXES) this._overlay.appendChild(this._axisButtons[axis])
  }

  private _updateOverlay(): void {
    const visible = this._root.visible && this._overlay.parentElement !== null
    this._overlay.style.display = visible ? 'block' : 'none'
    if (!visible) return

    this._root.updateMatrixWorld(true)
    this._camera.updateMatrixWorld(true)
    for (const axis of AXES) {
      const active = this._state[axis].on
      const button = this._axisButtons[axis]
      // Nur aktive Achsen zeigen ihren Handle — er haengt an der zugehoerigen Schnittebene.
      // Inaktive Achsen werden ueber die FooterBar zugeschaltet, nicht ueber schwebende Tabs.
      if (!active) {
        updateCutPlaneFrameTabButton(button, {
          axis,
          active: false,
          highlighted: false,
          dragging: false,
          direction: 'right',
          positionMm: this._state[axis].pos,
        })
        continue
      }
      const visual = this._axisVisuals[axis]
      // Ebenen-Zentrum (Schnittebene am Modell) im Overlay-Raum.
      visual.group.getWorldPosition(WORLD_C)
      worldToLocalElement(this._camera, this._renderer.domElement, this._overlay, WORLD_C, SCREEN_C)
      // Fester Anker an EINER Ebenen-Kante (kein Hysterese-Springen) → folgt der Ebene beim Drehen.
      visual.group.localToWorld(WORLD_A.copy(fixedTabAnchor(axis)))
      worldToLocalElement(this._camera, this._renderer.domElement, this._overlay, WORLD_A, SCREEN_A)
      // Tab knapp ueber die Kante hinaus — radial vom Ebenen-Zentrum, NICHT vom Canvas-Rand.
      // Kein Canvas-Clamping: der Handle bleibt an der Ebene statt am Bildschirmrand zu kleben.
      const center = labelCenterBeyondFrameEdge(SCREEN_C, SCREEN_A, CUT_FRAME_TAB_WIDTH_PX, CUT_FRAME_TAB_HEIGHT_PX, SCREEN_A)
      const highlighted = button.matches(':hover') || document.activeElement === button || this._drag?.axis === axis
      const direction = tabDirectionTowardCenter(center, SCREEN_C)
      button.style.left = `${Math.round(center.x - CUT_FRAME_TAB_WIDTH_PX / 2)}px`
      button.style.top = `${Math.round(center.y - CUT_FRAME_TAB_HEIGHT_PX / 2)}px`
      updateCutPlaneFrameTabButton(button, {
        axis,
        active,
        highlighted,
        dragging: this._drag?.axis === axis,
        direction,
        positionMm: this._state[axis].pos,
      })
    }
  }

  private _onTabPointerDown(axis: CutAxis, button: HTMLButtonElement, event: PointerEvent): void {
    if (!this._root.visible || this._disposed || this._drag) return
    event.preventDefault()
    event.stopPropagation()
    button.setPointerCapture(event.pointerId)
    this._beginDrag(axis, button, event)
  }

  private _onTabPointerMove(event: PointerEvent): void {
    if (!this._drag || this._drag.pointerId !== event.pointerId) return
    this._dragMove(event)
  }

  private _onTabPointerUp(event: PointerEvent): void {
    if (!this._drag || this._drag.pointerId !== event.pointerId) return
    this._dragEnd(event)
  }

  private _beginDrag(axis: CutAxis, source: HTMLElement, event: PointerEvent): void {
    this._orbitControls.enabled = false
    this._drag = {
      axis,
      source,
      pointerId: event.pointerId,
      pointerStart: pointerClient(event, POINTER_START).clone(),
      rootStart: this._axisVisuals[axis].group.position.clone(),
      moved: false,
    }
  }

  private _dragMove(event: PointerEvent): void {
    if (!this._drag || this._disposed) return
    event.preventDefault()
    event.stopPropagation()
    const pointer = pointerClient(event, POINTER_NOW)
    if (pointer.distanceTo(this._drag.pointerStart) >= POINTER_DRAG_THRESHOLD_PX) this._drag.moved = true
    if (!this._drag.moved) return

    const next = this._drag.rootStart.clone()
    const axisDelta = pointerDeltaOnAxis(
      this._camera,
      this._renderer.domElement,
      this._drag.axis,
      this._drag.rootStart,
      this._drag.pointerStart,
      pointer,
    )
    const startPos = cutAxisPositionFromWorld(this._drag.axis, this._drag.rootStart)
    setCutAxisWorldPosition(this._drag.axis, next, clampCutPosition(startPos + axisDelta))
    this._axisVisuals[this._drag.axis].group.position.copy(next)
    this._commitDragPosition()
    this._updateOverlay()
    this._requestRender()
  }

  private _dragEnd(event: PointerEvent): void {
    if (!this._drag) return
    event.preventDefault()
    event.stopPropagation()
    const drag = this._drag
    this._drag = null
    this._orbitControls.enabled = true
    if (drag.source.hasPointerCapture(event.pointerId)) drag.source.releasePointerCapture(event.pointerId)
    if (!drag.moved) this._toggleAxis(drag.axis)
    this._updateOverlay()
    this._requestRender()
  }

  private _toggleAxis(axis: CutAxis): void {
    const current = this._state[axis]
    this._cutPlaneManager.setCuts({
      [axis]: {
        on: !current.on,
        pos: Math.round(cutAxisPositionFromWorld(axis, this._axisVisuals[axis].group.position)),
      },
    })
  }

  private _commitDragPosition(): void {
    if (this._syncing || this._disposed || !this._drag) return
    const axis = this._drag.axis
    const current = this._state[axis]
    if (!current.on) return
    const pos = Math.round(cutAxisPositionFromWorld(axis, this._axisVisuals[axis].group.position))
    if (pos !== current.pos) this._cutPlaneManager.setCuts({ [axis]: { on: true, pos } })
  }

  private _onOrbitChange = (): void => {
    this._updateOverlay()
    this._requestRender()
  }

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._unsubscribeCutChange()
    this._orbitControls.removeEventListener('change', this._onOrbitChange)
    this._overlay.remove()
    this._scene.remove(this._root)
    for (const axis of AXES) {
      const visual = this._axisVisuals[axis]
      visual.frame.geometry.dispose()
      const mat = visual.frame.material
      if (Array.isArray(mat)) mat.forEach((item) => item.dispose())
      else mat.dispose()
    }
  }
}

function createFrameLineGeometry(axis: CutAxis): BufferGeometry {
  const edge = FRAME_SIZE / 2
  const points = axisFrameCorners(axis, edge)
  const values = [
    ...points[0], ...points[1],
    ...points[1], ...points[2],
    ...points[2], ...points[3],
    ...points[3], ...points[0],
  ]
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(values, 3))
  return geometry
}

function axisFrameCorners(axis: CutAxis, edge: number): [number, number, number][] {
  if (axis === 'sagittal') {
    return [[0, -edge, -edge], [0, edge, -edge], [0, edge, edge], [0, -edge, edge]]
  }
  if (axis === 'coronal') {
    return [[-edge, -edge, 0], [edge, -edge, 0], [edge, edge, 0], [-edge, edge, 0]]
  }
  return [[-edge, 0, -edge], [edge, 0, -edge], [edge, 0, edge], [-edge, 0, edge]]
}

/** Feste Kante pro Achse (lokal zur Frame-group): coronal=oben, sagittal=vorne, axial=seitlich. */
function fixedTabAnchor(axis: CutAxis): Vector3 {
  const edge = FRAME_SIZE / 2
  if (axis === 'sagittal') return new Vector3(0, 0, edge) // anterior
  if (axis === 'coronal') return new Vector3(0, edge, 0) // superior
  return new Vector3(edge, 0, 0) // axial: seitlich
}

function labelCenterBeyondFrameEdge(
  origin: Vector2,
  edgePoint: Vector2,
  buttonWidth: number,
  buttonHeight: number,
  target: Vector2,
): Vector2 {
  const dx = edgePoint.x - origin.x
  const dy = edgePoint.y - origin.y
  const length = Math.hypot(dx, dy)
  if (length < 1) return target.copy(edgePoint)
  const nx = dx / length
  const ny = dy / length
  const halfExtent = Math.abs(nx) * buttonWidth / 2 + Math.abs(ny) * buttonHeight / 2
  return target.set(
    edgePoint.x + nx * (halfExtent + FRAME_TAB_GAP_PX),
    edgePoint.y + ny * (halfExtent + FRAME_TAB_GAP_PX),
  )
}

function setMaterialOpacity(material: Material | Material[], opacity: number): void {
  if (Array.isArray(material)) {
    for (const item of material) setMaterialOpacity(item, opacity)
    return
  }
  const transparentMaterial = material as Material & { opacity?: number }
  transparentMaterial.opacity = opacity
}

function pointerClient(event: PointerEvent, target: Vector2): Vector2 {
  return target.set(event.clientX, event.clientY)
}

function pointerDeltaOnAxis(
  camera: Camera,
  element: HTMLElement,
  axis: CutAxis,
  rootStart: Vector3,
  pointerStart: Vector2,
  pointerNow: Vector2,
): number {
  worldToClient(camera, element, rootStart, SCREEN_A)
  axisVector(axis, AXIS_VECTOR)
  worldToClient(camera, element, WORLD_B.copy(rootStart).add(AXIS_VECTOR.multiplyScalar(40)), SCREEN_B)
  const axisX = SCREEN_B.x - SCREEN_A.x
  const axisY = SCREEN_B.y - SCREEN_A.y
  const screenLength = Math.hypot(axisX, axisY)
  if (screenLength < 1) return 0
  const pointerX = pointerNow.x - pointerStart.x
  const pointerY = pointerNow.y - pointerStart.y
  const projectedPixels = (pointerX * axisX + pointerY * axisY) / screenLength
  return projectedPixels * 40 / screenLength
}

function worldToClient(camera: Camera, element: HTMLElement, world: Vector3, target: Vector2): Vector2 {
  const rect = element.getBoundingClientRect()
  WORLD_A.copy(world).project(camera)
  return target.set(
    rect.left + (WORLD_A.x + 1) * rect.width / 2,
    rect.top + (-WORLD_A.y + 1) * rect.height / 2,
  )
}

function worldToLocalElement(
  camera: Camera,
  canvas: HTMLElement,
  localElement: HTMLElement,
  world: Vector3,
  target: Vector2,
): Vector2 {
  worldToClient(camera, canvas, world, target)
  const localRect = localElement.getBoundingClientRect()
  return target.set(target.x - localRect.left, target.y - localRect.top)
}

function axisVector(axis: CutAxis, target: Vector3): Vector3 {
  if (axis === 'sagittal') return target.set(1, 0, 0)
  if (axis === 'coronal') return target.set(0, 0, 1)
  return target.set(0, 1, 0)
}

function cutAxisPositionFromWorld(axis: CutAxis, world: Vector3): number {
  if (axis === 'sagittal') return world.x
  if (axis === 'coronal') return world.z
  return world.y
}

function setCutAxisWorldPosition(axis: CutAxis, world: Vector3, positionMm: number): void {
  if (axis === 'sagittal') world.x = positionMm
  else if (axis === 'coronal') world.z = positionMm
  else world.y = positionMm
}

function markHelper(object: Object3D): void {
  object.userData[CUT_GIZMO_HELPER_FLAG] = true
}

function tabDirectionTowardCenter(tab: Vector2, center: Vector2): CutFrameTabDirection {
  const dx = center.x - tab.x
  const dy = center.y - tab.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'down' : 'up'
}
