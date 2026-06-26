---
type: atlas
title: "DKT-Atlas (Desikan-Killiany-Tourville)"
aliases: ["DKT", "Desikan-Killiany", "FreeSurfer DKT", "gyrale Parzellierung"]
tags: [atlas, freesurfer, gyral, dkt, carve, fsaverage]
created: 2026-06-23
updated: 2026-06-23
sources: ["Desikan et al. 2006, NeuroImage", "Klein & Tourville 2012, Front Neurosci"]
see_also: ["[[julich-brain-v3]]", "[[brodmann-areale]]", "[[destrieux-atlas]]", "[[mni-koordinatensysteme]]"]
---

# DKT-Atlas (Desikan-Killiany-Tourville)

**Typ:** Gyraler (makroanatomischer) Oberflächen-Atlas
**Originalraum:** FreeSurfer fsaverage
**Labels:** 62 kortikale Labels (31 pro Hemisphäre)
**Quelle:** FreeSurfer; Desikan et al. 2006, revidiert durch Klein & Tourville 2012

## Was ist der DKT-Atlas?

Automatisierte gyrale Parzellierung der kortikalen Oberfläche auf Basis von Sulcus-Landmarken. Jedes Label entspricht einem anatomischen Gyrus oder einer definierten Subregion. Standard-Atlas in FreeSurfer (`aparc.DKTatlas`).

## Granularitaet

- 62 Labels (31 bilateral) — moderate Auflösung
- Gyrus-basiert: folgt sichtbaren Sulcus-Grenzen
- Kein Zugang zu zytoarchitektonischen Subarealen (dafür → [[julich-brain-v3]])

## Kapitel-11-relevante DKT-Labels

| DKT-Label | Brodmann-Äquivalent | Brain-Region |
|-----------|---------------------|-------------|
| `parsopercularis` | BA 44 | [[vlpfc]] |
| `parstriangularis` | BA 45 | [[vlpfc]] |
| `parsorbitalis` | BA 47 | [[vlpfc]] / [[ofc]] |
| `rostralanteriorcingulate` | BA 32 (rostral) | [[acc]] |
| `caudalanteriorcingulate` | BA 24 (kaudal) | [[acc]] |
| `lateralorbitofrontal` | BA 11/47 | [[ofc]] |
| `medialorbitofrontal` | BA 11/12 | [[ofc]] / [[vmpfc]] |
| `rostralmiddlefrontal` | BA 9/46 | [[dlpfc]] |
| `caudalmiddlefrontal` | BA 8/6 | [[dlpfc]] (kaudal) |
| `frontalpole` | BA 10 | [[frontalpol]] |

## Nutzung in der Brain-App

| Kontext | Datei | Details |
|---------|-------|---------|
| **TARO-Carve** | `atlas-carved-dkt.glb` | 60 Patches auf TARO-Oberfläche; Fußleiste → „Atlas auf Hirn → DKT" |
| **fsaverage Canonical** | Atlas-Modus | DKT als einer von 4 Kortex-Layern |
| **Shelf** | `scripts/atlas/work/atlas-dkt.glb` | 60 Parzellen |

DKT liefert die figur-relevante gyrale Granularität: `pars*` = BA 44/45/47, ACC-Subdivision, OFC lateral/medial — die Brücke zwischen makroskopischer Anatomie und den [[brodmann-areale]]n.

## Stärken

- Robust automatisierbar (FreeSurfer-Pipeline)
- Gyrale Grenzen gut reproduzierbar zwischen Probanden
- Deckt den gesamten Kortex mit kompakter Labelzahl ab
- Gute Korrespondenz zu klinisch-neurowissenschaftlicher Terminologie

## Limitierungen

- Keine zytoarchitektonische Auflösung (BA 44 vs. 45 nur über Gyrus-Proxy)
- 62 Labels = relativ grob verglichen mit [[destrieux-atlas]] (148) oder [[julich-brain-v3]] (292)
- Sulci nicht als eigene Labels segmentiert (anders als [[destrieux-atlas]])
