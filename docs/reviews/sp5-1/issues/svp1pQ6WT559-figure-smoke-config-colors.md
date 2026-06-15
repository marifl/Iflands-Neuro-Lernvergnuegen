# SP5.1 Issue Review: `svp1pQ6WT559`

Status: **open** (follow-up hardening suggestion below)

## Frage 1: Wird in `scripts/atlas/smoke-figures.mjs` nach `?config=<name>` weiterhin manuell ein Preset aktiv eingeschaltet?

Nein. Das Skript navigiert pro Konfiguration ausschließlich zu `/?config=<name>` und prüft anschließend Szene/Legende/Farben, ohne per UI auf ein Preset zu klicken.

- Evidence: `scripts/atlas/smoke-figures.mjs:106` `page.goto(`${BASE}/?config=${figure.name}`...)`
- Evidence: Es existiert kein weiterer Preset-Klick im Skript; nur `goto`, `legendColors`, `meshColors` und Prüflogik (`scripts/atlas/smoke-figures.mjs:113`-`127`).

## Frage 2: Bricht der Smoke laut, wenn `colors.preset` nicht durch Runtime Config angewendet wird?

Ja, im Normalfall schon, aber nicht durch einen expliziten „expected preset-applied“-Assert.

- App-seitiger Effekt der Runtime-Config:
  - `apps/brain-app/src/viewer/BodyParts3DViewer.tsx:140` liest `configuration.colors?.preset`
  - `BodyParts3DViewer.tsx:149` wirft bei unbekanntem Preset explizit (`Config-Link: Farb-Preset "..." nicht gefunden`).
  - `BodyParts3DViewer.tsx:142` setzt bei fehlendem Preset `setPreset(null)`.
  - `BodyParts3DViewer.tsx:245` färbt Materiale nur im `colorMode === 'preset'` nach `activePreset`.
  - `PresetLegend.tsx:10` zeigt Legende nur bei aktivem Preset-Modus.
- Smokeskript-Pfade:
  - `smoke-figures.mjs:110` vergleicht Legende-Keys mit erwarteten Gruppen.
  - `smoke-figures.mjs:120`..`124` prüft Mesh-Farbe je Bucket gegen Legendenfarbe.
  - Wenn Runtime-Preset nicht greift, bleibt meist keine passende Legende/Farbe => Prüfung schlägt mit `check` fehl.
- Schwäche: `smoke-figures.mjs` registriert `pageerror`, führt diesen aber nur als Log aus, keine harte `fails++`-Assertion auf `pageerror`.

## Frage 3: Minimaler Änderungsbedarf (Code/Tests)

- **Kein zwingender Produktcode-Fix mehr erkennbar:** Die manuelle Preset-Aktivierung im Smoke scheint entfernt zu sein; Runtime-Config -> `configuration.colors.preset` -> `setPreset(...)` ist aktiv und laut.
- **Empfohlene minimale harteening-Änderung:** in `scripts/atlas/smoke-figures.mjs` `pageerror`/kritische Konsolenfehler als harte Fehlschläge zählen (kleine, lokal begrenzte Testhärtung), damit ein „Preset nicht angewendet“-Fehler mit stummer Overlay-Situation deterministisch als Fail endet.
  - Aktueller Stand: kein harter Fehlerzähler auf `pageerror`.

## Frage 4: Exakte Verifikationskommandos

1. `cd apps/brain-app && pnpm typecheck`
2. `cd apps/brain-app && pnpm exec vitest run`
3. `cd apps/brain-app && pnpm dev`
4. In separatem Terminal (Server läuft): `SMOKE_URL=http://localhost:5173 node scripts/atlas/smoke-figures.mjs`

## Vergleich zur alten Quelle `docs/reviews/sp5-1/SP5.1.7-config-generated-smokes-review.md`

Die frühere Review notierte weiterhin manuelle Preset-Aktivierung im Figure-Smoke-Kontext, jedoch ist die aktuelle Skript-Datei (`scripts/atlas/smoke-figures.mjs`) im geforderten Dateibereich inzwischen ohne solchen UI-Klick implementiert.

---

## Owner Review Addendum (2026-06-15)

### Findings

1. **High - blocks Done:** `scripts/atlas/smoke-figures.mjs:117-128` akzeptiert pro Bucket bereits **ein** passend gefärbtes Mesh und beweist damit nicht, dass die Config-Färbung auf den gesamten Bucket angewendet wurde.
   - Der Check bricht ab, sobald `Object.values(colors).some(...)` wahr ist, und meldet danach mit `matched` nur einen einzelnen Treffer als Erfolg.
   - Das ist für die aktuelle Runtime-Config zu schwach: Der einzige aktuell gesmokte Figure-Config `basalganglienschleifen` enthält mehrere Multi-Mesh-Buckets (zur Laufzeit geprüft aus `atlas-config.json`, z.B. `dlpfc` mit 28 Meshes, `ofc` mit 8, `globus-pallidus` mit 4).
   - Reproduktion: Ein Regressionsbug, der innerhalb eines Buckets nur das erste Mesh oder nur eine Hemisphäre färbt, lässt den Smoke weiter grün werden, obwohl die Config-Färbung unvollständig angewendet wurde.

2. **High - blocks Done:** `scripts/atlas/smoke-figures.mjs:68-84` und `scripts/atlas/smoke-figures.mjs:121-127` prüfen Mesh-Farben gegen die **gerenderte Legende**, nicht gegen die in `color-presets.json` deklarierte Farberwartung.
   - Der Smoke lädt zwar `color-presets.json`, benutzt daraus aber nur Bucket->Gruppen-Zuordnung (`scripts/atlas/smoke-figures.mjs:36-45`), nicht die deklarierte Farbableitung.
   - `PresetLegend` rendert seine Swatches aus demselben Preset-Objekt via `hueToHex` (`apps/brain-app/src/viewer/PresetLegend.tsx:31-35`), und die Mesh-Färbung benutzt dieselbe Preset-Datenbasis über `resolvePresetColors` (`apps/brain-app/src/viewer/colorPresets.ts:78-88`).
   - Reproduktion: Ein Fehler in der Hue->Hex-Ableitung oder eine falsche Preset-Farbzuordnung, die **Legende und Meshes konsistent gleich falsch** färbt, bleibt hier grün. Damit ist die Forderung "Expectations must come from Runtime Config / color preset config" noch nicht vollständig erfüllt.

### Non-blocking note

1. **Low - report stale:** Diese Datei behauptet in `docs/reviews/sp5-1/issues/svp1pQ6WT559-figure-smoke-config-colors.md:26-32`, `pageerror` werde nur geloggt. Das ist im aktuellen Stand nicht mehr korrekt; `scripts/atlas/smoke-figures.mjs:132` macht daraus inzwischen einen harten Smoke-Fail.

## Post-Fix Review

Verdict: **clean for the reviewed scope; previous High blockers are closed and do not block Done.**

1. **Closed blocker:** `scripts/atlas/smoke-figures.mjs:138-153` verlangt jetzt nicht mehr nur einen Einzeltreffer pro Bucket, sondern wartet bis `row.meshes.every((mesh) => colors[mesh] === row.expectedColor)` und failt danach auf jedem verbleibenden `wrong`-Mesh. Der frühere False-Positive-Pfad "ein Mesh oder eine Hemisphäre reicht" ist damit im Review-Scope geschlossen.

2. **Closed blocker:** `scripts/atlas/smoke-figures.mjs:57-65` leitet `expectedColor` jetzt direkt aus der Preset-Hue ab, und `scripts/atlas/smoke-figures.mjs:146-152` prüft sowohl Legende als auch alle Bucket-Meshes gegen genau diese deklarierte Erwartung. Die Formel und Konstanten stimmen mit der Runtime-Implementierung in `apps/brain-app/src/viewer/colorPresets.ts:52-70` überein; die Runtime färbt weiter über `resolvePresetColors` aus derselben Hue-Basis (`apps/brain-app/src/viewer/colorPresets.ts:78-88`). Der frühere False-Positive-Pfad "Legende und Meshes sind nur konsistent gleich falsch" ist damit für diese Config-Ebene geschlossen.

3. **Still enforced:** `scripts/atlas/smoke-figures.mjs:112-116` sammelt `pageerror`, und `scripts/atlas/smoke-figures.mjs:157` macht verbliebene Browserfehler weiterhin zu einem harten Smoke-Fail.

Residual risk: **low, non-blocking.** `scripts/atlas/smoke-figures.mjs:19-38` dupliziert die `hueToHex`-Formel statt sie aus der Runtime zu importieren. Das ist kein stiller Pass-Risiko mehr; bei Drift zwischen Runtime und Smoke würde der Test laut scheitern statt grün zu bleiben.
