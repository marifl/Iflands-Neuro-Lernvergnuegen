# OBSOLET (2026-06-14): Dieses Skript erzeugte das alte glatte volumetrische julich-brain.glb (v3.0.3, OHNE
# Furchen), das aus der App entfernt wurde. Ersetzt durch `build_watertight_atlas.py` (furchen-echte
# Pial-Patch-Shells, v3.1, alle 4 Atlanten -> atlas3d-*.glb). Nur fuer historische Referenz / die
# MNI152->TARO-Affine-Herleitung behalten. NICHT mehr ausfuehren (regeneriert eine geloeschte Datei).
#
# Watertight Julich-Brain-CORTEX erzeugen (Monorepo-Methode: volumetrische Segmentierung -> Marching-Cubes
# -> geschlossene Shell-Meshes). Die rohen Julich-Oberflaechen-Patches (julich3.glb) sind duenne offene
# Kortex-Baender (NICHT watertight); Marching-Cubes auf der binaeren Areal-Maske liefert pro Areal ein
# GESCHLOSSENES Mesh.
#
# Registrierung MNI152 -> TARO (echte Koordinatenraeume, keine Augenmass-Anpassung):
#   1) Affine aus Julich-Areal-Centroid-Korrespondenzen ueber die fsaverage-Bruecke (jedes Areal hat einen
#      Centroid auf fsaverage -> via validierter atlas_affine_fsavg_to_taro -> TARO-Zielposition; Quelle =
#      Centroid im MNI-MPM). Ausreisser-robuster Refit. ~4 mm Residuum.
#   2) Cortex-zu-Cortex rigider ICP gegen die TARO-Kortexoberflaeche (nur kortikale Meshes als Quelle).
# KEIN manueller Nudge/Tilt, KEINE Per-Struktur-Skalierung. Cerebellum/Hirnstamm bringt das Julich-Brain
# NICHT mit — die kommen aus TARO (das Julich-Brain liegt passgenau auf TARO).
#
# KEINE Decimation: zerstoert die Watertight-Eigenschaft. Web-Groesse stattdessen via Draco (draco_compress.mjs).
import json
import re
import numpy as np
from pathlib import Path

import register as R

HERE = Path(__file__).parent
WORK = HERE / "work"
ASSETS_CANON = HERE.parent.parent / "apps/brain-app/public/assets/atlas-canonical"
OUT_GLB = HERE.parent.parent / "apps/brain-app/public/assets/bodyparts3d/julich-brain.glb"
LOG = WORK / "julich_watertight.log"


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a") as f:
        f.write(msg + "\n")


def slugify(name):
    s = name.lower()
    side = "l" if re.search(r"\bleft\b|\bli\b", s) else ("r" if re.search(r"\bright\b|\bre\b", s) else "")
    s = re.sub(r"\b(left|right)\b", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return f"julich-{s}-{side}" if side else f"julich-{s}"


def name_code(name):
    """Area-Code aus dem Mesh-Namen (julich-area-45-ifg-r -> '45'); None fuer Nicht-Area (GapMap/Subkortex)."""
    m = re.match(r"julich-area-([a-z0-9]+)-", name)
    return m.group(1) if m else None


def fit_mni_to_taro(src_by_codeside):
    """Affine MNI152 -> TARO aus Julich-Areal-Centroid-Paaren (fsaverage-Bruecke).
    src_by_codeside: {(code, side): centroid_mni}. Ziel: fsaverage-Centroid -> fsavg->TARO-Affine."""
    A_ft = np.asarray(json.loads((WORK / "atlas_affine_fsavg_to_taro.json").read_text()))
    manifest = json.loads((ASSETS_CANON / "manifest.json").read_text())
    id2code = {}
    for k, e in manifest["lut"]["julich"].items():
        if k == "0":
            continue
        m = re.match(r"Area\s+([A-Za-z0-9]+)", e["name"])
        if m:
            id2code[int(k)] = m.group(1).lower()
    src, dst = [], []
    for side in ("left", "right"):
        s = "L" if side == "left" else "R"
        pial = np.frombuffer((ASSETS_CANON / f"fsavg164_{s}_pial.f32").read_bytes(), dtype=np.float32).reshape(-1, 3).astype(float)
        jul = np.frombuffer((ASSETS_CANON / f"fsavg164_{s}_julich.i16").read_bytes(), dtype=np.int16)
        for lid in np.unique(jul):
            code = id2code.get(int(lid))
            if code is None:
                continue
            key = (code, side[0])
            if key not in src_by_codeside:
                continue
            fs_centroid = pial[jul == lid].mean(axis=0)
            target = R.apply_affine(A_ft, np.atleast_2d(fs_centroid))[0]
            src.append(src_by_codeside[key])
            dst.append(target)
    src, dst = np.asarray(src), np.asarray(dst)
    A = R.affine_from_pairs(src, dst)
    resid = np.linalg.norm(R.apply_affine(A, src) - dst, axis=1)
    # Ausreisser-robuster Refit: schlechteste 15% Korrespondenzen verwerfen (grenzwertige Areale, die die
    # Rotation leicht ziehen) und neu fitten -> straffere Gesamtausrichtung.
    keep = resid <= np.percentile(resid, 85)
    A = R.affine_from_pairs(src[keep], dst[keep])
    r2 = np.linalg.norm(R.apply_affine(A, src[keep]) - dst[keep], axis=1)
    log(f"MNI->TARO Affine: {len(src)} Paare (roh mean {resid.mean():.1f} mm) -> robust {keep.sum()} Paare, mean {r2.mean():.1f} median {np.median(r2):.1f} max {r2.max():.1f} mm")
    return A


def main():
    import siibra
    from skimage import measure
    import trimesh
    LOG.write_text("")
    log("Lade Julich-Brain v3.0.3 MPM (MNI152, labelled) via siibra ...")
    mp = siibra.get_map(parcellation="julich 3.0.3", space="mni152", maptype="labelled")
    regions = list(mp.regions)
    log(f"Regionen in der Map: {len(regions)}")

    built = []  # (name, trimesh in MNI mm)
    src_by_codeside = {}
    skipped = 0
    for region in regions:
        # GapMaps bleiben drin: sie fuellen die "nicht-kartierten" Zwischenraeume zwischen den
        # zytoarchitektonischen Arealen — ohne sie haette die Kortexflaeche Loecher.
        try:
            vol = mp.fetch(region=region)
        except Exception as e:
            log(f"  SKIP {region}: fetch ({type(e).__name__})")
            skipped += 1
            continue
        data = np.asarray(vol.dataobj)
        affine = vol.affine
        mask = data > 0
        if mask.sum() < 30:
            skipped += 1
            continue
        xs, ys, zs = np.where(mask)
        pad = 3
        x0, x1 = max(xs.min() - pad, 0), xs.max() + pad + 1
        y0, y1 = max(ys.min() - pad, 0), ys.max() + pad + 1
        z0, z1 = max(zs.min() - pad, 0), zs.max() + pad + 1
        # ROHE gepaddete Maske -> Marching-Cubes liefert eine geschlossene Shell (kein binary_closing/
        # fill_holes: das blaehte die diffusen GapMaps massiv auf, ohne Watertight zu verbessern).
        sub = mask[x0:x1, y0:y1, z0:z1].astype(np.float32)
        try:
            verts, faces, _, _ = measure.marching_cubes(sub, level=0.5)
        except Exception as e:
            log(f"  SKIP {region}: marching_cubes ({type(e).__name__})")
            skipped += 1
            continue
        world = (affine[:3, :3] @ (verts + np.array([x0, y0, z0])).T).T + affine[:3, 3]  # MNI152 mm (RAS)
        mesh = trimesh.Trimesh(vertices=world, faces=faces, process=True)
        trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=-0.53, iterations=12)  # Voxel-Treppung glaetten
        name = slugify(region.name if hasattr(region, "name") else str(region))
        built.append((name, mesh))
        code = name_code(name)
        if code:
            side = "l" if name.endswith("-l") else ("r" if name.endswith("-r") else "")
            if side:
                src_by_codeside[(code, side)] = mesh.vertices.mean(axis=0)
        if len(built) % 40 == 0:
            log(f"  ... {len(built)} Meshes")
    log(f"Marching-Cubes fertig: {len(built)} Julich-Cortex-Meshes, {skipped} uebersprungen.")

    # --- MNI152 -> TARO: Affine (anatom. Korrespondenzen) + cortex-zu-cortex ICP. Keine Augenmass-Anpassung. ---
    A = fit_mni_to_taro(src_by_codeside)
    for name, mesh in built:
        mesh.vertices = R.apply_affine(A, mesh.vertices)
    hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())
    taro_pts = np.vstack([np.asarray(h["vertices"], float) for h in hosts.values()])
    # NUR kortikale Julich-Meshes als ICP-Quelle (Cortex-zu-Cortex). Subkortex (tief) gegen die TARO-
    # Cortex-AUSSENflaeche zu matchen wuerde die Rotation verzerren.
    SUBCX = re.compile(r"putamen|caudate|striatum|pallid|thalamus|accumbens|amygdala|hippocampus|subiculum|fup|gapmap")
    j_cx = np.vstack([m.vertices for n, m in built if not SUBCX.search(n)])
    j_sub = j_cx[:: max(1, len(j_cx) // 20000)]
    M, _, cost = trimesh.registration.icp(j_sub, taro_pts, reflection=False, scale=False, max_iterations=200, threshold=1e-7)
    ang = np.degrees(np.arccos(np.clip((np.trace(M[:3, :3]) - 1) / 2, -1, 1)))
    log(f"ICP Cortex->TARO: cost {cost:.2f}, Rotation {ang:.2f} Grad (rigid, voll-konvergiert)")
    for name, mesh in built:
        mesh.vertices = trimesh.transformations.transform_points(mesh.vertices, M)

    scene = trimesh.Scene()
    for name, mesh in built:
        scene.add_geometry(mesh, geom_name=name, node_name=name)
    OUT_GLB.write_bytes(scene.export(file_type="glb"))
    log(f"-> {OUT_GLB} ({OUT_GLB.stat().st_size // 1024} KB, {len(built)} Julich-Cortex-Meshes)")


if __name__ == "__main__":
    main()
