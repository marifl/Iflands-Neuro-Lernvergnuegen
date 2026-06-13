# Pallidum-Subdivision GPe/GPi (CIT168 / Pauli 2017, MNI152) — ersetzt das grobe
# Harvard-Oxford-Pallidum (ein Label) durch die granulare GPe/GPi-Trennung, die Kapitel 11
# (BG-Schleife: Striatum -> GPe -> STN / GPi -> Thalamus) braucht.
#
# Quelle: nilearn fetch_atlas_pauli_2017('deterministic') = CIT168 (OSF, kein Auth).
# 0.7mm MNI152. GPe=Label 5, GPi=Label 6 (bilateral in einem Label -> per x-Vorzeichen
# in L/R gesplittet). Frame gegen fsaverage-pial verifiziert (100% Verts innerhalb Huelle,
# GPe lateral/dorsal, GPi medial/ventral — anatomisch korrekt, kohaerent mit HO-Pallidum).
#
# Pipeline wie extract_subcortex.py: Marching Cubes -> Voxel->MNI-mm -> Laplacian-Smoothing
# -> Vertex-Normalen -> Binaer-Assets. Manifest: 'pallidum'-Eintraege raus, 'gpe'/'gpi' rein.
# Fail-loud: leere Maske / leeres Mesh / Normalen-Mismatch / Frame-Fehler -> raise. Kein Skip.
import json
from pathlib import Path

import nibabel as nib
import numpy as np
import trimesh
from nilearn import datasets
from scipy.spatial import ConvexHull, Delaunay
from skimage import measure

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "apps/brain-app/public/assets/atlas-canonical"

# CIT168-Label-IDs + feste Farben (Pallidum-Familie, violett-Toene, distinkt L=R).
NUCLEI = {
    "gpe": {"label": 5, "color": [150, 100, 195], "name_de": "Globus pallidus externus (GPe)"},
    "gpi": {"label": 6, "color": [185, 130, 215], "name_de": "Globus pallidus internus (GPi)"},
}
SMOOTH_ITERS = 8


def write_f32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<f4").tobytes())


def write_u32(path, arr):
    path.write_bytes(np.ascontiguousarray(arr, dtype="<u4").tobytes())


def vox_to_mni(v, affine):
    return (affine @ np.c_[v, np.ones(len(v))].T).T[:, :3]


print("Lade CIT168 / Pauli 2017 (deterministic, MNI152)...")
det = datasets.fetch_atlas_pauli_2017(atlas_type="deterministic")
img = nib.load(det.maps)
data = np.asarray(img.dataobj)
affine = img.affine
print(f"  Volume {data.shape}, affine diag {np.diag(affine)[:3]}")

# pial-Huelle fuer Frame-Re-Check
pial = np.vstack([
    np.frombuffer((OUT / f"fsavg164_{h}_pial.f32").read_bytes(), dtype="<f4").reshape(-1, 3)
    for h in ("L", "R")
])
_hull = ConvexHull(pial)
_pial_hull = Delaunay(pial[_hull.vertices])


def smooth_normals(verts_mm, faces, key):
    m = trimesh.Trimesh(vertices=verts_mm, faces=faces, process=False)
    trimesh.smoothing.filter_laplacian(m, iterations=SMOOTH_ITERS)
    verts = np.asarray(m.vertices, dtype=np.float32)
    fcs = np.asarray(m.faces, dtype=np.uint32)
    normals = np.asarray(m.vertex_normals, dtype=np.float32)
    if verts.shape[0] == 0 or fcs.shape[0] == 0:
        raise SystemExit(f"ABBRUCH {key}: leeres Mesh ({verts.shape[0]} Verts, {fcs.shape[0]} Faces)")
    if normals.shape[0] != verts.shape[0]:
        raise SystemExit(f"ABBRUCH {key}: Normalen {normals.shape[0]} != Verts {verts.shape[0]}")
    return verts, fcs, normals


baked = []
print("\n=== GPe/GPi backen (je L/R per x-Vorzeichen gesplittet) ===")
for nuc_id, cfg in NUCLEI.items():
    mask = (data == cfg["label"]).astype(np.uint8)
    if mask.sum() == 0:
        raise SystemExit(f"ABBRUCH {nuc_id}: leere Maske fuer CIT168-Label {cfg['label']}")
    verts_vox, faces, _, _ = measure.marching_cubes(mask, level=0.5)
    mni = vox_to_mni(verts_vox, affine)

    # bilateral -> per x in L/R splitten. Faces je Seite neu (nur Faces, deren 3 Verts auf einer Seite).
    for side, vmask in [("L", mni[:, 0] < 0), ("R", mni[:, 0] >= 0)]:
        key = f"{nuc_id}_{side}"
        keep = np.where(vmask)[0]
        if keep.size == 0:
            raise SystemExit(f"ABBRUCH {key}: 0 Verts auf Seite {side}")
        remap = -np.ones(len(mni), dtype=np.int64)
        remap[keep] = np.arange(keep.size)
        fmask = np.all(vmask[faces], axis=1)
        side_faces = remap[faces[fmask]]
        side_verts = mni[keep]
        if side_faces.shape[0] == 0:
            raise SystemExit(f"ABBRUCH {key}: 0 Faces nach Seiten-Split")

        verts, fcs, normals = smooth_normals(side_verts, side_faces, key)

        c = verts.mean(axis=0)
        lo, hi = verts.min(axis=0), verts.max(axis=0)
        inside = (_pial_hull.find_simplex(verts) >= 0).mean()
        if inside < 0.99:
            raise SystemExit(f"ABBRUCH {key}: nur {inside*100:.1f}% Verts in pial-Huelle "
                             f"(Frame-Fehler? Zentroid {c.round(1)})")

        write_f32(OUT / f"subcort_{nuc_id}_{side}.f32", verts)
        write_f32(OUT / f"subcort_{nuc_id}_{side}_norm.f32", normals)
        write_u32(OUT / f"subcort_{nuc_id}_{side}_faces.u32", fcs.reshape(-1))

        baked.append({
            "id": nuc_id, "name_de": cfg["name_de"], "side": side, "color": cfg["color"],
            "verts": int(verts.shape[0]), "faces": int(fcs.shape[0]),
            "pos": f"subcort_{nuc_id}_{side}.f32",
            "norm": f"subcort_{nuc_id}_{side}_norm.f32",
            "faces_file": f"subcort_{nuc_id}_{side}_faces.u32",
        })
        print(f"  {key:8s} verts={verts.shape[0]:5d} faces={fcs.shape[0]:5d} "
              f"centroid=({c[0]:+5.1f},{c[1]:+5.1f},{c[2]:+5.1f}) "
              f"x[{lo[0]:+.0f},{hi[0]:+.0f}] z[{lo[2]:+.0f},{hi[2]:+.0f}] innerhalb pial={inside*100:.1f}%")

# Manifest: grobes Pallidum (HO) durch granulares GPe/GPi (CIT168) ersetzen.
manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text())
before = len(manifest["subcortical"])
manifest["subcortical"] = [e for e in manifest["subcortical"] if e["id"] != "pallidum"]
removed = before - len(manifest["subcortical"])
manifest["subcortical"].extend(baked)
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")

# Alte Pallidum-Assets entfernen (eigene Orphans)
for side in ("L", "R"):
    for suf in (".f32", "_norm.f32", "_faces.u32"):
        p = OUT / f"subcort_pallidum_{side}{suf}"
        if p.exists():
            p.unlink()

print(f"\n=== FERTIG === {len(baked)} GPe/GPi-Meshes; {removed} grobe Pallidum-Eintraege ersetzt.")
print(f"Subkortikale Eintraege jetzt: {len(manifest['subcortical'])}")
