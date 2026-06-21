---
outcome:
  user_signal: |
    Phineas-Gage-Fallstudie ist über ModeLauncher und Deep-Link erreichbar,
    6 Schritte navigierbar, Schädel + Stange + Läsions-Highlights funktionieren —
    ohne eigenen appMode, ohne Spezial-Loader, ohne Phineas-State im viewerStore.
  observable_in: |
    Browser: localhost:5173 → ModeLauncher → Phineas-Karte → 6-Schritt-Navigation.
    Code: grep -r "appMode.*phineas" src/ liefert 0 Treffer.
    viewerStore.ts enthält weder rodVisible noch rodPhase noch showSkull.
  guardrail: |
    Alle 442 existierenden Tests bleiben grün. pnpm typecheck Exit 0.
    pnpm verify:brain-models grün. Explorer- und Lern-Modus unverändert.
    Deep-Link ?mode=phineas leitet auf Case-Study-Aktivierung weiter (kein Bruch).
  read_horizon: |
    Sofort nach Implementation. Typecheck + Tests + Browser-Smoke.
---

# Akzeptanzkriterien — Phineas-Gage Case-Study Migration v1→V2-Registry-Launch

> Contract-ID: `2026-06-20-phineas-gage-case-study-migrat`
> Revision: v1 (2026-06-20)

Jedes Kriterium MUSS binär testbar sein (Pass/Fail).

## C1 — TampingIron-Prozedurgeometrie gelöscht

- Szenario: Prozedurale Zylinder-Geometrie existiert nicht mehr
  - Input: `grep -rn "TampingIron\|ROD_RADIUS_TIP\|ROD_RADIUS_SHAFT" src/viewer/BodyParts3DViewer.tsx`
  - Erwartet: 0 Treffer
- Szenario: Rod-Imports bereinigt
  - Input: `grep -n "rodSegmentForPhase\|ROD_RADIUS" src/viewer/BodyParts3DViewer.tsx`
  - Erwartet: 0 Treffer
- Szenario: GLB-Asset existiert weiterhin
  - Input: `test -f public/assets/phineas/phineas-gage-iron-rod.glb`
  - Erwartet: Exit 0

## C2 — Phineas-State nicht mehr im viewerStore

- Szenario: rod/skull-Felder entfernt
  - Input: `grep -c "rodVisible\|rodPhase\|showSkull\|skullOpacity" src/viewer/viewerStore.ts`
  - Erwartet: 0
- Szenario: rod/skull-Actions entfernt
  - Input: `grep -c "setRodVisible\|setRodPhase\|setSkull" src/viewer/viewerStore.ts`
  - Erwartet: 0
- Szenario: viewerStore LOC reduziert
  - Input: `wc -l < src/viewer/viewerStore.ts`
  - Erwartet: mindestens 40 Zeilen weniger als 684

## C3 — Kein appMode='phineas' mehr

- Szenario: AppMode-Typ enthält kein 'phineas'
  - Input: `grep "phineas" src/viewer/viewerStore.ts`
  - Erwartet: 0 Treffer (kein 'phineas' in AppMode-Union oder APP_MODES-Array)
- Szenario: Kein appMode-Guard für Phineas in BodyParts3DViewer
  - Input: `grep -c "appMode.*phineas\|phineas.*appMode" src/viewer/BodyParts3DViewer.tsx`
  - Erwartet: 0
- Szenario: Kein appMode-Guard in PhineasGageAssets
  - Input: `grep -c "appMode.*phineas" src/viewer/PhineasGageAssets.tsx 2>/dev/null || echo "0 (file deleted)"`
  - Erwartet: 0 oder Datei gelöscht

## C4 — phineasAssetManifest.ts gelöscht

- Szenario: Spezial-Loader existiert nicht mehr
  - Input: `test -f src/viewer/phineasAssetManifest.ts`
  - Erwartet: Exit 1 (Datei existiert nicht)
- Szenario: Keine Imports des Spezial-Loaders
  - Input: `grep -r "phineasAssetManifest" src/ --include="*.ts" --include="*.tsx" | grep -v test | wc -l`
  - Erwartet: 0

## C5 — ContextSkull ohne Phineas-Spezial-Guard

- Szenario: Kein appMode-Guard in der Schädel-Rendering-Logik
  - Input: `grep -A2 -B2 "phineas" src/viewer/BodyParts3DViewer.tsx | grep -c "appMode"`
  - Erwartet: 0

## C6 — CaseStudy-Interface existiert

- Szenario: Generisches Interface definiert
  - Input: `grep -l "interface CaseStudy\|type CaseStudy" src/viewer/`
  - Erwartet: mindestens 1 Datei
- Szenario: Interface hat Pflichtfelder
  - Input: Prüfe dass das CaseStudy-Interface id, title, collectionId, steps enthält
  - Erwartet: alle 4 Felder vorhanden
- Szenario: PHINEAS_GAGE ist eine CaseStudy-Instanz
  - Input: `grep "satisfies.*CaseStudy\|: CaseStudy" src/viewer/phineasGage.ts`
  - Erwartet: mindestens 1 Treffer

## C7 — Phineas-Fallstudie funktional (Browser-Smoke)

- Szenario: ModeLauncher zeigt Phineas-Einstieg
  - Input: Browser → localhost:5173, ModeLauncher sichtbar
  - Erwartet: Phineas-Gage-Karte oder Case-Study-Einstieg ist anklickbar
- Szenario: 6 Schritte navigierbar
  - Input: Phineas starten → Prev/Next durchklicken
  - Erwartet: Alle 6 Schritte zeigen Caption, Schädel ist sichtbar, Stange erscheint ab Schritt 2
- Szenario: Läsions-Highlights in Schritt 5+6
  - Input: Zu Schritt 5 navigieren
  - Erwartet: linker vmPFC/OFC-Bereich ist farblich hervorgehoben

## C8 — Deep-Link-Kompatibilität

- Szenario: Alter Deep-Link funktioniert weiterhin
  - Input: Browser → localhost:5173/?mode=phineas
  - Erwartet: Case-Study wird aktiviert (kein Fehler, kein leerer Screen)

## C9 — Bestehende Tests und Gates grün

- Szenario: Typecheck
  - Input: `pnpm typecheck`
  - Erwartet: Exit 0
- Szenario: Unit Tests
  - Input: `pnpm test`
  - Erwartet: alle Tests grün, keine Regression
- Szenario: Brain-Model-Gate
  - Input: `pnpm verify:brain-models`
  - Erwartet: "brain model asset gate passed"

## C10 — Snapshot-Kompatibilität (Negativ-/Edge-Case)

- Szenario: Alter Snapshot mit rodVisible/rodPhase wird toleriert
  - Input: Ein Snapshot-JSON mit `{"rodVisible": true, "rodPhase": 0.5}` importieren
  - Erwartet: Import ignoriert unbekannte Felder ohne Fehler (kein Crash)
