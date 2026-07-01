# PR #38 Review — feat(v2): Mockup-Completion

Datum: 2026-06-29 (Review-Session Cloud Agent)  
PR: [#38](https://github.com/marifl/Iflands-Neuro-Lernvergnuegen/pull/38) (Draft)  
Branch: `feature/v2-mockup-completion` → `main`  
Umfang: **324 Dateien**, **+26.082 / −3.796** Zeilen, **46 Commits**

Scope dieses Dokuments: **kritische und merge-blockierende Befunde** aus dem PR-Review.
Keine Code-Fixes — nur dokumentierte Findings mit Evidenz und empfohlener Priorität.

Verifikation in der Review-Session (Branch ausgecheckt):

| Gate | Ergebnis |
|------|----------|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | **506/506** grün (92 Dateien) |
| `pnpm build` | exit 0 |
| Browser-Smokes | **nicht** erneut ausgeführt (Playwright + Dev-Server) |

---

## Kurzfazit

Die **V2-Shell-Arbeit (Schritte 10–13)** ist technisch solide und lokal grün (typecheck/test/build).
Der PR ist als **ein Merge-Request nicht reviewbar**: ~47 % Wiki-Content, ~8.500 Zeilen
`atlas-ontology.json`, test-only Overlay-Infrastruktur und 46 Commits verschiedener Epics.

**Vor Merge müssen mindestens die URL/State-Bugs (K1–K3) behoben oder explizit als
akzeptiertes Risiko dokumentiert werden.** Scope-Split (S1–S3) wird dringend empfohlen.

---

## Severity-Legende

| Stufe | Bedeutung |
|-------|-----------|
| **BLOCKER** | Merge stoppen bis Fix oder dokumentierter Waiver mit Owner-Freigabe |
| **KRITISCH** | Sollte vor Merge behoben werden; hohes Nutzer-/Review-Risiko |
| **WICHTIG** | Kein harter Merge-Stop, aber zeitnah adressieren |

---

## BLOCKER — Funktionale URL/State-Bugs

### K1 — Vortrag verlassen verliert Lernposition

**Severity:** BLOCKER  
**Impact:** Nutzer:in startet Vortrag mitten im Kapitel-11-Lernpfad, verlässt den Vortrag →
landet auf **Schritt 1 der Default-Sequenz**, nicht auf der vorherigen Lernposition.

**Ursache:** Exit setzt nur `?mode=learn` ohne `config`/`scene`/`sequence`/`step`.

**Evidenz:**

- `apps/brain-app/src/scene/PresenterNotes.tsx` — `leavePresentation()` Zeilen 15–18
- `apps/brain-app/src/viewer/ShellNav.tsx` — gleiches Muster Zeile ~241
- `apps/brain-app/src/scene/LearnSidebar.tsx` — `syncFromRoute` lädt bei Sequence-Wechsel
  neu via `loadScenes()` ohne gespeicherte Position (Zeilen 69–86)
- `apps/brain-app/src/scene/router.ts` — `parseLocation` ohne `sequence`/`scene`/`config`
  → Default-Lernsequenz

**Repro (konzeptionell):**

1. `?mode=learn&config=…&scene=…` auf mittlerem Schritt
2. ShellNav „Mehr" → „Vortrag starten"
3. „Vortrag verlassen"
4. URL = `?mode=learn` → LearnSidebar lädt Default ab Index 0

**Fix-Richtung:**

- Vor Vortragsstart letzte Lern-URL (oder `CanonicalQueryInput`) in Ref/Store merken
- Beim Verlassen `replaceCanonicalLocation(...)` mit gespeicherter Position aufrufen
- Oder: dedizierte `leavePresentation()`-Hilfe, von `PresenterNotes` und `ShellNav` geteilt

**Merge-Gate:** Fix + Test (Unit oder Smoke: Vortrag rein → raus → gleicher `scene`/Index)

---

### K2 — „Im Atlas zeigen →" ohne URL-Sync (Reload bricht Atlas)

**Severity:** BLOCKER  
**Impact:** Klick im Lern-Panel wechselt live in den Atlas-Modus mit Fokus — nach **Reload**
ist Modus wieder **learn**, Atlas-Fokus weg.

**Ursache:** Bridge setzt nur Store (`setAtlasFocus` + `setAppMode('atlas')`), keine URL.

**Evidenz:**

- `apps/brain-app/src/scene/overlays/OverlayPanel.tsx` Zeilen 87–90
- `apps/brain-app/src/viewer/settingsRuntime.ts` — `explicitAppModeFromSearch`:
  `scene`/`config` in URL → `'learn'` (Zeilen 31–32)
- Inkonsistenz: `ShellNav.goToSurface('atlas')` setzt `?mode=atlas` (ShellNav.tsx ~36–38)
- Gleiches Muster pre-existing in `BodyParts3DViewer.tsx` (~594–666) — mehrere Atlas-Sprünge

**Fix-Richtung:**

- Gemeinsame Nav-Hilfe (z. B. `navigateToAtlas(focus, returnPath?)`) die URL + `ROUTE_CHANGE_EVENT`
  setzt — analog `goToSurface`
- Optional: Return-Query für Rückweg zum Lernschritt

**Merge-Gate:** Fix + Test; Smoke `atlas-bridge` ggf. um Reload-Schritt erweitern

---

### K3 — `goToSurface('learn')` synchronisiert URL nicht

**Severity:** BLOCKER (niedrigeres Risiko als K1/K2, aber Reload-Bug)  
**Impact:** Nach Wechsel Struktur/Atlas → Lernen bleibt URL z. B. `?mode=explore`.
Reload öffnet **Strukturfokus** statt Lernschritt.

**Evidenz:**

- `apps/brain-app/src/viewer/ShellNav.tsx` Zeilen 35–40 — `learn`-Pfad überspringt `replaceState`
- Kommentar sagt „Lernen behält aktive Szene" — gilt für Store, **nicht** für Reload

**Fix-Richtung:**

- Beim Wechsel zu `learn`: URL auf kanonische Learn-Route setzen
  (`replaceCanonicalLocation` aus aktuellem Scene-State oder `parseLocation` + `mode=learn` entfernen
  wenn scene/config die Quelle der Wahrheit sind)

**Merge-Gate:** Fix + ShellNav-Test oder Smoke

---

## KRITISCH — Merge-/Review-Risiko

### S1 — PR-Umfang: nicht reviewbar als Monolith

**Severity:** KRITISCH (Prozess)  
**Impact:** Kern-V2-Änderungen (~120 App-Dateien) gehen in Wiki/Ontology/Overlay-Rauschen unter;
Rollback-Grenzen unklar.

**Evidenz (Diff-Stat vs. `main`, Review-Session):**

| Bereich | Dateien | Insertions (ca.) |
|---------|---------|------------------|
| `knowledge/wiki/` | 168 | ~11.754 |
| `apps/brain-app/src/` | 119 | ~3.946 |
| `atlas-ontology.json` | 1 | ~8.489 |
| Rest (scripts, docs, assets, lockfile) | ~36 | — |

**Empfohlener Split:**

1. **PR A — V2 Shell** — Schritte 0–13, Phineas Step 5 (optional gekoppelt), ohne Wiki
2. **PR B — Wiki** — `knowledge/wiki/` isoliert
3. **PR C — Atlas-Daten** — `atlas-ontology.json`, subcortical manifest, `atlas-context.yaml`
4. **PR D — P0 Lab-Overlay-Contracts** — test-only Scaffold, eigene Epic

**Merge-Gate:** Mindestens Wiki (PR B) aus #38 herauslösen vor Merge

---

### S2 — Shape-Vertrag vs. Implementierung: Atlas auf Rail

**Severity:** KRITISCH (Design-Inkonsistenz)  
**Impact:** Widersprüchliche Produktspec; Reviewer/QA können „fertig" nicht einheitlich bewerten.

**Widerspruch:**

- `docs/specs/v2-migration-plan.md` Schritt 4: „Atlas ist kein Start-Card", nur Bridge/Deep-Link
- `docs/specs/unified-learning-mode-shape.md` §Phone Portrait: Atlas hinter „Mehr"
- Implementierung: `ShellNav.tsx` — Atlas als **3. gleichwertiger** Rail/Dock-Button (Zeilen 27–31)
- Schritt 10 im Migrationsplan dokumentiert Atlas auf Rail bewusst — **Spec-Konflikt bleibt offen**

**Merge-Gate:** Entscheidung + **eine** Quelle anpassen (Shape oder Plan), nicht beide widersprüchlich lassen

---

### S3 — PR-Beschreibung veraltet

**Severity:** KRITISCH (Kommunikation)  
**Impact:** Reviewer lesen falschen Scope; „Folge-Slice Footer-Konsolidierung" ist bereits umgesetzt.

**Evidenz:**

- PR-Body listet Portrait Dock + FooterBar als **zwei Leisten** als Folge-Slice
- Branch enthält bereits Schritt 13: `cd1f938`, `bcd3a0a`, `0a6525f`
- Testzahl in älteren Commits: **510** — aktuell **506** (4 FooterBar-Box-Tests entfernt, korrekt)

**Merge-Gate:** PR-Body vor Merge aktualisieren (Slice E done, Tests 506, Smokes inkl. shell-nav/erp/presenter/atlas-bridge)

---

### S4 — P0 Lab-Overlay: Scaffold ohne Runtime

**Severity:** KRITISCH (technische Schuld)  
**Impact:** Große Vertrags-API im App-Bundle-Pfad, größtenteils nur via Vitest erreichbar;
Fallow/Agenten-Risiko „weiterbauen ohne UI".

**Module (Branch, kein Production-Import außer `brainModelOptions`):**

- `overlayContract.ts`, `activationMappingContract.ts`, `pinpointContract.ts`
- `spaceTransformGraph.ts`, `brainModelManifest.ts`, `pickTargetContract.ts`
- `heatmapColormap.ts`, `HeatmapColorbar.tsx`
- Fehlend laut Epic: `pinpointProjection.ts`, `labOverlayLoader.ts`, Shader-Slice

**Merge-Gate:** Aus Mockup-PR splitten oder explizit als „Contract-only, no UI" labeln + Follow-up-Issue

---

### S5 — Phineas-Contract nicht abgeschlossen

**Severity:** KRITISCH (Prozess)  
**Impact:** S1–S5 implementiert, aber ALRAH-Contract
`.agent/contracts/2026-06-20-phineas-gage-case-study-migrat` ohne `eval`/`verdict`.

**Rest-Schuld:**

- `viewerStateSnapshot.ts` toleriert legacy `rodPhase`/`showSkull` (C10) — nicht voll entfernt
- Deep-Link-Shims `?mode=phineas` dauerhaft in `settingsRuntime.ts`

**Merge-Gate:** Contract `eval` + Verdict **oder** dokumentierter Waiver im Contract-Status

---

## WICHTIG — Qualität / Follow-up

### W1 — Keine Unit-Tests für `ShellNav.tsx`

272 Zeilen: URL-Sync, Presenter-Toggle, Mehr-Sheet, Escape-Capture.
Nur `scripts/smoke-shell-nav.mjs` (Layout-Screenshots).

**Priorität:** vor nächstem Chrome-Slice

---

### W2 — Mehr-Sheet A11y-Lücken

- Kein Focus-Trap (Tab entweicht zur 3D-Bühne)
- Kein Scroll-Lock auf `document.body`
- Fokus landet auf Dialog-Container, nicht auf erstes interaktives Element

Escape mit `capture: true` ist korrekt (ShellNav.tsx ~53–62).

---

### W3 — LearnSidebar Race-Guard ungetestet

`loadGenRef` (Presenter-Toggle) — Fix aus Review-Runde Slice C, keine Vitest-Abdeckung.

---

### W4 — PresenterNotes in scrollbarem Panel

`OverlayPanel.tsx` — Sprechernotiz scrollt mit langem ERP/Prose-Content weg;
Mockup evtl. sticky Presenter-Chrome erwarten.

---

### W5 — `ResumeLauncher` „frei erkunden" ohne URL

`ResumeLauncher.tsx` ~160: `onEnter('explore')` ohne `?mode=explore` — gleiche Reload-Klasse wie K3.

---

### W6 — Browser-Smokes nicht in Review-Session verifiziert

PR behauptet: responsive 6/6, learning 3/3, phineas 2/2, explorer 3/3, performance 2/2,
shell-nav 3/3, erp 2/2, presenter 1/1, atlas-bridge 1/1.

**Empfehlung:** CI- oder lokaler Smoke-Lauf vor Merge als Evidenz an PR anhängen.

---

## Was im PR gut ist (Kontext, nicht kritisch)

Diese Punkte **blockieren nicht**, sind aber relevant für „Merge nach Fix der Blocker":

- ResumeLauncher ersetzt ModeLauncher — Resume-first Einstieg
- FooterBar-Konsolidierung (Schritt 13) — Portrait eine Bottom-Leiste
- ERP einklappbare Kontextspalte — Mockup-Affordance
- Presenter als Sequenzzustand — kein AppMode-Silo
- Race-Guard LearnSidebar — sauberes Pattern
- Atlas-Carve `alphaTest` — Render-Fix dokumentiert
- ColorLegend-Vereinheitlichung — kleiner Refactor mit Tests

---

## Checkliste vor Merge (aus kritischen Findings)

- [ ] **K1** Vortrag-Exit stellt Lern-URL/Position wieder her
- [ ] **K2** Atlas-Bridge synchronisiert URL ( konsistent mit ShellNav )
- [ ] **K3** `goToSurface('learn')` URL-synchron
- [ ] **S1** Wiki (mindestens) aus PR splitten
- [ ] **S2** Atlas Rail vs. Shape — Spec-Entscheidung + Doku-Update
- [ ] **S3** PR-Beschreibung aktualisieren (506 Tests, Slice E)
- [ ] **S4** Overlay-Scaffold splitten oder labeln
- [ ] **S5** Phineas-Contract eval/verdict oder Waiver
- [ ] **W6** Smokes einmal grün nachweisen

---

## Verwandte Dokumente

- `docs/specs/v2-migration-plan.md` — Schritte 10–13, Status Header
- `docs/specs/v2-handoff-frame-mapping.md` — Frame-Mapping AppFrame/AtlasErp/Presenter
- `docs/specs/unified-learning-mode-shape.md` — bindender Screen-Vertrag
- `.agent/contracts/2026-06-20-phineas-gage-case-study-migrat/` — Phineas-Migration
- `docs/P0_LAB_OVERLAY_DECOMPOSITION.md` — Overlay-Epic (Scope S4)

---

## Nächste Schritte (empfohlen, nicht Teil dieses Docs)

1. URL-Bugs K1–K3 fixen (ein gemeinsames `navigation`-Modul reduziert Duplikat-Risiko)
2. PR #38 Body + ggf. Split-Branches
3. Shape/Plan Atlas-Entscheidung in Spec festnageln
