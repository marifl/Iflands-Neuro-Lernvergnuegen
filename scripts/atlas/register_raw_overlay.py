# Oberflaechen-Affine fuer das Roh-Atlas-Overlay: fittet eine Affine Atlas-Surface -> TARO-Surface
# (CPD AffineRegistration, soft correspondence) statt der Zentroid-Affine aus register_atlas.py.
# Die Zentroid-Affine unterskaliert ein Roh-Overlay (~85% TARO), weil Gyrus-Zentroide eine kleinere
# Punktwolke bilden als die Oberflaeche. Diese Affine richtet Skalierung+Pose global an der
# TARO-Oberflaeche aus. Schreibt work/atlas_surface_affine_<source>.json {B, t}: v' = v @ B + t.
# Aufruf: ./.venv/bin/python register_raw_overlay.py <julich|dkt>
import json
import sys
import numpy as np
from pathlib import Path
from pycpd import AffineRegistration

WORK = Path(__file__).parent / "work"
source = sys.argv[1] if len(sys.argv) > 1 else "julich"

parcels = json.loads((WORK / f"{source}_parcels.json").read_text())
hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())


def all_points(d):
    pts = []
    for k in d:
        pts.extend(d[k]["vertices"])
    return np.asarray(pts, float)


def downsample(P, n=3000, seed=0):
    rng = np.random.default_rng(seed)
    return P if len(P) <= n else P[rng.choice(len(P), n, replace=False)]


atlas = all_points(parcels)  # Atlas-Surface (MNI-Frame)
taro = all_points(hosts)     # TARO-Surface (Render-Frame)
Y = downsample(atlas)
X = downsample(taro)
print(f"{source}: CPD Affine-Fit Atlas({len(Y)}) -> TARO({len(X)}) ...")

reg = AffineRegistration(X=X, Y=Y, max_iterations=200, tolerance=1e-5)
reg.register()
B, t = reg.B, reg.t  # TY = Y @ B + t

(WORK / f"atlas_surface_affine_{source}.json").write_text(json.dumps({"B": B.tolist(), "t": t.tolist()}))

# Qualitaet: bbox des voll-transformierten Atlas vs TARO + Nearest-Surface-Residuum.
TY = atlas @ B + t
print("  transformiert bbox:", TY.min(0).round(1).tolist(), "..", TY.max(0).round(1).tolist())
print("  TARO bbox:         ", taro.min(0).round(1).tolist(), "..", taro.max(0).round(1).tolist())
from scipy.spatial import cKDTree
d = cKDTree(downsample(taro, 5000)).query(downsample(TY, 5000))[0]
print(f"  Nearest-TARO-Surface Residuum: Median {np.median(d):.1f} mm, Mean {d.mean():.1f} mm, P90 {np.percentile(d,90):.1f} mm")
print(f"  -> work/atlas_surface_affine_{source}.json")
