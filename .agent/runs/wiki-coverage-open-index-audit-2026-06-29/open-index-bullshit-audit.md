# Open Index Bullshit Audit

- Generated: `2026-06-29T15:24:57+02:00`
- DB: `.agent/runs/wiki-coverage-open-index-audit-2026-06-29/coverage.sqlite`
- Scope: `3930` rows with `source_terms.status = open`
- Method: normalized local matching against wiki names plus normalized fulltext occurrence before source-specific register/glossary starts.
- Caveat: this is a rule-based triage report, not a canonical wiki edit or deletion verdict.

## Family Totals

| Family | Count | Share | Meaning |
|---|---:|---:|---|
| `bullshit` | 484 | 12.3% | parser/OCR/person/generic/index artifact |
| `needs_review` | 711 | 18.1% | ambiguous; requires editorial review |
| `not_real_open` | 354 | 9.0% | already covered by existing topic/alias/redirect pattern |
| `true_open` | 2381 | 60.6% | likely real missing backlog |

## Categories

| Category | Count |
|---|---:|
| `bullshit.dangling_function_word` | 12 |
| `bullshit.dangling_punctuation` | 30 |
| `bullshit.generic_index_heading` | 22 |
| `bullshit.generic_subentry` | 8 |
| `bullshit.glossary_ocr_or_definition_fragment` | 3 |
| `bullshit.ocr_definition_fragment` | 14 |
| `bullshit.page_number_bleed` | 7 |
| `bullshit.person_index_entry` | 383 |
| `bullshit.source_footer_or_bibliographic_line` | 1 |
| `bullshit.unbalanced_parenthesis` | 4 |
| `needs_review.glossary_fragment_but_fulltext_supported` | 2 |
| `needs_review.index_only_unverified` | 709 |
| `not_real_open.alias_reversed_existing` | 55 |
| `not_real_open.alias_variant_existing` | 13 |
| `not_real_open.slash_alias_existing` | 69 |
| `not_real_open.subentry_under_existing_topic` | 217 |
| `true_open.fulltext_supported_index_term` | 2249 |
| `true_open.source_defined_glossary_term` | 132 |

## By Source

| Source | true_open | not_real_open | bullshit | needs_review | Total |
|---|---:|---:|---:|---:|---:|
| Bear Sachverzeichnis | 1524 | 5 | 286 | 253 | 2068 |
| Jaencke Index | 499 | 337 | 153 | 367 | 1356 |
| Karnath Glossar | 132 | 4 | 23 | 2 | 161 |
| Lehrner Sachverzeichnis | 226 | 8 | 22 | 89 | 345 |

## Sample Evidence

### `bullshit.dangling_function_word`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Regulation durch Hypophyse und | `raw/textbooks/bear-neurowiss-4.md:61031` | 0 | `` |
| Bear Sachverzeichnis | Rolle von Oxytocin- und | `raw/textbooks/bear-neurowiss-4.md:60284` | 2 | `` |
| Bear Sachverzeichnis | Umbildung von Synapsen durch Lernen und | `raw/textbooks/bear-neurowiss-4.md:60676` | 0 | `` |
| Bear Sachverzeichnis | hemisphärische Kontrolle in Bezug zur | `raw/textbooks/bear-neurowiss-4.md:61002` | 0 | `` |
| Bear Sachverzeichnis | hypothetisches Modell für die | `raw/textbooks/bear-neurowiss-4.md:60703` | 2 | `` |
| Bear Sachverzeichnis | und die biochemischen Lebenszyklen von | `raw/textbooks/bear-neurowiss-4.md:60017` | 1 | `` |
| Karnath Glossar | Patienten mit | `raw/textbooks/karnath-kogn-neurowiss-3.md:38971` | 474 | `` |
| Karnath Glossar | Teil des | `raw/textbooks/karnath-kogn-neurowiss-3.md:38447` | 113 | `` |

### `bullshit.dangling_punctuation`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Ein-Neuron- | `raw/textbooks/bear-neurowiss-4.md:60830` | 57 | `` |
| Bear Sachverzeichnis | Hebb- | `raw/textbooks/bear-neurowiss-4.md:61121` | 45 | `` |
| Bear Sachverzeichnis | Intentions- | `raw/textbooks/bear-neurowiss-4.md:61139` | 2 | `` |
| Bear Sachverzeichnis | Kurzzeit- | `raw/textbooks/bear-neurowiss-4.md:60307` | 38 | `` |
| Bear Sachverzeichnis | Langzeit- | `raw/textbooks/bear-neurowiss-4.md:60308` | 73 | `` |
| Bear Sachverzeichnis | Leitungs- | `raw/textbooks/bear-neurowiss-4.md:60032` | 42 | `` |
| Bear Sachverzeichnis | Protokarten- | `raw/textbooks/bear-neurowiss-4.md:60483` | 1 | `` |
| Bear Sachverzeichnis | REM- | `raw/textbooks/bear-neurowiss-4.md:60923` | 514 | `` |

### `bullshit.generic_index_heading`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Emotion | `raw/textbooks/bear-neurowiss-4.md:60285` | 384 | `` |
| Bear Sachverzeichnis | Funktion | `raw/textbooks/bear-neurowiss-4.md:60370` | 755 | `` |
| Bear Sachverzeichnis | Funktionen | `raw/textbooks/bear-neurowiss-4.md:60200` | 227 | `` |
| Bear Sachverzeichnis | Geschlecht | `raw/textbooks/bear-neurowiss-4.md:60343` | 175 | `` |
| Bear Sachverzeichnis | Lage | `raw/textbooks/bear-neurowiss-4.md:59967` | 430 | `` |
| Bear Sachverzeichnis | Mechanismen | `raw/textbooks/bear-neurowiss-4.md:60879` | 229 | `` |
| Bear Sachverzeichnis | Methoden | `raw/textbooks/bear-neurowiss-4.md:60747` | 85 | `` |
| Bear Sachverzeichnis | Symptome | `raw/textbooks/bear-neurowiss-4.md:60544` | 79 | `` |

### `bullshit.generic_subentry`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Jaencke Index | Asymmetrien, Ursachen | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48188` | 0 | `` |
| Jaencke Index | Emotion und Motivation, Einleitung | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48436` | 0 | `` |
| Jaencke Index | Emotion und Motivation, Lernen | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48440` | 0 | `` |
| Jaencke Index | Gedächtnisprozesse, Abruf | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48641` | 0 | `` |
| Jaencke Index | Gehirn/Ruhezustand, Einleitung | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48633` | 0 | `` |
| Jaencke Index | Links-rechts-Volumenasymmetrie, Einleitung | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48915` | 0 | `` |
| Jaencke Index | Modell, Bedeutung | `raw/textbooks/jaencke-kogn-neurowiss-4.md:49430` | 0 | `` |
| Jaencke Index | Plastizität, Einleitung | `raw/textbooks/jaencke-kogn-neurowiss-4.md:49052` | 0 | `` |

### `bullshit.glossary_ocr_or_definition_fragment`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Karnath Glossar | Realität dieser Art der Störung ist jedoch zweifelhaft | `raw/textbooks/karnath-kogn-neurowiss-3.md:38711` | 0 | `` |
| Karnath Glossar | Schall überlagert | `raw/textbooks/karnath-kogn-neurowiss-3.md:38899` | 0 | `` |
| Karnath Glossar | Umsetzung in motorische Aktionen gestört sein soll | `raw/textbooks/karnath-kogn-neurowiss-3.md:38710` | 0 | `` |

### `bullshit.ocr_definition_fragment`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Karnath Glossar | Basis einer | `raw/textbooks/karnath-kogn-neurowiss-3.md:38726` | 0 | `` |
| Karnath Glossar | Benennens von visuell dargebotenen Objekten | `raw/textbooks/karnath-kogn-neurowiss-3.md:39034` | 0 | `` |
| Karnath Glossar | Bezeichnung Produktionssysteme | `raw/textbooks/karnath-kogn-neurowiss-3.md:38535` | 0 | `` |
| Karnath Glossar | Bild und liefert Ortserkennung und Anfahrtsrichtung | `raw/textbooks/karnath-kogn-neurowiss-3.md:39254` | 0 | `` |
| Karnath Glossar | Bilder ersetzt | `raw/textbooks/karnath-kogn-neurowiss-3.md:39256` | 0 | `` |
| Karnath Glossar | Desoxyhämoglobin beruht | `raw/textbooks/karnath-kogn-neurowiss-3.md:38381` | 0 | `` |
| Karnath Glossar | Die Windungen | `raw/textbooks/karnath-kogn-neurowiss-3.md:38843` | 0 | `` |
| Karnath Glossar | Einstrom oder Schädigung der Rezeptoren reduziert | `raw/textbooks/karnath-kogn-neurowiss-3.md:38776` | 0 | `` |

### `bullshit.page_number_bleed`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Jaencke Index | Gilbert, A. N.155 | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48727` | 0 | `` |
| Jaencke Index | Independent-Component-Analyse/ICA 142 | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48803` | 0 | `` |
| Jaencke Index | Nahinfrarotspektroskopie/NIRS 115 | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48994` | 0 | `` |
| Lehrner Sachverzeichnis | Allgemeines Sozialversicherungsgesetz 35 | `raw/textbooks/lehrner-klin-neuropsych-2.md:40357` | 0 | `` |
| Lehrner Sachverzeichnis | Bio-psycho-soziales Schmerzmodell 411 | `raw/textbooks/lehrner-klin-neuropsych-2.md:40369` | 0 | `` |
| Lehrner Sachverzeichnis | Hirnperfusion (cerebral blood ﬂow) 254 | `raw/textbooks/lehrner-klin-neuropsych-2.md:40452` | 0 | `` |
| Lehrner Sachverzeichnis | atypische Parkinson-Erkrankungen 255 | `raw/textbooks/lehrner-klin-neuropsych-2.md:40346` | 0 | `` |

### `bullshit.person_index_entry`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Doeller, Christian | `raw/textbooks/bear-neurowiss-4.md:60186` | 0 | `` |
| Bear Sachverzeichnis | Dolan, Ray | `raw/textbooks/bear-neurowiss-4.md:60187` | 0 | `` |
| Bear Sachverzeichnis | Donoghue, John | `raw/textbooks/bear-neurowiss-4.md:60189` | 0 | `` |
| Bear Sachverzeichnis | Dowling, John | `raw/textbooks/bear-neurowiss-4.md:60208` | 0 | `` |
| Bear Sachverzeichnis | Dronkers, Nina | `raw/textbooks/bear-neurowiss-4.md:60219` | 0 | `` |
| Bear Sachverzeichnis | Dudai, Yadin | `raw/textbooks/bear-neurowiss-4.md:60227` | 0 | `` |
| Bear Sachverzeichnis | Dudek, Serena | `raw/textbooks/bear-neurowiss-4.md:60228` | 0 | `` |
| Bear Sachverzeichnis | Eccles, John | `raw/textbooks/bear-neurowiss-4.md:60251` | 0 | `` |

### `bullshit.source_footer_or_bibliographic_line`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Karnath Glossar | Hans-Otto Karnath, P. Thier | `raw/textbooks/karnath-kogn-neurowiss-3.md:38251` | 74 | `` |

### `bullshit.unbalanced_parenthesis`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | CREB (cAMP response element binding | `raw/textbooks/bear-neurowiss-4.md:60161` | 1 | `` |
| Karnath Glossar | Durchgängen) der Zielreiz befindet | `raw/textbooks/karnath-kogn-neurowiss-3.md:39357` | 0 | `` |
| Karnath Glossar | Glukose oder Wasser) eingesetzt | `raw/textbooks/karnath-kogn-neurowiss-3.md:39380` | 0 | `` |
| Lehrner Sachverzeichnis | Emissionscomputertomographie) | `raw/textbooks/lehrner-klin-neuropsych-2.md:40591` | 0 | `` |

### `needs_review.glossary_fragment_but_fulltext_supported`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Karnath Glossar | Raumorientierung | `raw/textbooks/karnath-kogn-neurowiss-3.md:38977` | 24 | `` |
| Karnath Glossar | Volumens | `raw/textbooks/karnath-kogn-neurowiss-3.md:39419` | 3 | `` |

### `needs_review.index_only_unverified`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Adaptionsverhalten | `raw/textbooks/bear-neurowiss-4.md:60598` | 0 | `` |
| Bear Sachverzeichnis | Augenentwicklung | `raw/textbooks/bear-neurowiss-4.md:60072` | 0 | `` |
| Bear Sachverzeichnis | Brückenzelle | `raw/textbooks/bear-neurowiss-4.md:60117` | 0 | `` |
| Bear Sachverzeichnis | Bulbus olfactorius accessorius | `raw/textbooks/bear-neurowiss-4.md:60123` | 0 | `` |
| Bear Sachverzeichnis | CNTNAP2-Gen | `raw/textbooks/bear-neurowiss-4.md:60170` | 0 | `` |
| Bear Sachverzeichnis | D2-Dopaminrezeptor-Gen | `raw/textbooks/bear-neurowiss-4.md:60188` | 0 | `` |
| Bear Sachverzeichnis | Differenzierung der Areale | `raw/textbooks/bear-neurowiss-4.md:60672` | 0 | `` |
| Bear Sachverzeichnis | Differenzierung zu Pyramidenzelle | `raw/textbooks/bear-neurowiss-4.md:60739` | 0 | `` |

### `not_real_open.alias_reversed_existing`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Jaencke Index | Alertnessnetzwerk, tonisches/TAN | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48143` | 0 | `tonisches-alertnessnetzwerk` |
| Jaencke Index | Areal, supplementärmotorisches/SMA | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48215` | 0 | `supplementarmotorisches-areal` |
| Jaencke Index | Aufmerksamkeitsnetzwerk, dorsales/DAN 685 | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48298` | 0 | `dorsales-aufmerksamkeitsnetzwerk` |
| Jaencke Index | Augenfeld, frontales, Metaphern | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48246` | 0 | `frontales-augenfeld` |
| Jaencke Index | Augenfeld, frontales, Modell | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48247` | 0 | `frontales-augenfeld` |
| Jaencke Index | Augenfeld, frontales, Neuroanatomie | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48248` | 0 | `frontales-augenfeld` |
| Jaencke Index | Augenfeld, frontales, Neurochemie | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48249` | 0 | `frontales-augenfeld` |
| Jaencke Index | Desynchronisation, ereignisbezogene/ERD | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48411` | 0 | `ereignisbezogene-desynchronisation` |

### `not_real_open.alias_variant_existing`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | GABAerges | `raw/textbooks/bear-neurowiss-4.md:60766` | 0 | `gabaerg` |
| Bear Sachverzeichnis | Hypothalamus (INAH) | `raw/textbooks/bear-neurowiss-4.md:60473` | 1 | `hypothalamus` |
| Bear Sachverzeichnis | Nucleus ventralis posteromedialis (VPM-Kern) | `raw/textbooks/bear-neurowiss-4.md:60749` | 2 | `nucleus-ventralis-posteromedialis` |
| Bear Sachverzeichnis | Pheromone | `raw/textbooks/bear-neurowiss-4.md:60801` | 11 | `pheromon` |
| Jaencke Index | Angstreaktionen | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48134` | 1 | `angstreaktion` |
| Jaencke Index | BOLD-Signale | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48359` | 4 | `bold-signal` |
| Jaencke Index | Dendritic Spines | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48404` | 1 | `dendritic-spine` |
| Jaencke Index | Motoneurone | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48955` | 8 | `motoneuron` |

### `not_real_open.slash_alias_existing`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Jaencke Index | Asymmetrie/Dynamik | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48168` | 0 | `asymmetrie` |
| Jaencke Index | Asymmetrie/Dynamik, Symptomgruppen | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48169` | 0 | `asymmetrie` |
| Jaencke Index | Brain-Computer-Interface-Technik/BCI | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48362` | 1 | `bci` |
| Jaencke Index | Computertomografie/CT | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48344` | 1 | `computertomografie` |
| Jaencke Index | Early left anterior negativity/ELAN | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48387` | 2 | `elan` |
| Jaencke Index | Elektroenzephalogramm/EEG | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48406` | 1 | `elektroenzephalogramm` |
| Jaencke Index | Elektroenzephalogramm/EEG, Alpha-Rhythmus | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48408` | 0 | `elektroenzephalogramm` |
| Jaencke Index | Elektroenzephalogramm/EEG, Analysen, frequenzbezogene | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48409` | 0 | `elektroenzephalogramm` |

### `not_real_open.subentry_under_existing_topic`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | Rezeptor, Typen | `raw/textbooks/bear-neurowiss-4.md:60913` | 0 | `rezeptor` |
| Jaencke Index | Afferenzen, mental vorgestellte | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48112` | 0 | `afferenzen` |
| Jaencke Index | Agnosie, Perspektiven, ungewöhnliche | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48122` | 0 | `agnosie` |
| Jaencke Index | Agnosie, Zeichnungen | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48124` | 0 | `agnosie` |
| Jaencke Index | Agnosie, visuell-räumliche | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48123` | 0 | `agnosie` |
| Jaencke Index | Alertness, intrinsische | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48140` | 0 | `alertness` |
| Jaencke Index | Alertness, phasische | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48141` | 0 | `alertness` |
| Jaencke Index | Alertness, tonische | `raw/textbooks/jaencke-kogn-neurowiss-4.md:48142` | 1 | `alertness` |

### `true_open.fulltext_supported_index_term`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Bear Sachverzeichnis | 5-HT1B -Rezeptor-Knock-out-Maus | `raw/textbooks/bear-neurowiss-4.md:60482` | 1 | `` |
| Bear Sachverzeichnis | Adaptation | `raw/textbooks/bear-neurowiss-4.md:59969` | 40 | `` |
| Bear Sachverzeichnis | Adaptationstheorien | `raw/textbooks/bear-neurowiss-4.md:60984` | 1 | `` |
| Bear Sachverzeichnis | Adenosindiphosphat | `raw/textbooks/bear-neurowiss-4.md:59976` | 1 | `` |
| Bear Sachverzeichnis | Alpha-Zelle | `raw/textbooks/bear-neurowiss-4.md:59986` | 1 | `` |
| Bear Sachverzeichnis | Aminogruppe | `raw/textbooks/bear-neurowiss-4.md:59997` | 3 | `` |
| Bear Sachverzeichnis | Amphetamine | `raw/textbooks/bear-neurowiss-4.md:59960` | 13 | `` |
| Bear Sachverzeichnis | Amplitude | `raw/textbooks/bear-neurowiss-4.md:60261` | 42 | `` |

### `true_open.source_defined_glossary_term`

| Source | Term | Anchor | Fulltext before index | Target |
|---|---|---|---:|---|
| Karnath Glossar | Ikonisches Gedächtnis | `raw/textbooks/karnath-kogn-neurowiss-3.md:38664` | 0 | `` |
| Karnath Glossar | Imagination | `raw/textbooks/karnath-kogn-neurowiss-3.md:38667` | 5 | `` |
| Karnath Glossar | Inferior-frontales Kreuzungsareal | `raw/textbooks/karnath-kogn-neurowiss-3.md:38673` | 0 | `` |
| Karnath Glossar | Integrationsfenster | `raw/textbooks/karnath-kogn-neurowiss-3.md:38682` | 1 | `` |
| Karnath Glossar | Intentionen | `raw/textbooks/karnath-kogn-neurowiss-3.md:38690` | 11 | `` |
| Karnath Glossar | Interaurale Pegeldifferenz | `raw/textbooks/karnath-kogn-neurowiss-3.md:38696` | 9 | `` |
| Karnath Glossar | Interaurale Zeitdifferenz | `raw/textbooks/karnath-kogn-neurowiss-3.md:38705` | 5 | `` |
| Karnath Glossar | Internales Vorwärtsmodell | `raw/textbooks/karnath-kogn-neurowiss-3.md:38725` | 0 | `` |

## Next Safe Actions

1. Review `bullshit.*` samples, then materialize confirmed parser-noise as Crosswalk exclusions, not pages.
2. Review `not_real_open.*` and materialize aliases/subentry coverage before writing new content.
3. Send `true_open.*` rows to bounded writer batches only after source-anchor review.
4. Keep `needs_review.*` out of automated writes until a reviewer upgrades or excludes them.
