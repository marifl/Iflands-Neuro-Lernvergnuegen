---
type: atlas
title: "Julich-Brain Atlas v3"
aliases: ["Julich-Brain", "Julich v3", "JuBrain", "zytoarchitektonischer Atlas"]
tags: [atlas, zytoarchitektonik, julich, ebrains, fsaverage, carve]
created: 2026-06-23
updated: 2026-06-23
sources: ["Amunts et al. 2020, Science", "EBRAINS / Human Brain Project", "Jäncke (2021), Kap. 3.4, Z. 1110–1127 — Brodmann-Areale, zytoarchitektonische Wahrscheinlichkeitskarten (Zilles & Amunts), probabilistische Kartierung über Post-mortem-Gehirne"]
see_also: ["[[brodmann-areale]]", "[[dkt-atlas]]", "[[destrieux-atlas]]", "[[mni-koordinatensysteme]]"]
---

# Julich-Brain Atlas v3

**Typ:** Zytoarchitektonischer probabilistischer Atlas
**Originalraum:** MNI152 ICBM 2009c Asymmetric (siehe [[mni-koordinatensysteme]])
**Labels:** 292 kortikale Meshes (bilaterale Parzellen)
**Kompression:** Meshopt (nicht Draco)
**Quelle:** EBRAINS / Human Brain Project (Amunts et al. 2020)

## Was ist Julich-Brain?

Moderner zytoarchitektonischer Atlas auf Basis histologischer Schnittserien von Spenderhirnen. Jede Parzelle repräsentiert ein Areal mit einheitlicher Zellschichtung (Zytoarchitektonik) — deutlich feiner als die klassischen [[brodmann-areale]], da statistische Grenzbestimmung (observer-independent) statt subjektiver Zeichnung.

## Granularitaet

- 292 kortikale Parzellen (ca. 146 pro Hemisphäre)
- Deckt frontale, parietale, temporale, okzipitale und insuläre Regionen ab
- Namensschema: `julich3-area-<code>-<host-gyrus>-<l|r>`
- Host-Gyrus im Meshnamen → direkte Zuordnung zur gyralen Anatomie

## Nutzung in der Brain-App

| Kontext | Datei | Details |
|---------|-------|---------|
| **TARO-Carve** | `atlas-carved-julich.glb` | 32 figur-relevante Julich-Parzellen auf TARO-Oberfläche; Fußleisten-Flyout „Atlas auf Hirn → Julich" |
| **fsaverage Canonical** | Kanonischer Atlas-Modus (Footer → Atlas) | Julich als einer von 4 Kortex-Layern neben [[dkt-atlas]], [[destrieux-atlas]], [[brodmann-areale]] |
| **Shelf (vollständig)** | `scripts/atlas/work/atlas-julich.glb` | Alle 292 Parzellen, nicht in Runtime geladen |

Relevante Regionen für [[jaencke-kapitel11-exekutive-funktionen]]: präzise Segmentierung von [[dlpfc]], [[vlpfc]], [[ofc]], [[acc]] auf zytoarchitektonischer Ebene — feiner als DKT-Gyri.

## Stärken

- Histologisch fundiert, statistisch abgegrenzt (objektiver als [[brodmann-areale]])
- Höchste kortikale Auflösung aller im App verfügbaren Atlanten
- Probabilistische Karten erlauben Konfidenzaussagen

## Limitierungen

- Basiert auf wenigen Spenderhirnen → interindividuelle Variabilität nur begrenzt abgebildet
- MNI152 ≠ TARO → eigene Affine-Transformation nötig (Within-Host-Split, siehe `scripts/atlas/README.md`)
- Subkortikale Strukturen (z. B. [[basalganglien]]) nicht vollständig abgedeckt
- 292 Meshes = hohe Geometrie-Last → in Runtime nur 32 relevante Patches geladen

## Merkpunkte

- Der Atlas standardisiert anatomische Regionen und erleichtert die Zuordnung zwischen Bildgebung und Terminologie.
- Er ist vor allem für Referenz, Koordination und Vergleich zwischen Studien nützlich.
- Im Wiki dient er als Verankerung für Regionen, Parzellierungen und Lokalisation.
