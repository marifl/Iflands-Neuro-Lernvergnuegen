---
type: method
title: "Diffusions-Tensor-Bildgebung und Traktographie (DTI)"
aliases: ["DTI", "Diffusion Tensor Imaging", "Diffusionstensorbildgebung", "Traktographie", "Tractography", "DWI"]
tags: [bildgebung, weisse-substanz, faserbahnen, konnektivitaet]
created: 2026-06-24
updated: 2026-06-28
sources: ["Jaencke (2021), Kap. 5, Z. 1798–1801", "Jaencke (2021), Kap. 17, Z. 7872–7895", "Karnath & Thier (2012), Kap. 2.2.4, Z. 818–874", "Karnath & Thier (2012), Kap. 72, Z. 12970–12974", "Karnath & Thier (2012), Glossar, Z. 38402-38407", "Bear et al. (2018), Kap. 7, Z. 4309–4337"]
see_also: ["[[strukturelle-mrt]]", "[[corpus-callosum]]", "[[multiple-sklerose]]"]
---

# Diffusions-Tensor-Bildgebung und Traktographie (DTI)

## Physikalisches Prinzip

DTI nutzt die **Brownsche Molekularbewegung** von Wassermolekuelen im Gehirn. In freier Fluessigkeit (z. B. Liquor in den Ventrikeln) diffundieren Wassermolekuele gleichmaessig in alle Richtungen -- die Diffusion ist **isotrop**. In der weissen Substanz hingegen ist die Diffusion durch die parallele Anordnung myelinisierter Axone **anisotrop**: Molekuele bewegen sich leichter laengs der Fasern als quer dazu, weil die Myelinhuellen die transversale Bewegung behindern.

Um diese Richtungsabhaengigkeit zu messen, werden vor der eigentlichen MRT-Bildaufnahme **Magnetfeldgradienten** in verschiedene Raumrichtungen geschaltet, die das Signal diffusionssensitiv machen. Aus mindestens 6 diffusionsgewichteten Bildern plus einem nicht-gewichteten Referenzbild wird fuer jedes Voxel ein **Diffusionstensor** (3x3-Matrix) geschaetzt. Dessen grafische Repraesentation ist ein **Diffusionsellipsoid**: In Faserbahnnaehe stark elongiert (hohe Anisotropie), in Liquor nahezu kugelfoermig (isotrope Diffusion).

## Quantitative Masse

- **Fraktionelle Anisotropie (FA)**: Kennwert der Gerichtetheit der Diffusion (0 = isotrop, 1 = perfekt anisotrop). Hohe FA-Werte zeigen intakte, dicht gebuendelte Faserbahnen an.
- **Mean Diffusivity (MD)**: Mittlere Diffusivitaet ueber alle Richtungen. Erhoehte MD deutet auf Gewebeschaedigung, Oedem oder Zellverlust hin.
- **Radiale und axiale Diffusivitaet**: Erlauben differenziertere Rueckschluesse auf Demyelinisierung (radial erhoet) vs. axonale Schaedigung (axial reduziert).

## Traktographie

Aus den Diffusionstensoren werden dreidimensionale Faserverlaeufe rekonstruiert. Zwei Hauptmethoden:

- **Deterministische Traktographie**: Ausgehend von einem Seed-Voxel wird Schritt fuer Schritt der Hauptdiffusionsrichtung gefolgt, bis ein Abbruchkriterium (FA-Schwelle, Winkelaenderung) erreicht ist. Einfach, aber Schwierigkeiten bei kreuzenden Fasern.
- **Probabilistische Traktographie**: Statt eines einzigen Pfads wird fuer jedes Voxel eine Wahrscheinlichkeitsverteilung der Faserrichtung geschaetzt und tausendfach beprobt. Robuster bei Faserkreuzungen, aber rechenintensiver.

### TBSS (Tract-Based Spatial Statistics)

Fuer Gruppenvergleiche der weissen Substanz: FA-Karten werden auf ein mittleres FA-Skelett projiziert, das die Zentren der grossen Faserbahnen repraesentiert. Voxelweise statistische Tests identifizieren Regionen mit Gruppenunterschieden, ohne durch raeumliche Normalisierungsfehler verzerrt zu werden.

## Staerken und Limitationen

| Staerke | Limitation |
|---|---|
| Einzige nicht-invasive Methode zur In-vivo-Darstellung von Faserbahnen | Indirekte Messung: Wasserdiffusion ≠ Axone direkt |
| Quantitative Masse (FA, MD) korrelieren mit Gewebeintegritaet | Kreuzende Fasern: Standardtensor versagt bei >1 Richtung/Voxel |
| Klinisch validiert bei MS, SHT, Dyslexie, Stottern | Anfaellig fuer Bewegungsartefakte und geometrische Verzerrungen (EPI) |
| Kombinierbar mit [[strukturelle-mrt|struktureller MRT]] und fMRT | Traktographie ist modellabhaengig: falsch-positive Bahnen moeglich |

## Klinische und Forschungsanwendung

### Multiple Sklerose

DTI zeigt FA-Reduktionen in laesionaler und **normal erscheinender weisser Substanz** (NAWM), die mit klinischer Behinderung korrelieren und dem konventionellen MRT-Befund vorausgehen koennen.

### Schaedel-Hirn-Trauma (SHT)

**Diffuse axonale Schaedigung (DAI)** -- die haeufigste Pathologie nach moderatem/schwerem SHT -- ist im konventionellen MRT oft unsichtbar, zeigt sich aber als reduzierte FA in Corpus callosum, Hirnstamm und langen Assoziationsbahnen.

### Praeoperative Faserbahn-Kartierung

Vor neurochirurgischen Eingriffen (Tumorresektion) wird die Traktographie eingesetzt, um die Lage eloquenter Bahnen (z. B. Fasciculus arcuatus fuer Sprache, Tractus corticospinalis fuer Motorik) in Relation zum Tumor darzustellen.

### Kognitive Neurowissenschaften

DTI-Studien haben Zusammenhaenge zwischen FA in spezifischen Bahnen und individuellen Unterschieden in Lesefaehigkeit (Dyslexie), Sprachfluessigkeit (Stottern) und Arbeitsgedaechtnis nachgewiesen. Die Diffusionstensormorphometrie erlaubt Gruppenvergleiche analoger Faserstrukturen zwischen Gesunden und Patienten.

## Merkpunkte

- Die Methode misst oder provoziert eine definierte Leistung und macht kognitive oder neurophysiologische Prozesse sichtbar.
- Stärke ist die Zuordnung zu einem bestimmten System; Grenze ist die meist indirekte Interpretation.
- Für das Wiki ist die Methode vor allem als Prüf- oder Nachweisverfahren relevant.
