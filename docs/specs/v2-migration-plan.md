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
- Aktiver Schritt: 1 (ModeLauncher entfernen)
- Letzter Commit: a9548d3e (Slice 1 — ResumeLauncher)
- Backup-Tag: pre-v2-shell-skeleton
- Letzte Update: 2026-06-29

## Fortschritt
- [x] Slice 0 — Unified Shell Skeleton (ResumeLauncher als Resume-Einstieg) · commit a9548d3e
- [ ] Schritt 1 — ModeLauncher entfernen (ResumeLauncher einziger Einstieg)
- [ ] Schritt 2 — FooterBar „Modus"-Box → Surface-Modell (Lernen = Shell, Explorer/Atlas als Surface)
- [ ] Schritt 3 — Strukturfokus statt Explorer-Default (lernnaher Default-Umfang)
- [ ] Schritt 4 — Atlas-Supplement (aus Kontext geöffnet, kein Peer)
- [ ] Schritt 5 — Fall/Phineas-Surface (Case als Dateninstanz im Lernraum)
- [ ] Schritt 6 — No-Fallback-Restklassen schließen (Blocker ZwvSdKghcAmK)
- [ ] Schritt 7 — Pre-existing Smoke-Failures grün (phineas inline-tree, learn-viewport-legends)
- [ ] Schritt 8 — Readiness-Gate auf PASS heben (Doku-Drift + Architektur-Readiness)

## Notizen
- `appMode: 'learn'|'explore'|'atlas'` ist Store-Kern (15 Dateien). Migration heißt: `explore`/`atlas`
  von Peer-Modi zu Surfaces im `learn`-Shell umdeuten, ohne den Store-Vertrag still zu brechen.
- Canvas-HUD (drei `<Html>`, sehr hoher z-index) blutet über Vollflächen-Overlays — bei Schritt 1/2 mitlösen.
