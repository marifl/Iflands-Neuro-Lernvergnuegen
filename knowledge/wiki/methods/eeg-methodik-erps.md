---
type: method
title: "EEG-Methodik: ERPs und exekutive Funktionen"
aliases: ["ERPs", "Evozierte Potenziale", "Ereigniskorrelierte Potenziale", "VCPT", "Visual-Continuous-Performance-Test", "ICA-ERP"]
tags: [eeg, erp, ica, inhibition, monitoring, source-localization]
created: 2026-06-23
updated: 2026-06-23
sources:
  - "[[jaencke-kapitel11-exekutive-funktionen]]"
  - "Jäncke (2021), Kap. 5.4 Elektrophysiologie, Z. 1846–1945 (EEG-Grundlagen, Frequenzbänder, EKP-Methode, P1/N1/P3, MMN, CNV, Bereitschaftspotenzial)"
  - "Jäncke (2021), Kap. 5.8/5.11, Z. 2004–2075 (EEG-Neurofeedback, BCI, ICA, mobile EEG)"
  - "Karnath & Thier (2012), Kap. 2.3 Elektrophysiologische Verfahren, Z. 876–925 (EEG-Signalgenese, EKP-Averaging, N1/P300/N400, Zeit-Frequenz-Analyse)"
  - "Karnath & Thier (2012), Glossar, Z. 38488 (ereigniskorrelierte Potenziale)"
  - "Karnath & Thier (2012), Kap. 71 Brain-Computer-Interface, Z. 12741–12862 (EEG-basierte BCI, P300-BCI, SMR-Feedback, Rehabilitation)"
  - "Lehrner et al. (2011), Klinische Elektrophysiologie, Z. 4029–4113 (klinisches EEG, Frequenzbänder, Epilepsie, Hirntod, Polysomnografie)"
  - "Lehrner et al. (2011), Kap. 4.4.2 EEG, Z. 4606–4701 (Forschungs-EEG, FFT/Wavelet, ERD/ERS, EKP-Komponenten, Quellenlokalisation, LORETA, BCI)"
  - "Bear et al. (2018), Kap. 19 Hirnrhythmen und Schlaf, Z. 11830–12010 (EEG-Geschichte, Rhythmen Delta–Gamma, thalamokortikale Oszillatoren, Epilepsie-EEG, Schlaf-EEG)"
see_also: ["[[meg]]", "[[flanker-aufgabe]]", "[[go-no-go-aufgabe]]"]
---

# EEG-Methodik: ERPs und exekutive Funktionen

## Grundprinzip

Ereigniskorrelierte Potenziale (ERPs) sind zeitgebundene Spannungsaenderungen im EEG, die durch einen definierten Stimulus oder eine Reaktion ausgeloest werden. Im Kontext exekutiver Funktionen liefern ERPs Aufschluss ueber Prozesse, die *waehrend* der Aufgabe ablaufen — jenseits dessen, was Reaktionszeiten allein zeigen.

## Paradigmen

### Flanker-Aufgabe (Eriksen)
Fuenf Buchstaben in Reihe (z.B. HHSHH). Proband reagiert nur auf den mittleren. Kongruent (SSSSS) vs. inkongruent (HHSHH) erzeugt Konflikt → laengere RT, staerkere [[acc]]-Aktivierung.

### Stroop-Test
Farbwort-Farb-Interferenz. Aktiviert dorsalen [[acc]] (kognitiver Konflikt). Emotionaler Stroop (emotional geladene Woerter) aktiviert ventralen ACC (Bush et al. 2000).

### Visueller Konzentrationsverlaufstest (VCPT)
Cued Go/No-go mit Bildsequenzen (Tier→Tier = Go, Tier→Pflanze = No-go, Pflanze→Pflanze = Ignore, Pflanze→Mensch = Novelty). Erlaubt differenzierte ERP-Analyse exekutiver Teilfunktionen (Mueller et al. 2011).

Die reine Reaktionshemmung ist als [[go-no-go-aufgabe|Go/No-go-Aufgabe]] separat aufgeführt.

## Drei ERP-Komponenten exekutiver Kontrolle (via ICA)

Mittels **Independent Component Analysis (ICA)** lassen sich aus dem VCPT-ERP drei unabhaengige Komponenten extrahieren (Kropotov et al. 2011):

### 1. P3a-No-go — Konfliktmonitoring
- **Latenz:** 300–400 ms post No-go
- **Topografie:** Fronto-zentral (Maximum ueber Cz)
- **Quellen:** Mittellinienstrukturen, v.a. [[acc]] (Cingulum)
- **Funktion:** Fehlerentdeckung und -korrektur. Vergleich erwarteter vs. ausgefuehrter Handlung.

### 2. P3b-Go — Engagement / Aktivierung
- **Latenz:** 200–400 ms post Go
- **Topografie:** Parietal (Maximum ueber Pz)
- **Quellen:** [[parietallappen]] und Frontallappen
- **Funktion:** Bereitstellung der Aufmerksamkeitsressourcen fuer die Aufgabenbewaeltigung.

### 3. P3z-No-go — Inhibition
- **Latenz:** 300–400 ms post No-go
- **Topografie:** Zentro-frontal (Maximum ueber Cz)
- **Quellen:** Medialer Frontalkortex (SMA, pre-SMA)
- **Funktion:** Unterdrueckung einer inadaequaten (vorbereiteten) Reaktion.

## Error-Related Negativity (ERN)

Bei Fehlern in Flanker-/Stroop-Aufgaben: Negativierung ca. 80–150 ms nach dem Fehler, Quellen im [[acc]]. Wird durch dopaminerge Signale aus [[basalganglien]] (Ncl. accumbens) und ventralem Tegmentum getrieben. Zeigt, dass das ACC sehr frueh in die Verhaltenskontrolle eingebunden ist.

## Source Localization und App-Bezug

EEG Source Localization (z.B. via MNE-Python eLORETA/dSPM) arbeitet nativ im **fsaverage**-Space — derselbe Space wie der Atlas-Modus der App. Das bedeutet: EEG-Quellenrekonstruktionen koennen direkt auf die fsaverage-Oberflaeche projiziert werden, ohne zusaetzliche Registrierung. Siehe [[mni-koordinatensysteme]] fuer die Space-Beziehungen.

Fuer die Lern-Experience im App ist die Zuordnung der drei Komponenten zu Hirnregionen zentral: P3a → ACC-Highlight, P3b → Parietallappen-Highlight, P3z → medialer Frontalkortex. Die VCPT-Abbildung (Abb. 11-15) ist eine Kernfigur.

## Merkpunkte

- Die Methode misst oder provoziert eine definierte Leistung und macht kognitive oder neurophysiologische Prozesse sichtbar.
- Stärke ist die Zuordnung zu einem bestimmten System; Grenze ist die meist indirekte Interpretation.
- Für das Wiki ist die Methode vor allem als Prüf- oder Nachweisverfahren relevant.
