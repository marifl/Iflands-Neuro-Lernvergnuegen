"""Hybrid-Ontologie fuer die 167 BodyParts3D-Hirnstrukturen.

Erzeugt public/assets/bodyparts3d/ontology.json: ein hierarchischer Baum mit
funktionaler Gruppierung (Lappen, Thalamus-/Hypothalamus-Kerne, Basalganglien,
Hirnstamm, Ventrikel, Cerebellum). Subkerne haengen unter ihrer Gruppe und sind
aufklappbar. Jeder Struktur-Knoten traegt trilinguale Labels (de/la/en), FMA-ID,
Mesh-Slug, Seite und optional eine Kapitel-11-Rolle.

Single Source of Truth fuer die Zuordnung ist das STRUCTURES-Dict unten (Basis-Name
ohne Seite -> Gruppe + de/la-Basislabel). L/R wird per Seite komponiert. Validierung:
jede der 167 Strukturen aus structures.json muss genau einmal eingehaengt werden,
sonst lauter Fehler.
"""

from __future__ import annotations

import json
import os
import re
import sys

# --- Gruppen-Hierarchie (funktional/anatomisch) ------------------------------
# id -> (de, la, en, parent_id|None)
GROUPS: dict[str, tuple[str, str, str, str | None]] = {
    "brain": ("Gehirn", "Encephalon", "Brain", None),
    # Grosshirn
    "telencephalon": ("Grosshirn", "Telencephalon", "Telencephalon", "brain"),
    "frontal-lobe": ("Frontallappen", "Lobus frontalis", "Frontal lobe", "telencephalon"),
    "parietal-lobe": ("Parietallappen", "Lobus parietalis", "Parietal lobe", "telencephalon"),
    "temporal-lobe": ("Temporallappen", "Lobus temporalis", "Temporal lobe", "telencephalon"),
    "occipital-lobe": ("Okzipitallappen", "Lobus occipitalis", "Occipital lobe", "telencephalon"),
    "limbic-cortex": ("Limbischer Cortex", "Cortex limbicus", "Limbic cortex", "telencephalon"),
    "hippocampal-formation": (
        "Hippocampusformation", "Formatio hippocampi", "Hippocampal formation", "telencephalon"),
    "insula": ("Insel", "Insula", "Insula", "telencephalon"),
    "amygdala-grp": ("Amygdala", "Corpus amygdaloideum", "Amygdala", "telencephalon"),
    "basal-ganglia": ("Basalganglien", "Nuclei basales", "Basal ganglia", "telencephalon"),
    "basal-forebrain": (
        "Basales Vorderhirn & Riechbahn", "Prosencephalon basale", "Basal forebrain", "telencephalon"),
    "fornix": ("Fornix", "Fornix", "Fornix", "telencephalon"),
    "telencephalic-wm": ("Marklager", "Substantia alba telencephali", "White matter", "telencephalon"),
    # Zwischenhirn
    "diencephalon": ("Zwischenhirn", "Diencephalon", "Diencephalon", "brain"),
    "thalamus": ("Thalamus", "Thalamus", "Thalamus", "diencephalon"),
    "hypothalamus-grp": ("Hypothalamus", "Hypothalamus", "Hypothalamus", "diencephalon"),
    "subthalamus": ("Subthalamus", "Subthalamus", "Subthalamus", "diencephalon"),
    "epithalamus": ("Epithalamus", "Epithalamus", "Epithalamus", "diencephalon"),
    # Hirnstamm
    "brainstem": ("Hirnstamm", "Truncus encephali", "Brainstem", "brain"),
    "midbrain-grp": ("Mittelhirn", "Mesencephalon", "Midbrain", "brainstem"),
    "pons-grp": ("Bruecke", "Pons", "Pons", "brainstem"),
    "medulla-grp": ("Verlaengertes Mark", "Medulla oblongata", "Medulla oblongata", "brainstem"),
    # Kleinhirn
    "cerebellum-grp": ("Kleinhirn", "Cerebellum", "Cerebellum", "brain"),
    # Ventrikelsystem
    "ventricles": ("Ventrikelsystem", "Systema ventriculare", "Ventricular system", "brain"),
    # Kommissuren
    "commissures": ("Kommissuren", "Commissurae", "Commissures", "brain"),
    # Sehbahn
    "visual-pathway": ("Sehbahn", "Tractus visualis", "Visual pathway", "brain"),
    # Hirnhaeute
    "meninges-grp": ("Hirnhaeute", "Meninges", "Meninges", "brain"),
    # Hirnnerven (I-XII) inkl. Aeste und zugehoerige Ganglien (anatomisch englische Namen)
    "cranial-nerves": ("Hirnnerven", "Nervi craniales", "Cranial nerves", "brain"),
    # Gefaesssystem (Strukturnamen anatomisch englisch; Auto-Klassifikation)
    "vasculature": ("Gefaesssystem", "Vasa", "Vasculature", "brain"),
    "arteries": ("Arterien", "Arteriae", "Arteries", "vasculature"),
    "veins-sinuses": ("Venen & Sinus", "Venae et sinus", "Veins & sinuses", "vasculature"),
}

# --- Struktur-Woerterbuch: lower(base-name) -> (group, de_base, la_base) ------
# de_base: deutscher Fachbegriff. la_base: anatomisches Latein (Nominativ).
STRUCTURES: dict[str, tuple[str, str, str]] = {
    # Frontallappen
    "superior frontal gyrus": ("frontal-lobe", "Obere Stirnwindung", "Gyrus frontalis superior"),
    "middle frontal gyrus": ("frontal-lobe", "Mittlere Stirnwindung", "Gyrus frontalis medius"),
    "inferior frontal gyrus": ("frontal-lobe", "Untere Stirnwindung", "Gyrus frontalis inferior"),
    "precentral gyrus": ("frontal-lobe", "Praezentralwindung", "Gyrus precentralis"),
    "straight gyrus": ("frontal-lobe", "Gerade Windung", "Gyrus rectus"),
    "anterior orbital gyrus": ("frontal-lobe", "Vordere Orbitalwindung", "Gyrus orbitalis anterior"),
    "medial orbital gyrus": ("frontal-lobe", "Mediale Orbitalwindung", "Gyrus orbitalis medialis"),
    "lateral orbital gyrus": ("frontal-lobe", "Laterale Orbitalwindung", "Gyrus orbitalis lateralis"),
    "posterior orbital gyrus": ("frontal-lobe", "Hintere Orbitalwindung", "Gyrus orbitalis posterior"),
    "paraterminal gyrus": ("limbic-cortex", "Paraterminale Windung", "Gyrus paraterminalis"),
    # Parietallappen
    "postcentral gyrus": ("parietal-lobe", "Postzentralwindung", "Gyrus postcentralis"),
    "superior parietal lobule": ("parietal-lobe", "Oberer Scheitellaeppchen", "Lobulus parietalis superior"),
    "supramarginal gyrus": ("parietal-lobe", "Gyrus supramarginalis", "Gyrus supramarginalis"),
    "angular gyrus": ("parietal-lobe", "Winkelwindung", "Gyrus angularis"),
    "precuneus": ("parietal-lobe", "Precuneus", "Precuneus"),
    # Temporallappen
    "superior temporal gyrus": ("temporal-lobe", "Obere Schlaefenwindung", "Gyrus temporalis superior"),
    "anterior part of superior temporal gyrus": (
        "temporal-lobe", "Obere Schlaefenwindung, vorderer Teil", "Gyrus temporalis superior, pars anterior"),
    "posterior part of superior temporal gyrus": (
        "temporal-lobe", "Obere Schlaefenwindung, hinterer Teil", "Gyrus temporalis superior, pars posterior"),
    "middle temporal gyrus": ("temporal-lobe", "Mittlere Schlaefenwindung", "Gyrus temporalis medius"),
    "inferior temporal gyrus": ("temporal-lobe", "Untere Schlaefenwindung", "Gyrus temporalis inferior"),
    "anterior transverse temporal gyrus": (
        "temporal-lobe", "Vordere Querwindung (Heschl)", "Gyrus temporalis transversus anterior"),
    "posterior transverse temporal gyrus": (
        "temporal-lobe", "Hintere Querwindung", "Gyrus temporalis transversus posterior"),
    "entorhinal area": ("temporal-lobe", "Entorhinaler Cortex", "Area entorhinalis"),
    # Okzipitallappen
    "cuneus": ("occipital-lobe", "Cuneus", "Cuneus"),
    "lingual gyrus": ("occipital-lobe", "Zungenwindung", "Gyrus lingualis"),
    "lateral occipital gyrus": ("occipital-lobe", "Laterale Okzipitalwindung", "Gyrus occipitalis lateralis"),
    "superior occipital gyrus": ("occipital-lobe", "Obere Okzipitalwindung", "Gyrus occipitalis superior"),
    # Limbischer Cortex
    "cingulate gyrus": ("limbic-cortex", "Guertelwindung", "Gyrus cinguli"),
    "posterior parahippocampal gyrus": (
        "limbic-cortex", "Hintere parahippocampale Windung", "Gyrus parahippocampalis posterior"),
    "fasciolar gyrus": ("limbic-cortex", "Gyrus fasciolaris", "Gyrus fasciolaris"),
    # Hippocampusformation
    "hippocampus proper": ("hippocampal-formation", "Hippocampus (Cornu ammonis)", "Hippocampus proprius"),
    "dentate gyrus of hippocampus": (
        "hippocampal-formation", "Gyrus dentatus", "Gyrus dentatus"),
    "presubiculum": ("hippocampal-formation", "Presubiculum", "Presubiculum"),
    "lateral longitudinal stria": (
        "hippocampal-formation", "Laterale Laengsstreife", "Stria longitudinalis lateralis"),
    "medial longitudinal stria": (
        "hippocampal-formation", "Mediale Laengsstreife", "Stria longitudinalis medialis"),
    # Amygdala
    "amygdala": ("amygdala-grp", "Mandelkern", "Corpus amygdaloideum"),
    # Basalganglien
    "caudate nucleus": ("basal-ganglia", "Schweifkern", "Nucleus caudatus"),
    "putamen": ("basal-ganglia", "Putamen", "Putamen"),
    "globus pallidus": ("basal-ganglia", "Blasser Kern (Pallidum)", "Globus pallidus"),
    # Marklager
    "internal capsule": ("telencephalic-wm", "Innere Kapsel", "Capsula interna"),
    "white matter of temporal lobe": (
        "telencephalic-wm", "Marklager des Temporallappens", "Substantia alba lobi temporalis"),
    # Thalamus-Kerne
    "anterodorsal nucleus": ("thalamus", "Anterodorsaler Kern", "Nucleus anterodorsalis"),
    "anteromedial nucleus": ("thalamus", "Anteromedialer Kern", "Nucleus anteromedialis"),
    "anteroventral nucleus": ("thalamus", "Anteroventraler Kern", "Nucleus anteroventralis"),
    "ventral anterior nucleus": ("thalamus", "Ventral-anteriorer Kern", "Nucleus ventralis anterior"),
    "caudal part of ventral lateral nucleus": (
        "thalamus", "Ventrolateraler Kern, kaudaler Teil", "Nucleus ventralis lateralis, pars caudalis"),
    "ventral posterolateral nucleus": (
        "thalamus", "Ventral-posterolateraler Kern", "Nucleus ventralis posterolateralis"),
    "caudal part of ventral posterolateral nucleus": (
        "thalamus", "Ventral-posterolateraler Kern, kaudaler Teil",
        "Nucleus ventralis posterolateralis, pars caudalis"),
    "oral part of ventral posterolateral nucleus": (
        "thalamus", "Ventral-posterolateraler Kern, oraler Teil",
        "Nucleus ventralis posterolateralis, pars oralis"),
    "ventral posteromedial nucleus": (
        "thalamus", "Ventral-posteromedialer Kern", "Nucleus ventralis posteromedialis"),
    "parvicellular part of ventral posteromedial nucleus": (
        "thalamus", "Ventral-posteromedialer Kern, parvozellulaerer Teil",
        "Nucleus ventralis posteromedialis, pars parvocellularis"),
    "magnocellular part of medial dorsal nucleus": (
        "thalamus", "Mediodorsaler Kern, magnozellulaerer Teil",
        "Nucleus medialis dorsalis, pars magnocellularis"),
    "paralaminar part of medial dorsal nucleus": (
        "thalamus", "Mediodorsaler Kern, paralaminaerer Teil",
        "Nucleus medialis dorsalis, pars paralaminaris"),
    "parvicellular part of medial dorsal nucleus": (
        "thalamus", "Mediodorsaler Kern, parvozellulaerer Teil",
        "Nucleus medialis dorsalis, pars parvocellularis"),
    "centromedian nucleus": ("thalamus", "Zentromedianer Kern", "Nucleus centromedianus"),
    "parafascicular nucleus": ("thalamus", "Parafaszikulaerer Kern", "Nucleus parafascicularis"),
    "paratenial nucleus": ("thalamus", "Parataenialer Kern", "Nucleus parataenialis"),
    "inferior pulvinar nucleus": ("thalamus", "Unterer Pulvinar-Kern", "Nucleus pulvinaris inferior"),
    "lateral pulvinar nucleus": ("thalamus", "Lateraler Pulvinar-Kern", "Nucleus pulvinaris lateralis"),
    "medial pulvinar nucleus": ("thalamus", "Medialer Pulvinar-Kern", "Nucleus pulvinaris medialis"),
    "oral pulvinar nucleus": ("thalamus", "Oraler Pulvinar-Kern", "Nucleus pulvinaris oralis"),
    "thalamic reticular nucleus": ("thalamus", "Retikulaerer Thalamuskern", "Nucleus reticularis thalami"),
    "lateral geniculate body": ("thalamus", "Seitlicher Kniehoecker", "Corpus geniculatum laterale"),
    "medial geniculate body": ("thalamus", "Innerer Kniehoecker", "Corpus geniculatum mediale"),
    # Hypothalamus
    "hypothalamus": ("hypothalamus-grp", "Hypothalamus", "Hypothalamus"),
    "anterior nucleus of hypothalamus": (
        "hypothalamus-grp", "Vorderer Hypothalamuskern", "Nucleus anterior hypothalami"),
    "arcuate nucleus of hypothalamus": (
        "hypothalamus-grp", "Bogenkern", "Nucleus arcuatus hypothalami"),
    "dorsomedial nucleus of hypothalamus": (
        "hypothalamus-grp", "Dorsomedialer Hypothalamuskern", "Nucleus dorsomedialis hypothalami"),
    "medial preoptic nucleus": (
        "hypothalamus-grp", "Medialer praeoptischer Kern", "Nucleus preopticus medialis"),
    "paraventricular nucleus of hypothalamus": (
        "hypothalamus-grp", "Paraventrikulaerer Hypothalamuskern", "Nucleus paraventricularis hypothalami"),
    "posterior nucleus of hypothalamus": (
        "hypothalamus-grp", "Hinterer Hypothalamuskern", "Nucleus posterior hypothalami"),
    "suprachiasmatic nucleus": (
        "hypothalamus-grp", "Suprachiasmatischer Kern", "Nucleus suprachiasmaticus"),
    "ventromedial nucleus of hypothalamus": (
        "hypothalamus-grp", "Ventromedialer Hypothalamuskern", "Nucleus ventromedialis hypothalami"),
    "tuber cinereum": ("hypothalamus-grp", "Tuber cinereum", "Tuber cinereum"),
    # Epithalamus
    "habenula": ("epithalamus", "Zuegelkern", "Habenula"),
    "pineal body": ("epithalamus", "Zirbeldruese", "Corpus pineale"),
    # Mittelhirn
    "midbrain": ("midbrain-grp", "Mittelhirn", "Mesencephalon"),
    "superior colliculus": ("midbrain-grp", "Oberer Huegel", "Colliculus superior"),
    "inferior colliculus": ("midbrain-grp", "Unterer Huegel", "Colliculus inferior"),
    "brachium of superior colliculus": (
        "midbrain-grp", "Arm des oberen Huegels", "Brachium colliculi superioris"),
    "brachium of inferior colliculus": (
        "midbrain-grp", "Arm des unteren Huegels", "Brachium colliculi inferioris"),
    "red nucleus": ("midbrain-grp", "Roter Kern", "Nucleus ruber"),
    "substantia nigra": ("midbrain-grp", "Schwarze Substanz", "Substantia nigra"),
    "cerebral crus": ("midbrain-grp", "Hirnschenkel", "Crus cerebri"),
    "interpeduncular fossa": ("midbrain-grp", "Zwischenschenkelgrube", "Fossa interpeduncularis"),
    # Bruecke / Mark
    "pons": ("pons-grp", "Bruecke", "Pons"),
    "medulla oblongata": ("medulla-grp", "Verlaengertes Mark", "Medulla oblongata"),
    # Kleinhirn
    "cerebellum": ("cerebellum-grp", "Kleinhirn", "Cerebellum"),
    # Ventrikelsystem
    "lateral ventricle": ("ventricles", "Seitenventrikel", "Ventriculus lateralis"),
    "interventricular foramen": ("ventricles", "Foramen interventriculare (Monroi)", "Foramen interventriculare"),
    "third ventricle": ("ventricles", "Dritter Ventrikel", "Ventriculus tertius"),
    "fourth ventricle": ("ventricles", "Vierter Ventrikel", "Ventriculus quartus"),
    "cerebral aqueduct": ("ventricles", "Hirnwasserleitung", "Aqueductus mesencephali"),
    "choroid plexus of third ventricle": (
        "ventricles", "Plexus choroideus des 3. Ventrikels", "Plexus choroideus ventriculi tertii"),
    # Kommissuren / Balken
    "posterior commissure": ("commissures", "Hintere Kommissur", "Commissura posterior"),
    "anterior commissure": ("commissures", "Vordere Kommissur", "Commissura anterior"),
    "corpus callosum": ("commissures", "Balken", "Corpus callosum"),
    # Insel (Gyri breves + longi)
    "first short gyrus of insula": ("insula", "Erste kurze Inselwindung", "Gyrus brevis primus insulae"),
    "second short gyrus of insula": ("insula", "Zweite kurze Inselwindung", "Gyrus brevis secundus insulae"),
    "intermediate short gyrus of insula": (
        "insula", "Mittlere kurze Inselwindung", "Gyrus brevis intermedius insulae"),
    "anterior accessory gyrus": ("insula", "Vordere akzessorische Inselwindung", "Gyrus accessorius anterior insulae"),
    "first posterior central gyrus": ("insula", "Erste hintere Inselwindung", "Gyrus longus primus insulae"),
    "second posterior central gyrus": ("insula", "Zweite hintere Inselwindung", "Gyrus longus secundus insulae"),
    # Temporallappen-Ergaenzung
    "fusiform gyrus": ("temporal-lobe", "Spindelwindung", "Gyrus fusiformis"),
    # Hippocampusformation-Ergaenzung
    "subiculum": ("hippocampal-formation", "Subiculum", "Subiculum"),
    "induseum griseum": ("hippocampal-formation", "Induseum griseum", "Indusium griseum"),
    # Limbischer Cortex-Ergaenzung
    "uncus": ("limbic-cortex", "Uncus", "Uncus"),
    # Amygdala-Region
    "periamygdaloid area": ("amygdala-grp", "Periamygdalaeres Areal", "Area periamygdaloidea"),
    "stria terminalis": ("amygdala-grp", "Stria terminalis", "Stria terminalis"),
    # Fornix-System
    "anterior column of fornix": ("fornix", "Vordere Fornixsaeule", "Columna anterior fornicis"),
    "posterior column of fornix": ("fornix", "Hintere Fornixsaeule (Crus)", "Crus fornicis"),
    "body of fornix of forebrain": ("fornix", "Fornixkoerper", "Corpus fornicis"),
    "commissure of fornix of forebrain": ("fornix", "Fornixkommissur", "Commissura fornicis"),
    "fimbria of hippocampus": ("fornix", "Fimbria hippocampi", "Fimbria hippocampi"),
    # Basales Vorderhirn / Septum / Riechbahn
    "septum of telencephalon": ("basal-forebrain", "Septum", "Septum telencephali"),
    "subcallosal area": ("basal-forebrain", "Subkallosales Areal", "Area subcallosa"),
    "diagonal band": ("basal-forebrain", "Diagonales Band (Broca)", "Stria diagonalis"),
    "lamina terminalis": ("basal-forebrain", "Lamina terminalis", "Lamina terminalis"),
    "olfactory tract": ("basal-forebrain", "Riechbahn", "Tractus olfactorius"),
    "medial olfactory stria": ("basal-forebrain", "Mediale Riechstreife", "Stria olfactoria medialis"),
    "lateral olfactory stria": ("basal-forebrain", "Laterale Riechstreife", "Stria olfactoria lateralis"),
    # Hypothalamus-Ergaenzung
    "mammillary body": ("hypothalamus-grp", "Mammillarkoerper", "Corpus mammillare"),
    "lateral preoptic nucleus": ("hypothalamus-grp", "Lateraler praeoptischer Kern", "Nucleus preopticus lateralis"),
    "supraoptic nucleus": ("hypothalamus-grp", "Supraoptischer Kern", "Nucleus supraopticus"),
    # Subthalamus
    "subthalamic nucleus": ("subthalamus", "Subthalamischer Kern (STN)", "Nucleus subthalamicus"),
    # Epithalamus-Ergaenzung
    "stria medullaris of thalamus": ("epithalamus", "Stria medullaris thalami", "Stria medullaris thalami"),
    # --- Archiv-Ergaenzungen: ZNS ---
    "fornix of forebrain": ("fornix", "Fornix (ganz)", "Fornix"),
    "mammillothalamic tract of hypothalamus": (
        "hypothalamus-grp", "Mammillothalamischer Trakt", "Tractus mammillothalamicus"),
    "lateral hypothalamic nucleus": ("hypothalamus-grp", "Lateraler Hypothalamuskern", "Nucleus hypothalamicus lateralis"),
    "periventricular nucleus": ("hypothalamus-grp", "Periventrikulaerer Kern", "Nucleus periventricularis"),
    "pituitary gland": ("hypothalamus-grp", "Hirnanhangdruese (Hypophyse)", "Hypophysis"),
    "parahippocampal gyrus": ("limbic-cortex", "Parahippocampale Windung", "Gyrus parahippocampalis"),
    "thalamus": ("thalamus", "Thalamus (ganz)", "Thalamus"),
    "choroid plexus of cerebral hemisphere": (
        "ventricles", "Plexus choroideus (Hemisphaere)", "Plexus choroideus hemispherii"),
    # --- Archiv-Ergaenzungen: Sehbahn ---
    "optic nerve": ("visual-pathway", "Sehnerv", "Nervus opticus"),
    "optic tract": ("visual-pathway", "Sehstrang", "Tractus opticus"),
    "optic chiasm": ("visual-pathway", "Sehnervenkreuzung", "Chiasma opticum"),
    "optic part of retina": ("visual-pathway", "Netzhaut (Pars optica)", "Pars optica retinae"),
    "olfactory nerve": ("basal-forebrain", "Riechnerv", "Nervus olfactorius"),
    # --- Archiv-Ergaenzungen: Hirnhaeute ---
    "falx cerebri": ("meninges-grp", "Hirnsichel", "Falx cerebri"),
    "tentorium cerebelli": ("meninges-grp", "Kleinhirnzelt", "Tentorium cerebelli"),
    "half of tentorium cerebelli": ("meninges-grp", "Kleinhirnzelt (Haelfte)", "Tentorium cerebelli, dimidium"),
    "cerebral hemisphere segment of dura mater": (
        "meninges-grp", "Dura mater (Hemisphaerenanteil)", "Dura mater, pars hemispherica"),
    # --- Archiv-Ergaenzungen (2. Welle): Insel ganz, Ventrikel-System ---
    "insula": ("insula", "Insel (ganz)", "Insula"),
    "central canal of spinal cord": ("ventricles", "Zentralkanal (Rueckenmark)", "Canalis centralis"),
    "choroid plexus of lateral ventricle": (
        "ventricles", "Plexus choroideus (Seitenventrikel)", "Plexus choroideus ventriculi lateralis"),
}

# Schluesselwoerter fuer die Auto-Klassifikation der Gefaesse (keine Hand-Labels noetig).
ARTERY_RE = re.compile(r"\barter(y|ies)\b|communicating|circle of|arterial", re.I)
VENOUS_RE = re.compile(r"\bveins?\b|sinus|venous|plexus", re.I)
NERVE_RE = re.compile(r"\bnerve\b|\bganglion\b", re.I)

# --- Kapitel-11-Rollen: lower(base-name) -> Rolle ----------------------------
# Quelle: docs/KAPITEL11_ABBILDUNGEN_MAPPING.md (exekutive Funktionen, PFC, BG-Schleife)
K11_ROLES: dict[str, str] = {
    "middle frontal gyrus": "DLPFC",
    "superior frontal gyrus": "DLPFC / SMA-Region (medial)",
    "inferior frontal gyrus": "VLPFC",
    "medial orbital gyrus": "VMPFC / OFC",
    "straight gyrus": "VMPFC",
    "anterior orbital gyrus": "OFC",
    "lateral orbital gyrus": "OFC",
    "posterior orbital gyrus": "OFC",
    "cingulate gyrus": "ACC (anteriorer Teil)",
    "caudate nucleus": "Basalganglien-Schleife: Striatum",
    "putamen": "Basalganglien-Schleife: Striatum",
    "globus pallidus": "Basalganglien-Schleife: Pallidum",
    "substantia nigra": "Basalganglien-Schleife: SN",
    "subthalamic nucleus": "Basalganglien-Schleife: STN (indirekter Weg)",
    "precentral gyrus": "Primaer-motorischer Cortex (M1)",
    "postcentral gyrus": "Primaer-somatosensorischer Cortex (S1)",
    "superior parietal lobule": "Parietaler Kortex (WCST/ToL)",
}

SIDE_DE = {"left": " (links)", "right": " (rechts)", "midline": ""}
SIDE_LA = {"left": " sinister", "right": " dexter", "midline": ""}


def base_name(name: str) -> str:
    b = re.sub(r"\bof (left|right)\b", "of", name, flags=re.I)
    b = re.sub(r"\b(left|right)\b", "", b, flags=re.I)
    return re.sub(r"\s+", " ", b).strip().lower()


def main() -> None:
    here = os.path.dirname(os.path.abspath(__file__))
    asset = os.path.normpath(os.path.join(here, "..", "..", "..", "apps", "brain-app",
                                          "public", "assets", "bodyparts3d"))
    reg = json.load(open(os.path.join(asset, "structures.json"), encoding="utf-8"))

    # Struktur-Knoten je Gruppe sammeln
    group_children: dict[str, list[dict]] = {gid: [] for gid in GROUPS}
    unknown: list[str] = []
    for slug, v in sorted(reg.items()):
        b = base_name(v["name"])
        variant = v.get("variant", 1)
        vsuffix = f" (Var. {variant})" if variant > 1 else ""
        if b in STRUCTURES:
            group, de_base, la_base = STRUCTURES[b]
            side = v["side"]
            labels = {
                "de": de_base + SIDE_DE[side] + vsuffix,
                "la": la_base + SIDE_LA[side] + vsuffix,
                "en": v["name"] + vsuffix,
            }
        elif ARTERY_RE.search(v["name"]) or VENOUS_RE.search(v["name"]) or NERVE_RE.search(v["name"]):
            # Gefaesse/Nerven: Auto-Klassifikation, anatomischer Name als Label (alle Sprachen).
            if ARTERY_RE.search(v["name"]):
                group = "arteries"
            elif VENOUS_RE.search(v["name"]):
                group = "veins-sinuses"
            else:
                group = "cranial-nerves"
            side = v["side"]
            # Geometrisch lateralisierte Strukturen ohne links/rechts im Namen kennzeichnen.
            named_side = re.search(r"\b(left|right)\b", v["name"], re.I)
            base_label = v["name"] + vsuffix
            side_en = {"left": " (left)", "right": " (right)", "midline": ""}
            labels = {
                "de": base_label + (SIDE_DE[side] if side != "midline" and not named_side else ""),
                "la": base_label + (SIDE_LA[side] if side != "midline" and not named_side else ""),
                "en": base_label + (side_en[side] if not named_side else ""),
            }
        else:
            unknown.append(f"{slug} (base='{b}', name='{v['name']}')")
            continue
        node = {"id": slug, "fma": v["fma"], "slug": slug, "side": v["side"], "labels": labels}
        if b in K11_ROLES:
            node["k11Role"] = K11_ROLES[b]
        if v.get("mirrored"):
            node["mirrored"] = True
        if v.get("reconstructed"):
            node["reconstructed"] = True
        if v.get("laterality_note"):
            node["lateralityNote"] = v["laterality_note"]
        group_children[group].append(node)

    if unknown:
        raise SystemExit(
            "Strukturen ohne Eintrag in STRUCTURES (Woerterbuch ergaenzen):\n  "
            + "\n  ".join(unknown)
        )

    # Baum bauen (rekursiv) aus GROUPS + eingehaengten Struktur-Knoten
    def build(gid: str) -> dict:
        de, la, en, _ = GROUPS[gid]
        child_groups = [build(g) for g, meta in GROUPS.items() if meta[3] == gid]
        structs = sorted(group_children[gid], key=lambda n: n["labels"]["la"])
        node = {"id": gid, "labels": {"de": de, "la": la, "en": en}, "children": child_groups + structs}
        return node

    tree = build("brain")

    # Validierung: jede der 167 Strukturen genau einmal im Baum
    placed: list[str] = []

    def collect(n: dict) -> None:
        if "fma" in n:
            placed.append(n["id"])
        for c in n.get("children", []):
            collect(c)

    collect(tree)
    if sorted(placed) != sorted(reg.keys()):
        missing = set(reg) - set(placed)
        dupes = [s for s in placed if placed.count(s) > 1]
        raise SystemExit(f"Validierung fehlgeschlagen. Fehlend: {missing}. Doppelt: {set(dupes)}")

    out = {
        "version": "1.0.0",
        "space": "bodyparts3d-taro",
        "structureCount": len(placed),
        "tree": tree,
    }
    path = os.path.join(asset, "ontology.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"ontology.json geschrieben: {len(placed)} Strukturen, "
          f"{sum(1 for v in reg.values() if base_name(v['name']) in K11_ROLES)} mit Kapitel-11-Rolle")


if __name__ == "__main__":
    main()
