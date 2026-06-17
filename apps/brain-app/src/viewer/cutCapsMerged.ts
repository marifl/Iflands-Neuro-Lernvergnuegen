// CutCapsMerged — Pool-basierte Stencil-Cap-Pipeline fuer geclippte Meshes.
//
// Port aus dem Monorepo (apps/brain-app/src/core/cutCapsMerged.ts, T6S00-working-impl),
// entkoppelt von der composition-spezifischen Pick-/Selection-Logik.
//
// Pro Mesh, das eine aktive Cut-Plane schneidet (aus einem Pool):
//   1. stencilBack  (BackSide, IncrementWrap) → schreibt Stencil
//   2. stencilFront (FrontSide, DecrementWrap) → schreibt Stencil
//   3. cap (PlaneGeometry in Mesh-Farbe, NotEqualStencilFunc) → fuellt die Cross-Section
//   4. onAfterRender → clearStencil
//
// Invarianten (aus der erprobten Vorlage):
// - Pool (MAX_POOL) statt create+dispose pro setPlanes
// - ALLE source-meshes auf MESH_RENDER_ORDER, sobald Cuts aktiv sind — sonst
//   ueberzeichnen non-intersecting source-meshes (renderOrder=0) die Caps.
// - BoundingBox-Culling mit 2mm Toleranz, Geometrie-Sharing, matrixAutoUpdate=false.
//
// Hinweis: Diese Klasse setzt NUR die Cap-Helfer. Das eigentliche Wegschneiden der
// source-Materialien (material.clippingPlanes) passiert weiterhin extern (useClipPlanes).
import {
  AlwaysStencilFunc,
  BackSide,
  Box3,
  Color,
  DecrementWrapStencilOp,
  DoubleSide,
  FrontSide,
  IncrementWrapStencilOp,
  Mesh,
  MeshBasicMaterial,
  NotEqualStencilFunc,
  Object3D,
  Plane,
  PlaneGeometry,
  ReplaceStencilOp,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { ATLAS_VIEWER_COLORS } from './atlasColorSystem'

// Cap-/Stencil-Helfer muessen VOR den Source-Meshes fertig sein:
// max(cap.renderOrder) ~= STENCIL_RENDER_ORDER_BASE + 2 * (aktive Units) - 1.
const MESH_RENDER_ORDER = 25000
const STENCIL_RENDER_ORDER_BASE = 10
const CAP_PLANE_SIZE = 400
const PLANE_TOLERANCE_MM = 2
const MAX_POOL = 1200
/** Hover-/Selektions-Farben der Cap (entsprechen den Hover-/Select-Toenen der Source-Meshes). */
const CAP_HOVER_COLOR = ATLAS_VIEWER_COLORS.hover
const CAP_SELECT_COLOR = ATLAS_VIEWER_COLORS.selection

/** Markiert die Stencil-/Cap-Hilfsmeshes (vom Picking + von getSourceMeshes auszufiltern). */
export const CUT_CAP_HELPER_FLAG = 'cutCapHelper'

/** Markiert ein Mesh als Cut-Source (Cap-faehig + via CutPickBridge pickbar). */
export const CUT_SOURCE_FLAG = 'cutSource'

/** Markiert die Gizmo-Hilfsobjekte (Rahmen/Anchor) — vom Picking auszuschliessen. */
export const CUT_GIZMO_HELPER_FLAG = 'cutGizmoHelper'

export type CutCapAxis = 'sagittal' | 'coronal' | 'axial'
/** Alias: dieselben drei Achsen, ohne 'none' (Multi-Axis-Cut-Modell). */
export type CutAxis = CutCapAxis
export const CUT_AXES: readonly CutAxis[] = ['sagittal', 'coronal', 'axial']

/** Zustand einer Achse: aktiv + Position der Ebene entlang ihrer Normalen (Viewer-Einheiten). */
export interface CutConfig {
  on: boolean
  pos: number
}

/** Wirkung der Schnittebenen: 'slice' = schneiden + Cap-Flaeche; 'hide' = vollstaendig
 *  dahinterliegende Strukturen ausblenden (kein Schnitt, keine Cap). */
export type CutMode = 'slice' | 'hide'

/** Maximaler Betrag der Schnittposition (deckt den Kopf ab). */
export const CUT_POS_MAX = 110

export function clampCutPosition(value: number): number {
  return Math.max(-CUT_POS_MAX, Math.min(CUT_POS_MAX, value))
}

// Schnittebenen-Normalen im Viewer-Raum (+X=links, +Y=superior, +Z=anterior).
export function axisNormal(axis: CutCapAxis): Vector3 {
  if (axis === 'sagittal') return new Vector3(1, 0, 0) // X (L/R)
  if (axis === 'coronal') return new Vector3(0, 0, 1) // Z (anterior/posterior)
  return new Vector3(0, 1, 0) // Y (superior/inferior)
}

/** Plane fuer eine Achse + Position (sichtbar bleibt die Seite in Normalen-Richtung). */
export function cutPlaneFor(axis: CutCapAxis, position: number): Plane {
  return new Plane(axisNormal(axis), -position)
}

/** Alle aktiven Schnittebenen aus dem Multi-Axis-Cut-Zustand (leer = kein Schnitt). */
export function activeCutPlanes(cuts: Record<CutAxis, CutConfig>): Plane[] {
  const out: Plane[] = []
  for (const axis of CUT_AXES) {
    if (cuts[axis].on) out.push(cutPlaneFor(axis, cuts[axis].pos))
  }
  return out
}

const _slabBox = new Box3()
/**
 * Ausblenden-Modus: true, wenn die Mesh-BoundingBox vollstaendig hinter mindestens einer
 * aktiven Ebene liegt (auch der vorderste BB-Punkt auf der negativen Seite). Schneidende oder
 * davorliegende Meshes bleiben sichtbar. Die Cut-Ebenen sind achsen-ausgerichtet, daher genuegt
 * der Vergleich der beiden BB-Extrempunkte.
 */
export function isHiddenByCutSlab(mesh: Mesh, cuts: Record<CutAxis, CutConfig>): boolean {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  const bb = mesh.geometry.boundingBox
  if (!bb) return false
  if (mesh.matrixWorldNeedsUpdate) mesh.updateMatrixWorld(true)
  _slabBox.copy(bb).applyMatrix4(mesh.matrixWorld)
  for (const axis of CUT_AXES) {
    if (!cuts[axis].on) continue
    const plane = cutPlaneFor(axis, cuts[axis].pos)
    if (Math.max(plane.distanceToPoint(_slabBox.min), plane.distanceToPoint(_slabBox.max)) < 0) {
      return true
    }
  }
  return false
}

/** Deterministischer Schluessel fuer Early-Exit in setPlanes (keine redundanten Rebuilds). */
export function cutCapsPlanesSignature(
  planesByAxis: Partial<Record<CutCapAxis, Plane | null>>,
): string {
  const axes: readonly CutCapAxis[] = ['sagittal', 'coronal', 'axial']
  return axes
    .map((axis) => {
      const pl = planesByAxis[axis]
      if (!pl) return 'off'
      const n = pl.normal
      return `${n.x.toFixed(7)},${n.y.toFixed(7)},${n.z.toFixed(7)},${pl.constant.toFixed(5)}`
    })
    .join('|')
}

export interface CutCapsMergedOptions {
  scene: Object3D
  // Source-Meshes: bei aktiven Schnitten renderOrder=MESH_RENDER_ORDER, damit
  // die Caps zuerst fertig sind und nicht uebermalt werden.
  getSourceMeshes: () => readonly Mesh[]
}

interface PoolUnit {
  stencilBack: Mesh
  stencilFront: Mesh
  cap: Mesh
  matBack: MeshBasicMaterial
  matFront: MeshBasicMaterial
  capMat: MeshBasicMaterial
  srcMesh: Mesh | null
}

export class CutCapsMerged {
  private readonly _scene: Object3D
  private readonly _getSourceMeshes: () => readonly Mesh[]
  private readonly _capGeom: PlaneGeometry
  private _pool: PoolUnit[] = []
  private _activeUnits: PoolUnit[] = []
  private _lastPlanes: Record<CutCapAxis, Plane | null> = {
    sagittal: null,
    coronal: null,
    axial: null,
  }
  private readonly _box3 = new Box3()
  private readonly _vec3 = new Vector3()
  private _lastPlanesSig = ''

  constructor({ scene, getSourceMeshes }: CutCapsMergedOptions) {
    this._scene = scene
    this._getSourceMeshes = getSourceMeshes
    this._capGeom = new PlaneGeometry(CAP_PLANE_SIZE, CAP_PLANE_SIZE)
  }

  setPlanes(planesByAxis: Partial<Record<CutCapAxis, Plane | null>>): void {
    this._lastPlanes = {
      sagittal: planesByAxis.sagittal ?? null,
      coronal: planesByAxis.coronal ?? null,
      axial: planesByAxis.axial ?? null,
    }

    const allActive: Array<{ axis: CutCapAxis; plane: Plane }> = []
    for (const axis of ['sagittal', 'coronal', 'axial'] as const) {
      const plane = this._lastPlanes[axis]
      if (plane) allActive.push({ axis, plane })
    }

    const sig = cutCapsPlanesSignature(planesByAxis)
    if (sig === this._lastPlanesSig) return
    this._lastPlanesSig = sig

    this._returnAllToPool()
    const sourceMeshes = this._getSourceMeshes()
    this._setSourceMeshRenderOrder(allActive.length > 0 ? MESH_RENDER_ORDER : 0, sourceMeshes)
    if (allActive.length === 0) return

    let roCounter = STENCIL_RENDER_ORDER_BASE
    for (const { axis, plane } of allActive) {
      const otherPlanes = allActive.filter((x) => x.axis !== axis).map((x) => x.plane)
      for (const m of sourceMeshes) {
        if (!m.visible || !m.geometry) continue
        if (!this._intersectsPlane(m, plane)) continue
        const unit = this._acquireUnit(m, plane, otherPlanes, roCounter)
        this._activeUnits.push(unit)
        roCounter += 2
      }
    }
  }

  /** Caps neu aufbauen (z.B. nach Mesh-Visibility-Aenderung bei gleichen Ebenen). */
  refresh(): void {
    this._lastPlanesSig = ''
    this.setPlanes(this._lastPlanes)
  }

  /**
   * Cap-Faerbung an Auswahl/Animation/Hover koppeln — gleiche Prioritaet wie die Source-Meshes:
   * selektiert/hervorgehoben (Select-Farbe) vor Hover vor Mesh-Basisfarbe.
   */
  syncHighlight(
    selectedSlugs: ReadonlySet<string>,
    highlight: readonly string[],
    hoveredName: string | null,
  ): void {
    const highlightSet = highlight.length ? new Set(highlight) : null
    for (const unit of this._activeUnits) {
      const src = unit.srcMesh
      if (!src) continue
      const name = src.name
      if (selectedSlugs.has(name) || highlightSet?.has(name)) {
        unit.capMat.color.set(CAP_SELECT_COLOR)
      } else if (name === hoveredName) {
        unit.capMat.color.set(CAP_HOVER_COLOR)
      } else {
        const c = readMeshColor(src)
        if (c) unit.capMat.color.copy(c)
      }
    }
  }

  dispose(): void {
    this._lastPlanesSig = ''
    const sourceMeshes = this._getSourceMeshes()
    this._setSourceMeshRenderOrder(0, sourceMeshes)
    this._returnAllToPool()
    for (const u of this._pool) this._disposeUnit(u)
    this._pool = []
    this._capGeom.dispose()
  }

  private _intersectsPlane(mesh: Mesh, plane: Plane): boolean {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    if (!bb) return false
    // Nur nachruecken wenn Three die Matrix noch nicht propagiert hat (spart eine
    // teure Hierarchy-Walk pro Mesh bei jedem Schnitt-Rebuild).
    if (mesh.matrixWorldNeedsUpdate) mesh.updateMatrixWorld(true)
    this._box3.copy(bb).applyMatrix4(mesh.matrixWorld)
    const d1 = plane.distanceToPoint(this._box3.min)
    const d2 = plane.distanceToPoint(this._box3.max)
    return d1 * d2 <= 0 || Math.abs(d1) < PLANE_TOLERANCE_MM || Math.abs(d2) < PLANE_TOLERANCE_MM
  }

  private _acquireUnit(
    mesh: Mesh,
    myPlane: Plane,
    otherPlanes: readonly Plane[],
    ro: number,
  ): PoolUnit {
    const unit = this._pool.pop() ?? this._createUnit()
    unit.srcMesh = mesh

    unit.stencilBack.geometry = mesh.geometry
    unit.stencilFront.geometry = mesh.geometry
    if (mesh.matrixWorldNeedsUpdate) mesh.updateMatrixWorld(true)
    unit.stencilBack.matrixWorld.copy(mesh.matrixWorld)
    unit.stencilBack.matrixAutoUpdate = false
    unit.stencilFront.matrixWorld.copy(mesh.matrixWorld)
    unit.stencilFront.matrixAutoUpdate = false

    unit.matBack.clippingPlanes = [myPlane]
    unit.matFront.clippingPlanes = [myPlane]
    unit.capMat.clippingPlanes = [...otherPlanes]

    const c = readMeshColor(mesh)
    if (c) unit.capMat.color.copy(c)

    unit.stencilBack.renderOrder = ro
    unit.stencilFront.renderOrder = ro
    unit.cap.renderOrder = ro + 1
    unit.cap.userData.cutCapSourceName = mesh.name
    unit.cap.userData.atlasCapSource = mesh.userData.atlasCapSource === true

    unit.stencilBack.visible = true
    unit.stencilFront.visible = true
    unit.cap.visible = true

    this._alignCap(unit.cap, myPlane)
    return unit
  }

  private _createUnit(): PoolUnit {
    const matBack = new MeshBasicMaterial({
      depthWrite: false,
      depthTest: false,
      colorWrite: false,
      stencilWrite: true,
      stencilFunc: AlwaysStencilFunc,
      side: BackSide,
      stencilFail: IncrementWrapStencilOp,
      stencilZFail: IncrementWrapStencilOp,
      stencilZPass: IncrementWrapStencilOp,
      clippingPlanes: [],
    })
    const matFront = matBack.clone()
    matFront.side = FrontSide
    matFront.stencilFail = DecrementWrapStencilOp
    matFront.stencilZFail = DecrementWrapStencilOp
    matFront.stencilZPass = DecrementWrapStencilOp

    const noopRaycast = () => {}
    const stencilBack = new Mesh(undefined, matBack)
    const stencilFront = new Mesh(undefined, matFront)
    stencilBack.raycast = noopRaycast
    stencilFront.raycast = noopRaycast
    stencilBack.frustumCulled = false
    stencilFront.frustumCulled = false
    stencilBack.visible = false
    stencilFront.visible = false
    stencilBack.userData[CUT_CAP_HELPER_FLAG] = true
    stencilFront.userData[CUT_CAP_HELPER_FLAG] = true

    const capMat = new MeshBasicMaterial({
      side: DoubleSide,
      clippingPlanes: [],
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: NotEqualStencilFunc,
      stencilFail: ReplaceStencilOp,
      stencilZFail: ReplaceStencilOp,
      stencilZPass: ReplaceStencilOp,
    })
    const cap = new Mesh(this._capGeom, capMat)
    cap.raycast = noopRaycast
    cap.frustumCulled = false
    cap.visible = false
    cap.userData[CUT_CAP_HELPER_FLAG] = true
    cap.onAfterRender = (renderer: WebGLRenderer) => renderer.clearStencil()

    this._scene.add(stencilBack)
    this._scene.add(stencilFront)
    this._scene.add(cap)

    return { stencilBack, stencilFront, cap, matBack, matFront, capMat, srcMesh: null }
  }

  private _returnAllToPool(): void {
    for (const u of this._activeUnits) {
      u.stencilBack.visible = false
      u.stencilFront.visible = false
      u.cap.visible = false
      delete u.cap.userData.cutCapSourceName
      delete u.cap.userData.atlasCapSource
      u.srcMesh = null
      if (this._pool.length < MAX_POOL) this._pool.push(u)
      else this._disposeUnit(u)
    }
    this._activeUnits = []
  }

  private _alignCap(cap: Mesh, plane: Plane): void {
    plane.coplanarPoint(cap.position)
    this._vec3.copy(cap.position).add(plane.normal)
    cap.lookAt(this._vec3)
  }

  private _setSourceMeshRenderOrder(order: number, meshes: readonly Mesh[]): void {
    for (const m of meshes) m.renderOrder = order
  }

  private _disposeUnit(u: PoolUnit): void {
    this._scene.remove(u.stencilBack)
    this._scene.remove(u.stencilFront)
    this._scene.remove(u.cap)
    u.matBack.dispose()
    u.matFront.dispose()
    u.capMat.dispose()
  }
}

function readMeshColor(mesh: Mesh): Color | null {
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  return (mat as { color?: Color } | undefined)?.color ?? null
}
