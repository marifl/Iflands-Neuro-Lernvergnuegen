# SP5.1.1 Review — Figure/Scene-Config-Schema

Reviewer: `skeptic_reviewer` subagent `019ecb31-0334-7160-88d3-169315580a6f`

Scope: `[SP5.1.1] Figure/Scene-Config-Schema festziehen`

## Findings

1. Critical — Das behauptete SP5.1-Schema wird nicht tatsächlich erzwungen

   `scripts/atlas/config.default.toml` deklariert für kanonische Atome
   `title`, `section`, `replaces_figure`, `view`, `camera`, `regions`,
   `colors`, `visibility`, `cuts`, `overlay`, `sequencing` und `scopes` als
   required. `scripts/atlas/build-config.mjs` prüft aber im Wesentlichen nur
   erlaubte Keys plus ausgewählte Enum-/Referenzfälle. Die Validierung verlangt
   diese Sektionen nicht und validiert viele primitive Typen nicht.

   Der Reviewer verifizierte, dass `validateConfig()` für eine Configuration
   mit nur `{ label_de, scopes }` `PASS` liefert. Ebenfalls akzeptiert wurden
   malformed Werte wie `label_de: 123`, `section: 789`,
   `view.subcortex: "false"`, `colors.enabled: "false"`,
   `visibility.dim_others: "true"` und `sequencing.step: 1`.

2. Important — Unknown Keys werden in verschachtelten Schema-Nodes noch still
   akzeptiert

   Parent-Tabellen werden geprüft, aber innere Objekte nicht vollständig:
   `camera.pose` wird nur auf Shape geprüft, `colors.groups` nur nach Buckets
   durchlaufen, und `cuts.planes` liest nur bekannte Felder.

   Der Reviewer bestätigte, dass `validateConfig()` weiterhin
   `camera.pose.roll`, `colors.groups[].alpha` und `cuts.planes[].softness`
   akzeptiert.

3. Important — Sequencing garantiert keinen nutzbaren Scene-Link zur Build-Zeit

   Sequenzen prüfen nur, dass ein Step eine vorhandene Configuration benennt.
   `overlay.scene` wird nur validiert, wenn es gesetzt ist. Eine sequenzierte
   Config mit `overlay: { kind: "prose" }` passiert `validateConfig()` und
   explodiert erst in `loadScenes()`.

4. Important — SP3-Rückwärtslesbarkeit oder Migration ist nicht erfüllt

   Der Validator verlangt jetzt nicht-leere `mesh_mappings`. Eine SP3-förmige
   Config ohne `mesh_mappings` schlägt mit
   `build-config: mesh_mappings fehlt oder ist kein Objekt` fehl. Der Reviewer
   fand in `README.md`, `docs/`, `apps/brain-app/` und `scripts/atlas/` keinen
   expliziten Migrationspfad für diesen Break.

5. Minor — Exporter-Tests beweisen den beworbenen autoritativen Roundtrip nicht

   `configExport.ts` verspricht Re-Parse plus `build-config`-validen Roundtrip.
   `configExport.test.ts` parst nur mit `smol-toml` und inspiziert Felder. Kein
   Test führt den exportierten Block zurück durch `validateConfig()`.

## Evidence Inspected

1. `scripts/atlas/build-config.mjs`
2. `scripts/atlas/build-config.test.mjs`
3. `scripts/atlas/config.default.toml`
4. `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
5. `apps/brain-app/src/viewer/atlas/configExport.ts`
6. `apps/brain-app/src/viewer/atlas/configExport.test.ts`
7. `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts`
8. `apps/brain-app/src/scene/scenes.ts`
9. `apps/brain-app/src/scene/scenes.test.ts`
10. SP5.1-Dokumentation

## Verification Run By Reviewer

1. `node --test scripts/atlas/build-config.test.mjs` — grün.
2. `pnpm --dir apps/brain-app exec vitest run src/viewer/atlas/atlasConfig.test.ts src/viewer/atlas/configExport.test.ts src/scene/scenes.test.ts`
   — grün.

Die grünen Tests sind Teil des Befunds, weil sie die Schema-Lücken nicht
abdecken.
