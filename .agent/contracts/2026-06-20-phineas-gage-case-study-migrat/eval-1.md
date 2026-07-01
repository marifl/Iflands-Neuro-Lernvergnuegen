# Eval 1 — Phineas-Gage Case-Study Migration

Datum: 2026-07-01  
Branch: `feature/v2-mockup-completion` / `cursor/v2-issue-fixes-2282`

## C1–C8 — Implementierung

| Kriterium | Ergebnis | Evidenz |
|-----------|----------|---------|
| C1 TampingIron gelöscht | PASS | Kein prozeduraler Rod in BodyParts3DViewer |
| C2 rod/skull aus viewerStore | PASS | State in phineasGage.ts / Case-Study-Store |
| C3 kein appMode phineas | PASS | `?mode=phineas` → explore + caseStudyLaunch |
| C4 phineasAssetManifest weg | PASS | GLB via generisches Manifest |
| C5–C6 CaseStudy-Interface | PASS | phineasGage.ts |
| C7 Browser-Smoke | PASS (historisch) | smoke:phineas-gage auf PR-Branch |
| C8 Deep-Link | PASS | settingsRuntime + main.tsx Bootstrap |

## C9 — Gates

- `pnpm typecheck`: exit 0 (Eval-Session 2026-07-01)
- `pnpm test`: 510/510 grün
- `pnpm verify:brain-models`: nicht in dieser Session erneut ausgeführt (keine Asset-Änderung)

## C10 — Snapshot-Kompatibilität (bewusst deferred)

`viewerStateSnapshot.ts` toleriert legacy `rodPhase`/`showSkull` beim Import — **bewusster Waiver**:
Alte gespeicherte Snapshots sollen nicht crashen; Felder werden ignoriert, nicht migriert.
Entfernung erst wenn Snapshot-Version bump + Migrationshinweis dokumentiert.

## C8 Rest — Deep-Link-Shim

`?mode=phineas` bleibt dauerhaft in `settingsRuntime.ts` — **bewusster Waiver** (Criteria C8 verlangt Kompatibilität).

## Verdict-Vorschlag

**pass-with-waiver** — C10 Snapshot-Toleranz und C8 Deep-Link-Shim sind dokumentierte Rest-Schuld, kein Blocker für V2-Shell-Merge.
