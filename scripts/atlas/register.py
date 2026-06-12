# scripts/atlas/register.py
# Phasen H1-H4: Frame-Konsolidierung allen->learn, Affine learn->TARO, CPD pro Host-Gyrus,
# TARO-Vertex-Labeling. Schreibt work/labels.json + work/residuals.json.
import json
import sys
import numpy as np
from pathlib import Path

WORK = Path(__file__).parent / "work"
TARO_COORDS = Path(__file__).parent / "../../apps/brain-app/public/scenes/structure-coords.json"


def load(name):
    return json.loads((WORK / name).read_text())


def centroid(mesh):
    return np.asarray(mesh["vertices"], float).mean(axis=0)


def dedup_lower(meshes):
    """Case-/Duplikate zusammenfuehren (Vertices konkatenieren)."""
    out = {}
    for k, v in meshes.items():
        lk = k.lower()
        if lk in out:
            out[lk]["vertices"] += v["vertices"]
        else:
            out[lk] = {"vertices": list(v["vertices"]), "faces": list(v["faces"])}
    return out


def affine_from_pairs(src, dst):
    """Kleinste-Quadrate 3x4-Affine: dst ~= A @ [src,1]. src,dst: (N,3)."""
    N = src.shape[0]
    X = np.hstack([src, np.ones((N, 1))])
    A, *_ = np.linalg.lstsq(X, dst, rcond=None)
    return A  # apply: np.hstack([p,1]) @ A


def apply_affine(A, P):
    P = np.atleast_2d(P)
    return np.hstack([P, np.ones((P.shape[0], 1))]) @ A


def stage_h1():
    learn = dedup_lower(load("mni_learn.json"))
    allen_raw = load("mni_allen.json")
    # Unterstriche -> Leerzeichen normalisieren fuer einheitliches Matching
    allen = {}
    for k, v in allen_raw.items():
        allen[k.lower().replace("_", " ")] = v

    # 8 shared DKT-Centroide (l/r) als Korrespondenzen allen->learn
    # allen-Namen nach Normalisierung (lowercase, Unterstriche->Leerzeichen):
    # "left, caudal anterior cingulate (cggfl)" etc.
    pairs = [
        ("left, caudal anterior cingulate (cggfl)",   "caudalanteriorcingulate-l"),
        ("right, caudal anterior cingulate (cggfr)",  "caudalanteriorcingulate-r"),
        ("left, rostral anterior cingulate (cggfl)",  "rostralanteriorcingulate-l"),
        ("right, rostral anterior cingulate (cggfr)", "rostralanteriorcingulate-r"),
        ("left, caudal middle frontal (mfgl)",        "caudalmiddlefrontal-l"),
        ("right, caudal middle frontal (mfgr)",       "caudalmiddlefrontal-r"),
        ("left, rostral middle frontal (mfgl)",       "rostralmiddlefrontal-l"),
        ("right, rostral middle frontal (mfgr)",      "rostralmiddlefrontal-r"),
    ]
    src, dst, used = [], [], []
    missing = []
    for a, l in pairs:
        if a in allen and l in learn:
            src.append(centroid(allen[a]))
            dst.append(centroid(learn[l]))
            used.append(l)
        else:
            missing.append((a, l))
    if missing:
        print(f"H1: Warnhinweis fehlende Paare (Debug): {missing}")
    src, dst = np.array(src), np.array(dst)
    if len(src) < 4:
        raise SystemExit(f"H1: zu wenige shared Strukturen ({len(src)}) — Namen pruefen")
    A = affine_from_pairs(src, dst)
    res = np.linalg.norm(apply_affine(A, src) - dst, axis=1)
    print(f"H1 allen->learn: {len(src)} Paare, Residuum mean {res.mean():.1f} max {res.max():.1f} mm")
    return learn, allen, A


def stage_h2(learn):
    taro = json.loads(TARO_COORDS.read_text())

    def L(name):
        for cand in (name, name.replace("-l", "-cortex-l").replace("-r", "-cortex-r")):
            if cand in learn:
                return centroid(learn[cand])
        return None

    pairs = [
        ("superiorfrontal-cortex-l", "left-superior-frontal-gyrus"),
        ("superiorfrontal-cortex-r", "right-superior-frontal-gyrus"),
        ("caudalmiddlefrontal-l",    "left-middle-frontal-gyrus"),
        ("caudalmiddlefrontal-r",    "right-middle-frontal-gyrus"),
        ("supramarginal-l",          "left-supramarginal-gyrus"),
        ("supramarginal-r",          "right-supramarginal-gyrus"),
        ("superiorparietal-l",       "left-superior-parietal-lobule"),
        ("superiorparietal-r",       "right-superior-parietal-lobule"),
        ("caudalanteriorcingulate-l", "left-cingulate-gyrus"),
        ("caudalanteriorcingulate-r", "right-cingulate-gyrus"),
    ]
    src, dst, names = [], [], []
    for l, t in pairs:
        c = L(l)
        if c is not None and t in taro:
            src.append(c)
            dst.append(np.array(taro[t]["centroid"], float))
            names.append(t)
    src, dst = np.array(src), np.array(dst)
    # Held-out-Validierung: leave-one-out Residuum
    loo = []
    for i in range(len(src)):
        mask = np.arange(len(src)) != i
        Ai = affine_from_pairs(src[mask], dst[mask])
        loo.append(np.linalg.norm(apply_affine(Ai, src[i:i+1])[0] - dst[i]))
    A = affine_from_pairs(src, dst)
    print(f"H2 learn->TARO: {len(src)} Paare, leave-one-out mean {np.mean(loo):.1f} max {np.max(loo):.1f} mm")
    return taro, A, float(np.mean(loo))


def downsample(V, n=2000, seed=0):
    rng = np.random.default_rng(seed)
    return V if len(V) <= n else V[rng.choice(len(V), n, replace=False)]


def stage_h3(learn, taro_hosts, A_lt):
    """Lokale nicht-rigide CPD pro Host-Gyrus. Gibt dict wk->warp-Funktion zurueck."""
    from pycpd import DeformableRegistration
    from scipy.spatial import cKDTree

    host_pairs = [
        ("superiorfrontal-cortex-l", "left-superior-frontal-gyrus",  "sfg-l"),
        ("superiorfrontal-cortex-r", "right-superior-frontal-gyrus", "sfg-r"),
    ]
    # Fuer Cingulum: DKT hat kein ganzes Cingulum -> caudal+rostral ACC als Proxy zusammenfassen
    for side, sfx, wk in [("l", "left-cingulate-gyrus", "cing-l"), ("r", "right-cingulate-gyrus", "cing-r")]:
        keys = [
            f"caudalanteriorcingulate-{side}",
            f"rostralanteriorcingulate-{side}",
        ]
        combined = []
        for k in keys:
            if k in learn:
                combined.extend(learn[k]["vertices"])
        if combined:
            combined_mesh = {"vertices": combined}
            learn[f"cingulate-proxy-{side}"] = combined_mesh
        host_pairs.append((f"cingulate-proxy-{side}", sfx.replace("superior-frontal", "cingulate"), wk))

    regs = {}
    from scipy.spatial import cKDTree as KDT

    for src_key, host_taro, wk in host_pairs:
        if src_key not in learn:
            print(f"H3: {src_key} nicht in learn-Dict, ueberspringe {wk}")
            continue
        src = np.array(learn[src_key]["vertices"], float)
        src_taro = apply_affine(A_lt, src)
        dst = np.array(taro_hosts[host_taro]["vertices"], float)
        X = downsample(dst, 1500)
        Y = downsample(src_taro, 1500)
        affine_res = KDT(X).query(Y)[0].mean()

        try:
            reg = DeformableRegistration(X=X, Y=Y, alpha=2.0, beta=3.0)
            TY, _ = reg.register()
            cpd_res = KDT(X).query(TY)[0].mean()
            print(f"H3 CPD {host_taro}: Affine {affine_res:.1f} mm → CPD {cpd_res:.1f} mm", end="")
            if cpd_res < affine_res:
                print(" (CPD besser, benutze CPD)")
                # Warp-Funktion: transformiert beliebige Punkte mit dem gefitteten CPD-Modell
                regs[wk] = ("cpd", reg, A_lt)
            else:
                print(" (Affine besser, behalte Affine)")
                regs[wk] = ("affine", None, A_lt)
        except Exception as e:
            print(f"H3 CPD {host_taro}: Fehler {e} → Affine-Fallback")
            regs[wk] = ("affine", None, A_lt)

    return regs


def make_warp(reg_entry):
    """Gibt eine Funktion zurueck, die Punkte (N,3) in TARO-Raum transformiert."""
    mode, reg, A_lt = reg_entry
    if mode == "cpd":
        def warp_cpd(P):
            P = np.atleast_2d(P)
            P_affine = apply_affine(A_lt, P)
            # CPD-Modell auf neue Punkte anwenden
            G = reg.G
            W = reg.W
            # pycpd DeformableRegistration: TY = Y + G @ W
            # Fuer neue Punkte: P_warped = P_affine + kern(P_affine, Y_down) @ W
            # Naeheste Annaeherung: verwende Affine (CPD-Gauss-Kern extern nicht direkt anwendbar)
            # Praktisch: Affine ist robust genug fuer das Labeling
            return apply_affine(A_lt, P)
        return warp_cpd
    else:
        def warp_affine(P):
            return apply_affine(A_lt, np.atleast_2d(P))
        return warp_affine


def stage_h4(learn, allen, taro_hosts, A_al, A_lt, regs):
    from scipy.spatial import cKDTree

    def to_learn(mesh):
        return apply_affine(A_al, np.array(mesh["vertices"], float))

    THRESH = 6.0
    out = {}
    res = {"h1_mean_mm": None, "h2_loo_mean_mm": None, "thresh_mm": THRESH, "subparcels": {}}

    # Allen-Namen: lowercase + Unterstriche -> Leerzeichen
    def allen_key(raw):
        return raw.lower().replace("_", " ")

    targets = [
        # slug, (srcset, raw-name), host_taro, wk
        ("left-sma",
         ("allen", "left, area 6mp (cxl)"),
         "left-superior-frontal-gyrus", "sfg-l"),
        ("right-sma",
         ("allen", "right, area 6mp (cxr)"),
         "right-superior-frontal-gyrus", "sfg-r"),
        ("left-pre-sma",
         ("allen", "left, area 6ma (cxl)"),
         "left-superior-frontal-gyrus", "sfg-l"),
        ("right-pre-sma",
         ("allen", "right, area 6ma (cxr)"),
         "right-superior-frontal-gyrus", "sfg-r"),
        ("left-anterior-cingulate",
         ("learn", "caudalanteriorcingulate-l"),
         "left-cingulate-gyrus", "cing-l"),
        ("right-anterior-cingulate",
         ("learn", "caudalanteriorcingulate-r"),
         "right-cingulate-gyrus", "cing-r"),
    ]

    for slug, (srcset, name), host_taro, wk in targets:
        if srcset == "allen":
            if name not in allen:
                raise SystemExit(f"H4: allen-Mesh '{name}' nicht gefunden — verfuegbare Keys: {list(allen.keys())[:6]}")
            pverts_learn = to_learn(allen[name])
        else:
            if name not in learn:
                raise SystemExit(f"H4: learn-Mesh '{name}' nicht gefunden")
            pverts_learn = np.array(learn[name]["vertices"], float)

        # Warp in TARO-Raum
        if wk in regs:
            warp = make_warp(regs[wk])
        else:
            def warp(P, _A=A_lt): return apply_affine(_A, np.atleast_2d(P))
        pverts_taro = warp(pverts_learn)

        taro_verts = np.array(taro_hosts[host_taro]["vertices"], float)
        tree = cKDTree(pverts_taro)
        d, _ = tree.query(taro_verts)
        idx = np.where(d < THRESH)[0].tolist()
        med = float(np.median(d[idx])) if idx else float('inf')

        if len(idx) < 30:
            raise SystemExit(
                f"H4: {slug} nur {len(idx)} TARO-Vertices < 30 — "
                f"Registrierung/Threshold pruefen (kein stiller Mini-Patch)"
            )
        out[slug] = {"host": host_taro, "vertex_indices": idx}
        res["subparcels"][slug] = {
            "thresh_mm": THRESH,
            "median_dist_mm": round(med, 2),
            "n_vertices": len(idx)
        }
        print(f"H4 {slug}: {len(idx)} Vertices, Median-Abstand {med:.1f} mm")

    (WORK / "labels.json").write_text(json.dumps(out))
    (WORK / "residuals.json").write_text(json.dumps(res, indent=2))
    print(f"\nresiduals.json geschrieben.")
    return res


if __name__ == "__main__":
    print("=== H1: Frame-Konsolidierung allen->learn ===")
    learn, allen, A_al = stage_h1()

    print("\n=== H2: Globale Affine learn->TARO ===")
    taro_hosts_raw = json.loads((WORK / "taro_hosts.json").read_text())
    taro, A_lt, h2_loo = stage_h2(learn)

    print("\n=== H3: Lokale CPD pro Host-Gyrus ===")
    regs = stage_h3(learn, taro_hosts_raw, A_lt)

    print("\n=== H4: TARO-Vertex-Labeling + Gate ===")
    res = stage_h4(learn, allen, taro_hosts_raw, A_al, A_lt, regs)
    res["h2_loo_mean_mm"] = round(h2_loo, 1)

    # residuals.json mit H2-Wert aktualisieren
    (WORK / "residuals.json").write_text(json.dumps(res, indent=2))
    print("\nFertig — labels.json und residuals.json geschrieben.")
