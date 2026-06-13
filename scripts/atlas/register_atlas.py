# scripts/atlas/register_atlas.py
# VOLL-TRANSFORM (Artefakt-only, KEINE Runtime-Integration): transformiert das gesamte
# Julich- (und optional DKT-) Atlas auf TARO via generalisierter Within-Host-Partition.
# Pro Atlas-Quelle: eigene <source>->TARO-Affine aus Parzelle->Host-Centroid-Paaren (jede
# Quelle hat ihren eigenen GLB-Welt-Frame!). Pro TARO-Host: die Parzellen der Quelle
# gemeinsam auf den Host-Schwerpunkt zentrieren (entfernt Bulk-Offset), dann jeden
# Host-Vertex der naechsten Parzelle zuweisen. Gapmaps (AUTO_NEAREST) -> zentroid-naechster
# Kortex-Host. Schreibt work/atlas_labels_full.json + work/atlas_residuals.json.
#
# Aufruf: register_atlas.py <source> <parcels.json>
#   source = "julich" | "dkt"   parcels.json = decoded Quell-Parzellen (decode_glb.mjs)
import json
import re
import sys
import numpy as np
from pathlib import Path

import register as R  # affine_from_pairs, apply_affine wiederverwenden (kein __main__-Run beim Import)

WORK = Path(__file__).parent / "work"
HOST_MAP = json.loads((Path(__file__).parent / "host_map.json").read_text())
SUF2HOST = HOST_MAP["julich_suffix_to_host"]
COMBINED = HOST_MAP["combined_hosts"]
RESTRICT = HOST_MAP.get("host_restrictions", {})
_AXIS = {"x": 0, "y": 1, "z": 2}
FLOOR_VERTS = 12  # garantierter Mini-Patch je Parzelle (Backfill bei Crowding); klein, da viele winzige Julich-Areale


def centroid(verts):
    return np.asarray(verts, float).mean(axis=0)


def julich_suffix(name):
    s = re.sub(r"-[lr]$", "", name)
    s = re.sub(r"^julich3-area-[a-z0-9]+-", "", s)
    s = re.sub(r"^julich3-", "", s)
    return s


def parse_parcel(name, source):
    """(side, host_stem_or_special). host: TARO-Gyrus-Stem, combined-Key, 'AUTO_NEAREST',
    'EXCLUDE...' oder None (unbekannt)."""
    side = "left" if name.endswith("-l") else "right"
    if source == "julich":
        suf = julich_suffix(name)
        host = SUF2HOST.get(suf)
    else:  # dkt: Name selbst ist der Host-Hinweis (caudalmiddlefrontal -> middle-frontal-gyrus ...)
        host = dkt_host(name)
    return side, host


# DKT-Parzellenname -> TARO-Host-Stem (DKT-Namen sind gyrus-nah).
DKT_HOST = {
    "parsopercularis": "inferior-frontal-gyrus", "parstriangularis": "inferior-frontal-gyrus",
    "parsorbitalis": "inferior-frontal-gyrus", "caudalmiddlefrontal": "middle-frontal-gyrus",
    "rostralmiddlefrontal": "middle-frontal-gyrus", "superiorfrontal": "superior-frontal-gyrus",
    "lateralorbitofrontal": "lateral-orbital-gyrus", "medialorbitofrontal": "medial-orbital-gyrus",
    "parsorbitofrontal": "anterior-orbital-gyrus", "caudalanteriorcingulate": "cingulate-gyrus",
    "rostralanteriorcingulate": "cingulate-gyrus", "posteriorcingulate": "cingulate-gyrus",
    "isthmuscingulate": "cingulate-gyrus", "precentral": "precentral-gyrus",
    "postcentral": "postcentral-gyrus", "paracentral": "superior-frontal-gyrus",
    "supramarginal": "supramarginal-gyrus", "superiorparietal": "superior-parietal-lobule",
    "inferiorparietal": "ipl-combined", "precuneus": "precuneus",
    "superiortemporal": "superior-temporal-gyrus", "middletemporal": "middle-temporal-gyrus",
    "inferiortemporal": "inferior-temporal-gyrus", "fusiform": "fusiform-gyrus",
    "transversetemporal": "heschl-combined", "entorhinal": "parahippocampal-gyrus",
    "parahippocampal": "parahippocampal-gyrus", "lateraloccipital": "lateral-occipital-gyrus",
    "lingual": "lingual-gyrus", "cuneus": "cuneus", "pericalcarine": "cuneus",
    "insula": "insula-combined",
}


def dkt_host(name):
    base = re.sub(r"-(cortex-)?[lr](-dorsal|-ventral)?(-wm)?$", "", name)
    return DKT_HOST.get(base)


def host_vertices(stem, side, hosts):
    """VOLLE Host-Geometrie (Vertices) je Seite, combined -> konkateniert. Index-Raum muss
    identisch zu atlas_bake.hostGeom bleiben (sonst carved es falsche Vertices) — daher KEINE
    Beschneidung hier; Restriction laeuft ueber eligible_mask()."""
    if stem in COMBINED:
        vs = []
        for c in COMBINED[stem]:
            k = f"{side}-{c}"
            if k in hosts:
                vs.extend(hosts[k]["vertices"])
        return np.asarray(vs, float) if vs else None
    k = f"{side}-{stem}"
    return np.asarray(hosts[k]["vertices"], float) if k in hosts else None


def eligible_mask(stem, V):
    """Bool-Maske: welche Host-Vertices duerfen einer Parzelle zugewiesen werden. Voll True,
    ausser host_restrictions beschneidet den Host auf eine Region (z.B. anteriore Pol-Kappe) —
    verhindert Ballooning, wenn wenige Parzellen einen grossen Host NICHT tilen (fp1/fp2)."""
    r = RESTRICT.get(stem)
    if r is None:
        return np.ones(len(V), dtype=bool)
    ax = _AXIS[r.get("axis", "z")]
    return V[:, ax] >= (V[:, ax].max() - float(r["anterior_mm"]))


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else "julich"
    parcels_path = sys.argv[2] if len(sys.argv) > 2 else f"work/{source}_parcels.json"
    parcels = json.loads((Path(__file__).parent / parcels_path).read_text())
    hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())
    print(f"=== Atlas-Transform: {source} ({len(parcels)} Parzellen) ===")

    # --- Stufe 1: <source>->TARO-Affine aus Parzelle-Centroid -> Host-Centroid ---
    src_pts, dst_pts = [], []
    skipped = {"exclude": 0, "unmapped": [], "auto": 0, "host_missing": []}
    parcel_info = {}  # name -> (side, host_stem)
    for name, mesh in parcels.items():
        side, host = parse_parcel(name, source)
        if host is None:
            skipped["unmapped"].append(name)
            continue
        if isinstance(host, str) and host.startswith("EXCLUDE"):
            skipped["exclude"] += 1
            continue
        parcel_info[name] = (side, host)
        if host == "AUTO_NEAREST":
            skipped["auto"] += 1
            continue
        hv = host_vertices(host, side, hosts)
        if hv is None:
            skipped["host_missing"].append((name, host))
            continue
        em = eligible_mask(host, hv)
        src_pts.append(centroid(mesh["vertices"]))
        dst_pts.append(hv[em].mean(axis=0))  # bei Restriction: Pol-Kappe-Centroid, nicht voller Host
    if skipped["unmapped"]:
        raise SystemExit(f"register_atlas: {len(skipped['unmapped'])} ungemappte Parzellen (host_map ergaenzen): {skipped['unmapped'][:10]}")
    if skipped["host_missing"]:
        raise SystemExit(f"register_atlas: fehlende TARO-Hosts: {skipped['host_missing'][:10]}")
    src_pts, dst_pts = np.array(src_pts), np.array(dst_pts)
    A = R.affine_from_pairs(src_pts, dst_pts)
    det = np.linalg.det(A[:3, :3])
    print(f"  {source}->TARO-Affine: {len(src_pts)} Paare, det={det:.3f} (>0 = kein Flip), exclude={skipped['exclude']} auto={skipped['auto']}")
    # Affine (4x3, apply: [x,y,z,1] @ A) fuer den Roh-Atlas-Overlay-Bake persistieren.
    (WORK / f"atlas_affine_{source}.json").write_text(json.dumps(A.tolist()))

    # Host-Centroide (alle Kortex-Gyri) fuer AUTO_NEAREST.
    gyrus_stems = sorted({k.split("-", 1)[1] for k in hosts})
    host_cents = {}
    for side in ("left", "right"):
        for stem in gyrus_stems:
            k = f"{side}-{stem}"
            if k in hosts:
                host_cents[k] = centroid(hosts[k]["vertices"])

    # --- Stufe 2: AUTO_NEAREST aufloesen (Gapmaps -> zentroid-naechster Host) ---
    auto_log = []
    for name, (side, host) in list(parcel_info.items()):
        if host != "AUTO_NEAREST":
            continue
        pc = R.apply_affine(A, np.atleast_2d(centroid(parcels[name]["vertices"])))[0]
        cand = [(np.linalg.norm(pc - c), k) for k, c in host_cents.items() if k.startswith(side)]
        cand.sort()
        nearest = cand[0][1].split("-", 1)[1]
        parcel_info[name] = (side, nearest)
        auto_log.append((name, nearest, round(cand[0][0], 1)))
    for n, h, d in auto_log:
        print(f"  AUTO_NEAREST {n} -> {h} ({d}mm)")

    # --- Stufe 3: Within-Host-Partition pro Host (zentroid-aligned) ---
    from scipy.spatial import cKDTree
    by_host = {}
    for name, (side, host) in parcel_info.items():
        by_host.setdefault((side, host), []).append(name)

    labels = {}  # parcel-name -> {host, side, vertex_indices}
    res = {"source": source, "affine_det": round(float(det), 3), "floor_verts": FLOOR_VERTS, "parcels": {}}
    gate_fail = []
    for (side, host), members in by_host.items():
        hv = host_vertices(host, side, hosts)
        if hv is None:
            raise SystemExit(f"Stufe3: Host-Geometrie fuer {side}-{host} fehlt")
        # Eligibility: nur diese Host-Vertices duerfen zugewiesen werden (Restriction = Pol-Kappe).
        # vertex_indices bleiben Indizes in die VOLLE hv (Index-Raum identisch zu atlas_bake).
        em = eligible_mask(host, hv)
        elig_idx = np.where(em)[0]
        host_centroid_pt = hv[em].mean(axis=0)
        warped = [R.apply_affine(A, np.asarray(parcels[m]["vertices"], float)) for m in members]
        shift = host_centroid_pt - np.vstack(warped).mean(axis=0)
        warped_aligned = [w + shift for w in warped]
        trees = [cKDTree(w) for w in warped_aligned]
        # Zuweisung nur ueber eligible Vertices.
        dists = np.column_stack([t.query(hv[em])[0] for t in trees])  # (n_elig, n_member)
        assign = np.argmin(dists, axis=1)
        host_tree = cKDTree(hv[em])
        for mi, m in enumerate(members):
            sel = np.where(assign == mi)[0]            # eligible-Positionen dieser Parzelle
            idx = elig_idx[sel].tolist()               # -> volle hv-Indizes (fuer atlas_bake)
            backfill = False
            if len(idx) < FLOOR_VERTS:
                # Crowding-Opfer (kleine Parzelle verliert per argmin alle Vertices an Nachbarn):
                # garantierter Mini-Patch = die FLOOR naechsten eligible Host-Vertices zum
                # Parzellen-Schwerpunkt. Kann ueberlappen (ehrlich `backfill`) — besser als 0.
                pc = warped_aligned[mi].mean(axis=0)
                k = min(FLOOR_VERTS, len(elig_idx))
                dd, pos = host_tree.query(pc, k=k)
                idx = elig_idx[np.atleast_1d(pos)].tolist()
                med = float(np.median(np.atleast_1d(dd)))
                backfill = True
            else:
                med = float(np.median(dists[sel, mi]))
            labels[m] = {"host": f"{side}-{host}", "side": side, "host_stem": host, "vertex_indices": idx, "backfill": backfill}
            entry = {"host": f"{side}-{host}", "n_vertices": len(idx), "median_mm": round(med, 2)}
            if backfill:
                entry["backfill"] = True
                gate_fail.append((m, len(idx)))
            res["parcels"][m] = entry

    (WORK / f"atlas_labels_{source}.json").write_text(json.dumps(labels))
    (WORK / f"atlas_residuals_{source}.json").write_text(json.dumps(res, indent=1))
    meds = [v["median_mm"] for v in res["parcels"].values()]
    clean = sum(1 for v in res["parcels"].values() if not v.get("backfill"))
    print(f"\n  {len(labels)}/{len(parcels)} Parzellen gelabelt — {clean} sauber partitioniert, {len(gate_fail)} via Backfill garantiert (ueberlappend)")
    if gate_fail:
        print(f"  Backfill (Crowding-Opfer): {sorted(gate_fail)[:15]}")
    print(f"  Within-Host-Median: mean {np.mean(meds):.1f} median {np.median(meds):.1f} max {np.max(meds):.1f} mm")
    print(f"  -> atlas_labels_{source}.json + atlas_residuals_{source}.json")


if __name__ == "__main__":
    main()
