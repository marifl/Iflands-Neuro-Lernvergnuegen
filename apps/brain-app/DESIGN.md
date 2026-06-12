# brain-app — DESIGN

> **⚠ TEILWEISE VERALTET (verifiziert 2026-05-29):** Beschreibt die Pre-Pivot „Neuro-Suite" (Routes `/deck` `/companion` `/editor`, `src/features/**`). Der reale `apps/brain-app` ist heute ein **Brain-Atlas** (Routes `Learn`/`Composition`/`Quality`, kein `src/features/`). Kanonischer Ist-Stand: [`docs/architecture/27_BRAIN_ATLAS_CURRENT_ARCHITECTURE.md`](../../docs/architecture/27_BRAIN_ATLAS_CURRENT_ARCHITECTURE.md). Inhalt unten = Historie/Scope-Intent.

> **Source-of-Truth Spec:** `docs/superpowers/specs/2026-04-27-brain-app-northstar-design.md`
> **Migration-Plan:** `docs/superpowers/plans/2026-04-27-brain-app-northstar-migration.md`
> **Masterplan Neuro-Suite (Single-App, Phasen):** [`docs/superpowers/plans/2026-05-12-masterplan-single-app-neuro-suite.md`](../../docs/superpowers/plans/2026-05-12-masterplan-single-app-neuro-suite.md)
> **Masterplan-Mapping (Single-App):** [`docs/architecture/26_MASTERPLAN_SINGLE_APP_MODULE_MAPPING.md`](../../docs/architecture/26_MASTERPLAN_SINGLE_APP_MODULE_MAPPING.md)
>
> Diese DESIGN.md ist die kompakte Ownership- und Scope-Definition fuer die einzige produktive App. Detail-Architektur, Tokens, Performance-Budgets und Risiken stehen in der Spec.

---

## 0. Scope-Boundaries

### 0.1 Ownership-Mapping (was lebt wo)

| Pfad | Ownership | Zweck |
|------|-----------|-------|
| `apps/brain-app/**` | brain-app (diese App) | finale Vortragsapplikation · Routes `/deck` `/companion` `/editor` |
| `apps/brain-app/public/figs3d/v2/**` | brain-app | `figures/s01.json`–`figures/s37.json` plus zusaetzliche Figure-Bundles (z. B. `figures/t6-master-brain-v2.json`); GLBs unter `glb/` — Bake-Ausgabe-Ziel |
| `scripts/alignment/**` | asset-pipeline | Python-Bake-Scripts fuer GLB-/Atlas-Outputs |
| `v3-1_synthese_v3-2/T6_Slides_v3-2.md` | Inhalts-Master | Slide-Inhalt + Sprecherskript-Quelle (read-only fuer brain-app) |
| `v3-1_synthese_v3-2/MASTERFILE.html` | Inhalts-Spec | Static-Vorschau fuer Inhalts-Reviews · NICHT Vortrags-Pfad |
| `_archive/deck-pre-brain-app/**` | archived | Alter Static-Stack + Next.js-Legacy · keine aktive Weiterentwicklung |
| `apps/companion-atlas/**` | removed | Alt-Fundus wurde im Cleanup entfernt (Backup als tar.gz) |

### 0.1b Produktbereich ↔ Route (`productContract` · `FeatureGate`)

Implementierung: `routeAreaMap` / `areaForPath()` / `canAccessArea()` in `src/features/auth/productContract.ts` — bei neuen Routen **zuerst** dort, dann diese Tabelle.

| Bereich (`ProductArea`) | Route | Gate / Guard |
|-------------------------|-------|---------------|
| `presenter` | `/deck` | `FeatureGate area="presenter"` |
| `companion` | `/companion` | `FeatureGate area="companion"` |
| `authoring` | `/editor` | `FeatureGate area="authoring"` + `EditorGuard` |

Landing `/`: Rollenwahl (`productRoleStore`), Link-Freigabe ueber `canAccessArea(role, area)` in `productContract.ts`.

### 0.2 Konflikt-Regel

Wenn Inhalt im Master-Markdown (`T6_Slides_v3-2.md`) und brain-app-Manifest (`public/figs3d/v2/figures/sNN.json`) auseinanderlaufen, gewinnt der **Master**. brain-app passt sich an. Code wird angepasst, nicht der Inhalt.

### 0.3 Shared-Doctrine

- **Tokens:** M3 Expressive aus `packages/theme-tokens/styles/` als SSoT fuer brain-app (und andere Hosts im Monorepo, die dieselben Tokens beziehen)
- **Schriften:** Lexend via npm-Paket `@fontsource/lexend` (Imports in `src/main.tsx`); **keine** eigene Unterbaum-Kopie unter `public/fonts/lexend/`
- **Pfad-Aliasse:** `@/` → `apps/brain-app/src/` (siehe `tsconfig.json` + `vite.config.ts`)
- **Figure-/Slide-Manifest-Schema:** `src/types/figureManifest.ts` (Zod, `FigureManifestSchema` etc.) — nur ueber Schema lesen, nie raw JSON

### 0.4 Was NICHT in brain-app gehoert

- Keine Static-HTML-Slides (alter `_archive/deck-pre-brain-app/`-Stack)
- Keine Next.js-Komponenten (`'use client'`-Direktiven raus)
- Keine eigene Build-Pipeline neben Vite
- Keine packages/*-Extraktion vor Vortragsreife (premature modularization)
- Keine Multi-Device-Sync, PWA, Quiz-Editor (Phase 1+)

### 0.5 Product Contract (Phase 1, verbindlich)

Der produktive Host bleibt **eine einzige App** in `apps/brain-app` mit drei freischaltbaren Bereichen im selben Dashboard:

- `authoring`
- `presenter`
- `companion` (inklusive spätere Erweiterung für Selflearning)

Das verbindliche Rollenmodell lautet:

- `admin`: verwaltet Rollen und Bereichsfreischaltung
- `presenter`: startet und steuert Live-Sessions
- `participant`: tritt Live-Sessions bei und nutzt Companion im Vortragskontext
- `selflearner`: nutzt Companion-Inhalte im Selbstlernmodus

Die Freischaltung erfolgt explizit über Feature-Gates pro Bereich. Es gibt **keine stillen Fallbacks** und keine impliziten Altpfad-Ausnahmen.

Architektur- und Betriebsleitlinien für die folgenden Phasen:

- Realtime bleibt `local-first WebSocket` als Produktstrategie
- Settings bleiben `TOML-first` (AAA-INI-ähnliches Schichtenmodell)
- `apps/companion-atlas/**` wurde entfernt und darf nicht wieder als Produktpfad reaktiviert werden

---

## 1. Northstar (verkuerzt)

Eine Vite-React-App als alleiniger produktiver Host fuer T6-Vortrag, Companion-Exploration und Editor-Tooling. Routes-basiert, Features-modular, Plattform-skalierbar ohne Refactor.

Detail siehe Spec Section 1.

---

## 2. Routes

| Route | Zweck | Verifiziert |
|-------|-------|-------------|
| `/` | Landing + Rollenauswahl + Links nach Gate-Policy | (Phase 1 Product Contract) |
| `/deck` | Vortragsmodus · 37 Slides · Hotkeys · Sidebar · 3D-Viewport | Wave 5b/6/7 DONE · Visual-Verify pending User-Chrome |
| `/companion` | Free-Exploration · OntologyTree · Master-Brain | Wave 6 DONE (`commit ab1323f`) · Visual-Verify deferred (Phase K) |
| `/editor` | Variant/Highlight-Tester · permanente Tools-Sidebar | Wave 6 DONE (`commit 42b2432`) · Visual-Verify deferred |
| `/devtools` | Debug-Console (Events, Sessions, NDJSON); **kein** `ProductArea` aus dem Contract · Phase-2-Produktfestlegung siehe Projektplan | Vitest fuer Layout-Komponenten |

---

## 3. Tech-Stack (verkuerzt)

Vite 5 · TypeScript 5 · React 19 · React Router 6 · @react-three/fiber 9 + drei 10 · three 0.184 · Tailwind v4 (oklch-Tokens) · Radix UI · class-variance-authority · Zustand · Zod · Lexend · Vitest + Playwright

Detail + Versionen siehe Spec Section 7 + `package.json`.

---

## 4. Core-Architektur (verkuerzt)

```
apps/brain-app/
├── public/figs3d/v2/   # Slide-Manifests + GLBs
├── src/
│   ├── routes/         # /deck /companion /editor (/devtools ohne Produktbereich)
│   ├── features/       # deck, exploration, companion, tools, auth, devtools
│   ├── core/           # Scene · SceneAutoFrame · CameraSession
│   ├── meshes/         # AtlasMesh · ParcelCollection · CutCap-/Material-Helpers
│   ├── figures/        # FigureLoader · TrajectoryLine · ParcelCollectionLoader
│   ├── data/           # blocks, slideFigures, dktBuckets, asegBuckets
│   ├── store/          # presenterStore · productRoleStore · layerVisibility … (siehe §5)
│   ├── ui/             # shadcn-lowercase + 4 PascalCase Custom-Widgets
│   ├── lib/            # allen-api Helpers
│   ├── theme/          # M3-Tokens
│   └── hooks/          # useFigureManifest · usePresentationSync · usePresenterBroadcast · useClippingKeys
└── tests/              # playwright e2e (vitest liegt unter src/**/__tests__)
```

Ausserhalb dieses Unterbaums live die **Python-Bakes** zum Befuellen von `public/figs3d/v2/**`:

- `scripts/alignment/**` (Repo-Root) — Ownership **asset-pipeline**, siehe **0.1**

Detail siehe Spec Section 4.

---

## 5. State-Stores

| Store | Zweck |
|-------|-------|
| `presenterStore` | aktive Folie (`activeSlideId`); Presenter-Route schreibt, Companion liest fuer Sync/Folieninhalt |
| `productRoleStore` | gewaehlte Demo-/Testrolle auf der Landing fuer Feature-Gates |
| `editorAuthStore` | Passwort/Unlock-State fuer `/editor` (Authoring-Zugang nach Policy) |
| `layerVisibilityStore` | Layer-Sichtbarkeit (Manifest-/UI-getrieben) |
| `highlightOverrideStore` | User-getriebene Highlight-Overrides (bucket-bezogene Keys) |
| `clippingStore` | Schnittebenen-State |
| `atlasVariantStore` | Auswahl von Atlas-Varianten (`atlasId` → `variantId`), wo Multi-GLB-Assets geschaltet werden |
| `materialVariantStore` | Material-Stil-Umschaltung (Matte, Glossy usw.) |
| `bucketHiddenStore` / `lockStore` | Bucket-Sichtbarkeit und Locks (Bridge mit Selection/Event-Pfad) |
| `phineasLayerVisibilityStore` | Phineas-Layer-Schalter fuer atlas-3d-master |
| `regionStore` | letzter Region-Hit fuer UI-Feedback (optional genutzt) |
| `meshHoverStore` | Hover-Zustand auf Meshes fuer Debug/UX |

Weitere lokale/ephemere Stores nur bei Bedarf; kanonischer Einstieg bleiben die obigen fuer Produktflows.

---

## 6. Tests + Verify

- **Unit (Vitest):** `pnpm exec vitest run` — **Stand:** nur Dateien unter `src/**` mit `*.test.*`/`*.spec.*`: **68** Dateien gesamt (**407** Tests, Exit 0). Playwright liegt unter `tests/e2e` und wird **nicht** von Vitest gezählt.
- **Typecheck:** `pnpm run typecheck` → `tsc -b --noEmit` · Exit 0
- **Build (optional Smoke):** `pnpm run build` — bundelt lazy Routes; vor Release mitlaufen lassen
- **E2E:** Playwright (`pnpm run test:e2e`) weiterhin eingeschraenkt ohne stabiles Headless-WebGL · primaerer Visual-Verify in echtem Chrome wenn noetig
- **Manifest-/Slide-Integritaet:** kein separates Audit-CLI im Pflichtumfang; Slide-/Figure-Invarianten ueber **`src/types/figureManifest.ts` (Zod)**, Vitest (`figureManifest.*` Tests) und die Asset-Pipeline. CI soll daran haengen — nicht an entfernte Ad-hoc-Skripte.

---

## 7. Bekannte Bugs / Deferred

- **Bug 6 C5 templates/** — `_archive/deck-pre-brain-app/brain3d-next/public/templates/` nicht zu brain-app/public/ migriert (nicht gebraucht)
- **Bug 7 pytest 0/15** — Python-Bake-Tests Pfad-Drift (out_fastsurfer · noch auf entfernter `deck/brain3d-next/...`-Pfad-Konvention)
- **Bug 3b Playwright Headless-WebGL** — Chromium kein WebGL · Workaround claude-in-chrome MCP / echtes Chrome
- **claude-in-chrome MCP Canvas-Sizing-Bug** — Pre-existing Environment-Bug · Workaround: Visual-Verify in echtem User-Chrome

---

## 8. Anti-Patterns (was schiefging und wir nicht wiederholen)

- **Mixed exports** in Component-Files brechen Vite Fast-Refresh — Helpers in `*.utils.ts` neben `*.tsx` splitten
- **Stray `.js`-Files** aus altem `tsc -b` ueberschatten `.tsx` (Vite Resolution-Order) — `tsconfig.json` `noEmit:true` praevention
- **WorldFrame ist `LineSegments`, nicht `Mesh`** — bei bbox-fit ueber `isMesh`-Filter ignorieren
- **Atlas-Variant-Toggle nicht via Re-Mount** — `visible`-Prop am `primitive`, three.js Mesh.visible setzen statt unmount/remount
