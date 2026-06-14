# Wissenschaftliche MNI152 -> TARO Registrierung (eine globale Affine), abgeleitet aus anatomischen
# Struktur-Korrespondenzen ueber das GANZE Hirn — inkl. posteriorer Fossa (Cerebellum + Hirnstamm), damit
# NICHT ins Cerebellum extrapoliert wird (das war der Fehler der cortex-only-Affine).
#
# Quelle MNI: CerebrA-Atlas (MNI152NLin2009cSym, templateflow) — benannte Gyri + Subkortex + Cerebellum +
# Hirnstamm. Ziel: TARO-Struktur-Centroide (brain.glb). Korrespondenz: gleiche benannte Strukturen.
import json
import re
import numpy as np
import nibabel as nib
from pathlib import Path

HERE = Path(__file__).parent
WORK = HERE / "work"
TF = Path.home() / "Library/Caches/templateflow/tpl-MNI152NLin2009cSym"


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    dseg = nib.load(TF / "tpl-MNI152NLin2009cSym_res-1_atlas-CerebrA_dseg.nii.gz")
    data = np.asarray(dseg.dataobj)
    aff = dseg.affine
    rows = {}
    for r in (TF / "tpl-MNI152NLin2009cSym_atlas-CerebA_dseg.tsv").read_text().splitlines()[1:]:
        c = r.split("\t")
        if len(c) < 3 or not c[0].isdigit():
            continue
        rows[int(c[0])] = (c[1].strip(), c[2].strip())

    def cen(ids, xfilter=None):
        m = np.isin(data, ids)
        if m.sum() < 5:
            return None
        xs, ys, zs = np.where(m)
        w = (aff[:3, :3] @ np.c_[xs, ys, zs].T).T + aff[:3, 3]
        if xfilter == "l":
            w = w[w[:, 0] < 0]
        elif xfilter == "r":
            w = w[w[:, 0] > 0]
        return w.mean(0) if len(w) else None

    # CerebrA: per-Region (norm-name, side) -> centroid (MNI)
    cer = {}
    for lid, (nm, hemi) in rows.items():
        cc = cen([lid])
        if cc is None:
            continue
        side = "l" if hemi == "L" else "r" if hemi == "R" else ""
        cer[(norm(nm), side)] = cc

    # TARO: (norm-core, side) -> centroid
    taro = json.loads((WORK / "taro_centroids.json").read_text())
    tn = {}
    for nm, c in taro.items():
        s = "l" if nm.startswith("left-") else "r" if nm.startswith("right-") else ""
        core = re.sub(r"^(left|right)-", "", nm)
        tn[(norm(core), s)] = np.asarray(c, float)

    src, dst, used = [], [], []
    # 1) kortikale/subkortikale Matches: exakt-norm ODER Substring (gleiche Seite)
    for (cn, cs), cc in cer.items():
        if any(t in cn for t in ["ventricle", "csf", "vessel"]):
            continue
        hit = None
        if (cn, cs) in tn:
            hit = tn[(cn, cs)]
        else:
            for (tnm, ts), tc in tn.items():
                if ts == cs and (cn in tnm or tnm in cn) and len(cn) >= 5:
                    hit = tc
                    break
        if hit is not None:
            src.append(cc); dst.append(hit); used.append(f"{cn}/{cs}")

    # 2) Posteriore Fossa als Anker (das Entscheidende): Cerebellum L/R + Hirnstamm.
    cb_ids = [lid for lid, (nm, _) in rows.items() if any(t in nm.lower() for t in ["cerebellum", "vermal", "vermis"])]
    bs_ids = [lid for lid, (nm, _) in rows.items() if "brainstem" in nm.lower()]
    # TARO Cerebellum-Centroide (aus brain.glb-Namen), L/R per x-Vorzeichen
    CB = re.compile(r"cerebell|vermis|flocc|tonsil|culmen|declive|uvula|pyramis|nodul|lingula|dentate")
    BS = re.compile(r"midbrain|mesencephal|\bpons\b|medullaoblongata|tegment|tectum|colliculus|peduncle|substantianigra|rednucleus|brainstem")
    VESS = re.compile(r"vein|artery|sinus|venous|arter")
    tcb = np.array([c for nm, c in taro.items() if CB.search(norm(nm))])
    tbs = np.array([c for nm, c in taro.items() if BS.search(norm(nm)) and not VESS.search(norm(nm))])
    for side, xf in [("l", "l"), ("r", "r")]:
        cc = cen(cb_ids, xf)
        tt = tcb[tcb[:, 0] < 0] if side == "l" else tcb[tcb[:, 0] > 0]
        if cc is not None and len(tt):
            src.append(cc); dst.append(tt.mean(0)); used.append(f"cerebellum/{side}")
    bc = cen(bs_ids)
    if bc is not None and len(tbs):
        src.append(bc); dst.append(tbs.mean(0)); used.append("brainstem")

    src, dst = np.asarray(src), np.asarray(dst)
    # Affine (kleinste Quadrate, 3x4): dst ~= [src,1] @ A
    X = np.hstack([src, np.ones((len(src), 1))])
    A, *_ = np.linalg.lstsq(X, dst, rcond=None)
    resid = np.linalg.norm(X @ A - dst, axis=1)
    print(f"MNI152->TARO Affine aus {len(src)} Korrespondenzen:")
    print(f"  Residuen mean {resid.mean():.1f}  median {np.median(resid):.1f}  max {resid.max():.1f} mm")
    for nm, rr in sorted(zip(used, resid), key=lambda x: -x[1])[:6]:
        print(f"   {rr:5.1f}  {nm}")
    cbres = [rr for nm, rr in zip(used, resid) if "cerebellum" in nm or "brainstem" in nm]
    print(f"  posteriore Fossa Residuen: {[round(x, 1) for x in cbres]}")
    (WORK / "atlas_affine_mni_to_taro.json").write_text(json.dumps(A.tolist()))
    print(f"  -> work/atlas_affine_mni_to_taro.json")


if __name__ == "__main__":
    main()
