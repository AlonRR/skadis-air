#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Judge exported STLs as scad-tools' scad-check.sh judges a part after rendering it: PrusaSlicer's
# report (manifold, one part, anything it repaired as it loaded the mesh), the mesh's own edges
# (scad-tools/scripts/stl-mesh.py), and a slice with the print profile, whose G-code must have no
# skirt, no brim and no spiral vase. This project has no .scad files (D2), so it starts from the STL;
# the steps and their reasons are scad-check.sh's, steps 2 and 3.
#
#   bash scripts/checks/stl-check.sh FILE.stl [FILE.stl ...]
#
# Environment, with scad-check.sh's defaults: PSLICER, DATADIR, PRINTER, PRINT_PROFILE, FILAMENT.
# Exit status: 0 every file passed, 1 any failed. A warning (a repair, a mesh note) does not fail it.
set -u

[ $# -gt 0 ] || {
  echo "usage: stl-check.sh FILE.stl [FILE.stl ...]" >&2
  exit 2
}
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
PSLICER=${PSLICER:-/c/Program Files/Prusa3D/PrusaSlicer/prusa-slicer-console.exe}
DATADIR=${DATADIR:-${APPDATA:-}/PrusaSlicer}
PRINTER=${PRINTER:-Original Prusa i3 MK3S & MK3S+}
PRINT_PROFILE=${PRINT_PROFILE:-0.2mm QUALITY @MK3 - no skirt, no brim, no crossing perimeter}
FILAMENT=${FILAMENT:-Inslogic ASA}

[ -x "$PSLICER" ] || {
  echo "PrusaSlicer not found at $PSLICER (set PSLICER)" >&2
  exit 2
}

failed=0
checked=0
for stl in "$@"; do
  checked=$((checked + 1))
  fail=0
  echo "==> $stl"
  [ -s "$stl" ] || {
    echo "  !! missing or empty"
    failed=1
    continue
  }

  info=$("$PSLICER" --info "$stl" 2> /dev/null || true)
  printf '%s\n' "$info" | grep -E "size_|number_of_facets|number_of_parts|manifold" | sed 's/^/  /'
  printf '%s\n' "$info" | grep -q "manifold = yes" || {
    echo "  !! not manifold"
    fail=1
  }
  parts=$(printf '%s\n' "$info" | awk -F= '/number_of_parts/ {gsub(/ /,"",$2); print $2}')
  [ "${parts:-0}" = "1" ] || {
    echo "  !! the STL is ${parts:-no} parts, expected 1"
    fail=1
  }
  rep=$(printf '%s\n' "$info" | grep -E "^(degenerate_facets|edges_fixed|facets_removed|facets_added|facets_reversed|backwards_edges) =" | tr -s ' ' | paste -sd ' ' - || true)
  [ -z "$rep" ] || echo "  ~~ the slicer repaired the mesh as it loaded it: $rep"

  if mesh=$(uv run -q "$root/scad-tools/scripts/stl-mesh.py" --bodies 1 "$stl" 2>&1); then
    echo "  mesh: ${mesh##*: }"
  else
    echo "  !! mesh: ${mesh##*: }"
    fail=1
  fi

  gcode="${stl%.stl}.gcode"
  rm -f "$gcode"
  if "$PSLICER" --export-gcode --datadir "$DATADIR" --printer-profile "$PRINTER" \
    --print-profile "$PRINT_PROFILE" --material-profile "$FILAMENT" -o "$gcode" "$stl" > /dev/null 2>&1 && [ -s "$gcode" ]; then
    g() { grep -E "^; $1 = " "$gcode" | head -1 | sed 's/.*= //'; }
    echo "  slice: $(grep -E '^; estimated printing time \(normal' "$gcode" | sed 's/^; //'); $(grep -E '^; total filament used \[g' "$gcode" | sed 's/^; //')"
    [ "$(g skirts)" = "0" ] || {
      echo "  !! skirts = $(g skirts)"
      fail=1
    }
    [ "$(g brim_width)" = "0" ] || {
      echo "  !! brim_width = $(g brim_width)"
      fail=1
    }
    [ "$(g spiral_vase)" = "0" ] || {
      echo "  !! spiral_vase = $(g spiral_vase)"
      fail=1
    }
  else
    echo "  !! slicing failed"
    fail=1
  fi
  [ $fail -eq 0 ] && echo "  PASS" || {
    echo "  FAIL"
    failed=1
  }
done
echo "$checked file(s) checked; $([ $failed -eq 0 ] && echo 'all passed' || echo 'SOME FAILED')"
exit $failed
