# Criteria Review — Phineas-Asset-Space `legacy-figs3d` kapseln

Status: PASS

Die Kriterien sind binär testbar:

1. C1 prüft Manifest und Transform-Contract gegen einen exakten neuen
   `spaceId` und verbietet den alten Legacy-Space im aktuellen Runtime-Vertrag.
2. C2 bindet die Änderung an konkrete Vitest-Dateien und verlangt einen Test,
   der den neuen Space direkt assertet.
3. C3 erzwingt regeneriertes Mesh-Identity-Inventar mit echtem Check-Modus.
4. C4 deckt Transform-Geometrie und sichtbaren Phineas-Runtime-Pfad ab.
5. C5 verhindert, dass der Legacy-Name in aktuellen App-/Doku-/Script-Pfaden
   stehen bleibt; historische Review-Artefakte sind bewusst ausgeschlossen.

Vollständigkeit: ausreichend für diese Slice. Die Kriterien schützen die
Vertragsumbenennung ohne GLB-Rebake und ohne UI-/Sequenzänderung.
