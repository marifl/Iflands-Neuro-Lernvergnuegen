# Third-Party-Notices

Dieses Projekt buendelt und/oder leitet Daten aus folgenden Drittquellen ab. Jede
Quelle behaelt ihre eigene Lizenz und Zitationspflicht. Vor einer Weiterverbreitung
sind die jeweils verlinkten Originalbedingungen massgeblich und zu pruefen.

---

## BodyParts3D (3D-Hirnstrukturen) — bestimmt die Repo-Lizenz

- **Verwendung:** Alle ausgelieferten 3D-Meshes (GLB), abgeleitet aus den OBJ-Dateien
  im BodyParts3D-Eigenraum (TARO).
- **Lizenz:** Creative Commons Attribution-ShareAlike 2.1 Japan (CC BY-SA 2.1 JP) —
  <https://creativecommons.org/licenses/by-sa/2.1/jp/>
- **Pflicht-Attribution (woertlich):**
  > BodyParts3D, Copyright© The Database Center for Life Science licensed by
  > CC Attribution-Share Alike 2.1 Japan
- **Zitation (APA7):** Mitsuhashi, N., Fujieda, K., Tamura, T., Kawamoto, S.,
  Takagi, T., & Okubo, K. (2009). BodyParts3D: 3D structure database for anatomical
  concepts. *Nucleic Acids Research, 37*(Database issue), D782–D785.
  <https://doi.org/10.1093/nar/gkn613>
- **Quelle / DOI:** <https://lifesciencedb.jp/bp3d/> ·
  <https://doi.org/10.18908/lsdba.nbdc00837-000>
- Details: [`apps/brain-app/public/assets/bodyparts3d/ATTRIBUTION.md`](apps/brain-app/public/assets/bodyparts3d/ATTRIBUTION.md)

> **ShareAlike-Hinweis:** Diese Lizenz ist „ansteckend" und gibt damit die Lizenz
> des gesamten Repositories vor (siehe [`LICENSE`](LICENSE)).

---

## fsaverage-Atlas-Schichten (kanonischer Nachschlage-Modus)

Oberflaechen im `fsaverage`-Raum mit folgenden Kartierungen
(`apps/brain-app/public/assets/atlas-canonical/`):

- **fsaverage-Oberflaechen** — FreeSurfer. Nutzung gemaess FreeSurfer Software
  License (frei fuer Forschung/akademisch). <https://surfer.nmr.mgh.harvard.edu/>
  Zitation: Fischl, B. (2012). FreeSurfer. *NeuroImage, 62*(2), 774–781.
  <https://doi.org/10.1016/j.neuroimage.2012.01.021>
- **DKT (Desikan-Killiany-Tourville / Mindboggle)** — Klein, A., & Tourville, J.
  (2012). 101 labeled brain images and a consistent human cortical labeling
  protocol. *Frontiers in Neuroscience, 6*, 171.
  <https://doi.org/10.3389/fnins.2012.00171> · <https://mindboggle.info/>
- **Destrieux** — Destrieux, C., Fischl, B., Dale, A., & Halgren, E. (2010).
  *NeuroImage, 53*(1), 1–15. <https://doi.org/10.1016/j.neuroimage.2010.06.010>
- **Julich-Brain v3.1 (Zytoarchitektonik)** — EBRAINS / Amunts, K., et al. (2020).
  *Science, 369*(6506), 988–992. <https://doi.org/10.1126/science.abb4588> ·
  <https://search.kg.ebrains.eu/> — i. d. R. unter **CC BY-SA 4.0** veroeffentlicht;
  Originalbedingungen pruefen.
- **Brodmann (klassisch)** — Brodmann (1909), gemeinfrei.

---

## Weitere Daten

- **Allen Brain Atlas — Ontologie/Graph** (`public/companion/data/allen_graph.json`):
  © Allen Institute for Brain Science. Nutzung gemaess Allen Institute Terms of Use /
  Citation Policy. <https://alleninstitute.org/legal/terms-use/> ·
  <https://portal.brain-map.org/>
- **Areal-/Kartendaten** (`public/companion/data/bahl_areal_karten.json`): aus
  veroeffentlichter Literatur abgeleitete Kartierungen; Originalquellen sind in den
  Szenen-/Regionen-Quellenangaben referenziert.

---

> **Hinweis fuer Weiterverbreitung:** CC BY-SA 2.1 JP (BodyParts3D) und CC BY-SA 4.0
> (Julich-Brain) sind beide ShareAlike-Lizenzen unterschiedlicher Versionen. Ihre
> Kombination in einem einzigen verteilten Werk sollte vor einer Veroeffentlichung
> rechtlich gegengeprueft werden. Im Zweifel die betroffenen Datensaetze separat
> halten oder die jeweils kompatibelste Lizenzfassung waehlen.
