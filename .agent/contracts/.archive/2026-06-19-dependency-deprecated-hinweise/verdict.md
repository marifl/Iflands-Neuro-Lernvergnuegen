---
contract: 2026-06-19-dependency-deprecated-hinweise
round: 1
verdict: pass
scores:
  - criterion: "C1 Frische Install-Quelle"
    score: 5
    note: "pnpm --dir apps/brain-app install --frozen-lockfile beendete mit Exit 0. Nach jsdom-Upgrade enthält package.json/pnpm-lock.yaml keinen deprecated/Deprecated-Treffer mehr."
  - criterion: "C2 Frische Test-Quelle"
    score: 5
    note: "pnpm --dir apps/brain-app test beendete nach Accessibility-Fix mit 82 Testdateien und 442 bestandenen Tests."
  - criterion: "C3 Browser-Warnung"
    score: 5
    note: "Playwright gegen /?mode=explore reproduziert weiterhin genau eine THREE.Clock-Warnung, keine console.error und keine pageerror. Quelle bleibt @react-three/fiber@9.6.1 mit three@0.184.0."
  - criterion: "C4 Upgrade-Entscheidung"
    score: 5
    note: "jsdom wurde gezielt von 25.0.1 auf 29.1.1 aktualisiert und entfernt whatwg-encoding. @react-three/fiber, @react-three/drei und three sind laut Registry bereits latest; R3F/Three bleibt externe Release-Entscheidung."
  - criterion: "C5 Negativfall breite Updates"
    score: 5
    note: "Kein breites Paketupdate: nur die direkte Dev-Dependency jsdom wurde aktualisiert. React-Router-Major v7 wurde nicht angefasst, weil kein frischer Browser-Warnbefund vorliegt."
  - criterion: "C6 Repo-Gates"
    score: 5
    note: "Fokussierter StructureTree-Test, voller Testlauf, typecheck, build, verify:brain-models, docs:drift, git diff --check und perf:budget beendeten mit Exit 0."
summary: |
  NF-010 hat den Lockfile-Deprecated-Hinweis über whatwg-encoding behoben:
  jsdom 29.1.1 nutzt den empfohlenen @exodus/bytes-Pfad. Das Update machte
  einen unstabilen Accessible Name im Strukturbaum sichtbar; StructureTree
  setzt diesen Namen jetzt explizit. Die Browser-Warnung THREE.Clock ist
  weiterhin frisch reproduzierbar, aber als upstream @react-three/fiber/three
  klassifiziert; weil die direkten Pakete bereits latest sind, bleibt für den
  Release-Parent eine bewusste Entscheidung offen: upstream akzeptieren,
  Three downgraden oder R3F patchen.
---
