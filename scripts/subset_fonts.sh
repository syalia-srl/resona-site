#!/usr/bin/env bash
# Rebuild fonts/recursive-latin.woff2 from the official Recursive release (OFL 1.1).
# Pins casual, slant and cursive; keeps the wght (400-700) and MONO axes.
# Usage: scripts/subset_fonts.sh path/to/Recursive_VF_1.085.ttf
set -euo pipefail
src=${1:?path to Recursive_VF_*.ttf from https://github.com/arrowtype/recursive/releases}
out=$(cd "$(dirname "$0")/.." && pwd)/fonts/recursive-latin.woff2
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
uvx --from 'fonttools[woff]' fonttools varLib.instancer "$src" \
  CASL=0 slnt=0 CRSV=0.5 wght=400:700 MONO=0:1 -o "$tmp/inst.ttf"
uvx --from 'fonttools[woff]' pyftsubset "$tmp/inst.ttf" \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2190-2193,U+2212' \
  --layout-features='kern,liga,calt,tnum,case' --flavor=woff2 --output-file="$out"
echo "$(stat -c %s "$out") bytes -> $out"
