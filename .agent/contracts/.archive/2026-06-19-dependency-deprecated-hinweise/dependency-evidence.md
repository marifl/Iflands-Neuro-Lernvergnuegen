# Dependency-Evidence — NF-010

Datum: 19. Juni 2026

## Frische Quellen

### Install

```bash
pnpm --dir apps/brain-app install --frozen-lockfile
```

Ergebnis: Exit 0. Lockfile aktuell, keine Install-Deprecated-Warnung in der
Ausgabe.

### Lockfile-Deprecated vor Update

```bash
rg -n "deprecated|Deprecated" apps/brain-app/pnpm-lock.yaml apps/brain-app/package.json
```

Vor dem Update gab es einen Treffer:

```text
apps/brain-app/pnpm-lock.yaml:1985:    deprecated: Use @exodus/bytes instead for a more spec-conformant and faster implementation
```

Quelle:

```text
whatwg-encoding@3.1.1
├─┬ html-encoding-sniffer@4.0.0
│ └─┬ jsdom@25.0.1
│   ├── @mu-kn/brain-app@0.1.0 (devDependencies)
│   └─┬ vitest@2.1.8
│     └── @mu-kn/brain-app@0.1.0 (devDependencies)
└── jsdom@25.0.1 [deduped]
```

Entscheidung: `jsdom` ist direkte Dev-Dependency. Gezieltes Update von
`25.0.1` auf `29.1.1` nutzt laut Registry `@exodus/bytes` und entfernt
`whatwg-encoding`.

Nach dem Update liefert derselbe `rg`-Befehl Exit 1 ohne Treffer.

### Browser

```bash
node --input-type=module
```

Route: `/?mode=explore` gegen `http://localhost:5174`.

```text
warnings=1 errors=0 pageErrors=0 deprecated=1
THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
@ http://localhost:5174/node_modules/.vite/deps/chunk-5NJSAUSQ.js?v=5f010c67:746:14
```

Quelle bleibt `@react-three/fiber@9.6.1` mit `three@0.184.0`.

Registry-Abgleich:

```text
@react-three/fiber latest: 9.6.1
@react-three/drei latest: 10.7.7
three latest: 0.184.0
react-router-dom latest: 7.18.0
```

Entscheidung: Kein risikoarmes R3F/Three-Upgrade verfügbar, weil die direkten
3D-Dependencies bereits auf latest stehen. Kein React-Router-Major-Upgrade in
NF-010, weil die frische Browser-Konsole keine React-Router-Future-Warnung mehr
zeigt und v7 eine eigene Major-Migration wäre.

## Verifikation

```text
pnpm --dir apps/brain-app exec vitest run src/viewer/StructureTree.test.tsx
10 tests passed

pnpm --dir apps/brain-app test
82 files, 442 tests passed

pnpm --dir apps/brain-app typecheck
Exit 0

pnpm --dir apps/brain-app build
Exit 0

pnpm --dir apps/brain-app run verify:brain-models
brain model asset gate passed (5 assets)

pnpm --dir apps/brain-app docs:drift
Exit 0

git diff --check
Exit 0

pnpm --dir apps/brain-app perf:budget
Exit 0
```

Nebenbefund: `jsdom@29.1.1` machte einen fehlenden stabilen Accessible Name im
Strukturbaum sichtbar. `StructureTree` setzt den Button-Namen jetzt explizit aus
sichtbarem Label plus Status-Pill, statt sich auf DOM-Whitespace-Verhalten zu
verlassen.
