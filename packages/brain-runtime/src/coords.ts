// Koordinaten-System-Mapping RAS <-> Three-native Y-up.
//
// Datenmodell bleibt in MNI152-ICBM-2009c-Asym RAS mm:
//   X = Right+, Y = Anterior+, Z = Superior+.
// Three-Welt ist Y-up. Assets werden beim Export per Rotation -90 Grad um
// X-Achse von RAS nach Welt konvertiert (scripts/alignment/build_mni152_pial.py,
// gage_fiducials.py, extract_mni_skin.py). Dieses Modul ist die Single Source
// of Truth fuer die inverse bzw. gleiche Transformation von Skalar-Koordinaten
// (Fiducials, Trajektorien, Kamera-Presets, Clipping-Plane-Normals).
//
// Invariante: rasToWorld und worldToRas sind exakt inverses zueinander,
// verifiziert per Round-Trip-Test in coords.test.ts.

export type Vec3 = [number, number, number];

// `-0` normalisiert zu `+0`, damit deep-equal-Asserts und Serialisierungen
// deterministisch bleiben. JSON.stringify(-0) === "0", toEqual(+0) != -0.
const norm = (v: number): number => (Object.is(v, -0) ? 0 : v);

/** RAS mm -> Three-Welt mm (Y-up). (x, y, z) -> (x, z, -y). */
export function rasToWorld([x, y, z]: Vec3): Vec3 {
  return [norm(x), norm(z), norm(-y)];
}

/** Three-Welt mm -> RAS mm. (x, y, z) -> (x, -z, y). */
export function worldToRas([x, y, z]: Vec3): Vec3 {
  return [norm(x), norm(-z), norm(y)];
}

/**
 * Transformiert einen Richtungs-Vektor (z.B. Clipping-Plane-Normale).
 * Identisch zu rasToWorld weil die Rotation linear und translations-frei ist.
 * Eigene Benennung fuer Lesbarkeit am Call-Site.
 */
export const rasDirToWorld = rasToWorld;
