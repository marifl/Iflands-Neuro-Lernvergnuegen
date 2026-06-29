---
type: method
title: "Water Load Test (WLT / WLT-II) — Messung gastrischer Interozeption"
aliases: ["Water Load Test", "WLT", "WLT-II", "Wasserbelastungstest", "gastrische Interozeption Messung", "water-load-test", "drink test"]
tags: [water-load-test, wlt, interozeption, gastrisch, saettigung, essstoerungen, messung, herbert]
created: 2026-06-26
updated: 2026-06-26
sources:
  - "van Dyck, Z., Vögele, C., Blechert, J., Lutz, A. P. C., Schulz, A. & Herbert, B. M. (2016). The Water Load Test As a Measure of Gastric Interoception: Development of a Two-Stage Protocol and Application to a Healthy Female Population. PLoS ONE, 11(9), e0163574."
  - "Herbert, B. M., Muth, E. R., Pollatos, O. & Herbert, C. (2012). Interoception across Modalities. PLoS ONE, 7(5), e36646."
  - "van Dyck, Z. et al. (2021). Gastric interoception and its gut feelings: Relationship with eating behavior, BMI and fear of negative evaluation in bulimia nervosa and binge eating disorder. Int J Eat Disord, 54, 1106–1115."
see_also: ["[[interozeption]]", "[[essstoerungen]]", "[[herzratenvariabilitaet]]", "[[heartbeat-tracking-task]]", "[[egg-elektrogastrogramm]]", "[[maia]]"]
---

# Water Load Test (WLT / WLT-II) — Gastrische Interozeption

Nicht-invasives Standardparadigma zur Messung der **gastrischen Interozeptionssensitivität** — der Fähigkeit, Signale der Magenfüllung wahrzunehmen. Entwickelt und validiert in der Arbeitsgruppe Herbert (Tübingen/Luxemburg).

## WLT (einstufig, Herbert et al. 2012)

- Proband trinkt Wasser bei Raumtemperatur in 5 min **ad libitum** bis zum ersten Sättigungsgefühl
- Trinkgefäß ist undurchsichtig und wird heimlich nachgefüllt → **Proband weiß nicht, wie viel er trinkt**
- **Endpunkt:** Selbstmeldung erster Sättigungszeichen ("erste Anzeichen von Vollheit")
- **Primärmaß:** Getränkte Wassermenge (ml) = Proxy für gastrische Sensitivität

> Weniger Wasser bis Sättigung → **sensitiver** für Magenfüllungssignale

## WLT-II (zweistufig, van Dyck & Herbert 2016)

Erweitertes Protokoll mit zwei aufeinanderfolgenden Stufen:

| Stufe | Endpunkt | Maß |
|---|---|---|
| **Stufe 1 (Sättigung)** | „Ende einer Mahlzeit, angenehm satt" | `sat_ml` |
| **Stufe 2 (Maximum)** | „Maximale Magenfülle — mehr geht nicht" | `sat_ml + Δfull_ml` |

**Indices:**
- `sat_ml` — Sättigungsschwelle
- `Δfull_ml` — Kapazitätsreserve zwischen Sättigung und Maximum
- `total_ml` = `sat_ml + Δfull_ml` — Gesamtkapazität

**Vorteil:** Zwei dissoziierbare Aspekte gastrischer Wahrnehmung; `Δfull_ml` sensitiv für Sättigungsunterkontrolle bei Essstörungen.

## Validität und Reliabilität

- Korreliert mit invasiven Barostat-Methoden (r ≈ ,40–,60; Tack et al.)
- **Test-Retest-Reliabilität** bei Gesunden: ICC ≈ ,70–,85
- Trinkmenge korreliert **negativ mit Heartbeat-Tracking-Score** (r = −,50; Herbert et al. 2012): gute Herzschlagwahrnehmer trinken weniger → modalitätsübergreifende Interozeptionsfähigkeit belegt
- Gut toleriert; keine invasiven Eingriffe nötig

## EGG-Kombination

Üblicherweise kombiniert mit **Elektrogastrogramm (EGG)** (→ [[egg-elektrogastrogramm]]):
- Baseline EGG (15 min) vor WLT
- WLT-Durchführung (5 min)
- Post-WLT EGG (30 min)
- Typische Reaktion Gesunder: Anstieg %3-cpm-Normogastrie nach Wasserbelastung

## Klinische Befunde

| Gruppe | WLT-Befund |
|---|---|
| **Gesunde, gute Herzschlagwahrnehmer** | Signifikant niedrigere sat_ml (Herbert et al. 2012) |
| **Anorexia Nervosa** | Erhöhte sat_ml (weniger sensitiv für Sättigung trotz Restriktionsverhalten) — Paradox: bei AN oft hohe Sättigungstoleranz |
| **Bulimia Nervosa / BED** | Erhöhtes Δfull_ml — geringere Empfindlichkeit für Überfüllungssignale; Zusammenhang mit Binge-Tendenz |
| **Funktionelle Dyspepsie / Reizdarmsyndrom** | Stark erniedrigte sat_ml — viszerale Hypersensitivität |

## Abgrenzung zu anderen Interozeptionsmaßen

| Maß | Modalität | Dimension | Messniveau |
|---|---|---|---|
| Heartbeat Tracking Task | Kardial | Accuracy (IAcc) | Objektiv |
| Water Load Test | Gastrisch | Accuracy (IAcc) | Objektiv |
| MAIA-Fragebogen | Multimodal | Sensibility (IS) | Subjektiv |
| EGG | Gastrisch | Physiologie | Objektiv |

## Merkpunkte

- Die Methode misst oder provoziert eine definierte Leistung und macht kognitive oder neurophysiologische Prozesse sichtbar.
- Stärke ist die Zuordnung zu einem bestimmten System; Grenze ist die meist indirekte Interpretation.
- Für das Wiki ist die Methode vor allem als Prüf- oder Nachweisverfahren relevant.
