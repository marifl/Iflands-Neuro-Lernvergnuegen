---
type: source
title: "About the MNI space(s) — Lead-DBS"
aliases: ["MNI-Spaces Lead-DBS", "Horn MNI-Spaces"]
tags: [mni, koordinatensysteme, template, space, registrierung]
sources:
  - "Jäncke (2013), Kap. 5.3, Z. 1776–1794 — Stereotaktische Normalisierung in Talairach- oder MNI-Standardraum als Schritt der VBM-Pipeline"
  - "Karnath & Thier (2012), Kap. 2.1 Datenanalyse, Z. 700–712 — Transformation in standardisierten anatomischen Raum (Talairach-Atlas, MNI305-Referenzgehirn), räumliche Normalisierung und Glättung"
created: 2026-06-23
updated: 2026-06-23
source_path: "https://www.lead-dbs.org/about-the-mni-spaces/"
---

# About the MNI space(s) — Lead-DBS

Ueberblicksartikel von Andreas Horn (Charite/Lead-DBS) ueber die historische Entwicklung und die Unterschiede der verschiedenen MNI-Spaces. Kernbotschaft: **es gibt nicht „den" MNI-Space** — die subtilen Unterschiede zwischen Template-Versionen sind fuer DBS-Imaging (und jede Anwendung wo Millimeter zaehlen) relevant.

## Chronologie der MNI-Templates

| Template | Jahr | Methode | Aufloesung | Modalitaeten | Genutzt von |
|----------|------|---------|------------|--------------|-------------|
| **MNI305** | ~1993 | 305 Hirne, 9-param linear auf Talairach | grob | T1 | historisch |
| **Colin27** | ~1998 | 1 Proband (Colin Holmes), 27 Scans, auf MNI305 | mittel | T1 | SPM96 |
| **MNI152 linear** | ~1999 | 152 Hirne, 9-param linear auf MNI305 | mittel | T1 | SPM99+, ICBM |
| **MNI152 NLIN 6th-gen** | ~2001 | 152 Hirne, nonlinear auf MNI305 | mittel | T1 | **FSL**, **SPM** (via IXI549) |
| **Colin27 HiRes** | 2008 | Hochaufloesungs-Rescan | hoch | T1, T2 | Spezialanwendungen |
| **MNI152 NLIN 2009a** | 2009 | 152, nonlinear, verbessert | 1mm | T1, T2, PD, T2-relax | Forschung |
| **MNI152 NLIN 2009b** | 2009 | wie 2009a | **0.5mm** | T1, T2, PD | **Lead-DBS** (asym) |
| **MNI152 NLIN 2009c** | 2009 | wie 2009a | 1mm | T1, T2, PD | Forschung |
| **HCP** | ~2017 | 900 Probanden, nonlinear auf 6th-gen | hoch | multi | HCP-Oekosystem |

## Kernerkenntnisse

1. **Space ≠ Template.** Ein „Space" definiert nur die Bounding-Box in mm um ein Hirn. Dieselbe Koordinate kann je nach Template in einer anderen anatomischen Struktur landen.
2. **6th-gen ≠ 2009b.** Die meisten Ressourcen (FSL, SPM, Community-Atlanten) liegen in 6th-gen. Lead-DBS nutzt 2009b (hoechste Aufloesung, T2 verfuegbar). Subkortikale Strukturen (GPi, STN) verschieben sich messbar zwischen beiden.
3. **Horn 2016 Warp** (figshare doi:10.6084/m9.figshare.3502238): Nonlinearer ANTs-Transform 6th-gen → 2009b. Damit wurden ATAG, Oxford Thalamic, BGHAT u.a. in 2009b-Space transformiert.
4. **fsaverage ≈ MNI** (grob), aber eigenes Subject-Set (Buckner40/GSP). Praezise Konversion: Wu/Yeo 2018 (ThomasYeoLab/CBIG).
5. **IXI549Space** (SPM Unified Seg / DARTEL / SHOOT): aehnlich MNI152, basiert auf IXI-Dataset — „largely similar", aber nicht identisch.
6. **BIDS Coordinate Systems Appendix** ist die aktuelle formale Referenz fuer Space-Definitionen.

## Relevanz fuer brain-app

- Unsere [[julich-brain-v3]] liegt nativ in **MNI152-ICBM-2009c-Asym** (nicht 2009b — Achtung: c ≠ b, aber Unterschied minimal).
- Unser fsaverage-Atlas-Modus ist Surface-based und damit von den Volume-Space-Problemen weitgehend entkoppelt.
- TARO ist ein Einzelindividuum-Mesh (BodyParts3D) — keiner der MNI-Spaces. Der ~22 mm laterale Offset zum MNI ist dokumentiert.
- EEG-Source-Localization (MNE-Python) arbeitet nativ in fsaverage → direkter Anschluss an unseren Atlas-Modus.

## Referenzen

- Brett et al. 2002, Nature Reviews Neuroscience 3(3), doi:10.1038/nrn756
- Horn 2016, figshare, doi:10.6084/m9.figshare.3502238
- Lorio et al. 2016, NeuroImage 130, doi:10.1016/j.neuroimage.2016.01.062
- BIDS Coordinate Systems: https://bids-specification.readthedocs.io/en/latest/99-appendices/08-coordinate-systems.html
- templateflow.org — kuratierte Template-Registry

## Merkpunkte

- Die Quelle liefert die Primärreferenz für ein zentrales Konzept oder eine Methode im Wiki.
- Nutze sie, um Definition, Studiendesign und Kernaussage sauber zu belegen.
- Sie ist besonders wichtig, wenn spätere Übersichtsseiten auf dieselbe Evidenz aufbauen.
