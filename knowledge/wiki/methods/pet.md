---
type: method
title: "Positronen-Emissions-Tomographie (PET)"
aliases: ["PET", "Positronenemissionstomographie", "PET-Scan"]
tags: [bildgebung, nuklearmedizin, tracer, neurochemie]
created: 2026-06-23
updated: 2026-06-23
sources:
  - "Lehrner et al. (2011) Klinische Neuropsychologie, Kap. PET in der Neurologie (S. 265 ff.)"
  - "Lehrner et al. (2011), Kap. PET in der Neurologie, Z. 5455–5507 — PET-Prinzip, Koinzidenzdetektion, Aufloesung, Bildrekonstruktion, Strahlenbelastung"
  - "Lehrner et al. (2011), Kap. PET in der Neurologie, Z. 5509–5636 — Radiopharmaka: FDG-Glukosemetabolismus, Flumazenil/cBZR, Perfusion, dopaminerge Synapse, weitere Tracer"
  - "Lehrner et al. (2011), Kap. PET in der Neurologie, Z. 5638–5737 — Klinischer Einsatz: Demenz-Differenzialdiagnose (FDG/PIB), Bewegungsstoerungen, Epilepsie, zerebrovaskulaere Erkrankungen, Tumoren"
  - "Lehrner et al. (2011), Kap. 5 Methoden, Z. 4778–4802 — PET/SPECT-Ueberblick: Annihilationsphotonen, Quantifizierung, Vergleich mit SPECT"
  - "Jäncke (2021) Lehrbuch Kognitive Neurowissenschaften, Kap. 5.12"
  - "Jäncke (2021), Kap. 5.12, Z. 1829–1844 — PET-Grundprinzip, Tracer (FDG, F-DOPA), raeumliche/zeitliche Aufloesung, Neurotransmitter-Mapping"
  - "Karnath & Thier (2012), Kap. 2.1.1, Z. 624–636 — PET-Physik: Radioisotope, Koinzidenzdetektion, rCBF-Messung mit H₂¹⁵O, zeitliche Aufloesung"
  - "Bear et al. (2018), Exkurs 7.3, Z. 4311–4333 — PET-Verfahren: 2-DG-Methode, Detektorprinzip, Subtraktionsmethode, Aufloesung und Limitationen"
  - "Bear et al. (2018), Kap. 21, Z. 13144–13167 — PET-Untersuchung merkmalsbasierter Aufmerksamkeit (Petersen-Studie: Farbe/Form/Geschwindigkeit)"
see_also: ["[[fmri]]", "[[dopamin]]", "[[demenz]]", "[[spect]]"]
---

# Positronen-Emissions-Tomographie (PET)

Funktionelles nuklearmedizinisches Bildgebungsverfahren zur Darstellung und Quantifizierung zerebraler Stoffwechselprozesse und Neurotransmittersysteme in vivo. Hauptvorteil gegenueber [[fmri]]: direkte neurochemische Information statt indirektes haemodynamisches Signal.

## Physikalisches Prinzip

- **Positronen-Emitter** (z. B. ¹⁸F, ¹¹C, ¹⁵O) werden im Zyklotron hergestellt und an organische Molekuele gekoppelt (Tracer)
- Positron trifft auf Elektron → **Annihilation** → zwei **511-keV-Gammaquanten**, die in 180° auseinanderstreben
- **Koinzidenzdetektion:** Ringfoermig angeordnete Detektoren registrieren nur zeitgleich auftreffende Photonenpaare → raeumliche Lokalisation des Zerfallsortes
- Bildrekonstruktion via Filtered Back Projection oder iterative Algorithmen (OSEM); Schwaechwungskorrektur erforderlich

## Raeumliche und zeitliche Aufloesung

- **Raeumlich:** 3–6 mm FWHM (besser als SPECT mit 7–8 mm)
- **Zeitlich:** Minuten (bestimmt durch Tracer-Halbwertszeit) — deutlich langsamer als [[fmri]] (Sekunden) oder [[eeg-methodik-erps|EEG]] (Millisekunden)
- Strahlenbelastung: 5–20 mSv je nach Tracer und Dosis; Wiederholungsmessungen ethisch eingeschraenkt

## Tracer und Anwendungen

| Tracer | Ziel | Klinische Anwendung |
|--------|------|---------------------|
| ¹⁸F-FDG | Glukosemetabolismus (rCMRglc) | Demenzabklaerung, Tumordiagnostik, Epilepsie-Fokuslokalisation |
| ¹⁸F-Fluorodopa | Dopaminerge Nervenendigungen | Fruehdiagnose M. Parkinson |
| ¹¹C-Raclopride | D2-Rezeptorbindung | Schizophrenie, Suchtforschung |
| ¹¹C-PiB / ¹⁸F-Florbetapir | Amyloid-Plaques | Alzheimer-Diagnostik (Amyloid-PET) |
| ¹¹C-Flumazenil | GABA-A/Benzodiazepinrezeptoren | Epilepsie (neuronale Integritaet) |
| ¹¹C-DASB | Serotonin-Transporter | Depression, psychiatrische Forschung |

**FDG-PET** ist die haeufigste Untersuchung: Graue Substanz 40–60 μmol/100 g/min, weisse Substanz 10–20 μmol/100 g/min; hoechster Verbrauch in Basalganglien und parietalem Kortex.

## Vergleich mit fMRI

| Aspekt | PET | [[fmri]] |
|--------|-----|------|
| Signal | Direkte Neurochemie (Metabolismus, Rezeptoren) | Indirektes BOLD (haemodynamisch) |
| Zeitliche Aufloesung | Minuten | Sekunden |
| Raeumliche Aufloesung | 3–6 mm | 1–3 mm |
| Invasivitaet | Radioaktiver Tracer i.v. | Nichtinvasiv |
| Wiederholbarkeit | Eingeschraenkt (Strahlung) | Unbegrenzt |
| Staerke | Transmitter-Mapping, Rezeptorbindung | Kognitive Paradigmen, Konnektivitaet |

## Klinische Relevanz

- **Demenz:** FDG-Hypometabolismus temporoparietal (Alzheimer) vs. frontal (FTD); Amyloid-PET zur Fruehdiagnose
- **Parkinson:** DAT-Scan (SPECT/PET) zeigt dopaminerge Degeneration vor CT/MRT-Befund
- **Epilepsie:** Interiktaler Hypometabolismus lokalisiert Fokus (FDG-PET der SPECT ueberlegen)
- **Psychiatrie:** Rezeptor-Mapping bei Schizophrenie, Depression, Sucht
- Seit Verfuegbarkeit von PET-CT und PET-MRT zunehmend multimodale Integration
