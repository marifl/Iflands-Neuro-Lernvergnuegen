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


def load_targets():
    """Carve-Targets aus targets.json (slug/src/names/host/mode[/group/thresh_mm])."""
    cfg = json.loads((Path(__file__).parent / "targets.json").read_text())
    return cfg["targets"], float(cfg.get("default_thresh_mm", 6.0))


def stage_subcortical_affine(taro_hosts):
    """Dedizierte Affine MNI-Subkortex->TARO aus Striatum/Pallidum-Zentroiden. Die
    globale kortikal-gefittete Affine extrapoliert auf tiefe Strukturen katastrophal
    (~60mm), darum eine eigene Registrierung pro Subkortex (wie 6-Patch pro Host).
    Gibt (A_sub, loo_mean) zurueck oder (None, None) wenn mni_subcort.json fehlt."""
    sub_path = WORK / "mni_subcort.json"
    if not sub_path.exists():
        return None, None
    sub = json.loads(sub_path.read_text())
    pairs = [
        ("caudate-l", "left-caudate-nucleus"), ("caudate-r", "right-caudate-nucleus"),
        ("putamen-l", "left-putamen"), ("putamen-r", "right-putamen"),
        ("pallidum-l", "left-globus-pallidus"), ("pallidum-r", "right-globus-pallidus"),
    ]
    src, dst = [], []
    for a, b in pairs:
        if a not in sub:
            raise SystemExit(f"subcort: MNI-Mesh '{a}' fehlt in mni_subcort.json")
        if b not in taro_hosts:
            raise SystemExit(f"subcort: TARO-Host '{b}' fehlt in taro_hosts — globus-pallidus/putamen decoden")
        src.append(centroid(sub[a]))
        dst.append(centroid(taro_hosts[b]))
    src, dst = np.array(src), np.array(dst)
    loo = []
    for i in range(len(src)):
        mask = np.arange(len(src)) != i
        Ai = affine_from_pairs(src[mask], dst[mask])
        loo.append(np.linalg.norm(apply_affine(Ai, src[i:i+1])[0] - dst[i]))
    A = affine_from_pairs(src, dst)
    print(f"Subkortex-Affine: {len(src)} Paare, leave-one-out mean {np.mean(loo):.1f} max {np.max(loo):.1f} mm")
    return A, float(np.mean(loo))


def parcel_taro_vertices(target, learn, allen, A_al, A_to_taro):
    """Quell-Vertices einer Parzelle in den TARO-Raum warpen. allen-Quellen zuerst
    allen->learn (A_al), dann learn->TARO (A_to_taro). learn-Quellen sind schon im
    learn-Frame (gleiches GLB) -> nur A_to_taro. pars* etc. konkatenieren mehrere
    Quell-Meshes (dorsal/ventral). A_to_taro ist die globale Affine (Kortex) oder die
    Subkortex-Affine (warp='subcortical'). Lateraler Versatz wird im partition-Modus
    relativ aufgefangen."""
    src = target["src"]
    chunks = []
    for name in target["names"]:
        if src == "allen":
            if name not in allen:
                raise SystemExit(f"H4: allen-Mesh '{name}' fuer {target['slug']} nicht gefunden — Keys (Auszug): {list(allen.keys())[:6]}")
            v = apply_affine(A_al, np.array(allen[name]["vertices"], float))
        else:
            if name not in learn:
                raise SystemExit(f"H4: learn-Mesh '{name}' fuer {target['slug']} nicht gefunden — Keys (Auszug): {list(learn.keys())[:6]}")
            v = np.array(learn[name]["vertices"], float)
        chunks.append(np.atleast_2d(v))
    learn_frame = np.vstack(chunks)
    return apply_affine(A_to_taro, learn_frame)


def pick_warp(target, A_lt, A_sub):
    """Affine je Target waehlen: 'subcortical' -> A_sub (laut wenn fehlt), sonst global."""
    if target.get("warp") == "subcortical":
        if A_sub is None:
            raise SystemExit(f"H4: {target['slug']} verlangt warp=subcortical, aber Subkortex-Affine fehlt (mni_subcort.json?)")
        return A_sub
    return A_lt


def stage_h4(learn, allen, taro_hosts, A_al, A_lt, A_sub, targets, default_thresh):
    """Pro Target Host-Vertices labeln. absolute: innerhalb thresh_mm der gewarpten
    Parzelle. partition: alle Host-Vertices der naechsten Parzelle der group zuweisen
    (Within-Host-Split — robust gegen lateralen Affine-Versatz, da relativ)."""
    from scipy.spatial import cKDTree

    out = {}
    res = {"h1_mean_mm": None, "h2_loo_mean_mm": None, "default_thresh_mm": default_thresh, "subparcels": {}}

    for t in targets:
        if t["mode"] in ("absolute", "partition") and t["host"] not in taro_hosts:
            raise SystemExit(f"H4: TARO-Host '{t['host']}' fuer {t['slug']} fehlt in taro_hosts — decoden + mergen (kein stiller Skip)")

    # --- absolute-Modus (bestehende 6 Patches + accumbens) ---
    for t in targets:
        if t["mode"] != "absolute":
            continue
        thresh = float(t.get("thresh_mm", default_thresh))
        pverts_taro = parcel_taro_vertices(t, learn, allen, A_al, pick_warp(t, A_lt, A_sub))
        taro_verts = np.array(taro_hosts[t["host"]]["vertices"], float)
        d, _ = cKDTree(pverts_taro).query(taro_verts)
        idx = np.where(d < thresh)[0].tolist()
        if len(idx) < 30:
            raise SystemExit(
                f"H4: {t['slug']} (absolute) nur {len(idx)} TARO-Vertices < 30 bei thresh {thresh}mm — "
                f"Registrierung/Threshold pruefen (kein stiller Mini-Patch)"
            )
        med = float(np.median(d[idx]))
        out[t["slug"]] = {"host": t["host"], "vertex_indices": idx}
        res["subparcels"][t["slug"]] = {"mode": "absolute", "thresh_mm": thresh, "median_dist_mm": round(med, 2), "n_vertices": len(idx)}
        print(f"H4 {t['slug']} [absolute]: {len(idx)} Vertices, Median {med:.1f} mm (thresh {thresh})")

    # --- partition-Modus (Within-Host-Split: pars*, rostral/caudal ACC, lateral/medial OFC) ---
    groups = {}
    for t in targets:
        if t["mode"] == "partition":
            groups.setdefault(t["group"], []).append(t)

    for gname, members in groups.items():
        hosts = {m["host"] for m in members}
        if len(hosts) != 1:
            raise SystemExit(f"H4: partition-Group '{gname}' hat uneinheitliche Hosts {hosts} — eine Group = ein Host")
        host = members[0]["host"]
        taro_verts = np.array(taro_hosts[host]["vertices"], float)
        host_centroid = taro_verts.mean(axis=0)
        # Within-Host-Split: gewarpte Parzellen der Gruppe gemeinsam auf den Host-Schwerpunkt
        # zentrieren. Das entfernt den globalen lateralen Affine-Versatz (~22mm) — nur die
        # RELATIVE Anordnung der Parzellen (pos./ant./ventr.) bestimmt die innere Grenze,
        # sonst reisst die am weitesten versetzte Teilregion (z.B. parsorbitalis) das Gate.
        pvs = [parcel_taro_vertices(m, learn, allen, A_al, pick_warp(m, A_lt, A_sub)) for m in members]
        shift = host_centroid - np.vstack(pvs).mean(axis=0)
        trees = [cKDTree(pv + shift) for pv in pvs]
        dists = np.column_stack([tr.query(taro_verts)[0] for tr in trees])  # (Nhost, Nmember)
        assign = np.argmin(dists, axis=1)
        for mi, m in enumerate(members):
            idx = np.where(assign == mi)[0].tolist()
            if len(idx) < 30:
                raise SystemExit(
                    f"H4: {m['slug']} (partition/{gname}) nur {len(idx)} Host-Vertices < 30 — "
                    f"Within-Host-Split unsauber, Parzelle reisst Gate (kein stiller Mini-Patch)"
                )
            med = float(np.median(dists[idx, mi]))
            out[m["slug"]] = {"host": host, "vertex_indices": idx}
            res["subparcels"][m["slug"]] = {"mode": "partition", "group": gname, "median_dist_mm": round(med, 2), "n_vertices": len(idx)}
            print(f"H4 {m['slug']} [partition/{gname}]: {len(idx)} Host-Vertices, Median-Parzellenabstand {med:.1f} mm")

    # --- geometric_pole-Modus (frontopolar/BA10: rein geometrisch, keine Atlas-Quelle) ---
    # BA 10 hat kein eigenes Atlas-Mesh — definitionsgemaess ist es der Frontalpol (vorderste
    # SFG+MFG-Spitze). Hosts kombinieren, anteriore Spitze nach mm-Tiefe (Achse +Z=anterior)
    # waehlen. Synthetischer kombinierter Host wird fuer den Carve persistiert.
    axis_idx = {"x": 0, "y": 1, "z": 2}
    combined_hosts = {}
    for t in targets:
        if t["mode"] != "geometric_pole":
            continue
        verts, faces, off = [], [], 0
        for h in t["hosts"]:
            if h not in taro_hosts:
                raise SystemExit(f"H4: geometric_pole-Host '{h}' fuer {t['slug']} fehlt in taro_hosts")
            hv, hf = taro_hosts[h]["vertices"], taro_hosts[h]["faces"]
            verts.extend(hv)
            faces.extend([[a + off, b + off, c + off] for a, b, c in hf])
            off += len(hv)
        V = np.array(verts, float)
        ax = axis_idx[t.get("axis", "z")]
        depth = float(t["pole_depth_mm"])
        cut = V[:, ax].max() - depth
        idx = np.where(V[:, ax] >= cut)[0].tolist()
        if len(idx) < 30:
            raise SystemExit(f"H4: {t['slug']} (geometric_pole) nur {len(idx)} Vertices < 30 bei Tiefe {depth}mm")
        ch = t["combined_host"]
        combined_hosts[ch] = {"vertices": verts, "faces": faces}
        out[t["slug"]] = {"host": ch, "vertex_indices": idx}
        res["subparcels"][t["slug"]] = {"mode": "geometric_pole", "pole_depth_mm": depth, "axis": t.get("axis", "z"), "n_vertices": len(idx)}
        print(f"H4 {t['slug']} [geometric_pole]: {len(idx)} Vertices, Frontalpol-Tiefe <= {depth}mm")

    if combined_hosts:
        (WORK / "combined_hosts.json").write_text(json.dumps(combined_hosts))
        print(f"combined_hosts.json: {len(combined_hosts)} synthetische Hosts (Carve-Geometrie)")

    (WORK / "labels.json").write_text(json.dumps(out))
    (WORK / "residuals.json").write_text(json.dumps(res, indent=2))
    print(f"\n{len(out)} Sub-Patches gelabelt -> labels.json")
    return res


if __name__ == "__main__":
    print("=== H1: Frame-Konsolidierung allen->learn ===")
    learn, allen, A_al = stage_h1()

    # Additive Erweiterung: neue DKT-Parzellen (pars*, lateral/medial orbitofrontal,
    # accumbens) aus dkt_extra.json — Original mni_learn.json bleibt unangetastet.
    dkt_extra_path = WORK / "dkt_extra.json"
    if dkt_extra_path.exists():
        extra = json.loads(dkt_extra_path.read_text())
        added = sum(1 for k in extra if k not in learn)
        for k, v in extra.items():
            learn.setdefault(k, v)
        print(f"H1: {added} DKT-Extra-Parzellen in learn gemerged ({list(extra.keys())[:3]} ...)")

    print("\n=== H2: Globale Affine learn->TARO ===")
    taro_hosts_raw = json.loads((WORK / "taro_hosts.json").read_text())
    # Additive Erweiterung: neue TARO-Hosts (IFG, orbital-Gyri, caudate) aus taro_hosts_extra.json.
    hosts_extra_path = WORK / "taro_hosts_extra.json"
    if hosts_extra_path.exists():
        hx = json.loads(hosts_extra_path.read_text())
        for k, v in hx.items():
            taro_hosts_raw.setdefault(k, v)
        print(f"H2: {len(hx)} TARO-Host-Extras gemerged ({list(hx.keys())[:3]} ...)")

    taro, A_lt, h2_loo = stage_h2(learn)

    print("\n=== H3: Lokale CPD pro Host-Gyrus (Diagnostik) ===")
    regs = stage_h3(learn, taro_hosts_raw, A_lt)

    print("\n=== H3b: Subkortex-Affine (Striatum/Pallidum) ===")
    A_sub, sub_loo = stage_subcortical_affine(taro_hosts_raw)

    print("\n=== H4: TARO-Vertex-Labeling + Gate (targets.json) ===")
    targets, default_thresh = load_targets()
    res = stage_h4(learn, allen, taro_hosts_raw, A_al, A_lt, A_sub, targets, default_thresh)
    res["h2_loo_mean_mm"] = round(h2_loo, 1)
    if sub_loo is not None:
        res["subcortical_loo_mean_mm"] = round(sub_loo, 1)

    # residuals.json mit H2-Wert aktualisieren
    (WORK / "residuals.json").write_text(json.dumps(res, indent=2))
    print("\nFertig — labels.json und residuals.json geschrieben.")
