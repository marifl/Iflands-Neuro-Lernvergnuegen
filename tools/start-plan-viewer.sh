#!/usr/bin/env bash
# Startet den LOKAL gehosteten agent-native Plan-Renderer (echter Renderer, kein Cloud,
# kein npx) und zeigt ihn auf die Plaene des aktuellen Projekts (docs/visual/<slug>/plan.mdx).
#
# Einmaliges Setup (schon erledigt):
#   git clone https://github.com/BuilderIO/agent-native ~/prj/agent-native
#   cd ~/prj/agent-native && corepack enable && pnpm install
#   pnpm run postinstall                       # Core-Packages bauen
#   (better-sqlite3 nativ kompilieren, falls noetig: node-gyp rebuild im Paketordner)
#
# Nutzung:
#   tools/start-plan-viewer.sh                 # rendert ./docs/visual
#   tools/start-plan-viewer.sh /pfad/zu/plans  # anderer Plan-Ordner
#   ANATIVE_DIR=/anderer/clone tools/start-plan-viewer.sh
#
# Danach: http://localhost:8080/  (Plan-Liste) bzw. /local-plans/<slug>
set -euo pipefail

ANATIVE="${ANATIVE_DIR:-$HOME/prj/agent-native}"
PLAN_DIR="${1:-$(pwd)/docs/visual}"

if [ ! -f "$ANATIVE/packages/core/bin/agent-native.js" ]; then
  echo "agent-native nicht gefunden unter: $ANATIVE" >&2
  echo "Setup siehe Kommentar oben in dieser Datei." >&2
  exit 1
fi
if [ ! -d "$PLAN_DIR" ]; then
  echo "Plan-Ordner fehlt: $PLAN_DIR" >&2
  exit 1
fi

echo "Plan-Renderer: http://localhost:8080/   (Plaene aus: $PLAN_DIR)"
echo ""
echo "Deine Plaene (direkt oeffnen — die Home-Sidebar listet nur DB-Plaene):"
found=0
for d in "$PLAN_DIR"/*/plan.mdx; do
  [ -f "$d" ] || continue
  slug="$(basename "$(dirname "$d")")"
  echo "  http://localhost:8080/local-plans/$slug"
  found=1
done
[ "$found" = 1 ] || echo "  (keine plan.mdx in $PLAN_DIR gefunden)"
echo ""
cd "$ANATIVE/templates/plan"
exec env AGENT_NATIVE_MODE=local-files PLAN_LOCAL_DIR="$PLAN_DIR" \
  node "$ANATIVE/packages/core/bin/agent-native.js" dev --open
