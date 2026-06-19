# Criteria Review — 2026-06-19-parser-default-fallbacks-kl-re

Verdict: PASS

Die Kriterien sind binär testbar:

1. C1 und C2 verlangen konkrete Storage-Keys, konkrete Loader-Pfade und Tests
   gegen korruptes JSON sowie ungültige Schema-Formen.
2. C3 verlangt einen deterministischen Minimal-Snapshot-Test gegen gesetzten
   Live-State und einen Fehlerfall mit Feldkontext.
3. C4 ist per Code-Search und bestehendem Manifest-Runtime-Test prüfbar.
4. C5 bindet die zentrale Inventur und `docs:drift` als Nachweis ein.

Keine Kriterien verwenden weiche Begriffe als Akzeptanzersatz. Der Scope ist
eng genug und vermeidet Kamera-, Animation-, Picking-, Phineas- und
Buchbild-Fallbacks.
