#!/usr/bin/env python3
# A2/A3/A4: Konnektivitaetserhaltender Julich-Transfer fsaverage -> TARO.
#
# Root-Cause-Fix fuer das Konfetti: statt das Fremd-MNI-Julich-Mesh zentroid-aligned per Nearest-Point
# auf TARO zu werfen (Punktwolken durchdringen sich -> Vertex-fuer-Vertex-Alternation), transferieren wir
# die SAUBERE fsaverage-Julich-Quelle (zusammenhaengend, median 1 Komponente). Pro TARO-Host wird der
# fsaverage-Patch (= alle fsaverage-Vertices, deren Julich-Label zu einem Slug DIESES Hosts gehoert) lokal
# auf das TARO-Host-Mesh registriert (Centroid + uniformer Scale + PCA-Achsen-Align + Rigid-ICP), dann
# bekommt jeder TARO-Host-Vertex das Julich-Label des naechsten registrierten fsaverage-Patch-Vertex.
# Weil eine *zusammenhaengende* Region via *stetige* Abbildung uebertragen wird, bleiben die Labels
# zusammenhaengend -> glatte Within-Gyrus-Grenzen (wie DKT).
#
# Slug->Host-Gruppierung kommt UNVERAENDERT aus work/atlas_labels_julich.json (register_atlas-Ergebnis,
# Bake-kompatibel). vertex_indices = volle hv-Indizes (identisch zu register_atlas/atlas_bake).
#
# Aufruf: transfer_julich_fsaverage.py
import json
import re
import sys
import numpy as np
from pathlib import Path
from scipy.spatial import cKDTree

HERE = Path(__file__).parent
WORK = HERE / "work"
CANON = HERE / "../../apps/brain-app/public/assets/atlas-canonical"
HOST_MAP = json.loads((HERE / "host_map.json").read_text())
COMBINED = HOST_MAP["combined_hosts"]
RESTRICT = HOST_MAP.get("host_restrictions", {})
_AXIS = {"x": 0, "y": 1, "z": 2}
FLOOR_VERTS = 12  # garantierter Mini-Patch je Slug ohne Patch-Treffer (Crowding/Subkortex), wie register_atlas


# ---------- fsaverage laden ----------
def load_fsaverage():
    man = json.loads((CANON / "manifest.json").read_text())
    N = man["verts_per_hemi"]
    fs = {}
    for hemi, side in (("L", "left"), ("R", "right")):
        pial = np.fromfile(CANON / f"fsavg164_{hemi}_pial.f32", dtype=np.float32).reshape(-1, 3).astype(float)
        jul = np.fromfile(CANON / f"fsavg164_{hemi}_julich.i16", dtype=np.int16)
        assert len(pial) == N and len(jul) == N, f"fsaverage {hemi}: Laenge != {N}"
        fs[side] = {"pial": pial, "julich": jul}
    return fs, man


# ---------- TARO-Host-Geometrie (identisch zu register_atlas/atlas_bake) ----------
def host_vertices(stem, side, hosts):
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
    r = RESTRICT.get(stem)
    if r is None:
        return np.ones(len(V), dtype=bool)
    ax = _AXIS[r.get("axis", "z")]
    return V[:, ax] >= (V[:, ax].max() - float(r["anterior_mm"]))


# ---------- Registrierung: fsaverage-Patch S -> TARO-Host T ----------
def pca_axes(P):
    """Hauptachsen (Spalten) + Eigenwerte, absteigend. Vorzeichen via 3. Moment disambiguiert."""
    C = P - P.mean(0)
    cov = C.T @ C / len(C)
    w, Vt = np.linalg.eigh(cov)
    order = np.argsort(w)[::-1]
    w = w[order]
    axes = Vt[:, order]  # Spalten = Achsen
    # Vorzeichen so, dass das 3. Moment entlang jeder Achse >= 0 (stabile Disambiguierung).
    proj = C @ axes
    skew = (proj ** 3).sum(0)
    for j in range(3):
        if skew[j] < 0:
            axes[:, j] = -axes[:, j]
    return axes, w


def register_patch(S, T, icp_iters=8):
    """S (fsaverage-Patch), T (TARO-Host). Centroid + uniformer Scale + PCA-Align + Rigid-ICP.
    Gibt transformierte S' zurueck (im T-Frame)."""
    cs, ct = S.mean(0), T.mean(0)
    S0, T0 = S - cs, T - ct
    rs = np.sqrt((S0 ** 2).sum(1).mean()) or 1.0
    rt = np.sqrt((T0 ** 2).sum(1).mean()) or 1.0
    scale = rt / rs
    S0 = S0 * scale
    # PCA-Achsen-Align: rotiere S-Achsen auf T-Achsen.
    As, _ = pca_axes(S0)
    At, _ = pca_axes(T0)
    Rrot = At @ As.T  # bringt S-Achsen in T-Achsen
    Sp = S0 @ Rrot.T
    # Rigid-ICP-Refinement (Rotation um Centroid; Scale fix).
    Ttree = cKDTree(T0)
    for _ in range(icp_iters):
        _, idx = Ttree.query(Sp)
        Tm = T0[idx]
        # bestes Rotations-Fit Sp->Tm (Kabsch, ohne Translation, beide um 0 zentriert lokal).
        H = (Sp - Sp.mean(0)).T @ (Tm - Tm.mean(0))
        U, _, Vh = np.linalg.svd(H)
        d = np.sign(np.linalg.det(Vh.T @ U.T))
        D = np.diag([1, 1, d])
        Ri = Vh.T @ D @ U.T
        shift = Tm.mean(0) - (Sp.mean(0) @ Ri.T)
        Sp = Sp @ Ri.T + shift
    return Sp + ct  # in T-Welt-Frame


def main():
    fs, man = load_fsaverage()
    hosts = json.loads((WORK / "taro_cortex_hosts.json").read_text())
    grouping = json.loads((WORK / "atlas_labels_julich.json").read_text())  # Slug->Host (Quelle der Gruppierung)
    corr = json.loads((WORK / "dkt_to_taro_gyrus.json").read_text())
    jul_to_slug = corr["julich_to_slug"]  # "<label_int>" -> base-slug

    # base-slug -> fsaverage-Label (Inverse)
    slug_to_label = {}
    for lab, base in jul_to_slug.items():
        slug_to_label[base] = int(lab)

    # Slugs je (side, host_stem) gruppieren (aus grouping, unveraendert).
    by_host = {}
    for slug, info in grouping.items():
        by_host.setdefault((info["side"], info["host_stem"]), []).append(slug)

    print(f"=== Julich-Transfer fsaverage v3.1 -> TARO ({len(grouping)} Slugs, {len(by_host)} Host-Gruppen) ===")

    labels = {}  # slug -> {host, side, host_stem, vertex_indices, backfill}
    comp_stats = []  # (slug, n_components) fuer A3-Gate
    backfilled = []

    for (side, host), members in sorted(by_host.items()):
        hv = host_vertices(host, side, hosts)
        if hv is None:
            raise SystemExit(f"A2: TARO-Host-Geometrie fuer {side}-{host} fehlt")
        em = eligible_mask(host, hv)
        elig_idx = np.where(em)[0]
        T = hv[em]

        # fsaverage-Patch dieses Hosts: alle fsaverage-Vertices (dieser Seite), deren Julich-Label
        # zu einem Member-Slug gehoert.
        fsv = fs[side]
        member_labels = {}  # fsaverage-label -> slug
        for slug in members:
            base = slug[:-2]  # '-l'/'-r' weg
            lab = slug_to_label.get(base)
            if lab is None:
                raise SystemExit(f"A2: Slug {slug} hat kein fsaverage-Label (A1-Bruecke unvollstaendig)")
            member_labels[lab] = slug
        patch_mask = np.isin(fsv["julich"], list(member_labels.keys()))
        S = fsv["pial"][patch_mask]
        S_lab = fsv["julich"][patch_mask]

        if len(S) == 0:
            # Kein fsaverage-Patch (z.B. Subkortex-Host hippocampus-proper: Labels existieren, aber nicht
            # in diesem Host-Areal der Oberflaeche zugeordnet) -> jeder Member per FLOOR garantiert.
            _floor_only(members, member_labels, slug_to_label, fsv, T, elig_idx, hv, side, host, labels, backfilled, comp_stats, hosts)
            continue

        Sp = register_patch(S, T)
        stree = cKDTree(Sp)
        _, nn = stree.query(T)  # je T-Vertex naechster Patch-Vertex
        T_lab_raw = S_lab[nn]   # ROH-Transfer-Label je eligible TARO-Vertex (Datenterm, zerfranst)

        # A3: Konnektivitaets-erzwingender geodaetischer Voronoi auf dem TARO-Host-Mesh.
        # Seeds = groesste zusammenhaengende Komponente je Label im Roh-Transfer; Multi-Source-Dijkstra
        # ueber Mesh-Kanten -> jeder Vertex bekommt das Label des geodaetisch naechsten Seeds. Jede
        # Voronoi-Zelle eines (zusammenhaengenden) Seeds ist zusammenhaengend -> median ~1 Komponente,
        # bleibt am Roh-Transfer verankert (Seed kommt aus den Daten, nicht aus reinem Centroid).
        T_lab = _geodesic_voronoi(T_lab_raw, elig_idx, hosts, side, host, list(member_labels.keys()))

        # Pro Member-Slug die TARO-Vertices einsammeln.
        for lab, slug in member_labels.items():
            sel = np.where(T_lab == lab)[0]
            backfill = False
            if len(sel) < FLOOR_VERTS:
                # Slug verlor (fast) alle Vertices (Patch-Label nicht im Host getroffen / von Nachbarn
                # geschluckt): garantierter Mini-Patch = FLOOR naechste eligible Host-Vertices zum
                # registrierten Label-Centroid. Ueberlappend, ehrlich `backfill`.
                lab_pts = Sp[S_lab == lab]
                if len(lab_pts) == 0:
                    center = T.mean(0)
                else:
                    center = lab_pts.mean(0)
                k = min(FLOOR_VERTS, len(T))
                _, pos = cKDTree(T).query(center, k=k)
                sel = np.atleast_1d(pos)
                backfill = True
                backfilled.append(slug)
            idx = elig_idx[sel].tolist()
            labels[slug] = {"host": f"{side}-{host}", "side": side, "host_stem": host,
                            "vertex_indices": idx, "backfill": backfill}
            comp_stats.append((slug, _n_components(idx, hv, hosts, side, host)))

    _finish(labels, grouping, comp_stats, backfilled)


def _floor_only(members, member_labels, slug_to_label, fsv, T, elig_idx, hv, side, host, labels, backfilled, comp_stats, hosts):
    """Host ohne fsaverage-Patch (Subkortex): jeder Member bekommt FLOOR naechste Host-Vertices um seinen
    (registrierten) Label-Schwerpunkt. Da kein Patch existiert, verteilen wir die Member gleichmaessig
    ueber den Host via ihres relativen fsaverage-Label-Schwerpunkts (Centroid-only-Align)."""
    # fsaverage-Label-Schwerpunkte (volle Hemi) der Member.
    cents = []
    valid = []
    for lab, slug in member_labels.items():
        pts = fsv["pial"][fsv["julich"] == lab]
        if len(pts):
            cents.append(pts.mean(0)); valid.append((lab, slug))
    Ttree = cKDTree(T)
    if cents:
        cents = np.array(cents)
        # Centroid+Scale+PCA-Align der Label-Schwerpunkte auf den Host.
        Cp = register_patch(cents, T, icp_iters=0) if len(cents) >= 3 else (cents - cents.mean(0) + T.mean(0))
    for i, (lab, slug) in enumerate(valid):
        center = Cp[i] if len(cents) else T.mean(0)
        k = min(FLOOR_VERTS, len(T))
        _, pos = Ttree.query(center, k=k)
        sel = np.atleast_1d(pos)
        idx = elig_idx[sel].tolist()
        labels[slug] = {"host": f"{side}-{host}", "side": side, "host_stem": host,
                        "vertex_indices": idx, "backfill": True}
        backfilled.append(slug)
        comp_stats.append((slug, _n_components(idx, hv, hosts, side, host)))


# ---------- A3: geodaetischer Voronoi (Konnektivitaet erzwingen) ----------
import heapq


def _geodesic_voronoi(lab_raw, elig_idx, hosts, side, host, present_labels):
    """lab_raw: Roh-Transfer-Label je ELIGIBLE-Vertex (Reihenfolge = elig_idx). Arbeitet im WELDED-Graphen:
    nimmt je Label die groesste zush. (welded) Komponente als Seed, fuellt via Multi-Source-Dijkstra
    (Kantengewicht=euklid. Laenge). Rueckgabe: geglaettete Labels je eligible-Vertex. Jede Voronoi-Zelle
    eines (zusammenhaengenden) Seeds ist zusammenhaengend -> median ~1 Komponente, am Roh-Transfer verankert."""
    adj, raw2weld, weld_pos = _host_welded(hosts, side, host)
    # Roh-Label je welded-Vertex (Mehrheitsvotum unter den eligible raw-Vertices dieser Position).
    from collections import Counter
    votes = {}  # weld_id -> Counter(label)
    elig_weld = set()
    for k, raw in enumerate(elig_idx):
        w = int(raw2weld[raw])
        elig_weld.add(w)
        votes.setdefault(w, Counter())[int(lab_raw[k])] += 1
    wlab = {w: c.most_common(1)[0][0] for w, c in votes.items()}

    # Pro Label: groesste zush. welded-Komponente (nur ueber eligible welded-Vertices) = Seed.
    seed_label = {}
    for lab in present_labels:
        members = [w for w, l in wlab.items() if l == lab]
        if not members:
            continue
        mset = set(members)
        seen = set(); best = []
        for s in members:
            if s in seen:
                continue
            comp = []; stack = [s]; seen.add(s)
            while stack:
                v = stack.pop(); comp.append(v)
                for nb in adj.get(v, ()):
                    if nb in mset and nb not in seen:
                        seen.add(nb); stack.append(nb)
            if len(comp) > len(best):
                best = comp
        for v in best:
            seed_label[v] = lab

    # Multi-Source-Dijkstra ueber alle Seeds, nur innerhalb eligible welded-Vertices.
    dist = {}; out = {}
    pq = []
    for v, lab in seed_label.items():
        dist[v] = 0.0; out[v] = lab
        heapq.heappush(pq, (0.0, v))
    while pq:
        d, v = heapq.heappop(pq)
        if d > dist.get(v, np.inf):
            continue
        pv = weld_pos[v]
        for w in adj.get(v, ()):
            if w not in elig_weld:
                continue
            e = float(np.sqrt(((pv - weld_pos[w]) ** 2).sum()))
            nd = d + e
            if nd < dist.get(w, np.inf):
                dist[w] = nd; out[w] = out[v]
                heapq.heappush(pq, (nd, w))

    # Zurueck auf eligible-Vertices; nicht erreichte (isolierte eligible-Inseln ohne Seed): Roh behalten.
    res = np.empty(len(elig_idx), dtype=np.int64)
    for k, raw in enumerate(elig_idx):
        w = int(raw2weld[raw])
        res[k] = out.get(w, int(lab_raw[k]))
    return res


# ---------- Welded-Host-Adjazenz (co-lokale Vertices verschmolzen, wie bake_carved_surface.pkey) ----------
# Die brain.glb-Host-Meshes haben an Naehten DOPPELTE Vertices (gleiche Position, verschiedener Index) ->
# rohe Face-Adjazenz zerfaellt in hunderte Pseudo-Komponenten (precuneus 324!). Der Bake verschweisst per
# pkey (Position*64 gerundet). Konnektivitaet/Voronoi MUESSEN denselben welded-Graphen nutzen, sonst misst
# man Mesh-Naht-Artefakte statt Label-Fransen.
_weld_cache = {}


def _pkey(p):
    return (round(p[0] * 64), round(p[1] * 64), round(p[2] * 64))


def _host_welded(hosts, side, host):
    """-> (adj_welded: dict[int->set[int]], raw2weld: np.int64[n_raw], weld_pos: np.float64[n_weld,3]).
    Index-Raum von raw = VOLLE hv (identisch register_atlas/atlas_bake)."""
    key = (side, host)
    if key in _weld_cache:
        return _weld_cache[key]
    hv = host_vertices(host, side, hosts)
    if host in COMBINED:
        faces = []
        off = 0
        for c in COMBINED[host]:
            k = f"{side}-{c}"
            if k not in hosts:
                continue
            for f in hosts[k]["faces"]:
                faces.append((f[0] + off, f[1] + off, f[2] + off))
            off += len(hosts[k]["vertices"])
    else:
        k = f"{side}-{host}"
        faces = [tuple(f) for f in hosts[k]["faces"]]
    weld = {}
    raw2weld = np.empty(len(hv), dtype=np.int64)
    weld_pos = []
    for i, p in enumerate(hv):
        kk = _pkey(p)
        w = weld.get(kk)
        if w is None:
            w = len(weld_pos); weld[kk] = w; weld_pos.append(p)
        raw2weld[i] = w
    adj = {}
    for a, b, c in faces:
        wa, wb, wc = int(raw2weld[a]), int(raw2weld[b]), int(raw2weld[c])
        for x, y in ((wa, wb), (wb, wc), (wc, wa)):
            if x == y:
                continue
            adj.setdefault(x, set()).add(y)
            adj.setdefault(y, set()).add(x)
    res = (adj, raw2weld, np.asarray(weld_pos, float))
    _weld_cache[key] = res
    return res


def _n_components(idx, hv, hosts, side, host):
    """Komponenten im WELDED-Graphen (echte Label-Fransen, nicht Mesh-Naht-Artefakte)."""
    if len(idx) <= 1:
        return len(idx)
    adj, raw2weld, _ = _host_welded(hosts, side, host)
    members = set(int(raw2weld[i]) for i in idx)
    seen = set()
    comps = 0
    for start in members:
        if start in seen:
            continue
        comps += 1
        stack = [start]; seen.add(start)
        while stack:
            v = stack.pop()
            for w in adj.get(v, ()):
                if w in members and w not in seen:
                    seen.add(w); stack.append(w)
    return comps


def _finish(labels, grouping, comp_stats, backfilled):
    # A4: alle Slugs erhalten?
    missing = [s for s in grouping if s not in labels]
    if missing:
        raise SystemExit(f"A4: {len(missing)} Slugs ohne Output (Areal verloren!): {missing[:10]}")
    empty = [s for s in labels if len(labels[s]["vertex_indices"]) == 0]
    if empty:
        raise SystemExit(f"A3-Gate: {len(empty)} leere Areale: {empty[:10]}")

    comps = np.array([c for _, c in comp_stats])
    med = float(np.median(comps))
    mx = int(comps.max())
    splintered = int((comps > 5).sum())
    print(f"\n  {len(labels)} Slugs gelabelt, {len(backfilled)} via FLOOR-Backfill garantiert")
    print(f"  Komponenten/Areal: median {med:.1f}  max {mx}  (>5 Komp.: {splintered} Areale)")
    worst = sorted(comp_stats, key=lambda t: -t[1])[:12]
    print(f"  Worst-Komponenten: {worst}")

    # Schreiben (A4): Backup macht der Aufrufer separat NICHT - hier ueberschreiben wir; Backup schon vorhanden.
    out = WORK / "atlas_labels_julich.json"
    out.write_text(json.dumps(labels))
    print(f"  -> {out}")

    # Gate-Auswertung (A3).
    if med > 2:
        print(f"\n  ⚠️  GATE VERFEHLT: median {med:.1f} > 2. A3-Cleanup (geod. Voronoi) noetig oder A2-Eskalation (LSCM).")
        sys.exit(2)
    print(f"\n  ✅  GATE: median {med:.1f} <= 2, 0 leere Areale.")


if __name__ == "__main__":
    main()
