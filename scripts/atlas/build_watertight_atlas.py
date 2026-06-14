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
import sys
import json
from pathlib import Path
import numpy as np
import trimesh

import register as R  # apply_affine

HERE = Path(__file__).parent
WORK = HERE / "work"
CANON = HERE.parent.parent / "apps/brain-app/public/assets/atlas-canonical"

N_VERTS = 163842
THICK_MM = 2.0  # Shell-Dicke (nach innen entlang -Normale)


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


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "proto"
    if mode == "proto":
        proto()
    else:
        raise SystemExit(f"Unbekannter Modus: {mode}")
