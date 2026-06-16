# Studentenmodus: Fortschritt und Lernchecks

Stand: 2026-06-16

## Ziel

Der Lernmodus bleibt derselbe Kapitel-11-Pfad, aber die Nutzung teilt sich in
zwei Rollen:

1. **Dozenten-Companion:** reproduzierbare Szenen, Vortragsschritte,
   Snapshots, Präsentationssequenz und Visual-Abnahme.
2. **Studentischer Selbstlernmodus:** dieselben Szenen, aber mit sichtbarem
   Fortschritt, Wiederholung und kleinen Lernchecks pro Schritt.

Der erste Slice baut keine Account-, Cloud- oder Analytics-Plattform. Er
definiert den Progress-Vertrag und speichert ihn im vorhandenen
Unterrichts-Snapshot.

## Erster technischer Slice

Der Codevertrag liegt in `apps/brain-app/src/viewer/studentProgress.ts`.

1. `StudentProgressState` ist versioniert und auf `sequenceKind: "learning"`
   begrenzt.
2. Jeder Schritt referenziert `configName`, `sceneId`, `title` und optional
   `figure`.
3. Statuswerte bleiben klein: `not-started`, `seen`, `checked`.
4. Lernchecks speichern `checkId`, Ergebnis, Versuchszahl und Zeitstempel.
5. Export und Import laufen über `ViewerStateSnapshot.state.studentProgress`.

Damit hängt Fortschritt am vorhandenen Snapshot-/Scene-State-Vertrag statt an
einem zweiten lokalen Speicherpfad.

## Persistenzentscheidung

Für den Standalone-Build ist **Snapshot-Persistenz der kanonische erste Pfad**.

1. **Kein stilles `localStorage` für Lernfortschritt:** Der Atlas-Config-Store
   nutzt `localStorage` für UI-Overrides; studentischer Fortschritt wäre aber
   fachlicher Lernstand und darf nicht unsichtbar an einen Browser gebunden
   werden.
2. **Kein Cloud-Pfad in diesem Slice:** Es gibt im Standalone-Repo kein Auth-,
   Kurs- oder User-Modell. Ein Cloud-Sync braucht später ein klares
   Nutzer-/Kurskonzept.
3. **Snapshot als Brücke:** Exportierte Unterrichts-Snapshots können Progress
   mitnehmen. Das ist prüfbar, versioniert und passt zur bestehenden
   Dozenten-/Studenten-Übergabe.

## Lerncheck-Priorisierung

Der erste UI-Slice sollte nicht alle Szenen abdecken, sondern mit den bereits
starken DLPFC/VLPFC-Steps starten:

1. `wcst-frontoparietal`: Regelwechsel und Perseveration.
2. `fluency-foci`: Abrufstrategie und frontale Kontrollanteile.
3. `tower-of-london-dlpfc`: Planungstiefe und Aufgabenschwierigkeit.
4. `tower-of-london-schweregrad`: DLPFC-Aktivierung als
   Schwierigkeitssignal.

Jeder Check soll eine konkrete fachliche Entscheidung prüfen, nicht nur
Bestätigungsklicks sammeln.

## Nicht-Ziele

1. Keine Prüfungssimulation mit Notenlogik.
2. Kein Nutzerkonto und keine Cloud-Synchronisierung.
3. Kein paralleler Szenenrouter nur für Studenten.
4. Kein automatisches Tracking ohne expliziten Export/Import.

## Nächste umsetzbare UI-Schritte

1. In `LearnSidebar` einen kompakten Progress-Indikator für
   `StudentProgressState` anzeigen.
2. Pro Szene genau einen Lerncheck-Block als Overlay-Abschnitt erlauben.
3. `markStudentStepSeen` beim stabilen Szenenwechsel auslösen.
4. `recordStudentCheck` an konkrete Check-Antworten binden.
5. Browser-Smoke: Snapshot mit Progress importieren, Szene wechseln, Check
   beantworten, exportieren und Progress im JSON prüfen.
