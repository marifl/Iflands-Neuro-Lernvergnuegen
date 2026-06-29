---
type: method
title: "Magnetenzephalografie (MEG)"
aliases: ["MEG", "Magnetoenzephalographie", "Magnetenzephalografie"]
tags: [elektrophysiologie, bildgebung, source-localisation, ms-aufloesung]
created: 2026-06-24
updated: 2026-06-24
sources: ["Jaencke (2021), Kap. 5.6, Z. 1975–1991", "Karnath & Thier (2012), Kap. 2.3.2, Z. 888–892", "Karnath & Thier (2012), Glossar, Z. 38860 (Magnetenzephalografie)", "Lehrner et al. (2011), Kap. 4.4.3, Z. 4697–4732", "Bear et al. (2018), Kap. 19, Z. 11856–11892"]
see_also: ["[[eeg-methodik-erps]]", "[[fmri]]"]
---

# Magnetenzephalografie (MEG)

## Physikalisches Prinzip

Das Gehirn erzeugt schwache Magnetfelder unterhalb eines Picotesla (pT) -- weniger als ein Hundertmillionstel des Erdmagnetfelds. Diese Felder entstehen durch **intrazellulaere Stroeme** in den Dendriten kortikaler Pyramidenzellen. Im Gegensatz zum [[eeg-methodik-erps|EEG]], das extrazellulaere Volumenstroeme misst, registriert das MEG ausschliesslich die magnetischen Feldlinien dieser intrazellulaeren Stroeme. Ein entscheidender physikalischer Unterschied: Magnetfelder breiten sich **unabhaengig vom umgebenden Gewebe** aus -- Schaedelknochen, Liquor und Kopfhaut verzerren das Signal nicht (kein Volume Conduction). Daher entfaellt auch die Notwendigkeit einer Referenzelektrode.

Allerdings erzeugen nur **tangentiale Dipole** (parallel zur Kortexoberflaeche orientiert) ein Magnetfeld, das ausserhalb des Kopfes messbar ist. Radiale Dipole (senkrecht zur Oberflaeche, z. B. auf der Konvexitaet eines Gyrus) bleiben fuer das MEG unsichtbar. Damit ergaenzen sich MEG und EEG: Das EEG erfasst bevorzugt radiale, das MEG bevorzugt tangentiale Quellen -- zusammen liefern sie ein vollstaendigeres Bild der kortikalen Aktivitaet.

## Durchfuehrung

Zur Messung dienen **Superconducting Quantum Interference Devices (SQUIDs)** -- supraleitende Magnetfeldsensoren, die mit fluessigem Helium auf -269 C gekuehlt werden. Moderne Ganzkopf-MEG-Systeme enthalten 100 bis 300 Sensoren in helmartiger Anordnung. Die Messvorbereitung ist deutlich kuerzer als beim EEG, da keine Elektrodenkappe aufgesetzt werden muss.

Wegen der extrem geringen Signalstaerke muss jede Messung in einer **magnetisch abgeschirmten Kammer** stattfinden. Externe Stoerquellen (Aufzuege, Strassenbahnen, Elektromotoren) uebersteigen das Hirnsignal um viele Groessenordnungen. Zusaetzlich kommen **axiale Gradiometer** zum Einsatz, die entfernte Stoerfelder heraussubtrahieren. Stimulationsgeraete muessen elektromagnetisch strahlungsarm sein; taktile Reize werden pneumatisch, visuelle ueber Linsensysteme appliziert.

## Source Localisation

Da das inverse Problem (Rueckschluss von der Feldoberflaeche auf intrazerebrale Quellen) mathematisch nicht eindeutig loesbar ist, werden verschiedene Verfahren zur Quellenrekonstruktion eingesetzt:

- **Aequivalenter Dipol-Fit**: Annahme weniger fokaler Quellen, iterative Anpassung von Position und Orientierung
- **Beamforming** (z. B. LCMV, SAM): Raum-Filter, der die Signalleistung aus einer bestimmten Voxelposition schaetzt und Interferenz unterdrueckt
- **Minimum-Norm-Schaetzung**: Verteilte Quellenmodelle ohne a-priori-Annahme ueber die Quellenanzahl

Die raeumliche Aufloesung liegt je nach Methode bei 10--20 mm und ist damit vergleichbar mit hochaufgeloestetem EEG (>64 Elektroden). Neuere Arbeiten zeigen, dass der frueher postulierte Vorteil des MEG gegenueber dem modernen Dicht-EEG geringer ausfaellt als erwartet.

## Staerken und Limitationen

| Staerke | Limitation |
|---|---|
| Millisekunden-Aufloesung (wie EEG) | Nur tangentiale Dipole sichtbar |
| Referenzfrei, kein Volume Conduction | Sehr hohe Anschaffungs- und Betriebskosten (Helium-Kuehlung, Abschirmung) |
| Nicht-invasiv, wiederholbar | Stationaer: Proband muss stillsitzen |
| Gute Voraussetzungen fuer Dipolschaetzung | Tiefere Strukturen (Basalganglien, Hirnstamm) kaum erfassbar |

## Klinische und Forschungsanwendung

Klinisch wird das MEG vor allem in der **praeoperativen Epilepsiediagnostik** zur nicht-invasiven Lokalisation epileptogener Foci eingesetzt. In der Forschung dient es der Untersuchung zeitlich hochaufgeloester sensorischer, motorischer und kognitiver Prozesse, darunter auditorische Mismatch-Responses, somatosensorisch evozierte Felder und Sprachlateralisierung. Durch die Kombination mit [[fmri|fMRT]] (sog. multimodale Fusion) lassen sich zeitliche und raeumliche Information komplementaer integrieren.

## Merkpunkte

- Die Methode misst oder provoziert eine definierte Leistung und macht kognitive oder neurophysiologische Prozesse sichtbar.
- Stärke ist die Zuordnung zu einem bestimmten System; Grenze ist die meist indirekte Interpretation.
- Für das Wiki ist die Methode vor allem als Prüf- oder Nachweisverfahren relevant.
