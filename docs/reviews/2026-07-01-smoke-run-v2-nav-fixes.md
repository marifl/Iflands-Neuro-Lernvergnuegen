# Browser-Smoke-Lauf — feature/v2-mockup-completion (nach PR #52 Merge)

Datum: 2026-07-01  
Dev-Server: `http://127.0.0.1:5173`  
Browser: System-Chrome via `scripts/smokeBrowser.mjs` (Playwright-Bundle nicht verfügbar)

## V2-relevant — PASS

| Suite | Ergebnis |
|-------|----------|
| smoke:responsive-layout | 6/6 PASS |
| smoke:learning-layout | 3/3 PASS |
| smoke:shell-nav | 3/3 PASS |
| smoke:erp-supplement | 2/2 PASS |
| smoke:presenter | 1/1 PASS |
| smoke:atlas-bridge | 1/1 PASS (URL-Assert: `mode=atlas` + `atlasLayer`/`atlasArea`) |

## FAIL (Umgebung / WebGL-Assets)

| Suite | Ursache |
|-------|---------|
| smoke:phineas-gage | `__manifestAssetObjects` Timeout (Headless/WebGL) |
| smoke:explorer-panel | `__manifestAssetObjects` Timeout |
| smoke:performance-gate | `__manifestAssetObjects` Timeout |

Atlas-Vollmodus im Headless-Chrome crasht mit massenhaft `Failed to fetch` (fsaverage-Mesh-Daten) — betrifft nicht die URL-Nav-Fixes; atlas-bridge prüft nur Lern→Atlas-URL.

## Unit-Tests

`pnpm test` → **514/514** grün (inkl. LearnSidebar Surface-URL-Guards)
