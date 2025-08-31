#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <square_png>" >&2
  exit 1
fi

SRC="$1"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/icons"
mkdir -p "$OUT_DIR"

sizes=(16 32 48 72 96 128 144 152 180 192 256 384 512)
for s in "${sizes[@]}"; do
  sips -s format png -z "$s" "$s" "$SRC" --out "$OUT_DIR/icon-$s.png" >/dev/null
done

# Maskable icon (simply duplicate 512)
cp -f "$OUT_DIR/icon-512.png" "$OUT_DIR/icon-512-maskable.png"
echo "Generated icons in $OUT_DIR"

