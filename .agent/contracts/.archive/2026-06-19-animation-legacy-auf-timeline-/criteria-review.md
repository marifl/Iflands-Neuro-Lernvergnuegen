# Criteria Review — Animation-Legacy auf Timeline-Registry migrieren

Status: PASS

Die Kriterien sind binär testbar:

1. C1 prüft die registrierte Basalganglien-Timeline gegen konkrete Nicht-
   Legacy-IDs und unveränderte Ontologie-Targets.
2. C2 ist ein Such-Gate gegen `legacyAnimations`, `legacy-highlight` und
   `legacy:` in aktuellen Runtime-/Test-Dateien.
3. C3 schützt den bestehenden AuthoringScene-ClipBinding-Pfad.
4. C4 schützt das fail-loud-Verhalten für unbekannte Timeline-Bindings.
5. C5 macht die Doku-/Inventuraktualisierung überprüfbar.

Vollständigkeit: ausreichend für diese Slice. Nicht enthalten sind Timeline-
Editor, GLTF-Mixer-Runtime, ERP-Animationen und Phineas-Animation, weil diese
eigene Verträge haben und für NF-002 nicht geändert werden müssen.

Review-Modus: lokaler Criteria-Review. Der externe Evaluator wurde nicht
gestartet, weil frühere Dispatches in dieser Session wiederholt hingen; die
Kriterien sind klein, konkret und direkt über Code/Tests/Suche prüfbar.
