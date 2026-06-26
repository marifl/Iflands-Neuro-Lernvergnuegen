/**
 * SpaceTransformGraph (9xGQeXYPZqS1, Description-Punkt 3).
 *
 * Deklariert die expliziten Transformketten zwischen den Brain-Spaces. Jede Kante
 * traegt Methode, Version und Residuum — kein stilles Umrechnen. Diese Slice liefert
 * nur die Graph-Struktur + Pfadfindung; die eigentlichen Koordinaten-Matrizen kommen
 * in der Pinpoint-Projektion (d1QSeLP9T2g7).
 *
 * Kanten sind bidirektional (Registrierungen/Affines sind invertierbar). Ein fehlender
 * Pfad oder ein unbekannter Raum wirft laut.
 */
import { BRAIN_SPACES, type BrainSpace } from './overlayContract'

export interface SpaceEdge {
  from: BrainSpace
  to: BrainSpace
  method: string
  version: string
  residualMm: number
}

const EDGES: readonly SpaceEdge[] = [
  { from: 'mni152', to: 'fsaverage', method: 'affine-mni2fs', version: '1.0', residualMm: 2.0 },
  { from: 'fsaverage', to: 'taro', method: 'surface-registration', version: '1.0', residualMm: 4.0 },
]

function assertKnownSpace(space: BrainSpace): void {
  if (!BRAIN_SPACES.includes(space)) {
    throw new Error(`SpaceTransformGraph: unbekannter Raum "${space}"`)
  }
}

/** Alle von `space` ausgehenden Kanten in beide Richtungen. */
function neighbors(space: BrainSpace): SpaceEdge[] {
  const out: SpaceEdge[] = []
  for (const e of EDGES) {
    if (e.from === space) out.push(e)
    else if (e.to === space) out.push({ ...e, from: e.to, to: e.from })
  }
  return out
}

/**
 * Kuerzeste Transformkette von `from` nach `to` (BFS). Leeres Array bei from === to
 * (Identitaet). Wirft laut bei unbekanntem Raum oder fehlendem Pfad.
 */
export function findTransformPath(from: BrainSpace, to: BrainSpace): SpaceEdge[] {
  assertKnownSpace(from)
  assertKnownSpace(to)
  if (from === to) return []

  const queue: BrainSpace[] = [from]
  const cameFrom = new Map<BrainSpace, SpaceEdge>()
  const visited = new Set<BrainSpace>([from])

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of neighbors(current)) {
      if (visited.has(edge.to)) continue
      visited.add(edge.to)
      cameFrom.set(edge.to, edge)
      if (edge.to === to) {
        const path: SpaceEdge[] = []
        let step: BrainSpace = to
        while (step !== from) {
          const e: SpaceEdge = cameFrom.get(step)!
          path.unshift(e)
          step = e.from
        }
        return path
      }
      queue.push(edge.to)
    }
  }

  throw new Error(`SpaceTransformGraph: kein Transformpfad von "${from}" nach "${to}"`)
}

/** Wirft, wenn keine Transformkette von `source` nach `target` existiert. */
export function assertSpaceCompatible(source: BrainSpace, target: BrainSpace): void {
  findTransformPath(source, target)
}
