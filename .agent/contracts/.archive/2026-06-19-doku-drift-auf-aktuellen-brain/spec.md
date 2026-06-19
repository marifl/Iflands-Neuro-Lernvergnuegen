# Spec — Doku-Drift auf aktuellen brain-app Architekturvertrag migrieren

> Contract-ID: `2026-06-19-doku-drift-auf-aktuellen-brain`
> Revision: v1 (2026-06-19)
> Status: planning -> active nach plan-done

---

## Frame

```yaml
problem: |
  Aktuelle Arbeitsdokumente beschreiben teils noch alte Companion-, T6-,
  Editor- oder Vier-Modi-Verträge und können dadurch neue Agents auf
  falsche Architekturpfade schicken.
why_now: |
  Die V2-Readiness ist durch NF-008 blockiert. Ohne bereinigte Doku und
  mechanisches Drift-Gate bleibt jede weitere V2-Migration anfällig für
  alte Handoff- oder Prototype-Begriffe.
symptom_vs_problem: |
  Symptom = widersprüchliche Formulierungen in PRODUCT, README, DESIGN und
  CLAUDE. Eigentliches Problem = es gibt keinen maschinell prüfbaren
  aktuellen Doku-Vertrag mit klarer Abgrenzung zu historischen Protokollen.
smallest_change: |
  Nur die aktuelle Arbeitsdoku und ein kleines Check-Skript anpassen:
  Runtime-Vertrag vereinheitlichen, historische Begriffe entfernen oder
  markieren, Drift-Begriffe künftig mechanisch blockieren.
tradeoffs: |
  Keine Runtime-Änderung: Der Code ist hier Evidenzquelle, nicht Ziel.
  Keine historischen Reviews umschreiben: Verlauf bleibt nachvollziehbar.
```

---

## 1. Motivation und Problem

Der aktuelle Code behandelt `learn`, `explore` und `phineas` als reguläre
Start- und Footer-Modi. `atlas` ist weiterhin technisch vorhanden, aber als
internes oder deep-linkbares Supplement dokumentiert und wird nicht im normalen
Modus-Flyout angeboten.

Mehrere aktuelle Markdown-Dateien enthalten noch frühere Produktbegriffe:
`T6`, `Companion`, `/deck`, `/editor`, `src/features/**`, "Drei Grundmodi"
oder "vier Modus-Karten". Diese Begriffe dürfen nicht mehr als aktuelle
Arbeitsanweisung erscheinen.

## 2. Scope

### In-Scope

- Root-Produkt- und Design-Doku auf den aktuellen Runtime-Vertrag bringen.
- App-lokale Produkt-/Design-/README-Doku bereinigen oder auf die zentrale
  Doku verweisen.
- `CLAUDE.md` als Agent-Einstieg auf den gleichen Modus- und Atlas-Vertrag
  bringen.
- `docs/ARCHITECTURE.md` punktuell nachziehen und eine Doku-Topologie
  ergänzen.
- NF-008 in `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md` aktualisieren.
- Ein mechanisches Doku-Drift-Skript ergänzen und in `apps/brain-app/package.json`
  als Script erreichbar machen.

### Out-of-Scope

- Runtime-, UI- oder Viewer-Verhalten ändern.
- Historische Reviews, END_SESSION-Dateien oder Handoff-Artefakte umschreiben.
- V2-Design-Code umsetzen.
- Offene NF-Klassen außer NF-008 schließen.

## 3. Architektur

Die Doku-Topologie nach dieser Änderung:

1. `PRODUCT.md`: Produktzweck und aktueller Modus-/Surface-Vertrag.
2. `DESIGN.md`: visuelle Leitplanken und responsive Shell-Grundsätze.
3. `CLAUDE.md`: Agent-Einstieg, Arbeitsregeln und präzise Architekturanker.
4. `docs/ARCHITECTURE.md`: Runtime-, State-, Config-, Snapshot- und
   Authoring-Vertrag.
5. `apps/brain-app/DESIGN.md`: app-lokaler Umsetzungsvertrag und Verweis auf
   zentrale Doku.
6. `docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md`: Areal-/Färbungs-Arbeitsvertrag.
7. `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`: Restklassen und Gate-Status.

Das Drift-Skript prüft nur aktuelle Arbeitsdoku. Historische Protokolle und
ausdrücklich erlaubte technische Pfade werden nicht als Fehler gewertet.

## 4. Test-Strategie

1. Doku-Drift-Skript muss aktuelle Arbeitsdoku gegen blockierte Altbegriffe
   prüfen.
2. Abschluss-`rg` gegen die zentralen Begriffe muss nur erlaubte Treffer zeigen.
3. App-nahe Tests sichern, dass der dokumentierte Modusvertrag zum Code passt:
   `appModeDefinitions`, `settingsRuntime`, `atlasConfig`.
4. `pnpm --dir apps/brain-app typecheck` bleibt grün.

## 5. Pflichtlektüre

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/rules/alrah.md`
- `docs/ARCHITECTURE.md`
- `apps/brain-app/DESIGN.md`
- `scripts/atlas/README.md`
- `docs/VORTRAGS_GRAFIK_AREAL_MATRIX.md`
- `docs/NO_FALLBACK_ARCHITECTURE_INVENTORY.md`
- Dart-Task `n0RsZZ5gXo5X`
