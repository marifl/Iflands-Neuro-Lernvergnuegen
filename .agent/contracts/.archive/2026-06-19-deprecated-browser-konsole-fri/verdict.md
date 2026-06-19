---
contract: 2026-06-19-deprecated-browser-konsole-fri
round: 1
verdict: pass
scores:
  - criterion: "C1 Frische Konsolenquelle"
    score: 5
    note: "Playwright-Smoke gegen http://localhost:5174 öffnete /, /?mode=explore, /?config=ofc-phineas und /?mode=atlas. Pro Route wurden Warnings, Errors, PageErrors und Deprecated-Treffer mit Source-Location protokolliert."
  - criterion: "C2 Deprecated-Entscheidung"
    score: 5
    note: "Frische Warnung reproduziert: THREE.Clock aus Vite-Dependency-Chunk. Chunk-Zuordnung zeigt @react-three/fiber@9.6.1 mit clock: new Clock(); App-Code hat keine direkte Nutzung. Entscheidung: externe Dependency-Klasse, weiter in NF-010."
  - criterion: "C3 Negativfall alte Artefakte"
    score: 5
    note: "git ls-files und find für apps/brain-app/native-highqual-browser-console*.md liefern keine Dateien mehr. Das alte ignorierte native-highqual-browser-console-all.md wurde entfernt."
  - criterion: "C4 App-Code-Suche"
    score: 5
    note: "rg -n \"THREE\\\\.Clock|new Clock|deprecated|Deprecated\" apps/brain-app/src apps/brain-app/scripts scripts --glob '!node_modules' --glob '!**/*.json' beendete mit Exit 1 ohne Treffer."
  - criterion: "C5 Repo-Gates"
    score: 5
    note: "pnpm --dir apps/brain-app docs:drift und git diff --check beendeten mit Exit 0."
  - criterion: "C6 Zusatz-Gate bei Codeänderung"
    score: 5
    note: "Nicht anwendbar: NF-007 änderte keine TypeScript-/Runtime-Datei. Kein Typecheck-Claim wird daraus abgeleitet."
summary: |
  NF-007 ist nicht als App-Code-Migration zu schließen, sondern als externe
  Dependency-Klassifikation. Die frische Browser-Konsole reproduziert
  THREE.Clock auf allen geprüften Routen, aber ohne console.error/PageError und
  mit Quelle @react-three/fiber@9.6.1. Alte App-Root-Konsolenartefakte sind
  entfernt; die aktuelle Inventur verweist auf NF-010 für den Dependency-
  Upgrade-Pfad.
---
