# Spec — MNI Brain als mobile-taugliches Referenzmodell optimieren

> Contract-ID: `2026-06-19-mni-brain-als-mobile-taugliche`
> Revision: v1 (2026-06-19)
> Status: planning -> active nach plan-done

---

## Frame

```yaml
problem: |
  Labor- und EEG-nahe Darstellungen brauchen ein MNI-faehiges BrainModel mit mehr
  Detail als die heutigen TARO-Carves, duerfen aber auf Mobile nicht in HQ-
  Downloads oder ueberteuerte Mesh-Budgets laufen.
why_now: |
  Die neue P0-Planung verlangt austauschbare Brain Models und eine Pinpoint-
  Pipeline. Das alte Monorepo enthaelt MNI152-HQ/LOD-Assets, aber auch
  dokumentierte Pipeline-Risiken. MNI muss vor Registry-Default-Entscheidungen
  qualifiziert werden.
symptom_vs_problem: |
  Symptom = MNI wirkt fachlich attraktiver als TARO, passt aber nicht automatisch
  in die Standalone-Overlays. Eigentliches Problem = kein verifizierter MNI-
  Assetvertrag fuer Detailgrad, Mobile-Performance, Koordinatenraum, Pickbarkeit
  und Overlays.
smallest_change: |
  Erst einen MNI-Importkandidaten mit HQ/Desktop/Mobile-LOD inventarisieren und
  per Budget-, Alignment- und Browser-Smoke-Gates qualifizieren, bevor Runtime-
  Default oder TARO-Ersatz geaendert werden.
tradeoffs: |
  Direktes Ersetzen von /assets/bodyparts3d/brain.glb wird verworfen, weil die
  heutigen Carve-Sidecars TARO-Vertexreihenfolgen voraussetzen.
  Reine Decimation wird verworfen, weil das alte Audit blockige Label-Meshes und
  heterogene Baker als Qualitaetsursache nennt; problematische Quellen brauchen
  SDF/prob-Map-Meshing oder explizite Source-Entscheidung.
```

---

## Working Principles (Karpathy + FAB — Reminder fuer Implementer)

1. **Think First** — Frame oben ist die Annahme-Basis. Bei Drift waehrend Implementation: spec.md updaten, nicht silently abweichen.
2. **Simplicity** — `smallest_change` aus dem Frame ist Source of Truth. Keine spekulativen Features ueber In-Scope hinaus.
3. **Surgical** — Out-of-Scope ist verbindlich. Adjacent-Refactor ist ein separater Contract.
4. **Goal-Driven** — criteria.md `outcome:` Frontmatter (user_signal/observable_in/guardrail/read_horizon) ist Verify-Ziel.

FAB-Bezug: `docs/decisions/ADR-005-fab-design-principles.md` (Gebote II/IX/X greifen besonders).

---

## 1. Motivation und Problem

Die Referenzbilder und der neue P0-Task verlangen labortaugliche, fein parzellierte
und punktgenaue Darstellungen. TARO funktioniert als aktueller Standalone-Explorer,
ist aber nicht automatisch der beste Master-Space fuer Laborwerte. Das alte Monorepo
hat bereits einen MNI152/tkRAS-zentrierten Pfad mit `BrainModelEntry`,
`brain-models.json`, HQ-Asset und mehreren LODs.

Live-Befund vom 19. Juni 2026:

1. Standalone `apps/brain-app/public/assets/bodyparts3d/brain.glb`: ca. 5,83 MB,
   0,83 Mio. Vertices, 600 Meshes.
2. Monorepo `mni152-native-highqual-brain.glb`: ca. 45,51 MB, 15,24 Mio. Vertices,
   546 Meshes.
3. Monorepo `mni152-native-highqual-brain-desktop-balanced.glb`: ca. 11,61 MB,
   3,05 Mio. Vertices.
4. Monorepo `mni152-native-highqual-brain-mobile-balanced.glb`: ca. 6,37 MB,
   1,52 Mio. Vertices.
5. Monorepo-Dokumente nennen offene Risiken: heterogene Baker, redundante Quellen,
   teils blockiges Label-Meshing und einzelne Registrierungsfehler.

Der erste Slice qualifiziert deshalb das MNI Brain als Referenzmodell, ohne TARO
oder vorhandene Overlays voreilig zu ersetzen.

## 2. Scope

### In-Scope

- Inventar der MNI-HQ-, Desktop-LOD-, Mobile-LOD-, Cutplane-LOD- und relevanten
  Subkortex-/BigBrain-Assets aus dem alten Monorepo.
- Definition eines `BrainModel`-Importkandidaten fuer MNI mit Space-Metadaten,
  LOD-Rollen, Budgetdaten und Herkunft.
- Mobile-Optimierungsziel fuer Dateigroesse, Vertex-/Indexzahl, Mesh-/Materialzahl
  und HQ-Leak-Verbot.
- Entscheidung, welche Quellen im MNI-Final kanonisch bleiben und welche wegen
  Redundanz oder schlechter Qualitaet ausgeschlossen oder neu gebacken werden.
- Alignment-/Bounding-Box-Gates gegen den MNI152/tkRAS-Contract.
- Browser-Smoke-Plan fuer Mobile-Profil, Desktop-Profil und A/B gegen TARO.

### Out-of-Scope

- TARO als Runtime-Default ersetzen.
- Atlas-Carves oder Pick-Sidecars auf MNI umbiegen, solange kein modellagnostischer
  Overlay-Vertrag existiert.
- Dirty-Monorepo-Assets ohne Inventar, Hash, Budget und Visual-Smoke uebernehmen.
- Proprietaere Fremdassets kopieren oder Referenzbilder nachbauen.
- Vollstaendige Pinpoint-Pipeline implementieren; dieser Contract liefert die
  qualifizierte MNI-Modellbasis dafuer.

## 3. Architektur

Zielarchitektur fuer diesen Slice:

1. MNI-Quelle bleibt zunaechst im alten Monorepo inventarisiert:
   `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/apps/brain-app/public/figs3d/v2/`.
2. Standalone importiert erst nach Gate-Pass nach
   `apps/brain-app/public/assets/brain-models/mni152/` oder einen gleichwertigen,
   noch festzulegenden BrainModel-Pfad.
3. Der MNI-Manifestvertrag muss mindestens enthalten:
   `brainModelId`, `label`, `spaceId`, `coordinateFrame`, `sourceAsset`,
   `desktopLod`, `mobileLod`, `cutplaneLod`, `hashes`, `budgets`, `knownLimitations`.
4. Runtime-Verbraucher duerfen nicht direkt auf MNI-Dateinamen hartcodieren. Der
   spaetere Anschluss erfolgt ueber die BrainModel-Registry aus dem P0-Architekturtask.
5. Overlays werden nur als kompatibel markiert, wenn sie denselben Raum oder eine
   explizite Transformkette mit Residuum/Qualitaetsmetrik besitzen.

Blockier-Mechanismus fuer diesen Contract:

1. Vor Runtime-Import blockiert ein Contract-Gate: Das Eval darf den Kandidaten
   nur als importierbar markieren, wenn alle Kriterien PASS sind.
2. Nach Runtime-Import blockiert ein technischer Validator: Ein Overlay ohne
   passende `brainModelId`, Vertex-/Face-Referenz oder Transformmetrik muss einen
   Fehler liefern und darf nicht gerendert werden.
3. "Audit-kritisierte Quelle" meint Quellen/Baker aus dem alten Monorepo-Dokument
   `docs/superpowers/plans/2026-06-11-brain-asset-architektur-audit.md`.

Aktuelle Standalone-Kopplungen, die dieser Contract nicht direkt veraendert, aber
als Migrationspunkte markiert:

1. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`: hardcoded `BRAIN_GLB`.
2. `apps/brain-app/src/viewer/AtlasOverlay.tsx`: TARO-Carve-Surfaces und Sidecars.
3. `apps/brain-app/src/viewer/atlas/CanonicalAtlasMode.tsx`: fsaverage/canonical
   Sonderpfad.
4. `apps/brain-app/src/viewer/assetManifest.ts`: allgemeiner Assetvertrag, noch
   kein BrainModel-Vertrag.

## 4. Test-Strategie

- Asset-Inventar: Script/Command erzeugt JSON/Markdown mit MB, Vertices, Indices,
  Meshes, Materials, Bounding-Box, Hash und Quelle.
- Budget-Gate: Mobile-Kandidat verletzt keine definierten Limits und laedt im
  Mobile-Smoke nicht das HQ-Asset.
- Alignment-Gate: MNI-Kandidat dokumentiert Space und besteht Bounding-Box- und
  Landmark-/Transform-Checks gegen den MNI152/tkRAS-Vertrag.
- Visual-Gate: Playwright- oder Browser-Screenshots zeigen MNI HQ/Desktop/Mobile
  und TARO im A/B-Vergleich aus mindestens lateral, medial, superior und frontal.
- Runtime-Gate: Standalone `pnpm --dir apps/brain-app typecheck`, relevante Tests
  und ein Mobile-Smoke laufen, sobald Code/Manifest importiert wird.
- FAB: kein paralleler Ersatzrenderer, keine ungenutzten Exports, keine
  spekulativen Registry-Abstraktionen ueber den benoetigten Importvertrag hinaus.

## 5. Pflichtlektuere

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `apps/brain-app/DESIGN.md`
- `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
- `apps/brain-app/src/viewer/AtlasOverlay.tsx`
- `apps/brain-app/src/viewer/assetManifest.ts`
- Altes Monorepo:
  `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/apps/brain-app/src/brainModelConfig.ts`
- Altes Monorepo:
  `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/packages/brain-runtime/src/coords.ts`
- Altes Monorepo:
  `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/docs/pipelines/anatomy-hires/13-coord-space-contract.md`
- Altes Monorepo:
  `/Users/marcusifland/CFH_REAL_LOCAL/SEM 4 LOCAL/MU - SS26 - Kognitive Neurowissenschaften/docs/superpowers/plans/2026-06-11-brain-asset-architektur-audit.md`
