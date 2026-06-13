# Korrespondenz-getriebener RBF-Warp des Roh-Atlas auf TARO — die saubere non-rigide Methode.
# Wir haben ANATOMISCHE KORRESPONDENZ (Carve-Patches): jede Parzelle weiss, wo sie auf TARO sitzt.
# Schritt 1: globale Korrespondenz-Affine (work/atlas_overlay_transform: korrekt orientiert).
# Schritt 2: RBF/Thin-Plate-Warp, der jede affine-ausgerichtete Parzelle exakt auf ihr Carve-Ziel
#   (work/atlas_carve_centroids) zieht und dazwischen GLATT interpoliert -> Gyri landen, wo der Carve
#   sie hinlegt. Korrespondenz-getrieben -> KEIN Blob-Matching, KEIN Flip, kein CPD-O(M^3).
# Hartes Anatomie-Gate (Frontalpol anterior etc.). Schreibt work/<source>_parcels_warped.json.
# Aufruf: ./.venv/bin/python warp_overlay.py <julich|dkt> [sigma_mm] [lambda]
import json
import sys
import numpy as np
from pathlib import Path
from scipy.spatial import cKDTree
from scipy.spatial.distance import cdist

WORK = Path(__file__).parent / "work"
source = sys.argv[1] if len(sys.argv) > 1 else "julich"
SIGMA = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0   # RBF-Breite mm (gross=glatter)
LAM = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5      # Regularisierung (gross=steifer)

parcels = json.loads((WORK / f"{source}_parcels.json").read_text())
hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())
carve = json.loads((WORK / f"atlas_carve_centroids_{source}.json").read_text())

# BASIS = Procrustes/Umeyama-Similarity (Rotation + uniforme Skalierung + Translation, KEIN Flip)
# ueber die Korrespondenz MNI-Centroid -> Carve-Centroid. Dediziert die Rotations-DOF rein der
# Orientierung -> nagelt den Tilt (TARO ist ~13.5deg gekippt, MNI Z-geflippt) exakt, statt ihn wie
# die allgemeine Affine gegen Scherung zu vertauschen (die ~5deg Rest-Tilt liess).
names = [n for n in parcels if n in carve]
src_mni = np.array([np.asarray(parcels[n]["vertices"], float).mean(0) for n in names])
dst = np.array([carve[n] for n in names])
K = len(names)


def umeyama(s, d):  # d ~= scale*R@s + tt ; SVD, ohne Reflexion
    mus, mud = s.mean(0), d.mean(0)
    Sc, Dc = s - mus, d - mud
    H = Sc.T @ Dc / len(s)
    U, D, Vt = np.linalg.svd(H)
    W = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        W[2, 2] = -1
    R = Vt.T @ W @ U.T
    var = (Sc ** 2).sum() / len(s)
    scale = np.trace(np.diag(D) @ W) / var
    tt = mud - scale * R @ mus
    return scale, R, tt


scale, R, tt = umeyama(src_mni, dst)
B = (scale * R).T  # v' = v @ B + tt  (Zeilenvektor-Konvention)
t = tt
print(f"{source}: Procrustes-Basis scale={scale:.3f}, det(R)={np.linalg.det(R):.2f}")


def affine(P):
    return np.atleast_2d(P) @ B + t


# Korrespondenz-Paare fuer den RBF-Warp: src = Procrustes-ausgerichteter Centroid, dst = Carve.
src = affine(src_mni)
print(f"{source}: RBF-Warp ueber {K} Korrespondenzen (sigma={SIGMA}, lambda={LAM})")

# RBF-Interpolation der Verschiebung disp = dst - src. Gauss-Kernel + Tikhonov-Regularisierung.
disp = dst - src
Phi = np.exp(-cdist(src, src, "sqeuclidean") / (2 * SIGMA ** 2))  # (K,K)
Wts = np.linalg.solve(Phi + LAM * np.eye(K), disp)  # (K,3)


def warp(P):  # affine-ausgerichtete Punkte -> + RBF-Verschiebung (gechunkt)
    out = np.empty_like(P)
    for i in range(0, len(P), 20000):
        c = P[i:i + 20000]
        G = np.exp(-cdist(c, src, "sqeuclidean") / (2 * SIGMA ** 2))
        out[i:i + 20000] = c + G @ Wts
    return out


# ANATOMIE-GATE.
def probe(sub):
    ks = [k for k in names if sub in k.lower()]
    return warp(affine(np.asarray(parcels[ks[0]]["vertices"], float).mean(0)))[0] if ks else None


fp = probe("fp1-fpole-l") if source == "julich" else probe("superiorfrontal-l")
v1 = probe("hoc1") if source == "julich" else probe("lateraloccipital-l")
lh = probe("44-ifg-l") if source == "julich" else probe("parsopercularis")
print(f"  Gate: Frontalpol-Z={fp[2]:.0f}, V1-Z={'n/a' if v1 is None else round(v1[2])}, links-X={lh[0]:.0f}")
if not (fp[2] > 20 and (v1 is None or v1[2] < 0) and lh[0] > 0):
    raise SystemExit("ABBRUCH: Anatomie-Gate verletzt — Warp NICHT geschrieben.")

# Korrespondenz-Residuum (wie nah landet jede Parzelle an ihrem Carve-Ziel?).
warped_ctrl = warp(src)
ctrl_res = np.linalg.norm(warped_ctrl - dst, axis=1)
print(f"  Korrespondenz-Residuum: Median {np.median(ctrl_res):.1f} mm, P90 {np.percentile(ctrl_res,90):.1f} mm")

# Warp anwenden + schreiben.
warped = {}
for name, g in parcels.items():
    vw = warp(affine(np.asarray(g["vertices"], float)))
    warped[name] = {"vertices": vw.round(3).tolist(), "faces": g["faces"]}
(WORK / f"{source}_parcels_warped.json").write_text(json.dumps(warped))
print(f"  -> work/{source}_parcels_warped.json")
