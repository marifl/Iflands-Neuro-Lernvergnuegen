# Watertight 3D-Atlas-Areale MIT FURCHEN aus der fsaverage-Quelle (alle 4 Atlanten).
#
# Methode (Plan 2026-06-14-watertight-atlanten-furchen, Pial-Patch-Closing):
#   Quelle = apps/brain-app/public/assets/atlas-canonical/ (fsavg164 pial + faces + 4 Label-Layer).
#   Pro Areal: den gefalteten Pial-Patch extrahieren (= echte Furchen), zu einem watertight Shell
#   schliessen (Patch + nach innen versetzte Rueckflaeche entlang -Normale, Rand stitchen), dann
#   fsaverage->TARO-Affine anwenden. KEIN volumetrisches Marching-Cubes (das glaettet die Furchen weg).
#
# W0-Prototyp-Modus: `python build_watertight_atlas.py proto`  -> wenige DKT-Areale (L), Watertight-Check,
#   Mini-GLB work/wt_proto_dkt_L.glb. Validiert die Closing-Methode, bevor auf alle 4 Atlanten skaliert wird.
import re
import sys
import json
import subprocess
from pathlib import Path
import numpy as np
import trimesh

import register as R  # apply_affine

HERE = Path(__file__).parent
WORK = HERE / "work"
CANON = HERE.parent.parent / "apps/brain-app/public/assets/atlas-canonical"
OUT_DIR = HERE.parent.parent / "apps/brain-app/public/assets/bodyparts3d"

N_VERTS = 163842
THICK_MM = 2.0  # Shell-Dicke (nach innen entlang -Normale)
ATLASES = ["julich", "dkt", "brodmann", "destrieux"]
DRACO_LIMIT_BYTES = 8 * 1024 * 1024  # >8 MB -> milde Decimation des Anzeige-Meshes


def load_hemi(hemi):
    pial = np.frombuffer((CANON / f"fsavg164_{hemi}_pial.f32").read_bytes(), dtype="<f4").reshape(-1, 3).astype(np.float64)
    faces = np.frombuffer((CANON / f"fsavg164_{hemi}_faces.u32").read_bytes(), dtype="<u4").reshape(-1, 3).astype(np.int64)
    if pial.shape[0] != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}: pial {pial.shape[0]} != {N_VERTS}")
    return pial, faces


def load_labels(hemi, atlas):
    lab = np.frombuffer((CANON / f"fsavg164_{hemi}_{atlas}.i16").read_bytes(), dtype="<i2").astype(np.int64)
    if lab.shape[0] != N_VERTS:
        raise SystemExit(f"ABBRUCH {hemi}/{atlas}: labels {lab.shape[0]} != {N_VERTS}")
    return lab


def vertex_normals(verts, faces):
    """Flaechen-gewichtete Vertex-Normalen."""
    n = np.zeros_like(verts)
    tri = verts[faces]
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])  # nicht normiert = flaechen-gewichtet
    for k in range(3):
        np.add.at(n, faces[:, k], fn)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln == 0] = 1.0
    return n / ln


def boundary_edges(faces):
    """Rand-Kanten (kommen in nur EINEM Dreieck vor), als (i,j)-Paare in Face-Winding-Richtung."""
    from collections import defaultdict
    cnt = defaultdict(int)
    for f in faces:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            cnt[(a, b)] += 1
    bedges = []
    for (a, b), c in cnt.items():
        if c == 1 and cnt.get((b, a), 0) == 0:  # gerichtete Kante ohne Gegenstueck -> Rand
            bedges.append((a, b))
    return bedges


def close_patch(verts, faces):
    """Offenen Pial-Patch zu watertight Shell schliessen.
    Front (Aussenseite, Furchen) + nach innen versetzte Rueckflaeche + Rand-Wand.
    Rueckgabe: (shell_verts, shell_faces)."""
    nrm = vertex_normals(verts, faces)
    n = verts.shape[0]
    back = verts - THICK_MM * nrm
    sv = np.vstack([verts, back])                       # [0..n) front, [n..2n) back
    front_f = faces                                      # Aussen-Winding
    back_f = faces[:, ::-1] + n                          # umgekehrt -> Aussen-Winding der Rueckseite
    wall = []
    for a, b in boundary_edges(faces):                  # Rand front (a,b) -> back (a+n,b+n)
        wall.append((a, b, b + n))
        wall.append((a, b + n, a + n))
    sf = np.vstack([front_f, back_f, np.asarray(wall, dtype=np.int64)]) if wall else np.vstack([front_f, back_f])
    return sv, sf


def close_patch_robust(pv, pf):
    """Patch in zusammenhaengende Komponenten splitten, jede einzeln schliessen, kombinieren.
    Verhindert Nicht-Mannigfaltigkeit bei mehrteiligen Arealen / Pinch-Raendern (euler!=2)."""
    pm = trimesh.Trimesh(vertices=pv, faces=pf, process=False)
    comps = pm.split(only_watertight=False)
    if len(comps) == 0:
        comps = [pm]
    all_v, all_f = [], []
    off = 0
    n_ok = 0
    for c in comps:
        cv, cf = close_patch(np.asarray(c.vertices), np.asarray(c.faces))
        m = trimesh.Trimesh(vertices=cv, faces=cf, process=True)
        if m.is_watertight:
            n_ok += 1
        all_v.append(np.asarray(m.vertices))
        all_f.append(np.asarray(m.faces) + off)
        off += m.vertices.shape[0]
    return np.vstack(all_v), np.vstack(all_f), len(comps), n_ok


def patch_for_label(pial, faces, labels, lab):
    """Sub-Mesh (verts, faces lokal remapped) aller Faces, deren 3 Ecken Label==lab tragen."""
    keep = labels == lab
    fmask = keep[faces].all(axis=1)
    pf = faces[fmask]
    if pf.shape[0] == 0:
        return None
    used = np.unique(pf)
    remap = -np.ones(pial.shape[0], dtype=np.int64)
    remap[used] = np.arange(used.shape[0])
    return pial[used], remap[pf]


def proto():
    A_ft = np.asarray(json.loads((WORK / "atlas_affine_fsavg_to_taro.json").read_text()))
    pial, faces = load_hemi("L")
    dkt = load_labels("L", "dkt")
    man = json.loads((CANON / "manifest.json").read_text())
    dkt_lut = man["lut"]["dkt"]
    # 3 markante DKT-Areale (Label-Ids aus dem LUT per Name)
    want = ["superiorfrontal", "parsopercularis", "precentral"]
    name_to_id = {v["name"]: int(k) for k, v in dkt_lut.items()}
    scene = trimesh.Scene()
    for nm in want:
        lid = name_to_id.get(nm)
        if lid is None:
            print(f"  WARN: {nm} nicht im DKT-LUT")
            continue
        p = patch_for_label(pial, faces, dkt, lid)
        if p is None:
            print(f"  WARN: {nm} (id {lid}) hat 0 Patch-Faces")
            continue
        pv, pf = p
        sv, sf, ncomp, nok = close_patch_robust(pv, pf)
        sv = R.apply_affine(A_ft, sv)  # fsaverage -> TARO
        m = trimesh.Trimesh(vertices=sv, faces=sf, process=True)
        print(f"  {nm:18} patch_v={pv.shape[0]:5} comps={ncomp} watertight_comps={nok}/{ncomp} shell_faces={sf.shape[0]:5}")
        scene.add_geometry(m, node_name=f"dkt-{nm}-l")
    out = WORK / "wt_proto_dkt_L.glb"
    out.write_bytes(scene.export(file_type="glb"))
    print(f"-> {out} ({out.stat().st_size // 1024} KB)")


def slugify(name):
    """LUT-Name -> kebab-case slug. 'Area 44 (IFG)' -> 'area-44-ifg'."""
    s = name.lower()
    s = s.replace("(", " ").replace(")", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    if not s:
        raise ValueError(f"Slug leer fuer Name {name!r}")
    return s


def labels_to_build(lut):
    """LUT-Items -> [(label_id, name)] fuer echte Areale (kein Medialwand/nicht kartiert)."""
    out = []
    for k, v in lut.items():
        lid = int(k)
        if lid == 0 or v.get("medial"):
            continue
        nm = v["name"].strip()
        if nm in ("—", "-", "") or "nicht kartiert" in nm.lower():
            continue
        out.append((lid, v["name"]))
    return out


def build_atlas(atlas, A_ft, man):
    """Baut alle Areale eines Atlas -> trimesh.Scene + Report-Dict."""
    lut = man["lut"][atlas]
    targets = labels_to_build(lut)
    # Per Hemi einmal laden (teuer)
    hemi_data = {}
    for hemi in ("L", "R"):
        pial, faces = load_hemi(hemi)
        labels = load_labels(hemi, atlas)
        hemi_data[hemi] = (pial, faces, labels)

    scene = trimesh.Scene()
    used_names = set()
    n_built = 0
    n_watertight = 0
    n_open_pial_patch = 0
    no_surface = []  # LUT-Labels mit 0 Vertices in BEIDEN Hemis -> kein Oberflaechen-Areal (z.B. DKT corpuscallosum)

    for lid, name in targets:
        slug = slugify(name)
        # Vorab: hat dieses Label ueberhaupt Vertices auf der Oberflaeche?
        verts_total = sum(int((hemi_data[h][2] == lid).sum()) for h in ("L", "R"))
        if verts_total == 0:
            no_surface.append((lid, name))
            print(f"  [{atlas}] {name} (id {lid}) NICHT auf der Oberflaeche (0 Vertices L+R) -> SKIP")
            continue
        for hemi in ("L", "R"):
            pial, faces, labels = hemi_data[hemi]
            p = patch_for_label(pial, faces, labels, lid)
            if p is None:
                continue  # dieses Areal nicht in dieser Hemi (z.B. lateralisiert) -> ok
            pv, pf = p
            sv, sf, ncomp, nok = close_patch_robust(pv, pf)
            if nok == ncomp and ncomp > 0:
                # Alle Komponenten watertight -> geschlossenes Shell verwenden
                verts, fcs = sv, sf
                n_watertight += 1
            else:
                # Offener Pial-Patch-Modus: roher Pial-Patch (furchen-echt, nicht volumen-geschlossen)
                verts, fcs = pv, pf
                n_open_pial_patch += 1
                print(f"  [{atlas}] {name} ({hemi}) open-pial-patch ({nok}/{ncomp} comps watertight)")
            verts = R.apply_affine(A_ft, verts)
            mesh_name = f"{atlas}-{slug}-{hemi.lower()}"
            if mesh_name in used_names:
                raise ValueError(f"Doppelter Mesh-Name {mesh_name!r} (slug-Kollision) in {atlas}")
            used_names.add(mesh_name)
            m = trimesh.Trimesh(vertices=verts, faces=fcs, process=False)
            scene.add_geometry(m, node_name=mesh_name, geom_name=mesh_name)
            n_built += 1

    # Assert: jedes LUT-Areal MIT Oberflaechen-Vertices wurde gebaut (sonst Code-Bug).
    n_surface_areale = len(targets) - len(no_surface)
    if n_built == 0:
        raise SystemExit(f"ABBRUCH {atlas}: 0 Meshes gebaut")
    if n_surface_areale <= 0:
        raise SystemExit(f"ABBRUCH {atlas}: keine Oberflaechen-Areale uebrig")

    report = {
        "atlas": atlas,
        "n_lut_areale": len(targets),
        "n_surface_areale": n_surface_areale,
        "n_no_surface_skipped": len(no_surface),
        "no_surface": [n for _, n in no_surface],
        "n_built": n_built,
        "n_watertight": n_watertight,
        "n_open_pial_patch": n_open_pial_patch,
        "n_decimated": 0,
    }
    return scene, report


def residual_fsavg_to_taro(A_ft):
    """Grobes Registrierungs-Residuum: existiert ein gespeicherter Residuum-Wert? Sonst Spannweite der Affine.
    Wir loggen den mittleren Skalierungsfaktor + Translation als grobe Charakterisierung (kein Punkt-Fit hier,
    da W0 das Residuum bereits als 'mehrere mm, anderes Hirn' dokumentiert hat)."""
    lin = A_ft[:3, :]
    scale = float(np.mean(np.linalg.norm(lin, axis=0)))
    trans = A_ft[3, :].tolist()
    return {"mean_scale": round(scale, 4), "translation_mm": [round(x, 2) for x in trans]}


def export_and_compress(scene, atlas):
    """GLB exportieren, Roh-Groesse messen, Draco komprimieren, Draco-Groesse messen.
    Wenn Draco > Limit: finales Shell milde dezimieren (~50% faces), neu exportieren+draco.
    Rueckgabe: (raw_mb, draco_mb, n_decimated)."""
    out = OUT_DIR / f"atlas3d-{atlas}.glb"
    out.write_bytes(scene.export(file_type="glb"))
    raw_bytes = out.stat().st_size
    draco_bytes = _draco(out)
    n_decimated = 0
    if draco_bytes > DRACO_LIMIT_BYTES:
        print(f"  [{atlas}] Draco {draco_bytes/1048576:.1f} MB > Limit -> milde Decimation (~50% faces)")
        scene2, n_decimated = _decimate_scene(scene)
        out.write_bytes(scene2.export(file_type="glb"))
        raw_bytes = out.stat().st_size
        draco_bytes = _draco(out)
    return raw_bytes / 1048576, draco_bytes / 1048576, n_decimated


def _decimate_scene(scene):
    """Jedes Mesh auf ~50% faces dezimieren (Anzeige-Mesh, watertight darf brechen)."""
    new = trimesh.Scene()
    n_dec = 0
    for name, geom in scene.geometry.items():
        target = max(4, int(geom.faces.shape[0] * 0.5))
        try:
            d = geom.simplify_quadric_decimation(face_count=target)
        except TypeError:
            d = geom.simplify_quadric_decimation(target)
        if d.faces.shape[0] < geom.faces.shape[0]:
            n_dec += 1
            new.add_geometry(d, node_name=name, geom_name=name)
        else:
            new.add_geometry(geom, node_name=name, geom_name=name)
    return new, n_dec


def _draco(path):
    """draco_compress.mjs in-place aufrufen. Rueckgabe: Datei-Groesse danach (bytes)."""
    res = subprocess.run(
        ["node", str(HERE / "draco_compress.mjs"), str(path)],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        raise SystemExit(f"ABBRUCH Draco {path.name}: {res.stderr or res.stdout}")
    print("   " + res.stdout.strip())
    return path.stat().st_size


def full():
    A_ft = np.asarray(json.loads((WORK / "atlas_affine_fsavg_to_taro.json").read_text()))
    man = json.loads((CANON / "manifest.json").read_text())
    resid = residual_fsavg_to_taro(A_ft)
    reports = []
    total_draco = 0.0
    for atlas in ATLASES:
        print(f"=== {atlas} ===")
        scene, rep = build_atlas(atlas, A_ft, man)
        raw_mb, draco_mb, n_dec = export_and_compress(scene, atlas)
        rep["raw_mb"] = round(raw_mb, 2)
        rep["draco_mb"] = round(draco_mb, 2)
        rep["n_decimated"] = n_dec
        rep["fsavg_to_taro"] = resid
        reports.append(rep)
        total_draco += draco_mb
        print(f"  -> atlas3d-{atlas}.glb  built={rep['n_built']} watertight={rep['n_watertight']} "
              f"open-pial-patch={rep['n_open_pial_patch']} decimated={n_dec}  "
              f"raw={raw_mb:.2f}MB draco={draco_mb:.2f}MB")
    (WORK / "atlas3d_report.json").write_text(json.dumps(reports, indent=2))
    print("\n=== GESAMT ===")
    print(f"  Total Draco: {total_draco:.2f} MB")
    print(f"  fsavg->TARO grob: {resid}")
    print(f"  Report: {WORK / 'atlas3d_report.json'}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "proto"
    if mode == "proto":
        proto()
    elif mode == "full":
        full()
    else:
        raise SystemExit(f"Unbekannter Modus: {mode}")
