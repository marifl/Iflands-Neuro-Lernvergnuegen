---
type: topic
title: "MNI-Koordinatensysteme — Überblick und Praxisrelevanz"
aliases: ["MNI-Spaces", "Koordinatensysteme", "Stereotaktischer Raum"]
tags: [mni, koordinatensysteme, template, fsaverage, registrierung, eeg]
created: 2026-06-23
updated: 2026-06-23
sources:
  - "[[lead-dbs-mni-spaces]]"
  - "Jäncke (2024), Kap. 5 Strukturelle Bildgebung, Z. 1776–1794"
  - "Karnath & Thier (2012), Kap. 2 Datenanalyse fMRT/PET, Z. 702–712"
  - "Karnath & Thier (2012), Kap. 2.2.3 Voxelbasierte Morphometrie, Z. 810–812"
---

# MNI-Koordinatensysteme

## Kernproblem

„MNI-Space" ist **kein einzelner Raum**, sondern eine Familie von Templates, die sich in Aufloesung, Registrierungsmethode und damit in der exakten Position anatomischer Strukturen unterscheiden. Fuer Ganzhirn-fMRI mit 8 mm Smoothing irrelevant; fuer subkortikale Strukturen (STN, GPi) oder praezise Areal-Zuordnung **Millimeter-relevant**.

## Die wichtigsten Spaces

### Volume-basiert (Voxel-Gitter)

| Space | Template | Aufloesung | Hauptnutzer |
|-------|----------|------------|-------------|
| MNI152NLin6thGen | 152 Hirne, nonlinear | ~1 mm | **FSL**, **SPM** (via IXI549) |
| MNI152NLin2009bAsym | 152 Hirne, nonlinear, 2009-Update | **0.5 mm** | **Lead-DBS** |
| MNI152NLin2009cAsym | wie 2009b, 1 mm | 1 mm | **Julich-Brain v3** (nativ) |

**Unterschied 6th-gen vs. 2009:** Subkortikale Strukturen (GPi, STN) verschieben sich messbar. Horn 2016 publizierte einen ANTs-Warp zwischen beiden (figshare).

### Surface-basiert

| Space | Basis | Hauptnutzer |
|-------|-------|-------------|
| **fsaverage** | Buckner40/GSP, FreeSurfer-Rekon | FreeSurfer, MNE-Python, HCP (teilw.) |
| **fsLR** | HCP-angepasst, MNI152NLin6thGen-aligned | HCP, Connectome Workbench |

**fsaverage vs. MNI-Volume:** Grob aligned, aber verschiedene Subject-Pools. Praezise Konversion: Wu/Yeo 2018 (ThomasYeoLab/CBIG).

## Relevanz fuer die brain-app

### Unsere drei „Hirne"

1. **fsaverage** (Atlas-Modus) — kanonische Surface, alle Atlanten nativ (0 mm Fehler). EEG-Source-Localization ueber MNE-Python landet direkt hier. **Praeziser Referenz-Space.**
2. **TARO** (BodyParts3D, Figur-Modi) — Einzelindividuum, kein MNI-Space, ~22 mm Offset zum MNI. Schematischer Figur-Layer fuer „welche Region leuchtet". 60 Carve-Patches (DKT, Julich, Brodmann).
3. **MNI152-ICBM-2009c-Asym** — Quell-Space der [[julich-brain-v3]]-Geometrie. Wird via Within-Host-Split auf TARO projiziert (Mediane 4.1 mm Julich / 2.3 mm DKT).

### EEG-Bruecke

Standard-EEG-Quellenlokalisation (MNE-Python: `mne.minimum_norm`) liefert Source Estimates auf **fsaverage**. Da unser Atlas-Modus fsaverage-Meshes nutzt, ist der Anschluss direkt: Dipol-/Source-Map-Daten koennen ohne Raum-Transformation auf der korrekten Anatomie visualisiert werden. Das eliminiert den Umweg ueber 2D-Topoplots oder halbpraezise MNI-Volume-Projektionen.

### Didaktischer Wert

Die Unterschiede zwischen den Spaces sind selbst ein lehrreiches Thema:
- **Warum gibt es mehrere MNI-Spaces?** (historische Entwicklung, Talairach → MNI305 → 152 → 2009)
- **Space vs. Template** (gleiche Koordinate, andere Anatomie)
- **Volume vs. Surface** (wann welcher Ansatz — fMRI vs. EEG vs. Konnektomik)
- **Individuum vs. Template** (TARO vs. MNI152 — warum man nicht 1:1 mappen kann)

## Externe Ressourcen

- **templateflow.org** — kuratierte Registry aller MNI-Templates + Transforms
- **BIDS Coordinate Systems Appendix** — formale Space-Definitionen
- **Lead-DBS** — praktische Umsetzung der Space-Problematik fuer DBS-Imaging
- **Wu/Yeo 2018** — MNI↔fsaverage praezise Konversion (GitHub: ThomasYeoLab/CBIG)

## Siehe auch

- [[lead-dbs-mni-spaces]] (Source)
- [[julich-brain-v3]] (Atlas)
- fsaverage-Atlas-Modus (Method)

## Merkpunkte

- Der Begriff beschreibt ein funktionelles Konzept, das bestimmte Verarbeitungs- oder Verhaltensleistungen erklärt.
- Achte auf die zugehörigen Netzwerke, typischen Leistungsprofile und die Richtung der Störung.
- Für Lokalisation, Befund und Differenzialdiagnose ist die Seite als Einordnungshilfe wichtig.
