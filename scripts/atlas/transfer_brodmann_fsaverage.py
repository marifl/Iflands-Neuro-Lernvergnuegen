#!/usr/bin/env python3
# W4: Konnektivitaetserhaltender Brodmann-Transfer fsaverage -> TARO.
#
# Schwester von transfer_julich_fsaverage.py. Die Per-Gyrus-Registrierung (Vehikel) ist IDENTISCH —
# nur das transportierte Payload-Label wechselt von Julich auf Brodmann. Jeder fsaverage-Vertex hat
# ein DKT-Label (-> bestimmt seinen TARO-Host via dkt_to_taro_gyrus.json) UND ein Brodmann-Label
# (das zu uebertragende Payload).
#
# Unterschied zu Julich: Julich brachte seine Slug->Host-Gruppierung fertig aus register_atlas mit
# (work/atlas_labels_julich.json). Brodmann hat KEINE host-basierte Slug-Korrespondenz. Stattdessen
# leiten wir die Host-Gruppierung aus der DKT-Korrespondenz ab: jeder TARO-Host-Stamm ist durch eine
# Menge DKT-Labels definiert (dkt_to_taro). Der fsaverage-DKT-Patch dieses Hosts (= alle fsaverage-
# Vertices, deren DKT-Label zu diesem Host gehoert) wird lokal auf das TARO-Host-Mesh registriert,
# dann bekommt jeder TARO-Host-Vertex das Brodmann-Label des naechsten registrierten Patch-Vertex.
#
# Ein BA-Areal das mehrere Gyri ueberspannt wird pro Gyrus-Segment transferiert -> je Segment ein
# Slug brodmann-ba<n>-<host_stem>-<l|r> (Carve = "welche Flaeche leuchtet"). Selbe Bake-Pipeline.
#
# Ausgabe: work/atlas_labels_brodmann.json (gleiches Schema wie atlas_labels_julich.json:
#          {host, side, host_stem, vertex_indices, backfill}), bake-kompatibel.
#
# Aufruf: transfer_brodmann_fsaverage.py
import json
import re
import sys
import importlib.util
import numpy as np
from pathlib import Path
from collections import defaultdict
from scipy.spatial import cKDTree

HERE = Path(__file__).parent
WORK = HERE / "work"
CANON = HERE / "../../apps/brain-app/public/assets/atlas-canonical"

# Registrierungs-Vehikel + Welded-Graph + Voronoi UNVERAENDERT aus dem Julich-Skript wiederverwenden
# (Single Source of Truth fuer Host-Geometrie/Registrierung/Konnektivitaet — kein Duplikat).
_spec = importlib.util.spec_from_file_location("tjf", HERE / "transfer_julich_fsaverage.py")
tjf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tjf)
host_vertices = tjf.host_vertices
eligible_mask = tjf.eligible_mask
register_patch = tjf.register_patch
_geodesic_voronoi = tjf._geodesic_voronoi
_n_components = tjf._n_components
FLOOR_VERTS = tjf.FLOOR_VERTS


def kebab(name):
    """Brodmann-LUT-Name -> Slug-Fragment. 'BA44' -> 'ba44'."""
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def load_fsaverage():
    man = json.loads((CANON / "manifest.json").read_text())
    N = man["verts_per_hemi"]
    fs = {}
    for hemi, side in (("L", "left"), ("R", "right")):
        pial = np.fromfile(CANON / f"fsavg164_{hemi}_pial.f32", dtype=np.float32).reshape(-1, 3).astype(float)
        dkt = np.fromfile(CANON / f"fsavg164_{hemi}_dkt.i16", dtype=np.int16)
        bro = np.fromfile(CANON / f"fsavg164_{hemi}_brodmann.i16", dtype=np.int16)
        assert len(pial) == N and len(dkt) == N and len(bro) == N, f"fsaverage {hemi}: Laenge != {N}"
        fs[side] = {"pial": pial, "dkt": dkt, "brodmann": bro}
    return fs, man


def main():
    fs, man = load_fsaverage()
    hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())
    corr = json.loads((WORK / "dkt_to_taro_gyrus.json").read_text())
    d2t = corr["dkt_to_taro"]  # "<dkt_label>" -> {dkt_name, taro_host_stem}
    bro_lut = man["lut"]["brodmann"]  # "<label>" -> {rgb, name, [medial]}

    # Brodmann-Label -> Slug-Fragment (aus LUT-Name). Label 0 = Medialwand/unlabeled (skip).
    lab_to_slugfrag = {}
    for lab, meta in bro_lut.items():
        li = int(lab)
        if li == 0:
            continue
        lab_to_slugfrag[li] = kebab(meta["name"])

    # Host-Gruppierung aus DKT-Korrespondenz: host_stem -> set(dkt_label).
    host_dkt = defaultdict(set)
    for lab, info in d2t.items():
        host_dkt[info["taro_host_stem"]].add(int(lab))

    print(f"=== Brodmann-Transfer fsaverage -> TARO ({len(host_dkt)} Host-Staemme, "
          f"{len(lab_to_slugfrag)} BA-Labels in LUT) ===")

    # Erwartete BA-Areale: jedes BA-Label das in fsaverage (irgendeiner Hemi) Vertices hat.
    expected_ba = set()
    for side in ("left", "right"):
        for li in np.unique(fs[side]["brodmann"]):
            if int(li) != 0:
                expected_ba.add(int(li))
    expected_ba &= set(lab_to_slugfrag.keys())  # nur was die LUT kennt
    seen_ba = set()  # BA-Labels die mind. ein TARO-Segment bekamen

    labels = {}  # slug -> {host, side, host_stem, vertex_indices, backfill}
    comp_stats = []  # (slug, n_components) fuers Gate
    backfilled = []

    for side in ("left", "right"):
        fsv = fs[side]
        for host in sorted(host_dkt):
            hv = host_vertices(host, side, hosts)
            if hv is None:
                # Host-Stamm ohne TARO-Geometrie auf dieser Seite -> lauter Hinweis, kein stiller Skip.
                raise SystemExit(f"W4: TARO-Host-Geometrie fuer {side}-{host} fehlt "
                                 f"(dkt_to_taro nennt ihn, taro_cortex_hosts nicht)")
            em = eligible_mask(host, hv)
            elig_idx = np.where(em)[0]
            T = hv[em]

            # fsaverage-DKT-Patch dieses Hosts = alle fsaverage-Vertices (dieser Seite), deren DKT-Label
            # zu diesem Host gehoert. Das ist das Registrierungs-Vehikel (wie der Julich-Patch).
            dkt_labels = host_dkt[host]
            patch_mask = np.isin(fsv["dkt"], list(dkt_labels))
            S = fsv["pial"][patch_mask]
            S_bro = fsv["brodmann"][patch_mask]  # Payload je Patch-Vertex
            if len(S) == 0:
                raise SystemExit(f"W4: fsaverage-DKT-Patch fuer {side}-{host} leer "
                                 f"(DKT-Labels {sorted(dkt_labels)} ohne Vertices)")

            # Registrierung Patch -> Host (identisches Vehikel wie Julich).
            Sp = register_patch(S, T)
            stree = cKDTree(Sp)
            _, nn = stree.query(T)
            T_bro_raw = S_bro[nn].astype(np.int64)  # Roh-Brodmann-Label je eligible TARO-Vertex

            # Welche BA-Labels treten in diesem Host-Patch auf (>0)? Das sind die Voronoi-Quellen.
            present = sorted(int(x) for x in np.unique(S_bro) if int(x) != 0)
            if not present:
                # Host nur Medialwand-Brodmann (0) -> kein BA-Segment. Selten; lauter Hinweis statt still.
                print(f"  Hinweis: {side}-{host} hat kein BA>0 im DKT-Patch — kein Segment.")
                continue

            # Konnektivitaets-erzwingender geodaetischer Voronoi (identisch zu Julich).
            T_bro = _geodesic_voronoi(T_bro_raw, elig_idx, hosts, side, host, present)

            # Pro BA-Label in diesem Host ein Slug-Segment.
            for li in present:
                slugfrag = lab_to_slugfrag.get(li)
                if slugfrag is None:
                    # Brodmann-Label ohne LUT-Name -> Datenfehler, kein stiller Skip.
                    raise SystemExit(f"W4: Brodmann-Label {li} fehlt in LUT (manifest.json)")
                sel = np.where(T_bro == li)[0]
                backfill = False
                if len(sel) < FLOOR_VERTS:
                    # Segment von Nachbarn geschluckt -> garantierter Mini-Patch (FLOOR naechste eligible
                    # Host-Vertices zum registrierten Label-Centroid). Ueberlappend, ehrlich `backfill`.
                    lab_pts = Sp[S_bro == li]
                    center = lab_pts.mean(0) if len(lab_pts) else T.mean(0)
                    k = min(FLOOR_VERTS, len(T))
                    _, pos = cKDTree(T).query(center, k=k)
                    sel = np.atleast_1d(pos)
                    backfill = True
                idx = elig_idx[sel].tolist()
                slug = f"brodmann-{slugfrag}-{host}-{'l' if side == 'left' else 'r'}"
                labels[slug] = {"host": f"{side}-{host}", "side": side, "host_stem": host,
                                "vertex_indices": idx, "backfill": backfill}
                if backfill:
                    backfilled.append(slug)
                comp_stats.append((slug, _n_components(idx, hv, hosts, side, host)))
                seen_ba.add(li)

    _finish(labels, comp_stats, backfilled, expected_ba, seen_ba, lab_to_slugfrag)


def _finish(labels, comp_stats, backfilled, expected_ba, seen_ba, lab_to_slugfrag):
    # Gate: jedes erwartete BA-Areal (mit fsaverage-Vertices) hat >=1 TARO-Segment.
    missing = sorted(expected_ba - seen_ba)
    if missing:
        names = [lab_to_slugfrag.get(li, str(li)) for li in missing]
        raise SystemExit(f"W4-Gate: {len(missing)} BA-Areale ohne TARO-Segment (verloren): {names}")
    empty = [s for s in labels if len(labels[s]["vertex_indices"]) == 0]
    if empty:
        raise SystemExit(f"W4-Gate: {len(empty)} leere Segmente: {empty[:10]}")

    comps = np.array([c for _, c in comp_stats])
    med = float(np.median(comps))
    mx = int(comps.max())
    splintered = int((comps > 5).sum())
    n_ba = len(seen_ba)
    print(f"\n  {len(labels)} Segmente ({n_ba} BA-Areale, erwartet {len(expected_ba)}), "
          f"{len(backfilled)} via FLOOR-Backfill")
    print(f"  Komponenten/Segment: median {med:.1f}  max {mx}  (>5 Komp.: {splintered})")
    worst = sorted(comp_stats, key=lambda t: -t[1])[:12]
    print(f"  Worst-Komponenten: {worst}")

    out = WORK / "atlas_labels_brodmann.json"
    out.write_text(json.dumps(labels))
    print(f"  -> {out}")

    if med > 2:
        print(f"\n  GATE VERFEHLT: median {med:.1f} > 2.")
        sys.exit(2)
    print(f"\n  GATE: median {med:.1f} <= 2, {n_ba}/{len(expected_ba)} BA-Areale, 0 leere.")


if __name__ == "__main__":
    main()
