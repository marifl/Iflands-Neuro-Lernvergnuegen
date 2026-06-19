---
title: localStorage-Persistenzgrenzen klaeren
type: fix
task: 1Hbpo13ABwto
---

# Spec — localStorage-Persistenzgrenzen klären

> Contract-ID: `2026-06-19-localstorage-persistenzgrenzen`
> Revision: v1 (2026-06-19)
> Status: planning -> active nach plan-done

---

## Frame

```yaml
problem: |
  Lokale App-Daten sind als UI-/Session-Persistenz erlaubt, koennen aber
  kaputte Settings- oder Atlas-Override-Daten derzeit still zu Defaults
  degradieren. Dadurch wird defekte lokale Wahrheit als gueltiger Zustand
  maskiert.
why_now: |
  Das V2-Readiness-Gate bleibt durch No-Fallback-Restklassen blockiert. NF-005
  ist ein direkter Release-Haertepunkt, weil persistierte Alt- oder Korruptdaten
  sonst jederzeit kanonische Links, Settings oder Authoring-Sicht verfalschen.
symptom_vs_problem: |
  Symptom = App startet trotz kaputter localStorage-Daten mit Defaults.
  Problem = kein fail-loud-Vertrag fuer korrupte App-eigene Persistenz und kein
  vollstaendig dokumentierter Owner-/Loeschpfad je Key.
smallest_change: |
  Settings- und Atlas-Override-Loader bei korrupten Daten laut werfen lassen,
  erlaubte Keys im Clear-Flow absichern und Architektur-/Inventartext
  synchronisieren.
tradeoffs: |
  Kein Server-State-Umbau und keine breite Store-Refaktorierung. Ein harter
  Fehler bei korruptem localStorage ist gewollt, weil der bestehende Settings-
  Button die bekannten App-Daten loeschen kann.
```

---

## Working Principles

1. **Think First** — lokale Persistenz ist nur UI-/Session-State.
2. **Simplicity** — vorhandene Stores und Tests gezielt härten.
3. **Surgical** — keine anderen No-Fallback-Klassen anfassen.
4. **Goal-Driven** — Kriterien in `criteria.md` mit frischen Commands belegen.

## Problem

Das V2-Readiness-Gate bleibt blockiert, solange lokale Persistenzpfade als
unklare Fallback- oder Reparaturschicht wirken können. Aktuell sind mehrere
`localStorage`-Keys bewusst erlaubt, aber kaputte Settings- oder Atlas-
Override-Daten werden beim Laden still durch Defaults ersetzt. Das maskiert
defekte lokale App-Wahrheit und widerspricht dem No-Fallback-Vertrag.

## Ziel

NF-005 wird für die aktuellen lokalen App-Daten geschlossen: jeder App-eigene
`localStorage`-Key hat Owner, Zweck und Löschpfad; korrupte Daten werden laut
abgelehnt statt als gültige Defaults zu erscheinen.

## Scope

1. `apps/brain-app/src/viewer/settingsStore.ts`
2. `apps/brain-app/src/viewer/settingsStore.test.ts`
3. `apps/brain-app/src/viewer/atlas/atlasConfigStore.ts`
4. `apps/brain-app/src/viewer/atlas/atlasConfigStore.test.ts`
5. `apps/brain-app/src/viewer/localDataActions.ts`
6. `apps/brain-app/src/viewer/localDataActions.test.ts`
7. `docs/ARCHITECTURE.md`
8. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`

## Nicht-Ziele

1. Kein Wechsel von erlaubter UI-/Session-Persistenz auf Server-State.
2. Keine breite Store-Refaktorierung.
3. Kein Umbau von Snapshot-Import/Export.
4. Keine Behandlung anderer No-Fallback-Klassen wie Kamera, Animation oder
   Phineas-Asset-Space.

## Erlaubter Endzustand

Migriert: lokale Persistenz ist expliziter UI-/Session-Vertrag, nicht
kanonische Autorenquelle und nicht stiller Reparaturpfad. Korrupte lokale
Daten werfen mit Key- und Kontextangabe; Nutzer:innen können bekannte App-
Keys über den bestehenden Clear-Local-Data-Flow entfernen.

## Risiken

1. Ein hartes Throw beim Store-Initialisieren kann die App-Fehlergrenze
   auslösen. Das ist gewollt, solange die Fehlermeldung den lokalen Key nennt
   und der Löschpfad dokumentiert ist.
2. Tests müssen echte lokale Persistenzkeys prüfen, damit neue Keys nicht am
   Clear-Flow vorbeiwachsen.
