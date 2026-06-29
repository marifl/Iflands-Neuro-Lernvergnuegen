# Scout Review — Coverage-Matrix, Glossare, Areale

Datum: 2026-06-27

Status: `DONE_WITH_CONCERNS`

## Gesamtbefund

Die vorhandene Matrix ist als Quellenanker-Übersicht brauchbar, aber nicht als
100%-Nachweis für das Wiki. Vier Read-only-Scouts haben unabhängig geprüft:
Glossar-/Register-Rohinventur, Atlas-/Subareal-Coverage und Duplikate sind noch
nicht final reviewt.

## Jäncke Index

Reliability: nicht autoritativ für Term-Level-Coverage.

Korrekturregeln:

1. Zwei Spalten getrennt parsen.
2. Parent-Kontext je Spalte halten.
3. `s.` / `s. auch` als Redirect/Alias, nicht als offene Konzepte zählen.
4. Orphan-Subentries wie `späte`, `apperzeptive`, `Lernen` nicht als Headwords zählen.
5. Autoren nur zählen, wenn sie Modell, Test, Theorie oder Syndrom bezeichnen.

Top-Lücken: reine Alexie, Alien-Hand-Syndrom, Acoustic Change Complex, Alpha-Band-Familie,
Afferenzkopie, Asymmetric Sampling in Time, Corbetta-Shulman-Modell,
Mirsky-Aufmerksamkeitsmodell, Biased-Competition-Modell, BOLD-Signal,
Bottom-up/Top-down-Verarbeitung, Closed-/Open-Loop-Control, CNV, Disconnection-Paradigma,
Single-Process-Recognition-Memory-Theorie, ERD/ERS, ERN, Exafferenz/Reafferenz,
Frontale Midline-Theta-Aktivität, Hyperbinding-Coactivation-Modell,
Inhibition of Return, Libet-Experiment, MMN, N-back-Aufgabe,
OFC-Amygdala-Accumbens-Komplex, P50-Paradigma, Resting-State/Task-Negative-Network,
BIS/BAS-Modell, Visual Word Form Area.

## Lehrner Sachverzeichnis

Reliability: nur grobe Triage.

Korrekturregeln:

1. Nur `raw/textbooks/lehrner-klin-neuropsych-2.md` `L40338-L40622` auswerten.
2. Ab `L40623` Autor-/Bio-Text komplett ausschließen.
3. Zwei Spalten getrennt parsen.
4. Unterpunkte an Parent hängen, z. B. `Apraxie` + `– okuläre` zu `okuläre Apraxie`.
5. Ligaturen normalisieren.
6. Juristische, administrative, reine Statistik- und Medikament-Indikationszeilen ausschließen.

Top-Lücken: Abulie/Hypobulie, Abstraktionsvermögen, Aufmerksamkeitsfeld,
analoge Größenrepräsentation, Chorea/Ballismus, Bradyphrenie, appallisches Syndrom,
apperzeptive Agnosie, okuläre Apraxie, chaining, errorless learning,
fronto-subkortikale Schaltkreise, diffuse axonale Verletzung, dorsale/ventrale
Simultanagnosie, Gedächtnistraining, Dysarthrie, Dyschromatopsie/Hemiachromatopsie,
hemianopische Lesestörung, homonyme Gesichtsfeldstörungen, Metagedächtnisstörung,
Myopia for the future, Neologismus, postläsionelle/transmodale Plastizität,
posttraumatische Amnesie, Pragmatik, reine Alexie, Unawareness, VLMT,
Wernicke-Encephalopathie.

## Karnath und Bear

Reliability: niedrig für Term-Level-Entscheidungen.

Korrekturregeln:

1. Glossarbereiche hart begrenzen: Karnath vor Literatur, Bear vor Sachverzeichnis `L59944`.
2. OCR zuerst nach Seiten und dann Spalten zerlegen.
3. Lemma-Start pro Spalte erkennen; Fortsetzungszeilen verwerfen.
4. `Siehe`-Einträge als Redirect/Alias-Kandidaten behandeln.
5. Match gegen Slug, Titel, Aliase und Singular-/Pluralvarianten.

Top-Lücken: Agrammatismus, Aphemie, apperzeptive Agnosie, außerkörperliche Erfahrung,
autoskopische Halluzination, Autotopagnosie, BOLD-Kontrast, Brain-Computer-Interface,
Closed-Loop-Control, Corpus geniculatum laterale, Crowding-Effekt, Deafferenzierung,
dorsaler Pfad, Duplex-Theorie des Richtungshörens, Efferenzkopie, ERN, Extinktion,
Gain-Modulation/Gain-Field, ideatorische Apraxie, internes Vorwärtsmodell,
AMPA-Rezeptor, anteriorer cingulärer Cortex, Areal 17, Areal IT, Areal LIP,
Areal MT, Areal V4, äußere Haarzelle, basales Großhirn, Basilarmembran,
cytoarchitektonische Karte, diffuses modulatorisches System, dorsaler Cochleariskern,
Duplextheorie der Schallquellenlokalisierung, frontoparietales Aufmerksamkeitsnetzwerk,
Ganglienzellschicht, Gitterzelle, Gyrus dentatus, Hinterstrangbahn,
Nucleus ventralis posterior.

## Atlas und Duplikate

Atlas-Ontologie: 590 Areal-Einträge.

Machine Crosswalk:

| Atlas | Total | direct_article | parent_region | atlas_overview | open |
|---|---:|---:|---:|---:|---:|
| Brodmann | 82 | 0 | 22 | 60 | 0 |
| Destrieux | 148 | 0 | 0 | 148 | 0 |
| DKT | 68 | 4 | 0 | 64 | 0 |
| Julich | 292 | 0 | 4 | 288 | 0 |

Duplikate: 176 Rohkollisionen sind überbreit. Viele sind Redirects oder
Parent-Child-Aliase. Priorisierte Konfliktzonen:

1. `fef` / `frontales_augenfeld` / `frontallappen`
2. `cingulaerer-cortex` / `gyrus-cinguli` / `acc`
3. `basalganglien` / Child-Kerne
4. `frontallappen` / motorische Gyri und Areale
5. `hippocampus` / entorhinaler Cortex / Gyrus parahippocampalis
6. `amygdala` / `stria-terminalis`
7. Lappen-Seiten vs. einzelne Gyri

## Verdict

`FAIL` für 100%-Coverage. `PASS` nur für: Quellenanker-Coverage der Fachseiten ist
aktuell vollständig gezählt. Alle anderen Domains bleiben teilweise oder offen.
