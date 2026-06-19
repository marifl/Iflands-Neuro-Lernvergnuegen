# Criteria Review

Datum: 19. Juni 2026

Evaluator-Dispatch `claude --print --model opus` wurde gestartet, lieferte
nach mehr als zwei Minuten keine Review-Ausgabe und wurde abgebrochen. Der
Zwischenstand enthielt nur `Execution error`; deshalb wurde dieses lokale
Kriterien-Audit als explizites Review-Artefakt erstellt.

## Befund

Status: PASS_WITH_NOTE

Die Kriterien sind testbar und vollständig genug für den kleinen NF-001-Slice.

1. Das gewünschte Outcome ist im Frontmatter benannt.
2. Akzeptanzkriterien prüfen die drei kritischen Legacy-Stellen:
   `CameraConfigSource`, `legacyCameraConfig` und `fallbackShot`.
3. Der Scene-Shot bleibt als aktueller Scene-Vertrag erhalten, damit vorhandene
   Scene-JSONs nicht funktionslos werden.
4. Die Checks enthalten Focused Vitest, Typecheck und ein Abschluss-`rg` gegen
   die verbotenen Legacy-/Fallback-Namen.

## Hinweis

Ein Browser-Smoke ist nur erforderlich, wenn die Umsetzung R3F-Laufzeitverhalten
über die existierenden CameraRig-Tests hinaus verändert. Wenn die Änderung auf
Resolver- und Config-Auswahl begrenzt bleibt, sind Focused Vitest und Typecheck
für diesen Contract ausreichend.
