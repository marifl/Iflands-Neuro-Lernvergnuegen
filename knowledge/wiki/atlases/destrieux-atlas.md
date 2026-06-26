---
type: atlas
title: "Destrieux-Atlas (a2009s)"
aliases: ["Destrieux", "a2009s", "sulcogyral atlas", "FreeSurfer Destrieux"]
tags: [atlas, freesurfer, sulcogyral, destrieux, fsaverage]
created: 2026-06-23
updated: 2026-06-23
sources: ["Destrieux et al. 2010, NeuroImage"]
see_also: ["[[dkt-atlas]]", "[[julich-brain-v3]]", "[[brodmann-areale]]", "[[mni-koordinatensysteme]]"]
---

# Destrieux-Atlas (a2009s)

**Typ:** Sulcogyraler Oberflächen-Atlas
**Originalraum:** FreeSurfer fsaverage
**Labels:** 148 kortikale Labels (74 pro Hemisphäre)
**Quelle:** Destrieux et al. 2010; FreeSurfer (`aparc.a2009s`)

## Was ist der Destrieux-Atlas?

Erweiterte FreeSurfer-Parzellierung, die sowohl Gyri als auch Sulci als eigenständige Labels segmentiert. Damit deutlich höhere Auflösung als der [[dkt-atlas]] (62 Labels), aber rein makroanatomisch (keine Zytoarchitektonik wie [[julich-brain-v3]] oder [[brodmann-areale]]).

## Granularitaet

- 148 Labels (74 bilateral) — 2,4× mehr als [[dkt-atlas]]
- **Gyri und Sulci** als separate Labels (z. B. `G_front_middle` vs. `S_front_middle`)
- Sulkale Segmentierung erlaubt präzise Zuordnung zu Landmarken, die in anderen Atlanten nur implizit sind

## Kapitel-11-relevante Labels (Auswahl)

| Destrieux-Label | Entspricht | Wiki-Seite |
|----------------|-----------|-----------|
| `G_front_middle` | Gyrus frontalis medius | [[dlpfc]] |
| `S_front_inf` | Sulcus frontalis inferior | Grenze [[dlpfc]] / [[vlpfc]] |
| `G_front_inf-Opercular` | Pars opercularis | [[vlpfc]] |
| `G_front_inf-Triangul` | Pars triangularis | [[vlpfc]] |
| `G_front_inf-Orbital` | Pars orbitalis | [[ofc]] |
| `G_and_S_cingul-Ant` | Anteriores Cingulum | [[acc]] |
| `G_orbital` | Orbitaler Gyrus | [[ofc]] |
| `G_and_S_frontomargin` | Frontomarginal | [[frontalpol]] |

## Nutzung in der Brain-App

| Kontext | Verfügbar | Details |
|---------|-----------|---------|
| **fsaverage Canonical** | Ja | Destrieux als einer von 4 Kortex-Layern im Atlas-Modus (Footer → Atlas) |
| **TARO-Carve** | **Nein** | Zu feinkörnig für die schematische TARO-Figur (148 Labels → visuelles Rauschen) |

Der Destrieux-Atlas ist ausschließlich im kanonischen fsaverage-Modus nutzbar — für TARO-Overlay den gröberen [[dkt-atlas]] verwenden.

## Stärken

- Höchste makroanatomische Auflösung aller FreeSurfer-Atlanten
- Sulci als eigene Labels → genaue Landmarkenzuordnung
- Robust automatisierbar über FreeSurfer-Pipeline
- Komplementär zu zytoarchitektonischen Atlanten ([[julich-brain-v3]], [[brodmann-areale]])

## Limitierungen

- Rein morphologisch — keine Aussage über Zelltypgrenzen
- 148 Labels auf TARO zu dicht → kein Carve-Overlay (nur fsaverage)
- Sulkale Labels sind für didaktische Zwecke (Kapitel 11) weniger relevant als gyrale
- Interindividuelle Sulkusvariabilität kann Labels verschieben
