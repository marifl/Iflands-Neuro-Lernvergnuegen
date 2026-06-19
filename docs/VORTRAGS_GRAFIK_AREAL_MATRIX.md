# Vortrags-Grafik-zu-Areal-Matrix

Stand: 2026-06-18

Diese Datei ist der aktuelle Arbeitsvertrag für die Färbungen der Vortragsgrafiken.
Sie ersetzt keine Runtime-Konfiguration, sondern macht vor der Umsetzung sichtbar,
welche PDF-Grafik auf welche App-Config, konkrete Buckets/Areas, Anzeigeart und
Verifikation zeigt.

## Quellen und Status

1. Aktuelle PDF:
   `/Users/marcusifland/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Präsentation Neuro_bilan, ifland, mertzianis, wiesent (4).pdf`
2. Live-Metadaten vom 18. Juni 2026: 112 PDF-Seiten, 960 x 540 pt, erstellt am
   17. Juni 2026.
3. PDF-Text-Extraktion: `pdftotext -layout`, lokaler Arbeitsauszug
   `/tmp/neuro_bilan_current_112_pages.txt`.
4. Autoritative Runtime-Quellen:
   `scripts/atlas/config.default.toml`,
   `apps/brain-app/public/assets/atlas-canonical/atlas-config.json`,
   `apps/brain-app/public/scenes/*.json`.
5. Bestehende Mapping-Dokumente:
   `docs/KAPITEL11_ABBILDUNGEN_MAPPING.md`,
   `docs/SP5_1_FIGURE_MATRIX.md`,
   `docs/FAERBUNGEN_GUIDE.md`.

Nicht als aktuelle Quelle verwenden:

1. `raw/pptx/slides-text.md` ist eine ältere 40-Folien-Extraktion und passt
   nicht zur aktuellen 112-Seiten-PDF.
2. Freie Begriffe wie `DLPFC`, `ACC` oder `Parietal` gelten nur als
   Sprechtext. Für Umsetzung zählen Bucket-IDs, Area-IDs oder Scene-Regions.
3. `colors.groups` ist kein aktueller Pfad. Produktive Figure-Färbungen laufen
   über `colors.preset` plus `[color_presets.<id>]` in `config.default.toml`;
   Scene-/ERP-Farben müssen explizit als `scheme = "scene"` oder
   `scheme = "atlas"` markiert sein.

## Deck-Inventar

| PDF-Seiten | Abschnitt | Färbungsrelevanz | Regel |
|---|---|---:|---|
| 1-3 | Titel, Vortragende, Benita-Intro | nein | Keine App-Färbung. |
| 4-10 | Einstieg Frontalkortex/Organisation | teilweise | Nur als Kontext. Keine konkrete Area-Matrix außer später genannten Grafiken. |
| 11 | Goldman-Rakic, dorsal/ventraler Affen-PFC | deck-only | Keine App-Färbung: Affen-PFC/Sulcus-principalis-Modell, nicht valide als Human-Atlas-Handoff. |
| 13 | PFC-Funktionen nach Petrides | ja | `pfc-petrides`. |
| 14 | Duncan/Owen Aktivitätsüberlappung | ja | `duncan-owen-overlap`; eigene Overlap-Scene, kein Petrides-Reuse. |
| 15-17 | Hierarchie-Überleitung, Orientierung, Fuster-Foto | nein | Keine App-Färbung. |
| 18 | Fuster Wahrnehmungs-Handlungs-Zyklus | ja | `fuster-gradient`. |
| 19-21 | Rostrokaudale Achse | ja | `badre-rostrokaudal`; Seite 20/21 sind didaktische Varianten derselben Achse. |
| 22-23 | Serien-Parallel-Wandlung, Modellgruppen-Überleitung | nein | Keine eigene Färbung. |
| 24 | Badre Domänenmodell | ja | `badre-domainen`. |
| 25-26 | Badre relationale Komplexität | ja | `badre-relationale-komplexitaet`. |
| 27 | Badre Kaskadenmodell | ja | `badre-kaskade`. |
| 28-29 | Badre Konflikttypen/Abstraktionsgrad | ja | `badre-konflikttypen`. |
| 30-33 | Benita-Quellen, Annalena-Intro/Bildseiten | nein | Keine konkrete App-Färbung. |
| 34 | DLPFC-Schädigung | ja | `dlpfc-schaedigung`; eigene klinische DLPFC-Scene, kein Tower-of-London-Reuse. |
| 35-39 | Wisconsin Card Sorting Test | ja | `wcst-frontoparietal`. |
| 40-43 | Stroop und beteiligte Hirnregionen | ja | `acc-bush`; dorsales ACC trägt die klassische/kognitive Stroop-Semantik sichtbar. |
| 44 | Flüssigkeitstests | ja | `fluency-foci`. |
| 45-46 | Tower of London | ja | `tower-of-london-dlpfc` und `tower-of-london-schweregrad`. |
| 47 | Selbstkontrolle, rechter DLPFC | ja | `right-dlpfc-selbstkontrolle`; rechtsseitige DLPFC-Scene-Region. |
| 48-52 | Quellen, Isabella-Intro, Somatic-Marker-Fragen | nein | Keine konkrete App-Färbung. |
| 53-55 | VMPFC/OFC und Phineas Gage | ja | `ofc-phineas`, aber Phineas-Asset-Finalisierung bleibt separater Blocker. |
| 56-57 | Umweltabhängigkeit/Lhermitte | nein | Keine aktuelle App-Färbung. |
| 58-59 | Parietales Kontrollsystem/Läsionen | ja | `right-parietal-lesion`; rechtsseitige Parietal-/Körperwissen-Scene. |
| 60-61 | Cinguläres Kontrollsystem/ACC | ja | `acc-bush`. |
| 62-64 | Flanker-Aufgabe | ja | `flanker-aufgabe`, Scene-Farben, keine Atlas-Preset-Färbung. |
| 65-67 | Emotionaler Stroop, dACC vs. ventraler ACC | ja | `acc-bush`; klassisch/kognitiv vs. emotional/ventral ist in der Scene-Semantik dokumentiert. |
| 68-72 | Übergang und Quellen | nein | Keine eigene Färbung. |
| 73-74 | Marcus-Intro/Agenda | nein | Keine eigene Färbung. |
| 75 | ACC-Brücke zum VCPT | ja | `acc-bush`. |
| 76 | Go-/No-go-Grundprinzip | ja | `go-nogo-intro`, Scene-Farben. |
| 77-79 | VCPT Ablauf und A-P-Bedingung | ja | `vcpt`, Scene-Farben. |
| 80-82 | Verhalten, SDT, ERP-Kurve lesen | nein/scene | 2D-/Didaktikgrafiken. Kein Atlas-Preset. |
| 83-85 | ICA und drei ERP-Komponenten | ja | `ica-uebersicht`, Scene-Farben. |
| 86 | P3a No-go Konfliktmonitoring | ja | `p3a-konfliktmonitoring`. |
| 87 | P3b Go Engagement | ja | `p3b-engagement`. |
| 88 | P3z No-go Inhibition | ja | `p3z-inhibition`. |
| 89-90 | ERP-Synthese und Take-home | ja/summary | `zusammenfassung` oder direkter Rücksprung in P3a/P3b/P3z. Keine neue Färbung. |
| 91 | Gesamtzusammenfassung | ja | `zusammenfassung`; Runtime-Regionen decken die sechs Textknoten explizit ab. |
| 92 | Frontostriatales Netzwerk/Basalganglien-Schleifen | ja | `basalganglienschleifen`. |
| 93 | Live am 3D-Hirn | ja | `zusammenfassung` führt DLPFC, VMPFC, PPC · Parietal, Basalganglien, dACC · Cingulum und SMA / pre-SMA explizit. |
| 94-95 | Quellen/Backup-Intro | nein | Keine App-Färbung. |
| 96-112 | Interaktionsteil, Multiple Choice, Diskussion | nein | Quiz-/Diskussionsfolien, keine neue App-Färbung. |

## Grafik-zu-Areal-Matrix

| Status | PDF-Seite(n) | PDF-Grafik / Folie | Lehrbuch-/App-Figure | Config / Route | Konkrete Areas, Buckets oder Scene-Regions | Anzeigeauftrag | Farbauftrag | Verifikation |
|---|---:|---|---|---|---|---|---|---|
| deck-only | 11 | Goldman-Rakic dorsal/ventraler Affen-PFC | keine aktuelle Human-Atlas-Figure | keine App-Route | Tierexperimenteller Affen-PFC: dorsal/ventral zum Sulcus principalis; PDF nennt selbst die fehlende Bestätigung durch Human-Bildgebung | Bewusst keine App-Färbung | `not-app-relevant`; Human-DLPFC/VLPFC-Route wäre ein Fallback | Dart: [Entscheide Goldman-Rakic Affen-PFC als App-Handoff oder Deck-only](https://app.dartai.com/t/RyU5WYQIkXxA-Entscheide-Goldman-Rakic-Affen) |
| done | 13 | PFC-Funktionen nach Petrides | 11-05 | `pfc-petrides` via `?sequence=presentation.kapitel11-vorlesung&config=pfc-petrides&scene=pfc-petrides&step=0` | Buckets: `dlpfc`, `vlpfc`, `ppc`, `pcc-praecuneus` | Highlight Buckets, andere dimmen | `colors.scheme=preset`, Preset `pfc-petrides`; Legende: DLPFC (Manipulieren), VLPFC (Halten/Abrufen), Posterior (Speicher) | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` |
| done | 14 | Überlappende frontale Aktivierungen nach Duncan/Owen | PDF-spezifische Vortragsfolie | `duncan-owen-overlap` via `?sequence=presentation.kapitel11-vorlesung&config=duncan-owen-overlap&scene=duncan-owen-overlap&step=0` | Buckets: `dlpfc`, `vlpfc`; Scene-Region: `pfc-overlap` | Gemeinsamer PFC-Überlappungsraum, Aufgabenvielfalt und Methodenlimit | `colors.enabled=false`, `scheme=scene`; kein Petrides-Preset, keine getrennte Funktionsrollen-Färbung | `build-config.test.mjs`, Browser-Smoke `duncan-owen-overlap` |
| done | 18 | Fuster Wahrnehmungs-Handlungs-Zyklus | 11-06 | `fuster-gradient` via `?sequence=presentation.kapitel11-vorlesung&config=fuster-gradient&scene=fuster-gradient&step=0` | Buckets: `frontopolar`, `dlpfc`, `vlpfc`, `ppc` | Highlight Gradient, andere dimmen | Preset `fuster-gradient`; Legende: Frontopolar, DLPFC, VLPFC, Posterior | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 19-21 | Rostrokaudale Achse | 11-07 | `badre-rostrokaudal` via `?sequence=presentation.kapitel11-vorlesung&config=badre-rostrokaudal&scene=badre-rostrokaudal&step=0` | Buckets: `frontopolar`, `dlpfc`, `sma-presma`, `vlpfc` | Highlight rostrokaudale Staffelung | Preset `badre-rostrokaudal`; Legende: BA 10, BA 9/46, BA 8/6, BA 47/45/44 | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` |
| done | 24 | Badre Domänenmodell | 11-08A | `badre-domainen` via `?sequence=presentation.kapitel11-vorlesung&config=badre-domainen&scene=badre-domainen&step=0` | Buckets: `frontopolar`, `dlpfc`, `vlpfc` | Highlight PFC-Kernbereiche | Preset `badre-domainen`; Legende: Frontopolar, DLPFC, VLPFC | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 25-26 | Badre relationale Komplexität | 11-08B | `badre-relationale-komplexitaet` via `?sequence=presentation.kapitel11-vorlesung&config=badre-relationale-komplexitaet&scene=badre-relationale-komplexitaet&step=0` | Buckets: `frontopolar`, `dlpfc`, `vlpfc` | Highlight PFC-Kernbereiche | Preset `badre-relationale-komplexitaet`; gleiche Legende wie 11-08A | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 27 | Badre Kaskadenmodell | 11-08C | `badre-kaskade` via `?sequence=presentation.kapitel11-vorlesung&config=badre-kaskade&scene=badre-kaskade&step=0` | Buckets: `frontopolar`, `dlpfc`, `vlpfc` | Highlight Kontrollkaskade | Preset `badre-kaskade`; gleiche Legende wie 11-08A | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 28-29 | Badre Konflikttypen | 11-08D | `badre-konflikttypen` via `?sequence=presentation.kapitel11-vorlesung&config=badre-konflikttypen&scene=badre-konflikttypen&step=0` | Buckets: `dlpfc`, `vlpfc`, `dacc` | Highlight Konflikttypen, mediale Kamera | Preset `badre-konflikttypen`; Legende: DLPFC (Kontext), VLPFC (Auswahl), dACC (Konflikt) | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 34 | DLPFC-Schädigung / Perseveration | PDF-spezifische Vortragsfolie | `dlpfc-schaedigung` via `?sequence=presentation.kapitel11-vorlesung&config=dlpfc-schaedigung&scene=dlpfc-schaedigung&step=0` | Bucket: `dlpfc`; Scene-Region: `dlpfc` | Klinischer DLPFC-Kontext für Perseveration und fehlendes Umstellen | `colors.enabled=false`, `scheme=scene`; keine Tower-of-London-Färbung | `build-config.test.mjs`, Browser-Smoke `dlpfc-schaedigung` |
| done | 35-39 | Wisconsin Card Sorting Test | 11-09 | `wcst-frontoparietal` via `?sequence=presentation.kapitel11-vorlesung&config=wcst-frontoparietal&scene=wcst-frontoparietal&step=0` | Buckets: `dlpfc`, `vlpfc`, `ppc` | Highlight frontoparietales Netzwerk | Preset `wcst-frontoparietal`; Legende: DLPFC, VLPFC, Parietal | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 40-43 | Klassischer Stroop und beteiligte Hirnregionen | PDF-spezifische Grafik | `acc-bush` via `?sequence=presentation.kapitel11-vorlesung&config=acc-bush&scene=acc-bush&step=0` | Buckets: `dacc`, `vmpfc`, `ofc`; Scene-Region: `acc-anterior` | Dorsales ACC für kognitive Konflikte/Stroop/Flanker | Preset `acc-bush`; Legende: dorsales ACC/kognitiv, ventrales ACC/OFC/emotional | `acc-bush.json`, `build-config.test.mjs`, `smoke-figures.mjs` |
| done | 44 | Flüssigkeitstests | 11-10 | `fluency-foci` via `?sequence=presentation.kapitel11-vorlesung&config=fluency-foci&scene=fluency-foci&step=0` | Buckets: `dlpfc`, `vlpfc`, `sma-presma` | Highlight Foci | Preset `fluency-foci`; Legende: DLPFC, VLPFC, SMA/pre-SMA | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 45 | Tower of London Aufgabe | 11-11A/B | `tower-of-london-dlpfc` via `?sequence=presentation.kapitel11-vorlesung&config=tower-of-london-dlpfc&scene=tower-of-london-dlpfc&step=0` | Bucket: `dlpfc` | Highlight DLPFC, andere dimmen | Preset `tower-of-london-dlpfc`; Legende: DLPFC-Aktivierung | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 46 | Tower of London Schwierigkeit | 11-11C | `tower-of-london-schweregrad` via `?sequence=presentation.kapitel11-vorlesung&config=tower-of-london-schweregrad&scene=tower-of-london-schweregrad&step=0` | Bucket: `dlpfc` | Highlight DLPFC | Preset `tower-of-london-schweregrad`; Legende: DLPFC-Aktivierung | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 47 | Selbstkontrolle, rechter DLPFC | PDF-spezifische Vortragsfolie | `right-dlpfc-selbstkontrolle` via `?sequence=presentation.kapitel11-vorlesung&config=right-dlpfc-selbstkontrolle&scene=right-dlpfc-selbstkontrolle&step=0` | Bucket: `right-dlpfc`; Scene-Region: `right-dlpfc`; Meshes: `right-middle-frontal-gyrus`, `right-superior-frontal-gyrus` | Rechtsseitiger DLPFC für Top-down-Kontrolle und Selbstkontrolle | `colors.enabled=false`, `scheme=scene`; rechtsseitig, nicht bilateraler DLPFC | `build-config.test.mjs`, Browser-Smoke `right-dlpfc-selbstkontrolle` |
| partial | 53-55 | VMPFC/OFC und Phineas Gage | Fallstudie | `ofc-phineas` via `?sequence=presentation.kapitel11-vorlesung&config=ofc-phineas&scene=ofc-phineas&step=0` | Areas: `dkt:lateralorbitofrontal:l`, `dkt:medialorbitofrontal:l`; Buckets: `ofc`, `vmpfc`; Scene-Region: `vm-ofc`; Fallstudien-Läsionen: `left-straight-gyrus`, `left-medial-orbital-gyrus`, `left-medial-orbital-gyrus-v2`, `left-anterior-orbital-gyrus`, `left-posterior-orbital-gyrus`, `left-lateral-orbital-gyrus`, `left-subcallosal-area` | Highlight Läsions-/OFC-Kontext; Lesionsschritte zeigen transparenten Schädel und Stange als räumliche Referenz | Preset `ofc-phineas`, Coverage `partial`; Legende: Läsionsgebiet | Config vorhanden; Lesionsschärfung in `PHINEAS_GAGE.steps`; Phineas-Asset-Space bleibt separater Blocker |
| done | 58-59 | Parietales Kontrollsystem/Läsionen | PDF-spezifische Vortragsfolie | `right-parietal-lesion` via `?sequence=presentation.kapitel11-vorlesung&config=right-parietal-lesion&scene=right-parietal-lesion&step=0` | Bucket: `right-parietal-body`; Scene-Region: `right-parietal-body`; Meshes: `right-superior-parietal-lobule`, `right-supramarginal-gyrus`, `right-angular-gyrus` | Rechtsseitiger Parietallappen für Körperwissen, Handelnden-Zuordnung und Läsionsfolgen | `colors.enabled=false`, `scheme=scene`; kein allgemeiner PPC-Fallback | `build-config.test.mjs`, Browser-Smoke `right-parietal-lesion` |
| done | 60-61, 75 | ACC/cinguläres Kontrollsystem, Brücke zum VCPT | 11-13 | `acc-bush` via `?sequence=presentation.kapitel11-vorlesung&config=acc-bush&scene=acc-bush&step=0` | Buckets: `dacc`, `vmpfc`, `ofc`; Scene-Region: `acc-anterior` | Highlight dorsal vs. ventral/affektiv | Preset `acc-bush`; Legende: Dorsales ACC, ventrales ACC/OFC | `figureScenePackages.test.ts`, `build-config.test.mjs`, `smoke-figures.mjs` |
| done | 62-64 | Flanker-Aufgabe | 11-12 | `flanker-aufgabe` via `?sequence=presentation.kapitel11-vorlesung&config=flanker-aufgabe&scene=flanker-aufgabe&step=0` | Scene-Regions: `acc-anterior`, `inhibition-network` | Flowchart-/Aufgaben-Szene | `colors.enabled=false`, `scheme=scene`; keine Atlas-Preset-Färbung | `figureScenePackages.test.ts`, `build-config.test.mjs` |
| done | 65-67 | Emotionaler Stroop, dACC vs. ventraler ACC | PDF-spezifische Grafik | `acc-bush` via `?sequence=presentation.kapitel11-vorlesung&config=acc-bush&scene=acc-bush&step=0` | Buckets: `dacc`, `vmpfc`, `ofc`; Scene-Region: `acc-anterior`; Scene-Text trennt klassisch/kognitiv von emotional/ventral | `acc-bush` mit sichtbarer Stroop-Semantik | Preset `acc-bush`; Legende: dorsales ACC/kognitiv, ventrales ACC/OFC/emotional | `acc-bush.json`, `build-config.test.mjs`, `smoke-figures.mjs` |
| done | 76 | Go-/No-go-Grundprinzip | didaktische Szene | `go-nogo-intro` via `?sequence=presentation.kapitel11-vorlesung&config=go-nogo-intro&scene=go-nogo-intro&step=0` | Scene-Region: `inhibition-network` | Prose-/Aufgaben-Szene | `colors.enabled=false`, `scheme=scene` | `scenes.test.ts`, `build-config.test.mjs` |
| done | 77-79 | VCPT Ablauf/A-P-Hemmung | 11-14 | `vcpt` via `?sequence=presentation.kapitel11-vorlesung&config=vcpt&scene=vcpt&step=0` | Scene-Region: `sma-presma` | Flowchart-/Aufgaben-Szene | `colors.enabled=false`, `scheme=scene` | `smoke-scenes.mjs`, `smoke-subparcels.mjs`, `build-config.test.mjs` |
| scene-only | 80-82 | Reaktionsmatrix, SDT, ERP-Kurve lesen | didaktische 2D-Grafiken | keine neue Atlas-Config | keine Area-ID; Verhalten/Signal/ERP-Diagramm | `flowchart-only` oder im VCPT/ERP-Segment belassen | Keine Atlas-Färbung | Entscheidung nur nötig, wenn diese Grafiken in der App interaktiv werden sollen |
| done | 83-85 | ICA und drei ERP-Komponenten | didaktische Szene | `ica-uebersicht` via `?sequence=presentation.kapitel11-vorlesung&config=ica-uebersicht&scene=ica-uebersicht&step=0` | Scene-Region: `inhibition-network` | Flowchart-/ERP-Übersicht | `colors.enabled=false`, `scheme=scene` | `smoke-ica.mjs`, `build-config.test.mjs` |
| done | 86 | P3a No-go Konfliktmonitoring | 11-15(1) | `p3a-konfliktmonitoring` via `?sequence=presentation.kapitel11-vorlesung&config=p3a-konfliktmonitoring&scene=p3a-konfliktmonitoring&step=0` | Area: `dkt:rostralanteriorcingulate:l`; Scene-Region: `acc-anterior` | Target-Fit auf rostrales ACC plus ERP-Overlay | `colors.enabled=false`, `scheme=atlas`; ERP-/Carve-Farben aus Scene/Atlas | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `configExport.test.ts` |
| done | 87 | P3b Go Engagement | 11-15(2) | `p3b-engagement` via `?sequence=presentation.kapitel11-vorlesung&config=p3b-engagement&scene=p3b-engagement&step=0` | Scene-Region: `parietal-frontal` | ERP-Overlay, parietal/frontal | `colors.enabled=false`, `scheme=scene` | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3b.mjs` |
| done | 88 | P3z No-go Inhibition | 11-15(3) | `p3z-inhibition` via `?sequence=presentation.kapitel11-vorlesung&config=p3z-inhibition&scene=p3z-inhibition&step=0` | Scene-Region: `sma-presma` | ERP-Overlay, medialer Frontalkortex/SMA | `colors.enabled=false`, `scheme=scene` | `smoke-scenes.mjs`, `smoke-eeg.mjs`, `smoke-eeg-p3z.mjs` |
| done | 91, 93 | Gesamtzusammenfassung und Live am 3D-Hirn | Aggregat | `zusammenfassung` via `?sequence=presentation.kapitel11-vorlesung&config=zusammenfassung&scene=zusammenfassung&step=0` | Buckets: `dlpfc`, `vmpfc`, `ppc`, `striatum-dorsal`, `globus-pallidus`, `thalamus`, `nucleus-accumbens`, `dacc`, `sma-presma`; Scene-Regions: `dlpfc`, `vmpfc`, `ppc`, `basalganglia-recap`, `dacc`, `acc-cingulum`, `sma-presma` | Aggregierte Recap-Szene mit eigener Überschrift `Recap am ganzen Hirn` und sechs abfragbaren Knoten: DLPFC, VMPFC, PPC · Parietal, Basalganglien, dACC · Cingulum, SMA / pre-SMA | `colors.enabled=false`, `scheme=scene`; keine Atlas-Preset-Färbung, sondern Scene-Farbvertrag | `build-config.test.mjs`, `figureScenePackages.test.ts`, Browser-Smoke `zusammenfassung`; Dart: [Task Farbkontrakt](https://app.dartai.com/t/lBEWZJxGEOsH-Korrigiere-Legenden-Mesh-Farbk), [Semantik-Audit](https://app.dartai.com/c/PGgkWCaX2HrH), [Recap-Wiki-Plan](https://app.dartai.com/c/qbY8RYAehoGV) |
| done | 92 | Frontostriatales Netzwerk mit drei Basalganglien-Schleifen | 11-04 | `basalganglienschleifen` via `?sequence=presentation.kapitel11-vorlesung&config=basalganglienschleifen&scene=basalganglienschleifen&step=0` | Areas: `dkt:lateralorbitofrontal:l`, `dkt:medialorbitofrontal:l`, `dkt:rostralanteriorcingulate:l`; Buckets: `dlpfc`, `ppc`, `striatum-dorsal`, `globus-pallidus`, `thalamus`, `ofc`, `vmpfc`, `amygdala`, `hippocampus`, `dacc`, `nucleus-accumbens` | Highlight drei Schleifen, andere dimmen | Preset `basalganglienschleifen`; Legende: Kognition, Emotion, Motivation | `smoke-figures.mjs`, `build-config.test.mjs` |

## Bucket- und Scene-Region-Glossar

| ID | Aktuelle Runtime-Meshes |
|---|---|
| `amygdala` | `left-amygdala`, `right-amygdala` |
| `dacc` | `left-caudal-anterior-cingulate`, `right-caudal-anterior-cingulate` |
| `dlpfc` | `left-middle-frontal-gyrus`, `right-middle-frontal-gyrus`, `left-superior-frontal-gyrus`, `right-superior-frontal-gyrus` |
| `pfc-overlap` | `left-middle-frontal-gyrus`, `right-middle-frontal-gyrus`, `left-superior-frontal-gyrus`, `right-superior-frontal-gyrus`, `left-parsopercularis`, `right-parsopercularis`, `left-parstriangularis`, `right-parstriangularis`, `left-parsorbitalis`, `right-parsorbitalis` |
| `right-dlpfc` | `right-middle-frontal-gyrus`, `right-superior-frontal-gyrus` |
| `frontopolar` | `left-frontopolar`, `right-frontopolar` |
| `globus-pallidus` | `left-gpi`, `right-gpi`, `left-gpe`, `right-gpe` |
| `hippocampus` | `left-hippocampus-proper`, `right-hippocampus-proper` |
| `nucleus-accumbens` | `left-nucleus-accumbens`, `right-nucleus-accumbens` |
| `ofc` | `left-lateral-orbitofrontal`, `right-lateral-orbitofrontal`, `left-medial-orbitofrontal`, `right-medial-orbitofrontal`, `left-anterior-orbital-gyrus`, `right-anterior-orbital-gyrus`, `left-posterior-orbital-gyrus`, `right-posterior-orbital-gyrus` |
| `pcc-praecuneus` | `left-precuneus`, `right-precuneus` |
| `ppc` | `left-superior-parietal-lobule`, `right-superior-parietal-lobule`, `left-supramarginal-gyrus`, `right-supramarginal-gyrus`, `left-angular-gyrus`, `right-angular-gyrus` |
| `right-parietal-body` | `right-superior-parietal-lobule`, `right-supramarginal-gyrus`, `right-angular-gyrus` |
| `sma-presma` | `left-sma`, `right-sma`, `left-pre-sma`, `right-pre-sma` |
| `striatum-dorsal` | `left-caudate-nucleus`, `right-caudate-nucleus`, `left-putamen`, `right-putamen` |
| `thalamus` | `left-ventral-anterior-nucleus`, `right-ventral-anterior-nucleus`, `caudal-part-of-left-ventral-lateral-nucleus`, `caudal-part-of-right-ventral-lateral-nucleus` |
| `vlpfc` | `left-parsopercularis`, `right-parsopercularis`, `left-parstriangularis`, `right-parstriangularis`, `left-parsorbitalis`, `right-parsorbitalis` |
| `vmpfc` | `left-medial-orbital-gyrus`, `right-medial-orbital-gyrus`, `left-subcallosal-area`, `right-subcallosal-area` |
| `acc-anterior` | `left-anterior-cingulate`, `right-anterior-cingulate` |
| `acc-cingulum` | `left-cingulate-gyrus`, `right-cingulate-gyrus` |
| `inhibition-network` | `left-superior-frontal-gyrus`, `right-superior-frontal-gyrus`, `left-cingulate-gyrus`, `right-cingulate-gyrus` |
| `parietal-frontal` | `left-superior-parietal-lobule`, `right-superior-parietal-lobule`, `left-supramarginal-gyrus`, `right-supramarginal-gyrus`, `left-superior-frontal-gyrus`, `right-superior-frontal-gyrus` |
| `sma-presma` Scene-Region | `left-sma`, `right-sma`, `left-pre-sma`, `right-pre-sma` |
| `vm-ofc` | `left-lateral-orbitofrontal`, `right-lateral-orbitofrontal`, `left-medial-orbitofrontal`, `right-medial-orbitofrontal`, `left-anterior-orbital-gyrus`, `right-anterior-orbital-gyrus`, `left-posterior-orbital-gyrus`, `right-posterior-orbital-gyrus`, `left-medial-orbital-gyrus`, `right-medial-orbital-gyrus`, `left-subcallosal-area`, `right-subcallosal-area` |

## Offene Umsetzungsentscheidungen

Diese Punkte sind kein Fallback. Sie bleiben blockiert, bis eine echte
Entscheidung oder eine konkrete Config-Erweiterung existiert.

| ID | PDF-Seite(n) | Unklarheit | Verbotener Endzustand | Erlaubter Endzustand |
|---|---:|---|---|---|
| VGA-001 | 11 | entschieden: Goldman-Rakic bleibt `deck-only`, weil Affen-PFC/Sulcus-principalis nicht sauber als Human-Atlas-Färbung abbildbar ist. | Als `pfc-petrides` schließen. | erledigt als `not-app-relevant`; keine App-Route. |
| VGA-002 | 14 | entschieden: Duncan/Owen wird als PFC-Überlappungsraum mit Methodenlimit gezeigt, nicht als Petrides-Funktionsaufteilung. | DLPFC/VLPFC grob wiederverwenden. | erledigt über `duncan-owen-overlap`. |
| VGA-003 | 34, 47 | entschieden: DLPFC-Schädigung und rechter DLPFC sind eigene Vortrags-Configs. | `tower-of-london-dlpfc` als Ersatz verwenden. | erledigt über `dlpfc-schaedigung` und `right-dlpfc-selbstkontrolle`. |
| VGA-004 | 40-43, 65-67 | entschieden: `acc-bush` trägt die sichtbare Stroop-Semantik (`dorsales ACC` = kognitive Konflikte/Stroop/Flanker; `ventrales ACC/OFC` = emotionale Stroop-Konflikte). | Still auf `acc-bush` routen, ohne separaten Begleittext-Vertrag. | erledigt über dokumentierte `acc-bush`-Semantik. |
| VGA-005 | 58-59 | entschieden: Parietallappen-Läsionen werden rechtsseitig als Körperwissen-/Handelnden-Zuordnungs-Scene geführt. | Allgemein `ppc` färben und als abgeschlossen melden. | erledigt über `right-parietal-lesion`. |
| VGA-006 | 91, 93 | entschieden: `zusammenfassung` führt die sechs Live-Recap-Knoten explizit als Buckets/Scene-Regions und zeigt sie als Flowchart. | Recap als fertig melden, obwohl VMPFC/Basalganglien/DLPFC nicht explizit geführt sind. | erledigt über erweiterten `zusammenfassung`-Scene-Vertrag. |

## Verifikation je Umsetzungsschnitt

Nach Änderungen an Configs, Buckets oder Presets:

```bash
node scripts/atlas/build-config.mjs
node --test scripts/atlas/build-config.test.mjs
pnpm --dir apps/brain-app test -- src/viewer/colorPresets.test.ts src/viewer/atlas/atlasConfig.test.ts src/scene/figureScenePackages.test.ts
pnpm --dir apps/brain-app typecheck
SMOKE_URL=http://localhost:5173 node scripts/atlas/smoke-figures.mjs
```

Für Scene-/ERP-Schnitte zusätzlich den passenden Smoke nennen, zum Beispiel
`smoke-ica.mjs`, `smoke-vcpt.mjs`, `smoke-eeg.mjs`,
`smoke-eeg-p3b.mjs` oder `smoke-eeg-p3z.mjs`.
