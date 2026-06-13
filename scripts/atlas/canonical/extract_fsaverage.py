# Kanonischer-Atlas-Extraktor (Phase-1-Spike): fsaverage5-Surface (pial+inflated) + Destrieux-Labels
# -> kompakte Binaer-Assets + LUT-JSON + Manifest fuer die WebGL-Runtime.
# Fail-loud: jede Inkonsistenz (Vertexzahl, fehlende Datei) bricht hart ab.
import json
from pathlib import Path
import numpy as np
from nilearn import datasets, surface

OUT = Path(__file__).resolve().parents[3] / "apps/brain-app/public/assets/atlas-canonical"
OUT.mkdir(parents=True, exist_ok=True)

fs = datasets.fetch_surf_fsaverage('fsaverage5')
des = datasets.fetch_atlas_surf_destrieux()

def write_f32(path, arr):
    arr = np.ascontiguousarray(arr, dtype='<f4')
    path.write_bytes(arr.tobytes())

def write_u32(path, arr):
    arr = np.ascontiguousarray(arr, dtype='<u4')
    path.write_bytes(arr.tobytes())

def write_i16(path, arr):
    arr = np.ascontiguousarray(arr, dtype='<i2')
    path.write_bytes(arr.tobytes())

manifest = {"space": "fsaverage5", "layers": ["destrieux"], "hemis": {}}

for hemi, pial_k, infl_k, map_k in [("L", "pial_left", "infl_left", "map_left"),
                                    ("R", "pial_right", "infl_right", "map_right")]:
    pcoords, faces = surface.load_surf_mesh(fs[pial_k])
    icoords, ifaces = surface.load_surf_mesh(fs[infl_k])
    labels = np.asarray(des[map_k]).astype(np.int16)
    if labels.min() < 0:
        raise SystemExit(f"ABBRUCH {hemi}: negative LabelId ({labels.min()}) — i16/LUT-Annahme verletzt")
    n = pcoords.shape[0]
    if not (icoords.shape[0] == n == labels.shape[0]):
        raise SystemExit(f"ABBRUCH {hemi}: Vertexzahl-Mismatch pial={n} infl={icoords.shape[0]} labels={labels.shape[0]}")
    if not np.array_equal(faces, ifaces):
        raise SystemExit(f"ABBRUCH {hemi}: pial/inflated teilen nicht dieselbe Topologie")
    write_f32(OUT / f"fsavg5_{hemi}_pial.f32", pcoords)
    write_f32(OUT / f"fsavg5_{hemi}_infl.f32", icoords)
    write_u32(OUT / f"fsavg5_{hemi}_faces.u32", faces.reshape(-1))
    write_i16(OUT / f"fsavg5_{hemi}_destrieux.i16", labels)
    manifest["hemis"][hemi] = {"verts": int(n), "faces": int(faces.shape[0]),
                               "pial": f"fsavg5_{hemi}_pial.f32", "infl": f"fsavg5_{hemi}_infl.f32",
                               "faces_file": f"fsavg5_{hemi}_faces.u32",
                               "labels": {"destrieux": f"fsavg5_{hemi}_destrieux.i16"}}

# LUT: labelId -> {rgb,name}. Destrieux-Namen sind bytes; ID = Index in labels-Liste.
names = [n.decode() if isinstance(n, bytes) else str(n) for n in des["labels"]]
rng = np.random.default_rng(42)
lut = {}
for i, nm in enumerate(names):
    if i == 0:  # 0 = Medial Wall / Unknown -> neutral grau, als "kein Label"
        lut[i] = {"rgb": [40, 40, 46], "name": "—", "medial": True}
    else:
        c = rng.integers(60, 230, size=3).tolist()
        lut[i] = {"rgb": c, "name": nm}
manifest["lut"] = {"destrieux": lut}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"OK -> {OUT} ({manifest['hemis']['L']['verts']} verts/Hemi, {len(names)} Destrieux-Labels)")
