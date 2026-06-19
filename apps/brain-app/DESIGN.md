# brain-app — Design und Produktvertrag

Stand: 2026-06-19.

Diese Datei beschreibt den aktuellen produktiven Stand der App in diesem Repo.
Historische Neuro-Suite-Konzepte mit `/deck`, `/companion`, `/editor` und
`src/features/**` sind nicht mehr der Implementierungsvertrag.

Die zentrale Architekturkarte für Runtime-State, Config-Priorität,
Snapshots sowie Visual- und Animation-Authoring steht in
[`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## Produktform

`apps/brain-app` ist eine Vite-React-App für Kapitel 11 der
Kognitiven Neurowissenschaften. Der 3D-Viewer ist die Hauptfläche; alle
Bedienelemente dienen der Orientierung, Auswahl, Färbung, Schnittführung und
didaktischen Begleitung.

Reguläre Modi:

1. **Lernen**: geführte Szenen mit Sidebar, Kamera, Overlays und ERP-/VCPT-Pfad.
2. **Explorer**: freier Strukturbaum, Atlas-Layer, Färbung, Isolation und Cuts.
3. **Phineas Gage**: Fallstudienmodus mit Schädelkontext, Läsionspfad und
   manifestierten Fallstudien-Assets.

Atlas ist technisch als eigener `appMode` erreichbar, aber nicht Teil des
normalen Modus-Flyouts. Produktiv ist Atlas ein Supplement: Carves liegen direkt
auf TARO, der kanonische fsaverage-Atlas ist eine präzise Zweitsicht für
kuratierte Brücken und Expert-Deep-Links.

Der Startscreen dient nur der Moduswahl. Es gibt keine Marketing-Landingpage.

## Code-Einstieg

| Bereich | Pfad | Verantwortung |
| --- | --- | --- |
| App-Boot und Deep Links | `src/main.tsx` | URL-Parameter, Startscreen, Mode-Auswahl |
| Lernsequenzen | `src/scene/**` | Szenen, Navigation, Kamera, Overlays |
| Viewer | `src/viewer/**` | 3D-Objekte, Store, Tools, Atlas, Cut-System |
| Runtime-Assets | `public/assets/**` | GLB, Pick-JSON, Atlas-Config, Kontextmodelle |
| Inhalte | `public/scenes/**`, `public/regions/**` | Lernpfade und Regionsquellen |
| Atlas-Build | `../../scripts/atlas/**` | reproduzierbare Config- und Asset-Pipeline |
| Architekturkarte | `../../docs/ARCHITECTURE.md` | Runtime-, State-, Config- und Authoring-Vertrag |

## State

Der zentrale UI-/3D-State liegt in `src/viewer/viewerStore.ts`. Wichtige
State-Gruppen:

1. Modus: `appMode`
2. Auswahl: `selectedSlugs`, `hovered`, `pickedAtlasArea`
3. Sichtbarkeit: `hidden`, `isolatedSlugs`, Atlas- und Carve-Toggles
4. Schnitte: `cuts`, `cutMode`, `clipAtlasOverlay`
5. Visuals: `activePreset`, `dimOpacity`, Färb- und Transparenzwerte
6. Snapshot: `viewerStateSnapshot.ts` für versionierten Export/Import

State darf nicht durch versteckte lokale Reparaturpfade ersetzt werden. Wenn ein
Viewer-Zustand teilbar oder unterrichtsrelevant ist, gehört er in den
versionierten Snapshot oder in die TOML-/JSON-Konfiguration.

## Konfiguration

Die Atlas-/Szenen-Konfiguration ist file-first:

1. `scripts/atlas/config.default.toml` ist die editierbare Quelle.
2. `pnpm atlas:build-config` erzeugt
   `public/assets/atlas-canonical/atlas-config.json`.
3. `src/viewer/atlas/atlasConfig.ts` löst Datei-, URL- und lokale Overrides auf.
4. `src/viewer/atlas/configExport.ts` exportiert nachvollziehbare TOML-Fragmente.

Produktregel: Keine stillen Defaults bei unbekannten Presets,
Configurations oder Arealen. Fehler müssen laut werden.

## Visual Design

Die root-nahe [`../../DESIGN.md`](../../DESIGN.md) beschreibt die visuelle
Editorial-Schicht. App-spezifisch gilt:

1. Der 3D-Viewport bleibt die Bühne.
2. Orange ist Auswahl-/Aktiv-Akzent und nie alleiniger Bedeutungsträger.
3. Panels und Sidebars rahmen den 3D-Inhalt, sie erklären ihn nicht mit
   langen Hilfetexten.
4. Mobile und Tablet sind eigene Bedienkontexte, keine verkleinerte
   Desktop-Kopie.
5. Cut-Planes, Atlas-Carves und transparente Nicht-Fokus-Objekte müssen
   konfigurierbar und visuell unterscheidbar bleiben.

## Fachliche Transparenz

Die App kombiniert echte anatomische Datensätze, registrierte Atlasflächen und
didaktische Näherungen. Sichtbare oder dokumentierte Aussagen müssen diese
Ebenen trennen:

1. `brain.glb`, Kontextmodelle und Atlas-Dateien sind Runtime-Assets mit
   Herkunft in `THIRD-PARTY-NOTICES.md`.
2. TARO-Carve-Flächen sind registrierte Atlas-Darstellungen, keine
   morphometrisch exakte Patientendaten.
3. Phineas Gage nutzt manifestierte Kontext- und Fallstudien-Assets. Wo
   Rekonstruktion, Spiegelung oder historische Näherung im Spiel ist, muss das
   in Inventar, Quellen oder UI erkennbar bleiben.
4. Gespiegelte oder rekonstruierte Assets müssen in Inventar, Quellen oder UI
   erkennbar bleiben.

Der detaillierte Bestand steht in [`../../docs/ASSET_UND_INHALTSINVENTUR.md`](../../docs/ASSET_UND_INHALTSINVENTUR.md).

## BrainModel-Review

Der Produktionsdefault ist weiterhin TARO. MNI-Varianten sind als explizite
Review-Optionen verfügbar, damit Geometrie, Detailtiefe, Lichtverhalten und
Mobile-Performance gegen TARO begutachtet werden können, ohne TARO still zu
ersetzen.

Review-Deep-Links:

1. `?mode=explore&brainModel=mni-mobile-r05`
2. `?mode=explore&brainModel=mni-mobile-r06`
3. `?mode=explore&brainModel=mni-mobile-r08`
4. `?mode=explore&brainModel=mni-desktop-r18`

Diese Optionen sind noch kein semantischer MNI-Atlas-Produktionspfad. Auswahl,
Carves, Snapshots und Unterrichtslinks gelten erst dann als MNI-produktiv,
wenn Pickbarkeit, Overlay-Mapping, Koordinatenraum und Atlas-Registry separat
verifiziert sind.

## Verification

Pflicht vor Merge oder Release:

```bash
pnpm verify:brain-models
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Bei Render- oder Layout-Änderungen zusätzlich:

1. Desktop-/Beamer-ähnlicher Viewport.
2. Tablet-Viewport.
3. Phone-Viewport.
4. Mindestens ein Atlas-/Cut-Pfad.
5. Mindestens ein Lernpfad und der Phineas-Modus.

Deployment, Base-Path und Cache-Regeln stehen in
[`../../docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md).
