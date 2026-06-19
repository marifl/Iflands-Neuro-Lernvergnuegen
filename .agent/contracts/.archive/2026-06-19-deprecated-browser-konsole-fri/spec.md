# Spec — Deprecated Browser-Konsole frisch prüfen

> Contract-ID: `2026-06-19-deprecated-browser-konsole-fri`
> Revision: v1 (2026-06-19)
> Status: planning → active nach plan-done

---

## Frame

```yaml
problem: |
  Release-Review und Folgeagenten können nicht unterscheiden, ob die
  dokumentierte THREE.Clock-Deprecated-Warnung noch aus aktueller App-Runtime
  stammt oder nur aus alten Konsolenartefakten.
why_now: |
  Die No-Fallback-Inventur blockiert Release-Fähigkeit, solange alte Browser-
  Konsolenartefakte als aktuelle Wahrheit gelesen werden können.
symptom_vs_problem: |
  Symptom = ein historischer Konsolenbefund mit Deprecated-Text. Problem =
  fehlende frische Zuordnung zu App-Code, Dependency oder veraltetem Artefakt.
smallest_change: |
  Aktuelle Browser-Konsole per Playwright gegen den laufenden Vite-Build
  erfassen, Warnungsquelle klassifizieren und nur die betroffene Inventur-/
  Artefaktstelle aktualisieren.
tradeoffs: |
  Keine pauschale Three/R3F-Migration ohne live reproduzierbaren App-Stack.
  Keine Bereinigung historischer END_SESSION- oder Review-Protokolle außerhalb
  der aktuellen NF-007-Quellen.
```

---

## Working Principles (Karpathy + FAB — Reminder fuer Implementer)

1. **Think First** — Frame oben ist die Annahme-Basis. Bei Drift wahrend Implementation: spec.md updaten, nicht silently abweichen.
2. **Simplicity** — `smallest_change` aus dem Frame ist Source of Truth. Keine spekulativen Features ueber In-Scope hinaus.
3. **Surgical** — Out-of-Scope ist verbindlich. Adjacent-Refactor ist ein separater Contract.
4. **Goal-Driven** — criteria.md `outcome:` Frontmatter (user_signal/observable_in/guardrail/read_horizon) ist Verify-Ziel.

FAB-Bezug: `docs/decisions/ADR-005-fab-design-principles.md` (Gebote II/IX/X greifen besonders).

---

## 1. Motivation und Problem

NF-007 in `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` benennt alte
`native-highqual-browser-console*.md`-Artefakte und eine
`THREE.Clock`-Deprecated-Warnung. Für Release-Fähigkeit darf daraus kein
unklarer Zustand bleiben: Entweder nutzt die App noch eine veraltete API und
wird migriert, oder die Warnung ist extern/historisch und aktuelle Doku darf
sie nicht als Runtime-Wahrheit führen.

Der Arbeitsvertrag ist evidence-first: Die frische Browser-Konsole schlägt
alte Artefakte. Alte Konsolenlogs dürfen als Verlaufsevidenz existieren, aber
nicht als aktuelle Release-Aussage.

## 2. Scope

### In-Scope

- Aktuelle Console-/PageError-Erfassung für zentrale App-Einstiege:
  `/`, `/?mode=explore`, `/?config=ofc-phineas`, `/?mode=atlas`.
- Suche nach app-seitiger `THREE.Clock`-/Deprecated-Nutzung in aktuellem
  Runtime-Code.
- Migration app-seitiger Deprecated-Nutzung, falls die frische Console-Quelle
  auf App-Code zeigt.
- Klassifikation oder Entfernung alter `apps/brain-app/native-highqual-browser-console*.md`-
  Artefakte, falls sie nur historische Evidenz sind.
- Aktualisierung der NF-007-Zeile in der No-Fallback-Inventur.

### Out-of-Scope

- Dependency-Upgrades aus `pnpm-lock.yaml`; diese gehören zu NF-010, wenn die
  frische Evidenz auf externe Pakete zeigt.
- Visuelles Redesign, neue BrainModel-Funktionalität oder Atlas-Mapping.
- Bereinigung historischer Review-, Plan- oder END_SESSION-Dokumente, solange
  sie nicht als aktuelle Arbeitsanweisung referenziert werden.
- Änderung an TARO-/MNI-Geometrie, Normalen oder Asset-Budgets.

## 3. Architektur

Die App-Runtime wird nicht aus alten Markdown-Artefakten bewertet. Der
Konsolen-Smoke startet den lokalen Vite-Server, öffnet die definierten Routen
per Playwright und sammelt `console`-Events sowie `pageerror`.

Entscheidung:

1. App-Stack reproduziert Deprecated-Warnung: betroffenen App-Code migrieren
   und mit Smoke erneut prüfen.
2. Nur Dependency-Stack reproduziert Warnung: NF-007 als extern klassifizieren
   und NF-010 offen lassen.
3. Keine Deprecated-Warnung reproduzierbar: alte Konsolenartefakte aus aktueller
   Wahrheit entfernen oder als historisch markieren; NF-007 als migriert
   schließen.

## 4. Test-Strategie

- Frischer Browser-Smoke mit Console-/PageError-Protokoll gegen Vite.
- `rg` gegen aktuelle Runtime-Quellen für `THREE.Clock`, `new Clock`,
  `deprecated` und `Deprecated`.
- `pnpm --dir apps/brain-app docs:drift`.
- `git diff --check`.
- Bei Codeänderungen zusätzlich fokussierte Tests und `pnpm --dir apps/brain-app typecheck`.

## 5. Pflichtlektuere

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
- `apps/brain-app/package.json`
- `scripts/atlas/check-brain-model-assets.mjs` nur als Release-Gate-Kontext;
  NF-007 verändert BrainModel-Assets nicht.
