# BodyParts3D-Asset-Pipeline

Erzeugt die 3D-Hirngeometrie der App aus dem **BodyParts3D**-Datensatz
(TARO-Ganzkörper-MRT, FMA-codiert). Ergebnis: ein benanntes, Draco-komprimiertes
`brain.glb` plus Kontext-Meshes (Kopf/Schädel) und die Struktur-Ontologie.

> **Quelldaten nicht im Repo** (Lizenz/Größe): das BodyParts3D-OBJ-Paket selbst von
> <https://lifesciencedb.jp/bp3d/> beziehen und dem Build per Pfad übergeben.
> Lizenz/Zitation: [`../../../THIRD-PARTY-NOTICES.md`](../../../THIRD-PARTY-NOTICES.md).

## Voraussetzungen

- Python-venv mit `trimesh`, `numpy` (z.B. `apps/brain-app/.venv`)
- `gltf-transform` (Node, global oder via `pnpm dlx`)

## Build

```bash
# Pfad = entpacktes BodyParts3D-OBJ-Paket; ersetzt apps/brain-app/public/assets/bodyparts3d/brain.glb
./build.sh /pfad/zum/bodyparts3d-obj-paket
```

`build.sh` orchestriert: `convert.py` (OBJ → Roh-GLB + Register) → Draco-Kompression
(16-bit Position, anatomisch verlustfrei) → `convert_context.py` (Kopf/Schädel-Kontext).

## Skripte

| Skript | Zweck |
|--------|-------|
| `build.sh` | Orchestrator der gesamten Pipeline (s.o.) |
| `convert.py` | BodyParts3D-OBJ-Satz → ein benanntes GLB + Struktur-Register |
| `convert_context.py` | Kontext-Schädel (20 Knochen) + Kopf-Kontext für den Phineas-Gage-Layer |
| `mirror_meshes.py` | erzeugt fehlende kontralaterale Strukturen durch Spiegelung an der Mittelsagittalebene |
| `ontology.py` | Hybrid-Ontologie der BodyParts3D-Hirnstrukturen (Hierarchie, Slugs) |
| `fma_audit.py` | FMA-Diskrepanz-Report (Qualitätssicherung der Codierung) |
| `laterality_audit.py` | Lateralitäts-/Volumen-Audit über den Strukturbestand |

`reference/` enthält die BodyParts3D-Ontologie-Listen (isa/partof) und Audit-Caches,
die diese Skripte einlesen bzw. erzeugen.

> Für die Atlas-Registrierung (Julich/DKT/Brodmann/fsaverage auf dieses `brain.glb`)
> siehe [`../../atlas/README.md`](../../atlas/README.md).
