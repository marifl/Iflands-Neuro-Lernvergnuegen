# EEG/ERP-3D-Modell

Stand: 15. Juni 2026

## Zweck

Das EEG-Headset ist ein didaktisches 3D-Schema für die ERP-Lernszenen. Es soll die Beziehung zwischen Kurve, Ableitort und intrakortikaler Quelle sichtbar machen. Es ist keine Messgeometrie und keine diagnostische Elektrodenrekonstruktion.

## Elektrodenannahmen

Die Darstellung orientiert sich am 10-20-System mit wenigen Mittellinien- und Referenzelektroden:

1. `Cz`: zentraler Vertex. In den vorhandenen Szenen ist das der relevante Ableitort für P3a und P3z.
2. `Pz`: parietale Mittellinie. In den vorhandenen Szenen ist das der relevante Ableitort für P3b.
3. `Fz`, `Fpz`, `Oz`, `F3`, `F4`, `C3`, `C4`, `P3`, `P4`: Referenzpunkte, damit die Kappe als EEG-System lesbar wird.

Die Koordinaten liegen in Viewer-Raumkoordinaten und sind bewusst schematisch auf dem Kopf platziert. Ziel ist räumliche Plausibilität und Vortragslesbarkeit, nicht anatomische Einmessung.

## Szenenbindung

1. ERP-Szenen lesen `overlay.data.site`.
2. `Cz` wird für P3a/P3z aktiv hervorgehoben.
3. `Pz` wird für P3b aktiv hervorgehoben.
4. Der aktive Elektrodenpunkt nutzt denselben `erpPulse` wie Kurvencursor und 3D-Quellenhighlight.

## Performance

Das Headset besteht aus wenigen Kugeln und Zylindern ohne externe Assets. Es mountet nur im Lernen-Modus und nur bei ERP-Szenen.
