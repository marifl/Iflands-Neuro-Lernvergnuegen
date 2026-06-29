---
type: method
title: "Heartbeat Tracking Task (Schandry) und Heartbeat Discrimination Task (Whitehead)"
aliases: ["heartbeat-tracking-task", "heartbeat-detection-task", "Herzschlagwahrnehmung", "Herzschlagzaehlen", "Schandry-Task", "Heartbeat Perception Task", "Mental Tracking Method", "cardiac awareness task", "heartbeat counting task"]
tags: [interozeption, messung, heartbeat-perception, heartbeat-tracking, schandry, ekg, cardiac-awareness]
created: 2026-06-26
updated: 2026-06-26
sources:
  - "Schandry, R. (1981). Heart beat perception and emotional experience. Psychophysiology, 18(4), 483–488."
  - "Herbert, B. M., Muth, E. R., Pollatos, O. & Herbert, C. (2012). Interoception across Modalities. PLoS ONE, 7(5), e36646."
  - "Khalsa, S. S. et al. (2018). Interoception and Mental Health: A Roadmap. Biol Psychiatry CNNI, 3(6), 501–513."
see_also: ["[[interozeption]]", "[[herzratenvariabilitaet]]", "[[maia]]", "[[eeg-methodik-erps]]", "[[autonomes-nervensystem]]"]
---

# Heartbeat Tracking Task — Messung kardialer Interozeption

Standardparadigma zur Messung der **Interoceptive Accuracy (IAcc)** im kardialen Bereich. Entwickelt von Rainer Schandry (1981) an der Universität München.

## Variante 1: Heartbeat Tracking / Mental Tracking Method (Schandry)

**Durchführung:**
1. EKG-Ableitung als Referenz
2. Proband zählt eigene Herzschläge in 4 Intervallen (typisch: 25, 35, 45, 55 s) **mental, ohne Puls zu fühlen** und ohne Körperkontakt
3. Start- und Stopp-Signal; Proband gibt gezählte Zahl an
4. Proband wird **nicht** über Intervalllänge oder Genauigkeit informiert

**Score-Berechnung:**
```
Score = (1/n) × Σ [1 – (|gezählt – tatsächlich| / tatsächlich)]
```
Wertebereich 0–1; Wert 1 = perfekte Genauigkeit.

**Cut-off:** Score ≥ 0,85 → *gute Herzschlagwahrnehmer*; Score < 0,85 → *schlechte Herzschlagwahrnehmer* (Herbert-Studien)

**Reliabilität:** Cronbach's α = ,69–,90 (Wiens et al. 2000)

## Variante 2: Heartbeat Discrimination Task (Whitehead/Katkin)

- EKG wird abgeleitet; Töne oder Lichtreize erscheinen zu verschiedenen Delays nach dem R-Zacken
- Proband urteilt: Koinzidiert Ton mit dem Herzschlag? (Ja/Nein)
- Signal-Detection-Analyse: d' als Diskriminationsmaß
- Misst Bewusstsein für den **Zeitpunkt** des Herzschlags (nicht die Anzahl)

## Neuronale Grundlagen

Bildgebungsstudien zeigen bei guten Herzschlagwahrnehmern stärkere Aktivierung der **anterioren Insula** — sowohl im Tracking- als auch im Discrimination-Paradigma. Die Insula gilt als primärer kortikaler Hub für kardiale Afferenzen (Craig-Modell).

## Klinische und experimentelle Bedeutung

| Befund | Quelle |
|---|---|
| Gute Wahrnehmer: höheres emotionales Arousal (ERP/LPP) | Herbert, Pollatos & Schandry 2007 |
| Gute Wahrnehmer: geringere Wassermenge bis Sättigung (WLT) | Herbert et al. 2012 PLoS ONE |
| Gute Wahrnehmer: stärkere autonome Reaktivität (HRV/PEP) | Herbert et al. 2010 Psychophysiology |
| AN-Patientinnen: Selbstfokus-Effekt invertiert | Pollatos et al. 2016 |
| Gute Wahrnehmer: Vorteile in Entscheidungsfindung | Dunn et al. 2010 |

## Kritik und Limitationen

- Tracking-Task misst **Anzahl** (kardiale Aktivierungsdichte), nicht Qualität einzelner Schläge
- Bei Bradykardie oder Arrhythmie: Task-Ausgabe beeinflusst
- Nicht invasiv und ökologisch valide — aber misst nur eine von drei Interozeptionsdimensionen (→ [[maia]] für Sensibility; [[interozeption]] für Awareness)
- Tracking und Discrimination-Tasks korrelieren nur moderat (r ≈ ,30–,50)

## Abgrenzung zur MAIA

Der Heartbeat-Tracking-Task misst **Interoceptive Accuracy** (objektive Leistung). Die MAIA misst **Interoceptive Sensibility** (subjektive Selbsteinschätzung). Beide Dimensionen sind teilweise dissoziierbar und ergänzen sich diagnostisch.

## Merkpunkte

- Die Methode misst oder provoziert eine definierte Leistung und macht kognitive oder neurophysiologische Prozesse sichtbar.
- Stärke ist die Zuordnung zu einem bestimmten System; Grenze ist die meist indirekte Interpretation.
- Für das Wiki ist die Methode vor allem als Prüf- oder Nachweisverfahren relevant.
