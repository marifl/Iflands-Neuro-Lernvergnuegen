# Subkortex-Bake (S-2): Basalganglien + Thalamus als separate Solid-Meshes neben der
# fsaverage-Kortexoberflaeche (Kapitel 11: PFC + BG). Quelle + Frame in S-1 verifiziert:
# Harvard-Oxford Subcortical (FSL), MNI152 1mm. Marching Cubes -> Voxel->MNI-mm via Affine
# -> Laplacian-Smoothing -> Vertex-Normalen -> kompakte Binaer-Assets + Manifest-Sektion.
#
# Frame-Beleg (S-1): Kern-Zentroide anatomisch korrekt (Caudate z~+11, Putamen x~+-25,
# Thalamus zentral), 100% der Kern-Vertices INNERHALB der fsaverage-pial-Huelle.
# Fail-loud: leere Maske / leeres Mesh / Normalen-Mismatch bricht hart ab. Kein Skip.
import json
from pathlib import Path

import numpy as np
import trimesh
from nilearn import datasets
from scipy.spatial import Delaunay
from skimage import measure

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps/brain-app/public/assets/atlas-canonical"
OUT.mkdir(parents=True, exist_ok=True)

# Kapitel-11-Kerne: HO-Label-IDs (L, R), feste Farbe (gleiche L/R), deutscher Name.
NUCLEI = {
    "thalamus":  {"L": 4,  "R": 15, "color": [210, 90, 90],  "name_de": "Thalamus"},
    "caudate":   {"L": 5,  "R": 16, "color": [90, 170, 210], "name_de": "Nucleus caudatus"},
    "putamen":   {"L": 6,  "R": 17, "color": [230, 150, 70], "name_de": "Putamen"},
    "pallidum":  {"L": 7,  "R": 18, "color": [160, 110, 200], "name_de": "Pallidum (Globus pallidus)"},
    "accumbens": {"L": 11, "R": 21, "color": [110, 200, 120], "name_de": "Nucleus accumbens"},
}
SMOOTH_ITERS = 8


def write_f32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<f4").tobytes())


def write_u32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<u4").tobytes())


def vox_to_mni(verts_vox, affine):
    homog = np.c_[verts_vox, np.ones(len(verts_vox))]
    return (affine @ homog.T).T[:, :3]


# Quelle laden (S-1: FSL Harvard-Oxford, MNI152 1mm)
print("Lade Harvard-Oxford sub-maxprob-thr25-1mm (MNI152)...")
ho = datasets.fetch_atlas_harvard_oxford("sub-maxprob-thr25-1mm")
img = ho.maps
data = np.asarray(img.dataobj)
affine = img.affine
print(f"  Volume {data.shape}, affine diag {np.diag(affine)[:3]}")

# pial-Huelle fuer Frame-Re-Check (S-1-Beleg reproduzieren)
pial = np.vstack([
    np.frombuffer((OUT / f"fsavg164_{h}_pial.f32").read_bytes(), dtype="<f4").reshape(-1, 3)
    for h in ("L", "R")
])
from scipy.spatial import ConvexHull
_hull = ConvexHull(pial)
_pial_hull = Delaunay(pial[_hull.vertices])


def mesh_nucleus(label_id, key):
    """Binaermaske -> Marching Cubes -> mm -> Smoothing -> (verts, faces, normals)."""
    mask = (data == label_id).astype(np.uint8)
    if mask.sum() == 0:
        raise SystemExit(f"ABBRUCH {key}: leere Maske fuer Label {label_id}")
    verts_vox, faces, _, _ = measure.marching_cubes(mask, level=0.5)
    verts_mm = vox_to_mni(verts_vox, affine)

    m = trimesh.Trimesh(vertices=verts_mm, faces=faces, process=False)
    trimesh.smoothing.filter_laplacian(m, iterations=SMOOTH_ITERS)

    verts = np.asarray(m.vertices, dtype=np.float32)
    fcs = np.asarray(m.faces, dtype=np.uint32)
    normals = np.asarray(m.vertex_normals, dtype=np.float32)

    if verts.shape[0] == 0:
        raise SystemExit(f"ABBRUCH {key}: 0 Verts nach Mesh")
    if fcs.shape[0] == 0:
        raise SystemExit(f"ABBRUCH {key}: 0 Faces nach Mesh")
    if normals.shape[0] != verts.shape[0]:
        raise SystemExit(f"ABBRUCH {key}: Normalen {normals.shape[0]} != Verts {verts.shape[0]}")
    return verts, fcs, normals


subcortical = []
print("\n=== Kerne backen ===")
for nuc_id, cfg in NUCLEI.items():
    for side in ("L", "R"):
        key = f"{nuc_id}_{side}"
        verts, faces, normals = mesh_nucleus(cfg[side], key)

        c = verts.mean(axis=0)
        lo, hi = verts.min(axis=0), verts.max(axis=0)
        inside_frac = (_pial_hull.find_simplex(verts) >= 0).mean()
        if inside_frac < 0.99:
            raise SystemExit(
                f"ABBRUCH {key}: nur {inside_frac*100:.1f}% Verts in pial-Huelle "
                f"(Frame-Fehler? Zentroid {c.round(1)})")

        write_f32(OUT / f"subcort_{nuc_id}_{side}.f32", verts)
        write_f32(OUT / f"subcort_{nuc_id}_{side}_norm.f32", normals)
        write_u32(OUT / f"subcort_{nuc_id}_{side}_faces.u32", faces.reshape(-1))

        subcortical.append({
            "id": nuc_id, "name_de": cfg["name_de"], "side": side, "color": cfg["color"],
            "verts": int(verts.shape[0]), "faces": int(faces.shape[0]),
            "pos": f"subcort_{nuc_id}_{side}.f32",
            "norm": f"subcort_{nuc_id}_{side}_norm.f32",
            "faces_file": f"subcort_{nuc_id}_{side}_faces.u32",
        })
        print(f"  {key:14s} verts={verts.shape[0]:5d} faces={faces.shape[0]:5d} "
              f"centroid=({c[0]:+6.1f},{c[1]:+6.1f},{c[2]:+6.1f}) "
              f"z[{lo[2]:+.0f},{hi[2]:+.0f}] innerhalb pial={inside_frac*100:.1f}%")

# Manifest erweitern (bestehende Felder NICHT anfassen)
manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text())
manifest["subcortical"] = subcortical
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

print(f"\n=== FERTIG === {len(subcortical)} Meshes (5 Kerne x L/R) -> {OUT}")
