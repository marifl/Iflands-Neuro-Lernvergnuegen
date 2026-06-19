#!/usr/bin/env bash
# Einmal-Setup fuer den LOKAL gehosteten agent-native Plan-Renderer (echter Renderer, kein Cloud).
# Idempotent: ueberspringt, was schon vorhanden ist. Danach: tools/start-plan-viewer.sh
set -euo pipefail

ANATIVE="${ANATIVE_DIR:-$HOME/prj/agent-native}"
REPO="https://github.com/BuilderIO/agent-native.git"

echo "[1/4] Klon …"
if [ ! -d "$ANATIVE/.git" ]; then
  git clone --depth 1 "$REPO" "$ANATIVE"
else
  echo "      vorhanden: $ANATIVE"
fi

cd "$ANATIVE"
echo "[2/4] pnpm install (corepack-pinned) …"
corepack enable >/dev/null 2>&1 || true
pnpm install

echo "[3/4] Core-Packages bauen …"
if [ ! -f "packages/core/dist/cli/index.js" ]; then
  pnpm run postinstall
else
  echo "      bereits gebaut"
fi

echo "[4/4] better-sqlite3 native binding …"
BSQ="$(ls -d node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 2>/dev/null | head -1 || true)"
if [ -n "$BSQ" ] && [ ! -f "$BSQ/build/Release/better_sqlite3.node" ]; then
  ( cd "$BSQ" && npx -y node-gyp@11 rebuild --release )
else
  echo "      ok"
fi

echo ""
echo "Fertig. Renderer starten mit: tools/start-plan-viewer.sh"
