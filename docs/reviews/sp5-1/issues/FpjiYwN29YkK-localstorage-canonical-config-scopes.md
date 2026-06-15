# Review: FpjiYwN29YkK localStorage überschreibt kanonische Config-Scopes

## Scope

Review des aktuellen Diffs für Dart-Issue `FpjiYwN29YkK` mit Fokus auf:

1. `computeEffectiveConfig()` ignoriert persistierte `local.scopes`, wenn `?config=` aktiv ist.
2. Lokale `preset`/`configuration` können kanonische `?config`-Links nicht mehr verfälschen.
3. Explizite URL-Scopes (`on`/`off`) gewinnen weiterhin über Runtime-Config.
4. Fehler bleiben fail-loud, ohne stille Defaults oder lokale Fallback-Source-of-Truth.
5. Tests decken das ausreichend ab.

## Geprüfte Dateien

1. `apps/brain-app/src/viewer/atlas/atlasConfig.ts`
2. `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts`
3. `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts`
4. `apps/brain-app/src/viewer/atlas/configExport.ts`
5. `apps/brain-app/src/viewer/atlas/configExport.test.ts`
6. `apps/brain-app/src/viewer/BodyParts3DViewer.tsx`
7. `apps/brain-app/src/scene/router.ts`

## Findings

### Low

1. `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts:127-147` deckt Akzeptanzkriterium 2 nur teilweise ab. Der neue Test `"URL-config rekonstruiert kanonisch und ignoriert persistierte lokale Overrides"` setzt zwar ein konkurrierendes lokales `preset` und konkurrierende `local.scopes`, aber gerade kein konkurrierendes lokales `configuration`. Damit ist nicht explizit festgenagelt, dass `?config=...` auch gegen eine persistierte `local.configuration` gewinnt. Zusätzlich wird kein preset-abhängiger Scope wie `axis:cyto` oder `area:julich:area-44:l` geprüft, sodass die kanonische Preset-Rekonstruktion nur über `eff.preset` und nicht über die resultierenden Scopes abgesichert ist.

## Verifikationsbewertung

1. `node --test scripts/atlas/build-config.test.mjs` frisch ausgeführt: `21/21` grün.
2. `cd apps/brain-app && pnpm exec vitest run src/viewer/atlas/atlasConfig.test.ts` frisch ausgeführt: `16/16` grün.
3. `cd apps/brain-app && pnpm typecheck` frisch ausgeführt: Exit `0`.
4. `git diff --check` frisch ausgeführt: sauber.
5. Implementierungsbewertung:
   `apps/brain-app/src/viewer/atlas/atlasConfig.ts:184-196` setzt die gewünschte Präzedenz korrekt um. Bei aktivem `?config=` wird `local.preset` durch `file.preset` ersetzt, `local.scopes` werden komplett ausgeblendet, und `parseUrlScopes(url)` bleibt letzte Override-Schicht.
6. Fail-loud-Verhalten bleibt erhalten:
   `apps/brain-app/src/viewer/atlas/atlasConfig.ts:186-190` wirft weiter bei unbekanntem Preset bzw. unbekannter Configuration; `loadLocalOverrides()` in `apps/brain-app/src/viewer/atlas/atlasConfig.ts:133-138` parst unverändert ohne stillen Fallback.

## Rest-Risiken

1. Testabdeckung für konkurrierende `local.configuration` unter `?config=` fehlt weiterhin.

## Verdict

Implementierung in `computeEffectiveConfig()` ist fachlich korrekt für die fünf geforderten Punkte. Kein funktionaler Blocker im geprüften Diff gefunden. Vor Merge bleibt ein kleiner Testlücken-Rest bei Akzeptanzkriterium 2.

## Post-Fix Review

Testlücke erledigt: ja. `apps/brain-app/src/viewer/atlas/atlasConfig.test.ts:139-154` setzt jetzt konkurrierendes `local.preset`, konkurrierende `local.configuration` und konkurrierende `local.scopes` und prüft zusätzlich die kanonische Rekonstruktion über die resultierenden Scopes `axis:cyto=false`, `area:julich:area-44:l=true` und `area:julich:area-45:l=true`. Damit ist Akzeptanzkriterium 2 jetzt direkt festgenagelt statt nur indirekt über `eff.preset`.

Verbleibende Findings: keine.

Verdict: Die zuvor bemängelte Low-Testlücke ist geschlossen. Frische Nachverifikation ist konsistent: `pnpm exec vitest run src/viewer/atlas/atlasConfig.test.ts` grün mit `16/16`, `pnpm typecheck` Exit `0`, `git diff --check` sauber. Der Report enthält damit keine offenen Findings mehr für dieses Issue.
