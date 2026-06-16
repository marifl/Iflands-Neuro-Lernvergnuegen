# Asset- und Inhaltsinventur

Stand: 2026-06-16. Grundlage sind die aktuellen Runtime-Assets,
Szenen-JSONs, `atlas-config.json`, `atlas-ontology.json`, Vortragstexte und
Kapitel-11-Abbildungsmappings im Repo.

## Kurzentscheidung

Die App ist für den Marcus-Teil des Vortrags mit VCPT, P3a/P3b/P3z, Explorer,
Atlas-Carve, Phineas-Gage-Fallstudie und Zusammenfassung vortragsreif. Es gibt
keinen aktuellen Pflicht-Assetblocker.

Offene Punkte sind Erweiterungen für eine vollständige Kapitel-11-Abdeckung,
nicht Blocker für den Produktiveinsatz im aktuellen Vortragspfad.

## Transparenz für Produktiveinsatz

Die App darf im Vortrag und in der späteren Lernapp keine stärkere fachliche
Genauigkeit behaupten, als die Assets hergeben.

| Ebene | Bedeutung | Produktregel |
| --- | --- | --- |
| Echte Runtime-Assets | BodyParts3D-/TARO-Hirn, Kopf, Schädel, Atlas-GLBs und Pick-JSONs | Herkunft bleibt über `THIRD-PARTY-NOTICES.md`, Asset-Namen und Pipeline-Doku nachvollziehbar |
| Registrierte Atlas-Carves | Jülich/DKT/Brodmann auf TARO-Oberfläche übertragen | als didaktisch registrierte Atlasdarstellung behandeln, nicht als morphometrisch exakte Einzelperson |
| Schematische Fallstudie | Phineas-Gage-Modus mit TARO-/Schädelmodell und animierter Stange | UI und Doku müssen klar machen, dass dies kein echtes Gage-CT/GLB ist |
| Rekonstruktion/Spiegelung | gespiegelte oder rekonstruierte Strukturen aus Asset-Pipeline | im Audit/Inventar sichtbar halten; nicht still als Originaldaten ausgeben |

Release-Regel: Wenn ein Asset schematisch, registriert, gespiegelt oder
rekonstruiert ist, muss diese Einschränkung entweder im UI-Kontext, in der
Quellen-/Inventardoku oder im jeweiligen Lerntext sichtbar sein. Für den
aktuellen Vortragspfad ist diese Transparenz über Phineas-UI, Atlas-/Pipeline-
Doku und `THIRD-PARTY-NOTICES.md` ausreichend. Ein echtes Gage-CT-Derivat
bleibt ein separater Import-/Lizenz-Slice, nicht Release-Blocker.

## Bestand

### Szenen und Configs

| Bereich | Bestand | Befund |
| --- | ---: | --- |
| Lernszenen | 7 | Go/No-go, VCPT, ICA, P3a, P3b, P3z, Zusammenfassung |
| Runtime-Konfigurationen | 10 | inklusive `ofc-phineas`, `broca-areal`, `basalganglienschleifen` |
| Figure-Ersetzungen | 5 | 11-04, 11-14, 11-15(1), 11-15(2), 11-15(3) |
| Offene Abbildungseinheiten | 13 | 11-05 bis 11-13 laut Masterplan |

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
| Gage-Schädel-Kandidat | nicht im Repo; extern: NIH 3D `3DPX-003118` / Harvard-Library-Sketchfab | CT-abgeleitetes Modell verfügbar, aber erst nach eindeutig gepinntem Quell- und Lizenzpfad importieren |

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

Entscheidung: Im aktuellen Build bleibt der Runtime-Pfad
`/assets/context/skull.glb` ein BodyParts3D-/TARO-Kontextschädel, kein
historischer Gage-Schädel. Ein späterer echter Import gehört in einen eigenen
Pfad wie `/assets/phineas/gage-skull.glb` plus JSON-Manifest und Quellenhinweis.
Bis dieser Import tatsächlich im Viewer hängt, muss die UI weiterhin
`kein Original-Gage-CT/GLB` ausweisen.

Quellen:

1. Countway Library: <https://countway.harvard.edu/news/phineas-gage-3d-print>
2. NIH 3D `3DPX-003118`: <https://3d.nih.gov/entries/3DPX-003118>
3. NIH 3D Terms: <https://3d.nih.gov/terms>
4. Harvard Library auf Sketchfab:
   <https://sketchfab.com/3d-models/skull-of-phineas-gage-4299ef89b78a49b8a9ece34839c94ea3>

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
| VCPT | keine | Tier-/Pflanzenstimuli als kleine Texturkarte | später |
| ICA | keine | animierte Komponententrennung im 3D-Raum | später |
| P3a/P3b/P3z | keine | echte Topografie-Heatmap-Texturen auf Kopfhaut | später |
| Zusammenfassung | keine | Netzwerk-Übersicht als expliziter Graph-Layer | später |
| Phineas Gage | kein Original-Gage-CT/GLB im Repo | CT-abgeleitetes externes Gage-Modell nach Lizenz-Pinning | nicht blockierend, UI dokumentiert schematisches TARO-Modell |
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
| DLPFC/VLPFC | WCST, Arbeitsgedächtnis, ToL | noch kein eigener Lernpfad |

## Folgearbeit nach Vortrag

1. Vollständige Kapitel-11-Abdeckung: 11-05 bis 11-13 als eigene
   Config-/Scene-Pakete priorisieren.
2. DLPFC/VLPFC-Lernpfad für WCST, Fluency und Tower of London ausbauen.
3. Optionales Destrieux-Carve auf TARO prüfen, wenn Sulcus/Gyrus-Präzision im
   Explorer wirklich gebraucht wird.
4. Optionaler realistischer Hirnshader erst nach Lesbarkeits- und Mobile-Gate.
