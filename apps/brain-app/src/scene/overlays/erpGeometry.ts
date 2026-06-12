export type Point = [number, number] // [x, value]
export interface Box {
  w: number
  h: number
}

/** Skaliert ERP-Punkte in einen SVG-Viewport. x linear ueber Indexbereich, y invertiert (oben=Maximum). */
export function toPolyline(points: Point[], box: Box): [number, number][] {
  if (points.length === 0) throw new Error('toPolyline: keine Punkte')
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const y0 = Math.min(...ys)
  const y1 = Math.max(...ys)
  const sx = (x: number) => (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * box.w)
  const sy = (y: number) => (y1 === y0 ? box.h / 2 : ((y1 - y) / (y1 - y0)) * box.h)
  return points.map((p) => [sx(p[0]), sy(p[1])])
}
