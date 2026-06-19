# Console-Smoke — NF-007

Datum: 19. Juni 2026
Vite-URL: `http://localhost:5174`
Command:

```bash
node --input-type=module <<'NODE'
import { chromium } from '@playwright/test';
// Öffnet /, /?mode=explore, /?config=ofc-phineas und /?mode=atlas.
NODE
```

## Ergebnis

| Route | Warnings | Errors | PageErrors | Deprecated |
| --- | ---: | ---: | ---: | ---: |
| `/` | 1 | 0 | 0 | 1 |
| `/?mode=explore` | 1 | 0 | 0 | 1 |
| `/?config=ofc-phineas` | 1 | 0 | 0 | 1 |
| `/?mode=atlas` | 1 | 0 | 0 | 1 |

Deprecated-Meldung auf allen Routen:

```text
THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
@ http://localhost:5174/node_modules/.vite/deps/chunk-5NJSAUSQ.js?v=746c4176:746:14
```

## Quellenzuordnung

`apps/brain-app/src` enthält keine direkte `THREE.Clock`- oder `new Clock`-
Nutzung. Der Vite-Chunk `chunk-C7DPC6F7.js` erzeugt den R3F-Root-State mit:

```js
clock: new Clock()
```

Das stammt aus `@react-three/fiber@9.6.1`; `pnpm why` zeigt:

```text
@react-three/fiber@9.6.1
├── @mu-kn/brain-app@0.1.0 (dependencies)
└─┬ @react-three/drei@10.7.7
  └── @mu-kn/brain-app@0.1.0 (dependencies)

three@0.184.0
├── @mu-kn/brain-app@0.1.0 (dependencies)
├─┬ @react-three/fiber@9.6.1
└─┬ @react-three/drei@10.7.7
```

NF-007-Entscheidung: keine app-seitige Migration. Die Warnung ist eine
externe Dependency-Warnung und bleibt als Upgrade-/Dependency-Klasse in NF-010.
Das alte `apps/brain-app/native-highqual-browser-console-all.md` war ignoriert
und wurde aus dem Arbeitsbaum entfernt, damit es nicht weiter als aktuelle
Release-Evidenz gelesen wird.
