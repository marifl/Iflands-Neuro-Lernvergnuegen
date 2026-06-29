# Subagent-Zwischenbenchmark — Glossar-Coverage

Generated: 2026-06-28

## Zweck

Der Contract weist aktuell 5575 offene Begriffe aus
(`book-crosswalk-recomputed.md`, Total open = 5575). Dieses Benchmark prüft,
wie niedrig die Subagent-Modelle für die Massen-Triage gehen dürfen, ohne
Quellenanker, Slugs oder Duplicate-/Verweis-Entscheidungen zu beschädigen.

## Testdesign

Alle Subagents bekamen exakt denselben Read-only-Prompt mit denselben 12
Begriffsdefinitionen aus lokalen Rohquellen. Erwartet war ausschließlich
valides JSON mit `create_new`, `update_existing` oder `skip_noise`.

Getestete Modelle und Thinking-Stufen:

| Modell | Thinking-Stufen |
|---|---|
| `gpt-5.5` | low, medium, high, xhigh |
| `gpt-5.4-mini` | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | low, medium, high, xhigh |
| `gpt-5.4-nano` | nicht verfügbar im Subagent-Tooling |

Das Subagent-Tooling exponierte für diese Session nur `low`, `medium`,
`high` und `xhigh`. `max`/`ultra` waren nicht als `spawn_agent`-Reasoning
verfügbar und wurden deshalb nicht als Subagent-Benchmark gefahren.

Nebenbefund: Die praktische Concurrency-Grenze lag bei 4 parallelen Agents;
weitere parallele Starts schlugen mit `agent thread limit reached` fehl.

## Benchmark-Begriffe

| Begriff | Erwartete Entscheidung | Ziel |
|---|---|---|
| Anabolismus | `create_new` | `anabolismus` |
| Anion | `create_new` | `anion` |
| Anterior | `update_existing` | `neuroanatomie` |
| Augendominanzverschiebung | `update_existing` | `augendominanzsaeulen` |
| Calcium-Calmodulin-abhängige Proteinkinase | `create_new` | `calcium-calmodulin-abhaengige-proteinkinase` |
| Cannon-Bard-Theorie | `create_new` | `cannon-bard-theorie` |
| Channelrhodopsin-2 | `create_new` | `channelrhodopsin-2` |
| Chiasma opticum | `create_new` | `chiasma-opticum` |
| Doppelgängererlebnis | `skip_noise` | `heautoskopie` |
| Filehne-Illusion | `create_new` | `filehne-illusion` |
| Fitts’ Gesetz | `create_new` | `fitts-gesetz` |
| Gain-Modulation/Gain Field | `update_existing` | `gain-modulation` |

Kritische Fallen im Datensatz:

1. `Doppelgängererlebnis` ist nur ein Verweis auf Heautoskopie und darf keine
   neue Seite erzwingen.
2. `Anterior` ist ein allgemeiner Lagebegriff und gehört in eine bestehende
   Neuroanatomie-Seite, nicht als neue isolierte Seite.
3. `Gain-Modulation/Gain Field` muss auf die bestehende Alias-Seite.
4. Slugs dürfen keine `.md`-Suffixe und keine Umlaute enthalten.

## Ergebnis

| Modell | Thinking | JSON | Items | Action-Fehler | Slug-Fehler | Befund | Empfehlung |
|---|---:|---:|---:|---:|---:|---|---|
| `gpt-5.5` | low | ok | 12/12 | 0 | 0 | stabile Actions, saubere Slugs, korrekter Verweisfall | Writer-Unterkante |
| `gpt-5.5` | medium | ok | 12/12 | 0 | 0 | wie low, etwas bessere Verweis-Caveats | Reviewer/Writer, wenn Budget egal |
| `gpt-5.5` | high | ok | 12/12 | 0 | 0 | kein relevanter Mehrwert gegenüber low/medium | nicht nötig für diese Slice |
| `gpt-5.5` | xhigh | ok | 12/12 | 0 | 0 | kein relevanter Mehrwert gegenüber low/medium | nicht nötig für diese Slice |
| `gpt-5.4-mini` | low | ok | 12/12 | 2 | 12 | `.md`-Slugs, `Anterior` neu, Verweisfall neu | nicht einsetzen |
| `gpt-5.4-mini` | medium | ok | 12/12 | 2 | 0 | Slugs sauber, aber `Anterior` und Verweisfall falsch | nur Kandidatenlieferant |
| `gpt-5.4-mini` | high | ok | 12/12 | 2 | 0 | `Anterior` besser, aber `Chiasma` zu breit und Verweisfall falsch | nur mit Gate |
| `gpt-5.4-mini` | xhigh | ok | 12/12 | 1 | 0 | Verweisfall korrekt, aber `Chiasma` zu breit geroutet | bester Mini, nicht writer-sicher |
| `gpt-5.3-codex-spark` | low | ok | 12/12 | 2 | 12 | `.md`-Slugs, `Anterior` neu, Verweisfall neu | nicht einsetzen |
| `gpt-5.3-codex-spark` | medium | ok | 12/12 | 2 | 0 | Slugs sauber, aber `Anterior` und Verweisfall falsch | nur sehr grobe Triage |
| `gpt-5.3-codex-spark` | high | ok | 12/12 | 2 | 12 | `.md`-Slugs, Umlaute in Slugs, Verweisfall falsch | nicht einsetzen |
| `gpt-5.3-codex-spark` | xhigh | ok | 12/12 | 1 | 1 | Verweisfall brauchbar, aber `Anterior` neu und Umlaut-Slug | nicht writer-sicher |

## Interpretation

`gpt-5.5 low` ist die niedrigste getestete Stufe, die im Benchmark ohne
Action-, Anchor- oder Slug-Fehler durchläuft. Für diese konkrete Glossar-Slice
brachten `medium`, `high` und `xhigh` keinen messbaren Qualitätsgewinn, solange
der Prompt strikte JSON- und Routing-Regeln enthält.

`gpt-5.4-mini` und `gpt-5.3-codex-spark` liefern brauchbare Rohvorschläge,
aber nicht zuverlässig genug für direkte Wiki-Schreibarbeit. Die Fehler sind
nicht kosmetisch: Sie erzeugen neue Seiten für Verweisbegriffe, routen
allgemeine Begriffe als isolierte Seiten oder beschädigen Slug-Konventionen.

## Empfohlene Pipeline

1. **Chunking:** 24 bis 40 Begriffe pro Writer-Run, sortiert nach Quelle und
   lokalem Zeilenfenster.
2. **Writer:** `gpt-5.5` mit `low` Thinking.
3. **Parallelität:** maximal 4 Subagents gleichzeitig, passend zur beobachteten
   Tool-Grenze.
4. **Output:** nur JSON-Patchplan, nicht direkt Markdown-Dateien schreiben.
5. **Deterministisches Gate:** Hauptagent oder Skript prüft JSON-Schema,
   `target_slug` ohne `.md`/Umlaute, Anchor-Existenz, `total = accepted +
   rejected + needs_review`.
6. **Review:** Ein stärkerer Reviewer (`gpt-5.5 medium` oder bestehender
   ALRAH-Review) prüft nur die accepted/needs_review-Kandidaten, nicht alle
   Rohbegriffe erneut.

## Einsatzgrenzen

| Aufgabe | Niedrigste sinnvolle Stufe |
|---|---|
| direkte Writer-Ausgabe für Wiki-Patches | `gpt-5.5 low` |
| JSON-Kandidaten ohne Schreibrecht | `gpt-5.4-mini medium` |
| reine Noise-/Duplikat-Vorsortierung | `gpt-5.3-codex-spark medium` |
| finale fachliche Freigabe | nicht unter `gpt-5.5 medium` |

## Offene Punkte

1. Kein Dart-Task wurde eindeutig für diesen aktuellen Glossar-Contract
   gefunden; der Benchmark liegt deshalb nur als ALRAH-Contract-Artefakt vor.
2. `gpt-5.4-nano` war im Subagent-Tooling nicht verfügbar und bleibt ungetestet.
3. Das Benchmark testet Begriffs-Triage, nicht vollständige Seitenerzeugung mit
   Frontmatter, Wikilinks, Index-Update und `knowledge/log.md`.
