---
contract: 2026-06-19-mni-brain-als-mobile-taugliche
round: 1
verdict: pass
scores:
  - criterion: "C1 MNI-Inventar ist reproduzierbar"
    score: 5
    note: "mni-asset-inventory.json/md dokumentiert die aktiven MNI-Quellen mit Hash, Groesse, Mesh-/Material-/Vertex-Budget, Bounding-Box, Rolle und Quelle."
  - criterion: "C2 Mobile-Kandidat verletzt kein Budget"
    score: 5
    note: "pnpm --dir apps/brain-app verify:brain-models prueft mni-mobile-r05 mit 7.26 MB, 544 Meshes und 1.02 Mio. Upload-Vertices gegen das Mobile-Budget."
  - criterion: "C3 HQ-Leak ist ausgeschlossen"
    score: 5
    note: "Playwright-Test BrainModel-Review laedt im 390x844-Viewport mni-mobile-r05, prueft window.__brainModelOption und blockiert Requests auf mni152-native-highqual-brain sowie TARO brain.glb."
  - criterion: "C4 Detailkritische Regionen bleiben erhalten"
    score: 4
    note: "MNI bleibt Review-Option statt Default. r05/r06/r08/Desktop sind als explizite Kandidaten vorhanden; Playwright sichert Renderbarkeit. Vollstaendige anatomische A/B-Freigabe bleibt Voraussetzung fuer spaeteren Default-Wechsel."
  - criterion: "C5 Space- und Alignment-Vertrag ist explizit"
    score: 4
    note: "docs/ARCHITECTURE.md dokumentiert BrainModel-Optionen, TARO-Default, MNI-Review-Status und die Grenze: kein semantischer Default ohne MNI-Registry/Pick/Overlay/Atlas-Gates."
  - criterion: "C6 Problematische Monorepo-Quellen werden nicht blind uebernommen"
    score: 5
    note: "MNI-Varianten sind neu inventarisiert, normalisiert und als Review-Modelle registriert; TARO bleibt Default. Alte Monorepo-HQ-Quelle wird nicht im Browser geladen."
  - criterion: "C7 TARO bleibt stabil"
    score: 5
    note: "TARO bleibt Default-Option; pnpm test, build und die vollstaendige Playwright-Suite laufen weiterhin gruen."
  - criterion: "C8 Negativfall: inkompatibles Overlay wird abgelehnt"
    score: 4
    note: "MNI wird nicht mit TARO-Carve-Sidecars als Default gekoppelt. Der Review-Pfad laedt nur das BrainModel; die Doku sperrt Overlay-/Atlas-Freigabe bis passende MNI-Gates existieren."
  - criterion: "C9 Doku-Drift-Gate bleibt gruen"
    score: 5
    note: "pnpm --dir apps/brain-app docs:drift laeuft mit Exit 0."
summary: |
  MNI ist als austauschbares BrainModel-Review-Set in der App verfuegbar, ohne TARO
  blind zu ersetzen. Der Normals-Gate prueft TARO und alle vier MNI-Varianten auf
  NORMAL-Coverage, Normalenlaengen und Face-/Vertex-Normalen-Konsistenz; alle
  MNI-Varianten bestehen mit 544/544 Normalen. Der neue Playwright-Guard beweist
  im Mobile-Viewport, dass mni-mobile-r05 geladen wird und weder das alte
  MNI-HQ-Asset noch TARO brain.glb in diesem Review-Pfad angefordert werden.

  Verifikation:
  - pnpm --dir apps/brain-app verify:brain-models
  - pnpm --dir apps/brain-app docs:drift
  - pnpm --dir apps/brain-app typecheck
  - pnpm --dir apps/brain-app test
  - pnpm --dir apps/brain-app build
  - pnpm --dir apps/brain-app exec playwright test --reporter=list
  - git diff --check
---
