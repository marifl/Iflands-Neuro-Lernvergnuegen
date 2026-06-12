"""BodyParts3D OBJ-Satz -> ein benanntes GLB + Struktur-Register.

Liest ALLE .obj aus dem BodyParts3D-Download (kein Ausschluss), rezentriert die
TARO-mm-Koordinaten auf den Origin, dreht Z-up (Koerperhoehe) nach Y-up (three.js),
und schreibt:

  - brain.glb         ein GLB, ein benannter Node pro Datei (Slug)
  - structures.json   Register: slug -> {fma, bp, fileId, name, side, volume_cm3, variant}

Wichtig: Manche bilaterale Strukturen liefert BodyParts3D als ZWEI Halb-Dateien unter
EINER FMA (z. B. Cerebellum links/rechts). Diese duerfen NICHT zusammengefasst werden.
Konvention aus den Daten: +x = links, -x = rechts. Namens-Kollisionen werden aufgeloest:
- Dateien auf entgegengesetzten x-Vorzeichen = echte L/R-Haelften -> Slug links-/rechts-Praefix.
- Dateien auf gleicher Seite = Versionen derselben Struktur -> beide behalten, Suffix -vN.

Native Geometrie (process=False), authored Normalen. Draco-Kompression: build.sh.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict

import numpy as np
import trimesh

NAME_PATTERN = re.compile(
    r"^(?P<fid>[A-Za-z0-9]+)_(?P<bp>BP\d+)_(?P<fma>FMA\d+)_(?P<name>.+)\.obj$"
)
# Teil-von-Marker: 'X half/part/portion/segment/division of <Ganzes>'. Greift den Namen des
# Ganzen ab, um per Slug zu pruefen, ob es ebenfalls als eigene Struktur im Satz steht.
PART_OF_RE = re.compile(r"\b(?:half|part|portion|segment|division)\s+of\s+(.+)$", re.IGNORECASE)

# Zweite Quelle: kuratierte hirnrelevante Strukturen aus dem Kopf-Archiv (Gefaesse,
# Sehbahn, Meningen, zusaetzliche ZNS-Strukturen). Nur Hirn-bezogenes, kein Gesicht/
# Orbita/Schaedel/Zaehne. FMAs, die schon in der Primaerquelle stehen, werden uebersprungen.
ARCHIVE_SRC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260611112101"
)
# Vierte Quelle (Vollausbau): groesserer Kopf-Download. Hier NUR explizit als hirn-relevant
# gelistete FMAs (reference/brain_additions.json) — kein Schwall an Kopf-Gefaessen. Der
# uebrige Kopf-Kontext geht NICHT in den Hirn-Satz, sondern in die Kontext-Layer
# (convert_context.py).
BRAIN_ADD_SRC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260611120253"
)
BRAIN_ADDITIONS = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "reference", "brain_additions.json"
)
# Dritte Quelle: selbst gespiegelte linke Gegenstuecke (erzeugt von mirror_meshes.py).
# Nur fuer per FMA nachweisbare bilaterale Paare; im Register als mirrored=true markiert.
MIRROR_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mirrored")
MIRROR_PLAN = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "reference", "mirror_plan.json"
)
# Autoritative FMA-Lateralitaets-Policy (aus EBI OLS4 abgeleitet, siehe fma_audit.py):
# steuert, ob eine als L/R gesplittete Struktur FMA-konform paarig (lateralisierte Kind-IDs)
# oder unpaarig (eine Mittellinienstruktur) ist. Tote Quell-IDs werden remappt.
LATERALITY_POLICY = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "reference", "fma_laterality_policy.json"
)
ARCHIVE_INCLUDE = re.compile(
    r"\b(cerebral|cerebellar|communicating|basilar|vertebral|choroidal|thalamoperforating|"
    r"thalamogeniculate|thalamotuberal|pericallosal|callosomarginal|pontine|medullary|striate|"
    r"lenticulostriate)\b|hypothalamic branch|artery of .*sulcus|posterior cerebral|"
    r"anterior cerebral|middle cerebral|superior cerebellar|inferior cerebellar|circle of|"
    r"spinal artery|internal carotid|\binsula\b|choroid plexus|central canal|"
    r"optic (nerve|tract|chiasm)|olfactory (nerve|tract)|optic chiasm|chiasm|retina|falx|"
    r"tentorium|fornix|mammillothalamic|lateral hypothalamic|parahippocampal|pituitary|"
    r"hypophys|periventricular|thalamus$|sagittal sinus|straight sinus|transverse sinus|"
    r"sigmoid sinus|cavernous sinus|petrosal sinus|occipital sinus|confluence|"
    r"great cerebral vein|internal cerebral vein|basal vein|septum pellucidum|thalamostriate|"
    r"cerebellar vein|choroid vein|veins? of .*ventricle|direct vein|veins? of vermis|"
    r"cerebral vein|venous plexus",
    re.I,
)
ARCHIVE_EXCLUDE = re.compile(
    r"pterygoid|facial|superficial temporal|lingual|lacrimal|nasociliary|ophthalmic|maxillar|"
    r"palatine|labial|buccal|masseter|tympanic|auricular|supraorbital|supratrochlear|nasal|"
    r"ciliary|conjunctiv|eyelid|central retinal|angular vein|gingiva|tooth|molar",
    re.I,
)
# Hirnnerven I-XII: alle Nerven + zugehoerige Ganglien aufnehmen (EXCLUDE wird fuer Nerven
# uebersprungen — die Trigeminus-/Gesichtsaeste sind Teile der Hirnnerven).
ARCHIVE_NERVE = re.compile(r"\bnerve\b|\bganglion\b", re.I)


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def side_from_name(name: str) -> str:
    low = name.lower()
    if low.startswith("left ") or " left " in low or "of left" in low:
        return "left"
    if low.startswith("right ") or " right " in low or "of right" in low:
        return "right"
    return "midline"


def resolve_side(name: str, mesh: "trimesh.Trimesh") -> str:
    """Seite ausschliesslich aus der FMA-/BodyParts3D-Nomenklatur (kein geometrisches Raten).

    'Left/Right X' -> diese Seite; unpaarige FMA-Namen (Tentorium, Falx, Balken, Cerebellum,
    Sinus sagittalis …) -> 'midline'. Echte L/R-Haelften, die als ZWEI Dateien unter EINER
    FMA auf Gegenseiten vorliegen (Cerebellum/Medulla), splittet die Kollisions-Logik per
    Geometrie. Einzeldateien werden NICHT mehr geometrisch lateralisiert (vermeidet Fehler
    wie das faelschlich 'rechte' Tentorium, das anatomisch unpaarig ist).
    """
    return side_from_name(name)


def _read_item(path: str, fname: str, origin: str) -> dict:
    m = NAME_PATTERN.match(fname)
    if not m:
        raise ValueError(f"Dateiname passt nicht zum BodyParts3D-Schema: {fname}")
    mesh = trimesh.load(path, process=False)
    if not isinstance(mesh, trimesh.Trimesh):
        raise ValueError(f"Erwartete ein einzelnes Mesh, bekam {type(mesh)}: {fname}")
    name = m.group("name").strip()
    return {
        "fileId": m.group("fid"),
        "bp": m.group("bp"),
        "fma": m.group("fma"),
        "name": name,
        "raw_slug": slugify(name),
        "side": resolve_side(name, mesh),
        "centroid_x": float(mesh.centroid[0]),  # +x = links, -x = rechts
        "volume_cm3": round(float(mesh.volume) / 1000.0, 4),
        "variant": 1,
        "origin": origin,
        "mesh": mesh,
    }


def load_policy() -> dict:
    """FMA-Lateralitaets-Policy laden. Pflicht — fehlt sie, lauter Fehler (kein Default)."""
    if not os.path.exists(LATERALITY_POLICY):
        raise SystemExit(f"FMA-Lateralitaets-Policy fehlt: {LATERALITY_POLICY}")
    p = json.load(open(LATERALITY_POLICY, encoding="utf-8"))
    return {"paired": p["paired"], "midline": p["midline"], "id_remap": p["id_remap"],
            "part_whole": p["part_whole"],
            "midline_mirror_complete": p["midline_mirror_complete"]}


def _xoverlap_rel(a: "trimesh.Trimesh", b: "trimesh.Trimesh") -> float:
    """Relative x-Ueberlappung zweier Meshes (>0.5 = Duplikat-Version derselben Seite,
    <=0 = disjunkte L/R-Haelften)."""
    a0, a1 = a.bounds[0][0], a.bounds[1][0]
    b0, b1 = b.bounds[0][0], b.bounds[1][0]
    ox = min(a1, b1) - max(a0, b0)
    denom = min(a1 - a0, b1 - b0)
    return ox / denom if denom > 0 else 0.0


def merge_midline_group(group: list[dict], label: str) -> dict:
    """Eine unpaarige FMA-Struktur aus mehreren Quell-Meshes rekonstruieren.

    FMA fuehrt fuer diesen Begriff KEINE lateralisierten Teilterme -> wir stellen ihn als
    EINE Mittellinienstruktur dar. Vorgehen (geometrie-evidenzbasiert):
      1. Meshes, die sich in x stark ueberlappen (rel>0.5), sind Duplikat-Versionen derselben
         Seite -> davon nur den hoechstaufgeloesten Repraesentanten behalten (Rest verworfen).
      2. Die verbleibenden (disjunkten) Repraesentanten sind L/R-Haelften -> zu einem Mesh
         zusammenfuehren. Lauter Log ueber Behalten/Verwerfen (keine stillen Drops).
    """
    n = len(group)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            if _xoverlap_rel(group[i]["mesh"], group[j]["mesh"]) > 0.5:
                parent[find(i)] = find(j)

    clusters: dict[int, list[dict]] = defaultdict(list)
    for i, it in enumerate(group):
        clusters[find(i)].append(it)

    reps: list[dict] = []
    for members in clusters.values():
        members.sort(key=lambda x: -len(x["mesh"].vertices))
        rep = members[0]
        reps.append(rep)
        for dropped in members[1:]:
            print(f"  MIDLINE {label}: Duplikat-Version {dropped['fileId']} verworfen "
                  f"(Repraesentant {rep['fileId']}, mehr Vertices)", file=sys.stderr)

    reps.sort(key=lambda x: x["centroid_x"])  # rechts (-x) .. links (+x), stabil
    merged_mesh = (reps[0]["mesh"] if len(reps) == 1
                   else trimesh.util.concatenate([r["mesh"] for r in reps]))
    fileids = [r["fileId"] for r in reps]
    print(f"  MIDLINE {label}: {len(reps)} Haelfte(n) zu EINER Mittellinienstruktur "
          f"gemerged ({'+'.join(fileids)})", file=sys.stderr)

    primary = max(reps, key=lambda x: len(x["mesh"].vertices))
    note = "Unpaariger FMA-Begriff (keine lateralisierten Teilterme in der FMA) — als Mittellinienstruktur gefuehrt."
    if len(group) > 1:
        note += f" Aus {len(group)} Quell-Meshes zusammengefuehrt."
    return {
        "fileId": primary["fileId"],
        "bp": primary["bp"],
        "fma": primary["fma"],
        "name": label,
        "raw_slug": slugify(label),
        "side": "midline",
        "centroid_x": float(merged_mesh.centroid[0]),
        "volume_cm3": round(float(merged_mesh.volume) / 1000.0, 4),
        "variant": 1,
        "origin": primary["origin"],
        "mesh": merged_mesh,
        "merged_from": fileids,
        "laterality_note": note,
    }


def apply_laterality_policy(items: list[dict], policy: dict) -> list[dict]:
    """FMA-Korrektheit erzwingen (strikt nach FMA, vor der Slug-Kollisionsaufloesung):

    - id_remap: tote/obsolete Quell-FMA-IDs auf die gueltige Live-ID umschreiben.
    - midline: alle Meshes eines unpaarigen FMA-Begriffs zu EINER Mittellinienstruktur
      zusammenfuehren (merge_midline_group). Das ersetzt die faelschliche geometrische
      L/R-Aufspaltung.
    Die paired-Umhaengung (FMA-ID je Seite auf das lateralisierte Kind) passiert NACH der
    Kollisionsaufloesung, weil sie die ermittelte Seite braucht.
    """
    for it in items:
        if it["fma"] in policy["id_remap"]:
            old = it["fma"]
            it["fma"] = policy["id_remap"][old]
            print(f"  ID-REMAP {it['fileId']}: {old} -> {it['fma']} (tote/obsolete FMA-ID)",
                  file=sys.stderr)

    midline = policy["midline"]
    keep: list[dict] = [it for it in items if it["fma"] not in midline]
    by_fma: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        if it["fma"] in midline:
            by_fma[it["fma"]].append(it)
    for fma, group in by_fma.items():
        keep.append(merge_midline_group(group, midline[fma]))
    return keep


def remap_paired_sides(items: list[dict], policy: dict) -> None:
    """Nach der Kollisionsaufloesung: FMA-ID paariger Strukturen je Seite auf das
    lateralisierte FMA-Kind umhaengen (z. B. Mammillary body links -> FMA273254)."""
    paired = policy["paired"]
    for it in items:
        spec = paired.get(it["fma"])
        if spec and it["side"] in ("left", "right"):
            it["fma"] = spec[it["side"]]


def collapse_geometric_duplicates(items: list[dict], policy: dict) -> list[dict]:
    """Echte geometrische Duplikate kollabieren (datengetrieben, vor der Slug-Aufloesung).

    Eine 'half/part/segment of X'-Struktur kann unter eigener FMA-ID DASSELBE Objekt wie das
    ganze X sein (z. B. 'Right half of tentorium cerebelli' ist das ganze Tentorium-Mesh unter
    irrefuehrendem Label). Solche Paare haben verschiedene FMA-IDs -> die FMA-Dedup greift nicht.

    Kriterium ist rein geometrisch (kein manueller Fall-Katalog): Teil und Ganzes muessen
    quasi-deckungsgleich sein — relative Volumendifferenz <= max_rel_volume_delta UND
    Schwerpunkt-Abstand <= max_centroid_mm. Nur dann ist der Teil ein redundantes Duplikat und
    wird verworfen; das Ganze bleibt als kanonischer Knoten. Nicht-deckungsgleiche Teile (andere
    Groesse ODER andere Lage = echte, buchrelevante Substruktur, z. B. anteriorer STG-Teil,
    VPLo/VPLc, VPMpc) werden BEWUSST behalten. Jede erkannte Teil/Ganzes-Beziehung wird laut
    geloggt (verworfen ODER bewusst behalten) — kein stiller Drop.
    """
    eps_v = policy["part_whole"]["max_rel_volume_delta"]
    eps_c = policy["part_whole"]["max_centroid_mm"]
    by_slug = {it["raw_slug"]: it for it in items}
    drop: set[int] = set()
    for it in items:
        m = PART_OF_RE.search(it["name"])
        if not m:
            continue
        whole = by_slug.get(slugify(m.group(1)))
        if whole is None or whole is it:
            continue  # Ganzes nicht im Satz -> Teil ist die einzige Repraesentation, behalten
        vp, vw = it["volume_cm3"], whole["volume_cm3"]
        rel = abs(vp - vw) / vw if vw else 1.0
        cdist = float(np.linalg.norm(it["mesh"].centroid - whole["mesh"].centroid))
        if rel <= eps_v and cdist <= eps_c:
            drop.add(id(it))
            print(f"  PART-WHOLE DUPLIKAT: '{it['name']}' ({vp} cm3) deckungsgleich mit "
                  f"'{whole['name']}' ({vw} cm3 | dvol={rel * 100:.2f}% dcentroid={cdist:.2f}mm) "
                  f"-> Teil verworfen, Ganzes als Knoten behalten", file=sys.stderr)
        else:
            print(f"  PART-WHOLE BEHALTEN: '{it['name']}' ({vp} cm3) NICHT deckungsgleich mit "
                  f"'{whole['name']}' ({vw} cm3 | dvol={rel * 100:.2f}% dcentroid={cdist:.2f}mm) "
                  f"-> eigenstaendige Substruktur (buchrelevant)", file=sys.stderr)
    if not drop:
        return items
    return [it for it in items if id(it) not in drop]


def _reflect_x(mesh: "trimesh.Trimesh", xmid: float) -> "trimesh.Trimesh":
    """Reflektiert ein Mesh an der Ebene x=xmid (x' = 2*xmid - x) und dreht das
    Face-Winding um, damit die Normalen nach der Spiegelung wieder nach aussen zeigen.
    Identisch zur Methode in mirror_meshes.py."""
    m = mesh.copy()
    v = m.vertices.copy()
    v[:, 0] = 2.0 * xmid - v[:, 0]
    m.vertices = v
    m.faces = m.faces[:, ::-1]
    return m


def complete_one_sided_midline(items: list[dict], policy: dict) -> None:
    """Fehlendes Blatt einer symmetrischen Mittellinienstruktur durch Reflexion ergaenzen.

    Manche unpaarige FMA-Begriffe liefert BodyParts3D nur einseitig — z. B. ist das als
    'Tentorium cerebelli' (Ganzes) gelabelte Mesh geometrisch nur das rechte Blatt, ein
    linkes existiert in keinem Download. Solche Strukturen sind in der Policy explizit
    whitelisted (midline_mirror_complete); KEIN geometrisches Auto-Raten, da die meisten
    geometrisch einseitigen 'midline'-Meshes echte einseitige Gefaesse sind, die NICHT
    gespiegelt werden duerfen.

    Spiegelebene X_mid = Median der Roh-Zentroid-x aller midline-Strukturen (das TARO-Modell
    ist nicht exakt um x=0 zentriert; gleiche Konvention wie mirror_meshes.py). Das Original
    bleibt erhalten, das reflektierte Blatt wird dazugemerged -> symmetrischer Knoten,
    markiert als reconstructed=true. Lauter Abbruch, falls das Mesh wider Erwarten nicht
    einseitig ist (Quelle liefert evtl. schon beide Blaetter).
    """
    flagged = policy["midline_mirror_complete"]
    if not flagged:
        return
    xs = sorted(it["centroid_x"] for it in items if it["side"] == "midline")
    if len(xs) < 5:
        raise SystemExit(f"Zu wenige Mittellinien-Referenzen fuer X_mid: {len(xs)}")
    xmid = xs[len(xs) // 2]
    for it in items:
        label = flagged.get(it["fma"])
        if not label:
            continue
        x0, x1 = float(it["mesh"].bounds[0][0]), float(it["mesh"].bounds[1][0])
        # Muss UEBERWIEGEND einseitig sein: die schwaechere Seite von X_mid darf hoechstens
        # halb so weit reichen wie die staerkere. Greift fuer voll einseitige (Tentorium,
        # weak=0) UND stark schiefe (Sinus confluence/occipitalis, weak~10-20%) Strukturen.
        # Eine bereits ~symmetrische Struktur wuerde durch Reflexion nur verdoppelt -> Abbruch.
        right_ext, left_ext = max(0.0, xmid - x0), max(0.0, x1 - xmid)
        weak, strong = min(right_ext, left_ext), max(right_ext, left_ext)
        if strong <= 0 or (weak / strong) >= 0.5:
            raise SystemExit(
                f"MIRROR-COMPLETE {label} ({it['fma']}): Mesh ist nicht ueberwiegend einseitig "
                f"(x {x0:.1f}..{x1:.1f}, X_mid={xmid:.2f}, schwache/starke Seite={weak/strong:.2f}) "
                f"— Reflexion wuerde nur verdoppeln. Whitelist pruefen.")
        reflected = _reflect_x(it["mesh"], xmid)
        it["mesh"] = trimesh.util.concatenate([it["mesh"], reflected])
        it["centroid_x"] = float(it["mesh"].centroid[0])
        it["volume_cm3"] = round(float(it["mesh"].volume) / 1000.0, 4)
        it["reconstructed"] = True
        it["laterality_note"] = (
            "Unpaarige, anatomisch symmetrische Mittellinienstruktur; BodyParts3D liefert sie "
            "nur einseitig/stark schief. Schwache Seite durch Reflexion an der Mittelsagittalebene "
            f"(X_mid={xmid:.2f} mm) ergaenzt — synthetische Gegenseite, reale Anatomie kann abweichen.")
        nb = it["mesh"].bounds
        print(f"  MIRROR-COMPLETE {label} ({it['fma']}): schief (x {x0:.1f}..{x1:.1f}, "
              f"schwach/stark={weak/strong:.2f}) an X_mid={xmid:.2f} gespiegelt + gemerged -> "
              f"symmetrisch (x {nb[0][0]:.1f}..{nb[1][0]:.1f})", file=sys.stderr)


def load_all(src: str) -> list[dict]:
    """Lade Primaerquelle (alle) + kuratiertes Hirn-Subset aus dem Archiv.

    Dedup ueber FMA: Strukturen, die in der Primaerquelle stehen, werden aus dem Archiv
    NICHT erneut geladen. Slug-Kollisionen werden ueber x-Seite/Version aufgeloest.
    """
    files = sorted(f for f in os.listdir(src) if f.endswith(".obj"))
    if not files:
        raise SystemExit(f"Keine .obj in {src}")

    items: list[dict] = [_read_item(os.path.join(src, f), f, "primary") for f in files]
    primary_fma = {it["fma"] for it in items}

    # Zweite Quelle: kuratiertes Hirn-Subset (Gefaesse/Sehbahn/Meningen/ZNS).
    if os.path.isdir(ARCHIVE_SRC):
        added = 0
        for f in sorted(os.listdir(ARCHIVE_SRC)):
            if not f.endswith(".obj"):
                continue
            m = NAME_PATTERN.match(f)
            if not m:
                continue
            fma, name = m.group("fma"), m.group("name")
            if fma in primary_fma:
                continue  # schon in Primaerquelle
            is_nerve = bool(ARCHIVE_NERVE.search(name))
            if not is_nerve and (ARCHIVE_EXCLUDE.search(name) or not ARCHIVE_INCLUDE.search(name)):
                continue
            items.append(_read_item(os.path.join(ARCHIVE_SRC, f), f, "archive"))
            added += 1
        print(f"  + {added} kuratierte Strukturen aus dem Kopf-Archiv", file=sys.stderr)

    # Vierte Quelle (Vollausbau): hirn-relevante Ergaenzungen aus dem groesseren Kopf-Download,
    # streng auf die Whitelist begrenzt. Dedup ueber FMA (Primaer/Archiv gewinnen).
    if os.path.isdir(BRAIN_ADD_SRC) and os.path.exists(BRAIN_ADDITIONS):
        whitelist = set(json.load(open(BRAIN_ADDITIONS))["fma"])
        seen_fma = {it["fma"] for it in items}
        added = 0
        for f in sorted(os.listdir(BRAIN_ADD_SRC)):
            m = NAME_PATTERN.match(f)
            if not m or m.group("fma") not in whitelist or m.group("fma") in seen_fma:
                continue
            items.append(_read_item(os.path.join(BRAIN_ADD_SRC, f), f, "brain-add"))
            seen_fma.add(m.group("fma"))
            added += 1
        print(f"  + {added} hirn-relevante Ergaenzungen (Whitelist) aus dem Kopf-Download",
              file=sys.stderr)

    # Dritte Quelle: gespiegelte linke Gegenstuecke. Eigene linke FMA-IDs -> keine
    # Kollision mit der rechten Seite. Als mirrored=true markiert.
    if os.path.isdir(MIRROR_SRC):
        mirrored = 0
        for f in sorted(os.listdir(MIRROR_SRC)):
            if not f.endswith(".obj") or not NAME_PATTERN.match(f):
                continue
            it = _read_item(os.path.join(MIRROR_SRC, f), f, "mirror")
            it["mirrored"] = True
            items.append(it)
            mirrored += 1
        print(f"  + {mirrored} gespiegelte linke Gegenstuecke", file=sys.stderr)

    # FMA-Lateralitaets-Policy anwenden: tote IDs remappen + unpaarige FMA-Begriffe zu
    # einer Mittellinienstruktur zusammenfuehren (strikt nach FMA, vor der Slug-Aufloesung).
    policy = load_policy()
    items = apply_laterality_policy(items, policy)

    # Echte geometrische Teil/Ganzes-Duplikate kollabieren (deckungsgleiches Mesh unter
    # zweiter FMA-ID). Nicht-deckungsgleiche Substrukturen bleiben bewusst erhalten.
    items = collapse_geometric_duplicates(items, policy)

    # Einseitig gelieferte symmetrische Mittellinienstrukturen (Whitelist) durch Reflexion
    # vervollstaendigen (z. B. linkes Tentorium-Blatt). Strikt nach FMA, kein Auto-Raten.
    complete_one_sided_midline(items, policy)

    # Kollisionen pro raw_slug aufloesen.
    by_slug: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        by_slug[it["raw_slug"]].append(it)

    for raw, group in by_slug.items():
        if len(group) == 1:
            group[0]["slug"] = raw
            continue
        # Ein Slug kann sowohl L/R-Haelften ALS AUCH mehrere Dateien pro Seite haben
        # (z. B. Uncus: 2x links + 2x rechts). Daher erst Seite bestimmen, dann pro
        # Seite die Versionen durchnummerieren.
        spans_both = len({1 if it["centroid_x"] > 0 else -1 for it in group}) > 1
        per_base: dict[str, list[dict]] = defaultdict(list)
        for it in group:
            if spans_both:
                it["side"] = "left" if it["centroid_x"] > 0 else "right"
                base_slug = f"{it['side']}-{raw}"
            else:
                base_slug = raw  # gleiche Seite, Name traegt links/rechts bereits
            per_base[base_slug].append(it)
        for base_slug, members in per_base.items():
            for n, it in enumerate(sorted(members, key=lambda x: -len(x["mesh"].vertices)), start=1):
                it["variant"] = n
                it["slug"] = base_slug if n == 1 else f"{base_slug}-v{n}"
                tag = "L/R-HAELFTE" if spans_both else "STRUKTUR"
                suffix = "" if n == 1 else f" (Variante {n})"
                print(
                    f"  {tag} {raw}: {it['fileId']} (x={it['centroid_x']:+.1f}) -> {it['slug']}{suffix}",
                    file=sys.stderr,
                )

    # Paarige Strukturen: FMA-ID je Seite auf das lateralisierte FMA-Kind umhaengen.
    remap_paired_sides(items, policy)

    slugs = [it["slug"] for it in items]
    if len(set(slugs)) != len(slugs):
        dupes = {s for s in slugs if slugs.count(s) > 1}
        raise SystemExit(f"Slug-Kollision nach Aufloesung: {dupes}")
    return sorted(items, key=lambda it: it["slug"])


# Z-up (Koerperhoehe) -> Y-up (three.js): Rotation -90 Grad um X. (x, y, z) -> (x, z, -y).
ZUP_TO_YUP = np.array(
    [[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], dtype=float
)
# Persistierter Rezentrierungs-Offset des Hirn-Builds. Der Kontext-Schaedel (convert_context.py)
# MUSS exakt diesen Offset verwenden, sonst liegt er nicht deckungsgleich ueber dem Hirn.
BRAIN_SPACE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "reference", "brain_space.json"
)


def build_scene(structures: list[dict]) -> tuple["trimesh.Scene", np.ndarray]:
    mins = np.array([s["mesh"].bounds[0] for s in structures]).min(axis=0)
    maxs = np.array([s["mesh"].bounds[1] for s in structures]).max(axis=0)
    center = (mins + maxs) / 2.0
    print(f"  Gesamt-Bounds (mm): {mins.tolist()} .. {maxs.tolist()}", file=sys.stderr)
    print(f"  Rezentriere um {center.tolist()}", file=sys.stderr)

    scene = trimesh.Scene()
    for s in structures:
        mesh = s["mesh"].copy()
        _ = mesh.vertex_normals  # authored Normalen vor dem Transform cachen
        mesh.apply_translation(-center)
        mesh.apply_transform(ZUP_TO_YUP)
        scene.add_geometry(mesh, geom_name=s["slug"], node_name=s["slug"])
    return scene, center


def main() -> None:
    default_src = os.path.expanduser(
        "~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260611111252"
    )
    here = os.path.dirname(os.path.abspath(__file__))
    default_out = os.path.normpath(
        os.path.join(here, "..", "..", "..", "apps", "brain-app", "public", "assets", "bodyparts3d")
    )

    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=default_src)
    ap.add_argument("--out", default=default_out)
    args = ap.parse_args()

    print(f"Lese OBJ aus: {args.src}", file=sys.stderr)
    structures = load_all(args.src)
    print(f"  {len(structures)} Strukturen (alle Dateien, kein Ausschluss)", file=sys.stderr)

    scene, center = build_scene(structures)

    os.makedirs(args.out, exist_ok=True)
    glb_path = os.path.join(args.out, "brain.raw.glb")
    scene.export(glb_path, include_normals=True)
    print(f"  GLB geschrieben: {glb_path} ({os.path.getsize(glb_path) // 1024} KB)", file=sys.stderr)

    # Rezentrierungs-Offset persistieren, damit der Kontext-Schaedel deckungsgleich baut.
    os.makedirs(os.path.dirname(BRAIN_SPACE), exist_ok=True)
    json.dump({"center_mm": center.tolist(), "axis": "zup_to_yup",
               "note": "Hirn-Build-Offset; (x,y,z)-center subtrahiert, dann (x,z,-y)."},
              open(BRAIN_SPACE, "w"), indent=2)
    print(f"  Space geschrieben: {BRAIN_SPACE} (center={center.tolist()})", file=sys.stderr)

    # Lateralitaets-Hinweise aus der Evidenz (mirror_plan.json): gespiegelte Strukturen
    # tragen die Herkunft + Asymmetrie-Warnung, nicht gespiegelte Sinus den Datensatz-Hinweis.
    mirror_note: dict[str, str] = {}
    asym_note: dict[str, str] = {}
    if os.path.exists(MIRROR_PLAN):
        for r in json.load(open(MIRROR_PLAN)):
            if r["decision"] == "MIRROR":
                mirror_note[r["left_fma"].upper()] = (
                    f"Gespiegelt aus '{r['rlabel']}' ({r['fma']}) — synthetisches Mesh "
                    "der rechten Seite; reale linksseitige Anatomie kann abweichen.")
            elif r["decision"] == "MIRROR-R":
                mirror_note[r["right_fma"].upper()] = (
                    f"Gespiegelt aus '{r['name']}' ({r['fma']}) — synthetische rechte Seite; "
                    "rechtes Gegenstueck in BodyParts3D nie modelliert, reale Anatomie kann abweichen.")
            elif r["decision"] == "LABEL-ASYM":
                asym_note[r["fma"]] = (
                    "Gegenseite nicht im Datensatz — Sinus durae matris, normale "
                    "Rechts-/Links-Asymmetrie (bewusst NICHT gespiegelt).")

    def entry(s: dict) -> dict:
        e = {
            "fma": s["fma"],
            "bp": s["bp"],
            "fileId": s["fileId"],
            "name": s["name"],
            "side": s["side"],
            "volume_cm3": s["volume_cm3"],
            "variant": s["variant"],
            "origin": s["origin"],
        }
        if s.get("mirrored"):
            e["mirrored"] = True
        if s.get("reconstructed"):
            e["reconstructed"] = True
        if s.get("merged_from"):
            e["merged_from"] = s["merged_from"]
        note = s.get("laterality_note") or mirror_note.get(s["fma"]) or asym_note.get(s["fma"])
        if note:
            e["laterality_note"] = note
        return e

    registry = {s["slug"]: entry(s) for s in structures}
    reg_path = os.path.join(args.out, "structures.json")
    with open(reg_path, "w", encoding="utf-8") as fh:
        json.dump(registry, fh, ensure_ascii=False, indent=2, sort_keys=True)
    print(f"  Register geschrieben: {reg_path} ({len(registry)} Strukturen)", file=sys.stderr)


if __name__ == "__main__":
    main()
