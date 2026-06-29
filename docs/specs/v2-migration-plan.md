# V2 Unified-Shell-Migration — Implementierungsplan

## Arbeitsweise (Pflicht — bei jeder Session lesen)
- Single Source of Truth für Fortschritt (parallel zu Claude-Tasks).
- Jeder Schritt ein verifizierter Commit: typecheck 0, test grün, build 0, Smoke/Screenshot wo UI.
- Sequenziell an geteilten Kerndateien (`BodyParts3DViewer.tsx`, `viewerStore.ts`, `FooterBar.tsx`) — keine file-disjunkten Parallel-Subagents (kollidieren auf der Shell).
- Kein stiller Fallback (CLAUDE.md-Regel #1): sichtbarer Loading/Error/Empty-State, lauter Fehler statt Notlösung.
- Branch-Anker: `feature/v2-unified-shell-skeleton`. Backup-Tag: `pre-v2-shell-skeleton`.

## Quelle der Form
`docs/specs/unified-learning-mode-shape.md` (Screen-Vertrag + Navigationsmodell) ist bindend.
Lernen = primärer Flow; Explorer/Atlas/Fall/Wiki/Chat = Surfaces, keine Peer-Modi.

## Status-Header
- Aktiver Schritt: 4 (Atlas-Supplement) / 7 (Smoke grün) — Rail/Dock-Nav ist die größte verbleibende V2-Sicht
- Letzter Commit: (folgt — Schritt 2/3 + 6-Beleg)
- Backup-Tag: pre-v2-shell-skeleton
- Letzte Update: 2026-06-29

## Schlüsselbefund (29.06.)
Die Runtime erfüllt das **AppFrame-Modell** für learn+explore bereits weitgehend:
3D-Bühne (Canvas) persistiert, Surface rendert im Panel, `responsiveShellMode`
deckt desktop-split/landscape-rail/portrait-drawer ab. Nur `isAtlas` ersetzt die
Bühne. Die V2-Migration ist also **Framing/Nav + Atlas-Supplement**, kein Rebuild.
**No-Fallback-Blocker `ZwvSdKghcAmK` ist geschlossen** (NF-013 Abschlussinventur
26.06.; Abschluss-rg am 29.06. gegen aktuellen Baum sauber — nur erlaubte Kategorien).

## Fortschritt
- [x] Slice 0 — Unified Shell Skeleton (ResumeLauncher als Resume-Einstieg) · commit a9548d3e
- [x] Schritt 1 — ModeLauncher entfernen (ResumeLauncher einziger Einstieg) · commit bcd9ea57
- [x] Schritt 2 — FooterBar „Modus"→„Lernraum": Lernen=Home + Rückweg zum Lernschritt
- [x] Schritt 3 — Explorer→„Strukturfokus" (Label + lernnahe Beschreibung)
- [ ] Schritt 4 — Atlas-Supplement (aus Kontext geöffnet, kein Peer) — `isAtlas` ersetzt noch die Bühne
- [ ] Schritt 5 — Fall/Phineas-Surface (Case als Dateninstanz im Lernraum)
- [x] Schritt 6 — No-Fallback-Restklassen geschlossen (verifiziert: Abschluss-rg sauber, NF-013)
- [ ] Schritt 7 — Pre-existing Smoke-Failures grün (phineas inline-tree, learn-viewport-legends-Route stale)
- [ ] Schritt 8 — Rail/Dock-Nav (HfDyMF0aT88a) — größter verbleibender AppFrame-Schnitt
- [ ] Schritt 9 — Readiness-Gate-Verdict aktualisieren (No-Fallback-Blocker belegt geschlossen)

## Notizen
- `appMode: 'learn'|'explore'|'atlas'` ist Store-Kern (15 Dateien). Migration heißt: `explore`/`atlas`
  von Peer-Modi zu Surfaces im `learn`-Shell umdeuten, ohne den Store-Vertrag still zu brechen.
- Canvas-HUD (drei `<Html>`, sehr hoher z-index) blutet über Vollflächen-Overlays — bei Schritt 1/2 mitlösen.
