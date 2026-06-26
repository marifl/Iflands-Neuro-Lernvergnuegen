---
type: method
title: "Elektrophysiologie der Einzelzelle"
aliases: ["Single-Unit Recording", "Einzelzellableitung", "Patch-Clamp", "Mikroelektrodenableitung"]
tags: [tiermodell, elektrophysiologie, aktionspotenziale, rezeptive-felder]
created: 2026-06-24
updated: 2026-06-24
sources: ["Karnath & Thier (2012), Kap. 2.5, Z. 936–970", "Jaencke (2021), Kap. 8, Z. 3413–3425; Kap. 12, Z. 5673–5681; Kap. 16, Z. 7430–7436; Kap. 17, Z. 7700–7704", "Lehrner et al. (2011), Kap. 4.4.1, Z. 4594–4605", "Bear et al. (2018), Kap. 4, Exkurs 4.1, Z. 2456–2472; Exkurs 4.3, Z. 2662–2672"]
see_also: ["[[hippocampus]]", "[[aktionspotenzial]]"]
---

# Elektrophysiologie der Einzelzelle

## Physikalisches Prinzip

Nervenzellen kommunizieren ueber kurze elektrische Impulse -- **Aktionspotenziale** (Spikes, ~1 ms Dauer, ~100 mV Amplitude intrazellular). Einzelzellableitungen registrieren diese Signale mit hoher raeumlicher und zeitlicher Aufloesung. Zwei grundlegende Ansaetze werden unterschieden:

- **Extrazellulaere Ableitung**: Eine Mikroelektrode (Metallspitze, Durchmesser wenige Mikrometer) wird neben einem Neuron positioniert und misst das lokale Feldpotenzial sowie die Spikes benachbarter Zellen. Durch **Spike-Sorting** -- algorithmische Trennung der Wellenformen nach Amplitude und Form -- koennen mehrere Neurone an derselben Elektrodenposition identifiziert werden. **Tetroden** (Buendel aus vier Draehten) verbessern die Trennschaerfe erheblich, da jede Zelle auf den vier Kanaelen ein individuelles Amplituden-Verhaeltnis erzeugt.

- **Intrazellulaere Ableitung**: Eine mit Elektrolytloesung gefuellte Glaspipette durchsticht die Zellmembran und registriert das Membranpotenzial direkt. Diese Technik zeigt sowohl Aktionspotenziale als auch subliminale synaptische Potenziale (EPSPs, IPSPs).

## Patch-Clamp-Technik

Die von **Erwin Neher und Bert Sakmann** entwickelte und 1991 mit dem **Nobelpreis** gewuerdigte Patch-Clamp-Technik stellt eine Sonderform dar: Eine Mikropipette (Oeffnungsdurchmesser ≤1 um) wird unter leichtem Unterdruck dicht auf die Zellmembran gepresst (Gigaseal). Dadurch werden die Ionenkanaele im Membranfleck (Patch) vom elektrischen Umgebungsrauschen abgeschirmt, sodass Stroeme einzelner Kanaele im Picoampere-Bereich messbar werden. Varianten: **Cell-attached**, **Whole-cell**, **Inside-out**, **Outside-out** -- je nach experimenteller Fragestellung.

## Durchfuehrung

Im klassischen Paradigma lernt ein wacher Affe (oder Nager) gegen Belohnung eine Verhaltensaufgabe, waehrend Mikroelektroden ueber chronisch implantierte Ableitkammern taeglich in das Zielgebiet eingefuehrt werden. Moderne **Multi-Electrode Arrays (MEAs)** mit bis zu mehreren Hundert Elektroden (z. B. Utah Array, Neuropixels-Sonden) erlauben die simultane Ableitung grosser Neuronenpopulationen. Die Tiere werden nicht durch Schmerz, sondern durch Belohnung (Fruchtsaft) zur Mitarbeit motiviert.

## Staerken und Limitationen

| Staerke | Limitation |
|---|---|
| Hoechste zeitliche (sub-ms) und raeumliche Aufloesung | Invasiv: nur tierexperimentell oder im Rahmen klinischer Neurochirurgie |
| Kausale Zuordnung Neuron-Verhalten moeglich (Mikrostimulation) | Stichproben-Bias zugunsten grosser, stark feuernder Neurone |
| Patch-Clamp: Einzelkanal-Aufloesung | Intrazellulaer nur in stabilem Gewebe (in-vitro-Praeparate) |
| MEAs: Populationsdynamik erfassbar | Begrenzte Hirnregionen zugaenglich (v. a. Kortex, Hippocampus, BG) |

## Klinische und Forschungsanwendung

### Bahnbrechende Entdeckungen

- **Place Cells** im [[hippocampus|Hippocampus]]: John O'Keefe zeigte 1971, dass bestimmte Neurone nur an einem spezifischen Ort im Raum feuern -- die Grundlage der kognitiven Landkarte (Nobelpreis 2014).
- **Grid Cells** im entorhinalen Kortex: May-Britt und Edvard Moser entdeckten 2005 Neurone mit hexagonalem Feuerungsmuster, die ein metrisches Koordinatensystem des Raums bilden (Nobelpreis 2014 gemeinsam mit O'Keefe).

### Klinische Nutzung

Im Rahmen epilepsiechirurgischer Eingriffe werden penetrierende Elektroden beim Menschen eingesetzt (v. a. Hippocampus, Temporallappen). Aus diesen Ableitungen stammen Erkenntnisse ueber die neuronale Grundlage von Objekterkennung und Gedaechtnis (z. B. sog. "Konzeptzellen"). Brain-Computer-Interfaces (BCIs) wie das Utah-Array-System von Hochberg et al. (2006) erlauben querschnittsgelaehmten Patienten, Roboter-Arme und Computer-Cursor allein durch vorgestellte Bewegungen zu steuern.
