---
type: method
title: Funktionelle Magnetresonanztomographie (fMRT/fMRI)
aliases: ["fMRI", "fMRT", "funktionelle MRT", "Funktionelle Magnetresonanztomografie", "Event-related fMRT", "efMRT", "Echo Planar Imaging", "EPI", "BOLD-Imaging", "bold-effekt", "vbm", "voxel", "pfc", "cingulum", "Desoxyhämoglobin"]
aliases: ["fMRI", "fMRT", "funktionelle MRT", "Funktionelle Magnetresonanztomografie", "Event-related fMRT", "efMRT", "Echo Planar Imaging", "EPI", "BOLD-Imaging", "bold-effekt", "vbm", "voxel", "pfc", "cingulum", "Desoxyhämoglobin"]
tags:
- bildgebung
- bold
- mni
- haemodynamik
- resting-state
- spm
- vbm
created: 2026-06-23
updated: 2026-06-25
sources:
- Jaencke (2013), Kap. 5 Methoden, Z. 1807–1846 (BOLD-Grundlagen, fMRT-Technik)
- Jaencke (2013), Kap. 5 Zusammenfassung, Z. 2099–2105 (BOLD-Effekt kompakt, 4–8 s
  Peak)
- Jaencke (2013), Z. 1781–1794 (Voxel, VBM)
- Jaencke (2013), Z. 2023 (Echtzeit-fMRT)
- Jaencke (2013), Z. 9692–9804 (Resting-State-Netzwerke, Default Mode Network)
- 'Karnath & Thier (2012), Kap. 2.1.2, Z. 637–696 (fMRT: BOLD, efMRT, Block/Event/Faktoriell/Parametrisch,
  Resting State, kognitive Subtraktion)'
- Karnath & Thier (2012), Glossar, Z. 38488 (Echo Planar Imaging)
- Karnath & Thier (2012), Glossar, Z. 38514 (Event-related fMRT)
- Karnath & Thier (2012), Glossar, Z. 38578–38584 (funktionelle Bildgebung/fMRT)
- Karnath & Thier (2012), Z. 704 (MNI-Normalisierung fuer Gruppenvergleiche)
- Karnath & Thier (2012), Z. 722 (PPI – Psychophysiologische Interaktionsanalyse)
- Karnath & Thier (2012), Z. 776–808 (VLSM, VBM)
- Karnath & Thier (2012), Z. 12777 (Brain-Computer Interfaces)
- 'Lehrner et al. (2011), Z. 5753–5948 (fMRT-Methodenkapitel: Signal, Technik, Artefakte,
  klinische Anwendung)'
- 'Lehrner et al. (2011), Z. 4746–4776 (fMRI Grundprinzip: neurohaemodyn. Kopplung,
  raeumliche Aufloesung)'
- Lehrner et al. (2011), Z. 5826 (Kopfbewegungsartefakte)
- Lehrner et al. (2011), Z. 5886–5921 (praechirurgisches Mapping)
- 'Lehrner et al. (2011), Z. 6008 (Logothetis et al. 2001: BOLD korreliert mit LFPs)'
- 'Bear et al. (2018), Exkurs 7.3, Z. 4311–4345 (PET und fMRT: BOLD-Prinzip, raeumliche/zeitliche
  Aufloesung)'
see_also:
- '[[eeg-methodik-erps]]'
- '[[mni-koordinatensysteme]]'
- '[[laesionsstudien]]'
- '[[tms]]'
- '[[nirs]]'
---

# Funktionelle Magnetresonanztomographie (fMRI)

Nichtinvasive Bildgebung der Hirnaktivität über das BOLD-Signal. In Kapitel 11 die meistgenutzte Methode für Lokalisierung exekutiver Funktionen.

## BOLD-Signal

Die fMRT basiert auf dem Prinzip der **neurohämodynamischen Kopplung**: neuronale Aktivität erzeugt einen lokalen Anstieg des zerebralen Blutflusses, der das Verhältnis von Oxyhämoglobin zu Desoxyhämoglobin verschiebt (Lehrner et al. 2011, Z. 4746). Dieses **Blood-Oxygen-Level-Dependent** (BOLD) Signal wird im T2*-gewichteten MRT als Signalanstieg sichtbar. Entscheidend ist, dass die fMRT damit ein metabolisches Surrogat misst, nicht die neuronale Aktivität selbst — diese fundamentale Einschränkung muss jede Interpretation berücksichtigen. Logothetis et al. (2001) zeigten, dass das BOLD-Signal am stärksten mit lokalen Feldpotenzialen (LFPs) korreliert, nicht mit Aktionspotenzialen (Lehrner et al. 2011, Z. 6008).

Die **hämodynamische Antwortfunktion** (HRF) erreicht ihren Peak erst 4–8 Sekunden nach dem Stimulus (Jäncke 2013, Z. 2103), was die zeitliche Auflösung im Sekundenbereich limitiert — deutlich langsamer als [[eeg-methodik-erps|ERPs]] im Millisekundenbereich. Die **räumliche Auflösung** von 1–3 mm (Standard: 2 mm isotrope [[voxel|Voxel]] bei 3T) stellt jedoch einen erheblichen Vorteil gegenüber dem [[eeg-methodik-erps|EEG]] dar, das nur im Zentimeterbereich auflöst (Lehrner et al. 2011, Z. 4764).

## Experimentelle Paradigmen

### Block-Design
Längere Blöcke einer Bedingung (z.B. 30 s kongruent, 30 s inkongruent). Hohe statistische Power, geringe zeitliche Präzision.

### Event-Related Design (efMRT)
Einzelne Trials gemischt präsentiert, HRF pro Einzelereignis modelliert. Die efMRT erlaubt die Modellierung individueller BOLD-Antworten und die Trennung von z.B. korrekten vs. fehlerhaften Trials (Karnath & Thier 2012, Z. 654–660) — zentral für [[acc]]-Fehlerverarbeitung.

### Kognitive Subtraktion
Der traditionelle Ansatz: eine Kontrollbedingung wird von der Experimentalbedingung subtrahiert, um die Aktivierung der interessierenden kognitiven Komponente zu isolieren (Karnath & Thier 2012, Z. 666).

### Faktorielles Design
Kreuzung mehrerer Faktoren (z.B. Aufgabentyp × Schwierigkeit), um Haupteffekte und Interaktionen zu untersuchen (Karnath & Thier 2012, Z. 672).

### Parametrisches Design
Systematische Variation eines Parameters — etwa [[arbeitsgedaechtnis|Arbeitsgedächtnis]]-Last in einer n-back-Aufgabe (1-back vs. 2-back vs. 3-back) — und Korrelation mit dem BOLD-Signal, um dosisabhängige neuronale Antworten zu identifizieren (Karnath & Thier 2012, Z. 694).

## Datenanalyse und Normalisierung

Die statistische Auswertung erfolgt üblicherweise über **Statistical Parametric Mapping** (SPM), das pro Voxel ein statistisches Modell berechnet (Jäncke 2013, Z. 1809–1842). Für Gruppenvergleiche werden individuelle Gehirne auf den [[mni-koordinatensysteme|MNI152-Standardraum]] normalisiert (Karnath & Thier 2012, Z. 704).

**Voxelbasierte Morphometrie** ([[vbm|VBM]]) nutzt die gleiche Normalisierungs-Pipeline für strukturelle Analysen: Vergleich lokaler Grausubstanzdichte zwischen Gruppen, etwa zur Identifikation atrophierter Regionen bei Patienten (Karnath & Thier 2012, Z. 802–808; Jäncke 2013, Z. 1781–1794).

Die **Psychophysiologische Interaktionsanalyse** (PPI) geht über lokale Aktivierung hinaus und untersucht, wie die funktionelle Konnektivität zwischen Regionen durch den Aufgabenkontext moduliert wird — etwa ob die Kopplung zwischen [[dlpfc]] und [[acc]] unter hoher Konfliktlast zunimmt (Karnath & Thier 2012, Z. 722).

## Resting-State-fMRT

In der Resting-State-fMRT werden spontane BOLD-Fluktuationen ohne explizite Aufgabe gemessen. Raichle et al. (2001) entdeckten dabei das **Default Mode Network** (DMN) — ein Netzwerk aus medialem [[pfc|PFC]], posteriorem [[cingulum|Cingulum]] und lateralem Parietalkortex, das in Ruhe aktiv ist und bei Aufgaben deaktiviert wird. Insgesamt lassen sich etwa zehn stabile Resting-State-Netzwerke identifizieren (Jäncke 2013, Z. 9692–9718). Die Methode wird breit für funktionelle Konnektivitätsanalysen eingesetzt und eignet sich besonders für klinische Populationen, die keine komplexen Aufgabenparadigmen bewältigen können.

## Klinische Anwendung

In der klinischen Praxis dient die fMRT primär dem **prächirurgischen Mapping**: Vor neurochirurgischen Eingriffen werden eloquente Areale (Motorik, Sprache) lokalisiert, um funktionell kritische Regionen bei der Resektionsplanung zu schonen (Lehrner et al. 2011, Z. 5886–5921). **Echtzeit-fMRT** ermöglicht Neurofeedback-Anwendungen, bei denen Patienten lernen, ihre eigene Hirnaktivität zu modulieren (Jäncke 2013, Z. 2023). An der Schnittstelle zur Technik eröffnen **Brain-Computer Interfaces** (BCI) die Möglichkeit, fMRT-Signale für die direkte Steuerung externer Geräte zu nutzen (Karnath & Thier 2012, Z. 12777).

## Rolle in Kapitel 11

| Fragestellung | fMRI-Befund |
|---------------|-------------|
| Arbeitsgedaechtnis | [[dlpfc]]-Aktivierung steigt mit Manipulationsanforderung (Petrides) |
| Inhibition | Rechter inferiorer Frontalkortex + [[acc]] bei No-go |
| Entscheidung | [[vmpfc]]/[[ofc]] bei Iowa Gambling Task ([[entscheidungsfindung]]) |
| Konflikt | Dorsaler [[acc]] bei Stroop/Flanker (event-related) |
| Planung | [[dlpfc]] + [[frontalpol]] bei Tower of London |

## Limitationen

- **Korrelativ:** Aktivierung ≠ Kausalität → Ergänzung durch [[tms]] (virtuelle Läsion) und [[laesionsstudien]]
- **Hämodynamische Verzögerung:** Schnelle kognitive Prozesse zeitlich nicht auflösbar → [[eeg-methodik-erps|ERP]] als Komplement. Die räumliche Auflösung (1–3 mm) kompensiert diesen Nachteil gegenüber dem EEG (Lehrner et al. 2011, Z. 4764).
- **Kopfbewegungsartefakte:** Bereits Bewegungen im Submillimeterbereich können Signalverschiebungen erzeugen und müssen in der Vorverarbeitung korrigiert werden (Lehrner et al. 2011, Z. 5826).
- **Physiologische Artefakte:** Atmung und Puls erzeugen systematische Signalfluktuationen, die insbesondere in Resting-State-Analysen kritisch sind.
- **Statistische Analyse:** Die Masse simultaner Voxel-Tests erfordert strenge Korrektur für multiples Testen; unzureichende Korrektur führt zu falsch-positiven Aktivierungen (Jäncke 2013, Z. 2099–2105).
## Merkpunkte

- fMRT misst indirekt neuronale Aktivität über den BOLD-Effekt und ist damit ein Netzwerkverfahren, kein Direkttest.
- Die Methode ist räumlich stark, aber zeitlich träge.
- Für das Wiki ist fMRT vor allem dort wichtig, wo Aktivierungsmuster und Konnektivität beschrieben werden.
