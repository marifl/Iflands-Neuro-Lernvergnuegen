#!/usr/bin/env bash
# BodyParts3D-Pipeline: 181 OBJ -> ein benanntes, Draco-komprimiertes GLB + Register.
# Reproduzierbar: einmal ausfuehren ersetzt public/assets/bodyparts3d/brain.glb.
#
# Voraussetzungen: apps/brain-app/.venv (trimesh, numpy), gltf-transform (node global).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$HERE/../../../apps/brain-app"
OUT="$APP/public/assets/bodyparts3d"
SRC="${1:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/Downloads/20260611111252}"

echo ">> Konvertiere OBJ -> Roh-GLB + Register"
"$APP/.venv/bin/python" "$HERE/convert.py" --src "$SRC" --out "$OUT"

echo ">> Draco-Kompression (native: Topologie 1:1, Position 16-bit ~verlustfrei)"
# Draco aendert die Topologie NICHT (gleiche Vertex-/Face-Zahl) — es quantisiert nur die
# Koordinaten-Praezision. 16-bit Position ueber ~180mm Bounds = <0.003mm, anatomisch
# und visuell verlustfrei. Normalen 12-bit. Kein Smoothing/Welding.
gltf-transform draco "$OUT/brain.raw.glb" "$OUT/brain.glb" \
  --quantize-position 16 --quantize-normal 12

echo ">> Raeume Roh-Intermediat"
rm -f "$OUT/brain.raw.glb"

echo ">> Kontext-Schaedel (Phineas-Gage) + voller Kopf-Kontext (Vollausbau) -> deckungsgleiche GLBs"
CTX="$APP/public/assets/context"
"$APP/.venv/bin/python" "$HERE/convert_context.py"
for layer in skull head; do
  gltf-transform draco "$CTX/$layer.raw.glb" "$CTX/$layer.glb" \
    --quantize-position 16 --quantize-normal 12
  rm -f "$CTX/$layer.raw.glb"
done

echo ">> Fertig: $OUT/brain.glb + $CTX/skull.glb + $CTX/head.glb"
