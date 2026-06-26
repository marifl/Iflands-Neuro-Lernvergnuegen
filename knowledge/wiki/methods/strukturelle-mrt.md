---
type: method
title: "Strukturelle Magnetresonanztomographie (MRT)"
aliases: ["strukturelle MRT", "sMRT", "anatomische MRT", "VBM", "DTI", "Diffusion Tensor Imaging"]
tags: [bildgebung, morphometrie, diffusion, traktographie, white-matter]
created: 2026-06-23
updated: 2026-06-23
sources:
  - "Lehrner et al. (2011) Klinische Neuropsychologie, Kap. Neuroradiologie (S. 241 ff.)"
  - "Lehrner et al. (2011), Kap. 2.2, Z. 5152–5191 — MRT-Grundlagen: Kernspinprinzip, T1-/T2-Gewichtung, neue Sequenztechniken, Kontraindikationen"
  - "Lehrner et al. (2011), Kap. 3.5/3.6, Z. 5253–5266 — T2-gewichtete MS-Bildgebung, VBM bei neurodegenerativen Erkrankungen, T1-/T2-Sequenzwahl"
  - "Jäncke (2021) Lehrbuch Kognitive Neurowissenschaften, Kap. 5.3"
  - "Jäncke (2021), Kap. 5.3.1, Z. 1726–1806 — MRT-Grundprinzip (Kernspin, Relaxation, T1/T2), strukturelle Bildgebung, VBM-Methode, DTI/Anisotropie, kortikale Dicke"
  - "Jäncke (2021), Kap. 5 Zusammenfassung, Z. 2083–2097 — Kompakte Wiederholung sMRT, VBM-Schritte, DTI-Prinzip"
  - "Bear et al. (2018), Exkurs 7.2, Z. 4279–4309 — Fokus Magnetresonanztomografie: Grundprinzip, Wasserstoffatome, Resonanzfrequenz, raeumliche Codierung"
see_also: ["[[fmri]]", "[[fasciculus-arcuatus]]", "[[hippocampus]]", "[[mni-koordinatensysteme]]", "[[dti-traktographie]]"]
---

# Strukturelle Magnetresonanztomographie (MRT)

Nichtinvasive Bildgebung der Hirnanatomie auf Basis der Kernspinresonanz. Grundlage fuer morphometrische Analysen (VBM, kortikale Dicke) und Fasertrakt-Rekonstruktion (DTI/Traktographie).

## Kontrastgewichtungen

| Gewichtung | Kontrast | Hauptanwendung |
|------------|----------|----------------|
| **T1-gewichtet** | Graue Substanz dunkel, weisse Substanz hell → gute GM/WM-Differenzierung | Anatomische Detaildarstellung, VBM, kortikale Dicke |
| **T2-gewichtet** | Fluessigkeit hell (Liquor, Oedem) | Laesionsdetektion, Blutungen, Tumore |
| **FLAIR** | T2-Signal mit unterdruecktem Liquor | MS-Plaques (Balkenherde), periventrikulaere Laesionen |
| **DWI** (diffusionsgewichtet) | Eingeschraenkte Diffusion hell | Akute Ischaemie (zytotoxisches Oedem) — sensitiver als CT in der Fruehphase |

## Voxel-Based Morphometry (VBM)

Quantitativer Vergleich lokaler Hirnvolumina zwischen Gruppen (Ashburner & Friston, 2000):

1. **Normalisierung** in stereotaktischen Standardraum ([[mni-koordinatensysteme|MNI152]])
2. **Segmentierung** in graue Substanz, weisse Substanz, Liquor
3. **Raeumliche Glaettung** (Gauss-Kernel, z. B. 8 mm) → Reduktion auf unabhaengige Volumina (Resels)
4. **Voxelweise Statistik** (t-Tests pro Voxel, Korrektur fuer multiples Testen)

Anwendungen: Atrophie bei [[demenz]], strukturelle Veraenderungen bei psychiatrischen Stoerungen, Plastizitaet durch Lernen (z. B. Musiker, Taxifahrer).

## Kortikale Dicke (FreeSurfer)

- Berechnung der Distanz zwischen pialer Oberflaeche und Grenze GM/WM pro Vertex
- Kortikale Dicke und kortikale Flaeche sind Marker fuer unterschiedliche Phaenomene: Flaeche wird frueh in der Fetalentwicklung festgelegt, Dicke veraendert sich durch Reifung, Lernen und Krankheit
- Komplementaer zu VBM: oberflaechenbasiert statt volumenbasiert

## Diffusion Tensor Imaging (DTI)

Misst die **Diffusion von Wassermolekuelen** im ZNS. In Fasertrakten ist die Diffusion anisotrop (eingeschraenkt senkrecht zur Faserrichtung), in Liquor isotrop (gleichmaessig in alle Richtungen).

- **Fraktionale Anisotropie (FA):** Kennwert 0 (isotrop) bis 1 (maximal anisotrop) — hohe FA in intakten Kabelsystemen, reduziert bei Demyelinisierung oder axonaler Schaedigung
- **Hauptdiffusionsrichtung:** Zeigt die Faserrichtung pro Voxel an

### Traktographie

Rekonstruktion von Faserbahnen anhand der Diffusionsrichtungen:

| Methode | Prinzip | Staerke |
|---------|---------|---------|
| **Deterministisch** | Streamline folgt Hauptdiffusionsrichtung | Schnell, anschaulich |
| **Probabilistisch** | Modelliert Unsicherheit, multiple Pfade | Robuster bei Faserkreuzungen |

Klinisch und wissenschaftlich relevant: [[fasciculus-arcuatus]], Corpus callosum, Capsula interna, kortikospinaler Trakt. FA korreliert z. B. bei Musikern mit Trainingsstunden.

### TBSS (Tract-Based Spatial Statistics)

Skelettbasierte Gruppenanalyse von FA-Werten entlang der Hauptfaserzuege — reduziert Registrierungsfehler gegenueber voxelweiser DTI-Statistik.

## Klinische Relevanz

- **Schlaganfall:** DWI zeigt akute Ischaemie innerhalb von Minuten (CT oft noch unauffaellig); Perfusions-MRT differenziert Penumbra
- **Multiple Sklerose:** FLAIR detektiert Entmarkungsherde; DTI quantifiziert subklinische WM-Schaedigung
- **Demenz:** VBM zeigt Hippocampus-Atrophie bei Alzheimer, frontale Atrophie bei FTD
- **Parkinson:** Konventionelles MRT oft unauffaellig → ergaenzend [[pet|PET/SPECT]]
- **Neurochirurgie:** DTI-Traktographie zur praeoperativen Planung (Schonung eloquenter Bahnen)

## Vergleich mit funktioneller Bildgebung

| Aspekt | Strukturelle MRT | [[fmri]] |
|--------|-----------------|------|
| Misst | Anatomie, Gewebeeigenschaften | Haemodynamische Aktivitaet (BOLD) |
| Zeitliche Dimension | Statisch (Momentaufnahme) | Dynamisch (Sekunden) |
| Raeumliche Aufloesung | ≤1 mm (T1), 1–2 mm (DTI) | 2–3 mm |
| Komplementaer | Morphologie, Konnektom-Struktur | Funktionelle Konnektivitaet |
