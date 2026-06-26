---
type: method
title: "Optogenetik"
aliases: ["Optogenetics", "optogenetische Stimulation"]
tags: [tiermodell, kausalitaet, zelltypspezifisch, ionenkanaele]
created: 2026-06-24
updated: 2026-06-24
sources: ["Karnath & Thier (2012), Kap. 2, Z. 985–989", "Bear, Connors & Paradiso (2018), Kap. 4, Z. 2492–2533"]
see_also: ["[[neurone-gliazellen]]", "[[laesionsstudien]]"]
---

# Optogenetik

## Physikalisches Prinzip

Die Optogenetik beruht auf dem Einbringen **lichtempfindlicher Ionenkanaele** aus Algen und Bakterien in Nervenzellen. Je nach Kanaltyp wird die Zelle durch Licht erregt oder gehemmt:

- **Channelrhodopsin-2 (ChR2)**: ein depolarisierender (erregender) Kationenkanal aus der Gruenalge *Chlamydomonas reinhardtii*, aktiviert durch blaues Licht (~470 nm). Bei Beleuchtung stroemen Na+- und Ca2+-Ionen ein und loesen Aktionspotenziale aus.
- **Halorhodopsin (NpHR)**: eine hyperpolarisierende (hemmende) Chloridpumpe aus *Natronomonas pharaonis*, aktiviert durch gelbes Licht (~580 nm). Chlorid-Einstrom unterdrueckt neuronale Aktivitaet.

Die spektral unterschiedlichen Aktivierungswellenlaengen ermoeglichen die **bidirektionale Kontrolle** desselben Neurons oder benachbarter Populationen in einem einzigen Experiment -- mit Millisekunden-Praezision.

## Durchfuehrung

### Genetische Transfektion

Die Gene fuer die lichtempfindlichen Proteine werden ueber **lentivirale oder adeno-assoziierte virale Vektoren (AAV)** in das Zielgebiet injiziert. Der entscheidende Vorteil gegenueber klassischer elektrischer Stimulation ist die **Zelltypspezifitaet**: Durch die Wahl geeigneter **Promotoren** (z. B. CaMKII fuer exzitatorische Neurone, Parvalbumin-Promotor fuer inhibitorische Interneurone) exprimieren nur bestimmte Zelltypen den Kanal. Das **Cre-Lox-System** erlaubt zusaetzliche genetische Praezision: Ein Cre-abhaengiges virales Konstrukt wird nur in Neuronen aktiv, die Cre-Rekombinase exprimieren, definiert durch die Mauslinie.

### Lichtapplikation

Nach einer Wartezeit von Wochen (fuer ausreichende Proteinexpression) wird ueber eine implantierte **Glasfaser** Licht in das Zielgebiet geleitet. Die Kontrolle erfolgt mit Millisekundenaufloesung: Lichtpulse koennen einzelne Spikes oder rhythmische Aktivitaetsmuster erzeugen.

## Staerken und Limitationen

| Staerke | Limitation |
|---|---|
| Zelltypspezifische Kontrolle (ein Neurontyp in einer Region) | Primaer Tiermodell-Methode (Nager, zunehmend Primaten) |
| Millisekunden-Aufloesung der Aktivierung/Hemmung | Invasiv: virale Injektion und Faserimplantation noetig |
| Bidirektional (Erregung und Hemmung trennbar) | Lichtstreuung im Gewebe begrenzt die raeumliche Reichweite |
| Kausale Aussagen ueber Zelltyp-Funktion moeglich | Ueberexpression artfremder Proteine als potenzielles Artefakt |

## Chemogenetische Alternative: DREADDs

Als komplementaerer Ansatz haben sich **DREADDs** (Designer Receptors Exclusively Activated by Designer Drugs) etabliert. Dabei werden genetisch modifizierte muskarinische Rezeptoren exprimiert, die nur auf das sonst pharmakologisch inerte Molekuel **Clozapin-N-Oxid (CNO)** reagieren. DREADDs bieten eine **langsamere, aber weniger invasive** Modulation (Minuten statt Millisekunden) und eignen sich fuer Fragen, die keine zeitlich praezise Kontrolle erfordern.

## Klinische und Forschungsanwendung

In der Grundlagenforschung hat die Optogenetik das Verstaendnis neuronaler Schaltkreise revolutioniert: Kausale Beitraege einzelner Zelltypen zu Verhalten, Lernen, Angst und Sucht koennen erstmals direkt getestet werden. Klinisch wird optogenetische Hirnstimulation als hochselektive Alternative zur **tiefen Hirnstimulation** bei Bewegungsstoerungen (z. B. Parkinson) erforscht, allerdings steht eine Anwendung am Menschen noch aus. Der Fernblick richtet sich auf gentherapeutische Ansaetze bei Retinitis pigmentosa, bei denen lichtempfindliche Kanaele in degenerierte Photorezeptorzellen eingebracht werden.
