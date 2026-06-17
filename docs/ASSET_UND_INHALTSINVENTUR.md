# Asset- und Inhaltsinventur

Stand: 2026-06-16. Grundlage sind die aktuellen Runtime-Assets,
Szenen-JSONs, `atlas-config.json`, `atlas-ontology.json`, Vortragstexte und
Kapitel-11-Abbildungsmappings im Repo.

## Kurzentscheidung

Die App ist für den Marcus-Teil des Vortrags mit VCPT, P3a/P3b/P3z, Explorer,
Atlas-Carve, Phineas-Gage-Fallstudie und Zusammenfassung vortragsreif. Die
Kapitel-11-Abbildungen 11-04 bis 11-15 sind jetzt als lokale Runtime-
Figure-Packages abgedeckt. Es gibt keinen aktuellen Pflicht-Assetblocker.

## Transparenz für Produktiveinsatz

Die App darf im Vortrag und in der späteren Lernapp keine stärkere fachliche
Genauigkeit behaupten, als die Assets hergeben.

| Ebene | Bedeutung | Produktregel |
| --- | --- | --- |
| Echte Runtime-Assets | BodyParts3D-/TARO-Hirn, Kopf, Schädel, Atlas-GLBs und Pick-JSONs | Herkunft bleibt über `THIRD-PARTY-NOTICES.md`, Asset-Namen und Pipeline-Doku nachvollziehbar |
| Registrierte Atlas-Carves | Jülich/DKT/Brodmann auf TARO-Oberfläche übertragen | als didaktisch registrierte Atlasdarstellung behandeln, nicht als morphometrisch exakte Einzelperson |
| Schematische Fallstudie | Phineas-Gage-Modus mit TARO-/Schädelmodell und animierter Stange | UI und Doku müssen klar machen, dass dies noch kein montiertes echtes Gage-CT/GLB ist |
| Rekonstruktion/Spiegelung | gespiegelte oder rekonstruierte Strukturen aus Asset-Pipeline | im Audit/Inventar sichtbar halten; nicht still als Originaldaten ausgeben |

Release-Regel: Wenn ein Asset schematisch, registriert, gespiegelt oder
rekonstruiert ist, muss diese Einschränkung entweder im UI-Kontext, in der
Quellen-/Inventardoku oder im jeweiligen Lerntext sichtbar sein. Für den
aktuellen Vortragspfad ist diese Transparenz über Phineas-UI, Atlas-/Pipeline-
Doku und `THIRD-PARTY-NOTICES.md` ausreichend. Die Gage-GLB-Kandidaten sind
jetzt im Standalone-Repo versioniert; ihre Montage in den aktuellen Viewer
bleibt ein separater Transform-/Lizenz-Slice, nicht Release-Blocker.

## Bestand

### Szenen und Configs

| Bereich | Bestand | Befund |
| --- | ---: | --- |
| Lernszenen | 23 | 21-Step-Lernpfad plus Phineas/OFC- und Broca-Kontexte |
| Runtime-Konfigurationen | 23 | inklusive `ofc-phineas`, `broca-areal` und 18 Figure-Replacements |
| Figure-Ersetzungen | 18 | 11-04 bis 11-15 inklusive 11-08A-D und 11-11A/B/C |
| Offene Abbildungseinheiten | 0 | SP5.1-Figure-Matrix ist vollständig geschlossen |

### 3D-Assets

| Asset-Gruppe | Dateien | Bewertung |
| --- | --- | --- |
| Basis-Hirn | `brain.glb`, `ontology.json`, `structures.json` | vorhanden |
| Kapitel-11-Subparcels | `k11-subparcels.glb` | vorhanden, deckt ACC/SMA/OFC-nahe Lernmarkierungen ab |
| Kontext | `head.glb`, `skull.glb`, jeweilige JSON-Metadaten | vorhanden |
| Atlas-Vollobjekte | `atlas3d-{julich,dkt,brodmann,destrieux}.glb` | vorhanden |
| Carve-Flächen | `atlas-surface-{julich,dkt,brodmann}.glb` + Pick-JSON | vorhanden |
| Roh-Atlas | `atlas-raw-{julich,dkt}.glb` | vorhanden, nicht Primärpfad |
| Bild-/Brandingassets | Logo-PNGs | vorhanden |
| Kapitel-11-Figure-Fallbacks | 13 lokale JPGs unter `apps/brain-app/public/figures/` | versionierte Runtime-Fallbacks für 11-05 bis 11-11C, 11-13, 11-14; 11-12 ist textuell neu gebaut |
| Gage-Schädel-Kandidat | `apps/brain-app/public/assets/phineas/` mit Schädel-LOD, Calvarium-Cut, Eisenstange, Manifest und Rekonstruktionsdaten | CT-abgeleiteter Kandidat ist im Phineas-Modus montiert; Lizenz/Attribution vor Public-Claim final pinnen |

Größte Assets im Runtime-Pfad sind aktuell `atlas-raw-dkt.glb` (~22 MB),
`atlas-raw-julich.glb` (~14 MB), `atlas-surface-brodmann.glb` (~9.6 MB),
`atlas-surface-julich.glb` (~9 MB), `atlas-surface-dkt.glb` (~6.4 MB) und
`brain.glb` (~6 MB). Für den Vortragspfad ist das akzeptabel, aber der Roh-Atlas
bleibt ein Kandidat für späteres Lazy Loading.

### Phineas-Gage-Schädel: Authentizität und Lizenz

Geprüft am 2026-06-16:

1. Die Countway Library beschreibt den 3D-Druckpfad als Datei von Graham Holt
   auf Basis der 2004er Dünnschicht-CT-Scans von Ratiu und Talos. Das Original
   bleibt in der Warren Anatomical Museum Collection; die Datei ist als
   Lehr-/Druckderivat gedacht.
2. NIH 3D `3DPX-003118` führt den Schädel als CT-Derivat des historischen
   Gage-Schädels, erstellt mit 3DSlicer, MeshLab und NetFabb Basic, geteilt mit
   Zustimmung der Warren Anatomical Museum Collection. Die Entry-Seite zeigt
   `CC-BY-SA`; die NIH-3D-Nutzungsbedingungen delegieren die konkrete
   Lizenzprüfung an die jeweilige Entry-Lizenz.
3. Der Harvard-Library-Sketchfab-Mirror zeigt dasselbe Modell als downloadbares
   3D-Modell mit `CC Attribution`. Wegen dieses Lizenz-Label-Unterschieds darf
   die App das Modell nicht still übernehmen. Ein Import muss die konkrete
   Quelle pinnen, Attribution und eventuell Share-Alike-Pflichten in
   `THIRD-PARTY-NOTICES.md` nachziehen und das Asset-Manifest ergänzen.
4. Nach Hinweis von Marcus wurden die belastbaren lokalen Artefakte in dieses
   Standalone-Repo kopiert:
   `apps/brain-app/public/assets/phineas/phineas-gage-skull-lod.glb`,
   `phineas-gage-skull-calvarium-cut-lod.glb`,
   `phineas-gage-iron-rod.glb`,
   `gage-reconstructions.json` und `asset-manifest.json`. Die wissenschaftlichen
   PDFs/OCR-Artefakte liegen unter `raw_protected/phineas-gage/`.

Entscheidung: Im aktuellen Build rendert der Phineas-Modus die Standalone-GLBs
unter `/assets/phineas`: Vollschädel im ersten Schritt, Calvarium-Cut plus
Eisenstange in den Trajektorien-Schritten. Der normale Kontextpfad
`/assets/context/skull.glb` bleibt für Explorer/Strukturbaum erhalten, wird im
Phineas-Modus aber nicht mehr als Gage-Ersatz gezeigt. Das Manifest pinnt
Quelle, Lizenzhinweis, Hash, Transform/Skalierung und Node-Namen; der Test
`phineasStandaloneAssets.test.ts` prüft die Dateien gegen ihre SHA-256-Hashes.
Vor öffentlicher Auslieferung muss die konkrete Attribution/Lizenz noch in
`THIRD-PARTY-NOTICES.md` finalisiert werden.

Quellen:

1. Countway Library: <https://countway.harvard.edu/news/phineas-gage-3d-print>
2. NIH 3D `3DPX-003118`: <https://3d.nih.gov/entries/3DPX-003118>
3. NIH 3D Terms: <https://3d.nih.gov/terms>
4. Harvard Library auf Sketchfab:
   <https://sketchfab.com/3d-models/skull-of-phineas-gage-4299ef89b78a49b8a9ece34839c94ea3>

### Phineas-Gage-Stange: Maße und Modellgrenze

Geprüft am 2026-06-16:

1. Van Horn et al. 2012 beschreiben die Stange als ca. 110 cm lang, 3,2 cm im
   Durchmesser und 13 lb schwer. Das deckt die App-Texte `1,1 m` und `~6 kg`.
2. Bigelow 1850 ist als historische Sekundärquelle enger am Objekt: 3 ft 7 in
   Länge, 1,25 in Schaftdurchmesser, 13,25 lb, mit verjüngter Spitze. Umgerechnet
   sind das ca. 109,2 cm, 3,18 cm und 6,0 kg.
3. Der aktuelle Viewer rendert im Phineas-Modus das importierte
   `phineas-gage-iron-rod.glb`. Die historischen Konstanten in
   `phineasGage.ts` bleiben als didaktische Trajektorien-/Quellenreferenz
   erhalten, ersetzen aber nicht mehr das sichtbare Stangenmodell.

Entscheidung: Die Textmaße bleiben historisch, die 3D-Stange kommt aus dem
Standalone-GLB. Die UI weist das jetzt explizit aus:
`Stange historisch ca. 1,1 m lang, 3,2 cm Schaftdurchmesser, ~6 kg; im Viewer
wird das importierte Eisenstangen-GLB statt eines gekürzten Zylinder-Markers
gerendert.`

Quellen:

1. Van Horn et al. 2012:
   <https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0037454>
2. Harvard Countway / Warren Anatomical Museum:
   <https://collections.countway.harvard.edu/onview/exhibits/show/beyond-the-bone-box/the-case-of-phineas-gage>
3. Bigelow 1850, Harvard-Digitalisat:
   <https://collections.countway.harvard.edu/onview/files/original/fc61f61c95e9f2d82160a86b1f168664.pdf>

### Atlas-Abdeckung

| Atlas | Areas | TARO-präsent | Alias-Abdeckung | Befund |
| --- | ---: | ---: | ---: | --- |
| DKT | 68 | 60 | 2 | gut für Makro-Gyri, acht nicht als TARO-Carve präsent |
| Destrieux | 148 | 0 | 0 | fsaverage-Vollobjekt vorhanden, nicht als TARO-Carve präsent |
| Jülich | 292 | 292 | 3 | stärkster aktueller Präzisionspfad |
| Brodmann | 82 | 80 | 0 | gut für klassische BA-Referenzen, zwei ohne TARO-Präsenz |

## 3D-Objektlücken je Szene

| Szene/Modus | Pflichtlücke | Optional | Entscheidung |
| --- | --- | --- | --- |
| Go/No-go | keine | reale Stimulus-Karten statt Prose-Intro | später |
| VCPT | keine | echte Stimulus-Bildkarten | später; aktueller Build zeigt eine pausierbare schematische Cue-Probe-Folge mit Go/No-go-Fehlerzuständen |
| ICA | keine | 3D-Komponententrennung im Raum | später; aktueller Build zeigt eine pausierbare schematische Signal-zu-Komponenten-Animation im Overlay |
| P3a/P3b/P3z | keine | echte Topografie-Heatmap-Texturen auf Kopfhaut | später; aktueller Build zeigt schematische Topografie, Support-Elektroden und Quellenlabels |
| Zusammenfassung | keine | Netzwerk-Übersicht als expliziter Graph-Layer | später |
| Phineas Gage | keine für den Vortragspfad | final gepinnte Public-Attribution für die Gage-GLBs | Standalone-Assets unter `/assets/phineas` sind sichtbar montiert; UI dokumentiert weiter den Kandidatenstatus der Lizenz/Attribution |
| Explorer/Atlas | keine | Destrieux-Carve auf TARO | später |

## Shader- und Texturbewertung

Pflicht: keine fehlenden Texturen. Die App nutzt aktuell bewusst ruhige
prozedurale `MeshStandardMaterial`-Pfade, Preset-Farben und Emissive-Highlights.
Das ist für Lernlesbarkeit besser als ein realistischer Hirnshader.

Realistische Hirnshader werden geparkt. Bedingungen für eine spätere Umsetzung:

1. Umschaltbar, nicht Default.
2. Keine schlechtere Lesbarkeit von Highlights, Carve-Arealen und Labels.
3. Mobil ohne merklichen GPU-Knick.
4. Kein neues Stock-/Fake-Brain-Material ohne klare Herkunft.

## Arealnamen DE/EN/Lat

Konvention:

1. UI-Primärsprache bleibt Deutsch.
2. Kontext-Assets (`head.json`, `skull.json`) führen Deutsch, Latein und Englisch.
3. Canonical-Atlas-Areas führen aktuell `label_de`, stabile IDs und Kontext-Aliase.
4. Latein/Englisch wird im Atlas nicht flächendeckend behauptet, solange es nicht
   vollständig kuratiert ist.
5. Such-Aliase bleiben gezielt auf Vortragssprache und häufige Abkürzungen
   beschränkt, statt Synonyme breit zu erfinden.

Auffälligkeit: DKT/Jülich haben aktuell nur wenige explizite Aliase im
Katalog. Das ist für ACC, Cingulum, Broca und OFC-nahe Vortragspfade ausreichend,
aber kein vollständiger neuroanatomischer Thesaurus.

## Arealbezüge zu Vortrag und Lernen

| Areal/Netzwerk | Vortrag/Lernen | App-Pfad |
| --- | --- | --- |
| ACC / Cingulum | Konfliktmonitoring, Flanker/Stroop, P3a | Explorer-Flyout -> P3a |
| Parietal + Frontal | P3b, Engagement/Aufmerksamkeitsressourcen | Explorer-Flyout -> P3b |
| SMA / pre-SMA | P3z, Inhibition | Explorer-Flyout -> P3z |
| OFC / VMPFC | Phineas Gage, somatische Marker, Sozialverhalten | Explorer-Flyout -> Phineas-Modus |
| Basalganglien-Schleifen | DLPFC/VMPFC/ACC-Schleifen | Abb. 11-04-Konfiguration |
| DLPFC/VLPFC | WCST, Arbeitsgedächtnis, ToL | Lernpfad 11-05, 11-09, 11-10, 11-11A/B/C |

## Folgearbeit nach Vortrag

1. Studentische Check-UI auf `StudentProgressState` legen:
   sichtbare Übungsfragen, Progress-Anzeige und Snapshot-Roundtrip-Smoke.
2. Optionales Destrieux-Carve auf TARO prüfen, wenn Sulcus/Gyrus-Präzision im
   Explorer wirklich gebraucht wird.
3. Optionaler realistischer Hirnshader erst nach Lesbarkeits- und Mobile-Gate.
