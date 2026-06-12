"""Kontext-Schaedel fuer den Phineas-Gage-Layer: 20 Schaedelknochen aus dem Kopf-Archiv
zu EINEM separaten, deckungsgleichen GLB.

Bewusst NICHT in brain.glb gemischt: das sind keine FMA-Hirnstrukturen, und der Hirn-
Datensatz bleibt strikt FMA-lateralisiert. Der Schaedel teilt aber den Koordinatenraum des
Hirns — er wird mit EXAKT demselben Rezentrierungs-Offset gebaut (reference/brain_space.json,
geschrieben von convert.py), sonst liegt er nicht deckungsgleich.

Ausgabe:
  - context/skull.raw.glb   ein GLB, ein benannter Node pro Knochen (Slug) -> Draco via build.sh
  - context/skull.json      Manifest: slug -> {fma, name, side, region, labels(de/la/en)}
"""

from __future__ import annotations

import json
import os
import re
import sys
from collections import defaultdict

import numpy as np
import trimesh

from convert import (
    BRAIN_SPACE, ZUP_TO_YUP, NAME_PATTERN, slugify, side_from_name, BRAIN_ADD_SRC,
)

ARCHIVE_SRC = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260611112101"
)

# Schaedel-Knochen (FMA -> de/la/en + Region). Hirnschaedel (Vault/Basis) + Gesichtsschaedel.
SKULL: dict[str, dict] = {
    "FMA52734": {"de": "Stirnbein", "la": "Os frontale", "en": "Frontal bone", "region": "vault"},
    "FMA52735": {"de": "Hinterhauptsbein", "la": "Os occipitale", "en": "Occipital bone", "region": "vault"},
    "FMA52736": {"de": "Keilbein", "la": "Os sphenoidale", "en": "Sphenoid bone", "region": "vault"},
    "FMA52738": {"de": "Schlaefenbein", "la": "Os temporale", "en": "Temporal bone", "region": "vault"},
    "FMA52739": {"de": "Schlaefenbein", "la": "Os temporale", "en": "Temporal bone", "region": "vault"},
    "FMA52740": {"de": "Siebbein", "la": "Os ethmoidale", "en": "Ethmoid bone", "region": "vault"},
    "FMA52788": {"de": "Scheitelbein", "la": "Os parietale", "en": "Parietal bone", "region": "vault"},
    "FMA52789": {"de": "Scheitelbein", "la": "Os parietale", "en": "Parietal bone", "region": "vault"},
    "FMA52891": {"de": "Lamina perpendicularis", "la": "Lamina perpendicularis ossis ethmoidalis",
                 "en": "Perpendicular plate of ethmoid", "region": "vault"},
    "FMA52892": {"de": "Jochbein", "la": "Os zygomaticum", "en": "Zygomatic bone", "region": "face"},
    "FMA52893": {"de": "Jochbein", "la": "Os zygomaticum", "en": "Zygomatic bone", "region": "face"},
    "FMA53649": {"de": "Oberkiefer", "la": "Maxilla", "en": "Maxilla", "region": "face"},
    "FMA53650": {"de": "Oberkiefer", "la": "Maxilla", "en": "Maxilla", "region": "face"},
    "FMA53647": {"de": "Nasenbein", "la": "Os nasale", "en": "Nasal bone", "region": "face"},
    "FMA53648": {"de": "Nasenbein", "la": "Os nasale", "en": "Nasal bone", "region": "face"},
    "FMA53645": {"de": "Traenenbein", "la": "Os lacrimale", "en": "Lacrimal bone", "region": "face"},
    "FMA53646": {"de": "Traenenbein", "la": "Os lacrimale", "en": "Lacrimal bone", "region": "face"},
    "FMA53655": {"de": "Gaumenbein", "la": "Os palatinum", "en": "Palatine bone", "region": "face"},
    "FMA53656": {"de": "Gaumenbein", "la": "Os palatinum", "en": "Palatine bone", "region": "face"},
    "FMA9710": {"de": "Pflugscharbein", "la": "Vomer", "en": "Vomer", "region": "face"},
}

SIDE_DE = {"left": " (links)", "right": " (rechts)", "midline": ""}
SIDE_LA = {"left": " sinistrum", "right": " dextrum", "midline": ""}
SIDE_EN = {"left": " (left)", "right": " (right)", "midline": ""}


def load_bones() -> list[dict]:
    """Pro FMA das hoechstaufgeloeste Mesh aus dem Archiv waehlen (Dubletten verwerfen)."""
    if not os.path.isdir(ARCHIVE_SRC):
        raise SystemExit(f"Kopf-Archiv fehlt: {ARCHIVE_SRC}")
    by_fma: dict[str, dict] = {}
    for f in sorted(os.listdir(ARCHIVE_SRC)):
        m = NAME_PATTERN.match(f)
        if not m or m.group("fma") not in SKULL:
            continue
        mesh = trimesh.load(os.path.join(ARCHIVE_SRC, f), process=False)
        if not isinstance(mesh, trimesh.Trimesh):
            raise ValueError(f"Erwartete ein Mesh: {f}")
        cur = by_fma.get(m.group("fma"))
        if cur is None or len(mesh.vertices) > len(cur["mesh"].vertices):
            by_fma[m.group("fma")] = {
                "fma": m.group("fma"), "name": m.group("name").strip(),
                "side": side_from_name(m.group("name")), "mesh": mesh,
            }
    missing = set(SKULL) - set(by_fma)
    if missing:
        raise SystemExit(f"Schaedel-Knochen im Archiv nicht gefunden: {sorted(missing)}")
    return list(by_fma.values())


def main() -> None:
    if not os.path.exists(BRAIN_SPACE):
        raise SystemExit(f"{BRAIN_SPACE} fehlt — erst convert.py (Hirn-Build) laufen lassen.")
    center = np.array(json.load(open(BRAIN_SPACE))["center_mm"], dtype=float)
    print(f"Hirn-Center (mm): {center.tolist()}", file=sys.stderr)

    bones = load_bones()
    # Slug eindeutig machen (links/rechts-Praefix bei paarigen Knochen).
    used: dict[str, int] = defaultdict(int)
    scene = trimesh.Scene()
    manifest: dict[str, dict] = {}
    for b in sorted(bones, key=lambda x: x["fma"]):
        meta = SKULL[b["fma"]]
        side = b["side"]
        raw = slugify(meta["en"])
        slug = f"{side}-{raw}" if side in ("left", "right") else raw
        used[slug] += 1
        if used[slug] > 1:
            slug = f"{slug}-v{used[slug]}"

        mesh = b["mesh"].copy()
        _ = mesh.vertex_normals
        mesh.apply_translation(-center)
        mesh.apply_transform(ZUP_TO_YUP)
        scene.add_geometry(mesh, geom_name=slug, node_name=slug)

        manifest[slug] = {
            "fma": b["fma"], "name": b["name"], "side": side, "region": meta["region"],
            "labels": {
                "de": meta["de"] + SIDE_DE[side],
                "la": meta["la"] + SIDE_LA[side],
                "en": meta["en"] + SIDE_EN[side],
            },
        }

    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, "..", "..", "..", "apps", "brain-app",
                                        "public", "assets", "context"))
    os.makedirs(out, exist_ok=True)
    glb = os.path.join(out, "skull.raw.glb")
    scene.export(glb, include_normals=True)
    json.dump({"version": "1.0.0", "space": "bodyparts3d-taro",
               "boneCount": len(manifest), "bones": manifest},
              open(os.path.join(out, "skull.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"  Schaedel-GLB: {glb} ({os.path.getsize(glb) // 1024} KB, {len(manifest)} Knochen)",
          file=sys.stderr)
    print(f"  Manifest: {os.path.join(out, 'skull.json')}", file=sys.stderr)

    # Vollausbau: breiter Kopf-Kontext (eigenes GLB), gleicher center.
    build_head(center, os.path.normpath(os.path.join(out, "..")))


# --- Voller Kopf-Kontext (Vollausbau) ----------------------------------------

# Region-Klassifikation (Reihenfolge zaehlt). Auto, anatomischer Name als Label.
HEAD_REGIONS: list[tuple[str, str, str]] = [
    # (region-key, deutsche Gruppenbezeichnung, Regex)
    ("eye", "Auge", r"eyeball|cornea|\biris\b|\blens\b|sclera|vitreous|\bchoroid\b|corona ciliaris|"
                     r"retina|eyebrow|palpebr|conjunctiv|ciliaris|eyelid|suspensory ligament"),
    ("muscle", "Muskeln", r"rectus|oblique|levator|tensor|capitis|mylohyoid|digastric|genioglossus|"
                          r"masseter|temporalis|pterygoid|veli palatini|orbitalis|\bmuscle\b|musculus"),
    ("ligament", "Baender/Sehnen", r"ligament|raphe|tendinous ring|\btendon\b"),
    ("nerve", "Nerven/Ganglien", r"\bnerve\b|ganglion|plexus"),
    ("gland", "Druesen", r"\bgland\b|\bduct\b|\bsac\b|saliva|lacrimal lake|nasolacrimal|canaliculus"),
    ("artery", "Arterien", r"\bartery\b|arterial|arch$"),
    ("vein", "Venen/Sinus", r"\bvein\b|\bsinus\b|venous"),
    ("cartilage", "Knorpel", r"cartilage"),
    ("teeth", "Zaehne/Gingiva", r"tooth|molar|premolar|incisor|canine|gingiv|dental"),
    ("vertebra", "Halswirbelsaeule", r"\batlas\b|\baxis\b|vertebra|intervertebral|odontoid"),
    ("bone", "Knochen", r"\bbone\b|concha|maxilla|mandible|palatine|vomer|turbinate|nasal septum"),
    ("ear", "Ohr", r"external ear|auricle|\bear\b|pinna"),
    ("airway", "Mund/Rachen/Nase", r"pharyn|laryn|tonsil|palate|uvula|epiglott|nasal|tongue|naris|choana|mucosa|labi|\blip\b"),
]
# Bewusst NICHT in den Kontext: nur Haare (Zaehne/Gingiva auf User-Wunsch wieder aufgenommen).
HEAD_EXCLUDE = re.compile(r"\bhair\b", re.I)


def _norm(n: str) -> str:
    n = re.sub(r"\b(left|right)\b", "", n.lower())
    n = re.sub(r"\bof (left|right)\b", "of", n)
    return re.sub(r"[^a-z0-9]+", " ", n).strip()


def classify_region(name: str) -> str | None:
    for key, _de, rx in HEAD_REGIONS:
        if re.search(rx, name, re.I):
            return key
    return None


def build_head(center: np.ndarray, asset_dir: str) -> None:
    """Voller Kopf-Kontext (Vollausbau): alle sinnvollen Kopf-Strukturen aus dem groesseren
    Download, die NICHT schon im Hirn-Satz oder im Schaedel-GLB sind und keine Zaehne/Gingiva/
    Haare. Deckungsgleich (gleicher center). Auto-Region + anatomischer Name als Label."""
    brain = json.load(open(os.path.join(asset_dir, "bodyparts3d", "structures.json"), encoding="utf-8"))
    skull = json.load(open(os.path.join(asset_dir, "context", "skull.json"), encoding="utf-8"))["bones"]
    have_fma = {v["fma"] for v in brain.values()} | {v["fma"] for v in skull.values()}
    have_norm = {_norm(v["name"]) for v in brain.values()} | {_norm(v["name"]) for v in skull.values()}

    if not os.path.isdir(BRAIN_ADD_SRC):
        raise SystemExit(f"Kopf-Download fehlt: {BRAIN_ADD_SRC}")

    # Pro FMA bestes Mesh (hoechste Aufloesung).
    by_fma: dict[str, dict] = {}
    for f in sorted(os.listdir(BRAIN_ADD_SRC)):
        m = NAME_PATTERN.match(f)
        if not m:
            continue
        fma, name = m.group("fma"), m.group("name").strip()
        if fma in have_fma or _norm(name) in have_norm or HEAD_EXCLUDE.search(name):
            continue
        region = classify_region(name)
        if region is None:
            continue  # nicht klassifizierbar -> kein sinnvoller Kontext-Teil
        mesh = trimesh.load(os.path.join(BRAIN_ADD_SRC, f), process=False)
        if not isinstance(mesh, trimesh.Trimesh):
            continue
        cur = by_fma.get(fma)
        if cur is None or len(mesh.vertices) > len(cur["mesh"].vertices):
            by_fma[fma] = {"fma": fma, "name": name, "side": side_from_name(name),
                           "region": region, "mesh": mesh}

    scene = trimesh.Scene()
    manifest: dict[str, dict] = {}
    used: dict[str, int] = defaultdict(int)
    region_counts: dict[str, int] = defaultdict(int)
    for b in sorted(by_fma.values(), key=lambda x: (x["region"], x["name"])):
        raw = slugify(b["name"])
        used[raw] += 1
        slug = raw if used[raw] == 1 else f"{raw}-v{used[raw]}"
        mesh = b["mesh"].copy()
        _ = mesh.vertex_normals
        mesh.apply_translation(-center)
        mesh.apply_transform(ZUP_TO_YUP)
        scene.add_geometry(mesh, geom_name=slug, node_name=slug)
        manifest[slug] = {
            "fma": b["fma"], "name": b["name"], "side": b["side"], "region": b["region"],
            "labels": {"de": b["name"], "la": b["name"], "en": b["name"]},
        }
        region_counts[b["region"]] += 1

    region_labels = {key: de for key, de, _ in HEAD_REGIONS}
    glb = os.path.join(asset_dir, "context", "head.raw.glb")
    scene.export(glb, include_normals=True)
    json.dump({"version": "1.0.0", "space": "bodyparts3d-taro",
               "structureCount": len(manifest), "regionLabels": region_labels,
               "structures": manifest},
              open(os.path.join(asset_dir, "context", "head.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"  Kopf-Kontext-GLB: {glb} ({os.path.getsize(glb) // 1024} KB, {len(manifest)} Strukturen)",
          file=sys.stderr)
    print(f"  Regionen: {dict(region_counts)}", file=sys.stderr)


if __name__ == "__main__":
    main()
