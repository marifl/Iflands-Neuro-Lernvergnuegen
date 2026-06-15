# Mobile Shortcut-Methodik

Stand: 15. Juni 2026

## Ziel

Desktop-Shortcuts bleiben für Tastatur- und Vortragsbetrieb sinnvoll. Auf Mobile darf aber keine wichtige Aktion ausschließlich über Tastatur, versteckte Geste oder eine nur zufällig sichtbare Baumzeile erreichbar sein. Mobile Entsprechungen müssen auffindbar, fingerfreundlich und kontextnah sein.

## Entscheidungsmatrix

1. Primäraktion als sichtbarer Button: nutzen, wenn die Aktion den aktuellen Flow startet oder beendet und ohne sie ein zentraler Zustand blockiert.
2. Kontextaktion im Footer-Flyout oder Drawer: nutzen, wenn die Aktion nur im aktuellen Modus oder bei aktueller Auswahl sinnvoll ist.
3. Geste mit sichtbarem Feedback: nur für direkte 3D-Manipulation wie Orbit, Zoom oder Drag; nicht als einzige Möglichkeit für fachliche Aktionen.
4. Long-Press: nur für sekundäre Power-Aktionen, nie für notwendige Vortragspfade.
5. Kein Mobile-Pendant: erlaubt, wenn die Aktion auf Mobile technisch nicht stabil oder fachlich nicht nötig ist.

## Shortcut-Inventar

| Desktop | Zweck | Kritikalität | Mobile-Entsprechung |
|---|---|---:|---|
| `h` | aktuelle Auswahl ausblenden oder wieder einblenden | hoch | `Werkzeug` -> `Auswahl ausblenden` / `Auswahl einblenden` |
| `Shift+H` | alle ausgeblendeten Strukturen wieder sichtbar machen | hoch | `Werkzeug` -> `Alles zeigen` |
| `i` | aktuelle Auswahl isolieren | hoch | `Werkzeug` -> `Auswahl isolieren` |
| `Shift+I` | Isolation komplett verlassen | hoch | `Werkzeug` -> `Isolation aus` |
| `Esc` | Auswahl lösen oder Isolation eine Ebene zurücknehmen | mittel | `Werkzeug` -> `Auswahl lösen` und `Isolationsebene zurück`; zusätzlich bleiben Breadcrumbs im Viewport |
| `f` | Browser-Vollbild anfordern | niedrig | kein Pflicht-Pendant; mobile Browser behandeln Vollbild je Plattform unterschiedlich |

## Pilot

Der Pilot liegt im Explorer-Modus im bestehenden `Werkzeug`-Flyout. Dadurch bleibt die Fußleiste kompakt, und die Aktionen erscheinen nur dort, wo Auswahl, Isolation und Bauminteraktion fachlich Sinn ergeben.

Geprüfter Flow:

1. Struktur auf Mobile über den Drawer suchen und auswählen.
2. `Werkzeug` öffnen.
3. Auswahl ausblenden/einblenden, Auswahl isolieren, alles zeigen und Isolation verlassen.
4. Zurück in den Canvas, ohne dass der Strukturbaum dauerhaft Fläche belegt.

## Regeln für neue Shortcuts

1. Erst Zweck, Häufigkeit und Kritikalität notieren.
2. Prüfen, ob die Aktion bereits als sichtbarer Button, Footer-Flyout, Drawer-Aktion oder Breadcrumb existiert.
3. Kritische Aktionen nie nur als Geste oder Tastatur-Shortcut belassen.
4. Mobile Labels müssen Verben enthalten und den Zustand spiegeln, zum Beispiel `Auswahl einblenden` statt nur `Einblenden`.
5. Der mobile Pilot braucht mindestens einen Unit-Test und einen Browser-Smoke auf schmalem Viewport.
