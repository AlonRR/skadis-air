#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Prove scripts/checks/overhang-report.py counts what it should and nothing else, on a G-code file written here whose
# answers are known: a bridge across a 10 mm square of perimeter, 6 mm of it within 3 mm of the square's sides and
# 4 mm over air; a bridge 1 mm beside a line of infill, all of it over that infill; an overhang perimeter far from
# anything, all over air; and moves that must not count: travel, a wipe that retracts, and in absolute E an
# extrusion whose E stays or falls. A second file has no overhang or bridge at all and must sum to nothing, and
# --near 0.5 must put the bridge 1 mm from the infill over air. A report that counts everything, or nothing, looks
# exactly like one that measured.
#
#   bash tests/test-overhang-report.sh
#
# Needs uv, as the report itself does.
set -u
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/known.gcode" << 'GCODE'
M83
;Z:0.2
;TYPE:Perimeter
G1 X0 Y0 F1000
G1 X10 Y0 E1
G1 X10 Y10 E1
G1 X0 Y10 E1
G1 X0 Y0 E1
;TYPE:Internal infill
G1 X30 Y0
G1 X40 Y0 E1
;Z:0.4
;TYPE:Bridge infill
G1 X0 Y5
G1 X10 Y5 E1
G1 X30 Y1
G1 X40 Y1 E1
;TYPE:Overhang perimeter
G1 X20 Y20
G1 X25 Y20 E0.5
G1 X26 Y20 E-0.8
G1 X30 Y20
;Z:0.6
M82
G92 E0
;TYPE:Bridge infill
G1 X0 Y0
G1 X2 Y0 E1
G1 X4 Y0 E1
G1 X6 Y0 E0.5
G1 X8 Y0 E2
GCODE

cat > "$tmp/none.gcode" << 'GCODE'
M83
;Z:0.2
;TYPE:External perimeter
G1 X0 Y0
G1 X10 Y0 E1
;Z:0.4
;TYPE:Solid infill
G1 X0 Y1
G1 X10 Y1 E1
GCODE

report() { uv run --no-project -q python -I "$root/scripts/checks/overhang-report.py" --json "$@"; }
report "$tmp/known.gcode" > "$tmp/known.json" || exit 1
report "$tmp/none.gcode" > "$tmp/none.json" || exit 1
report --near 0.5 "$tmp/known.gcode" > "$tmp/near.json" || exit 1

uv run --no-project -q python -I - "$tmp" << 'PY'
import json, sys
from pathlib import Path
tmp = Path(sys.argv[1])
known = json.loads((tmp / "known.json").read_text())
none = json.loads((tmp / "none.json").read_text())
near = json.loads((tmp / "near.json").read_text())
layer = {row["z"]: row for row in known["layers"]}
near_layer = {row["z"]: row for row in near["layers"]}
checks = [
    ("the bridges total 24 mm: 10 + 10 at z 0.4, 2 + 2 at z 0.6", known["totals"]["bridge_mm"], 24.0),
    ("the overhang perimeter totals 5 mm: the wipe and the travel after it do not count", known["totals"]["overhang_mm"], 5.0),
    ("z 0.4: 20 mm of bridge", layer[0.4]["bridge_mm"], 20.0),
    ("z 0.4: 6 mm of the bridge across the square lies within 3 mm of its sides", layer[0.4]["bridge_below"].get("Perimeter", 0), 6.0),
    ("z 0.4: 4 mm of the bridge across the square is over air", layer[0.4]["bridge_below"].get("air", 0), 4.0),
    ("z 0.4: the bridge beside the infill is all over it", layer[0.4]["bridge_below"].get("Internal infill", 0), 10.0),
    ("z 0.4: the overhang perimeter is all over air", layer[0.4]["overhang_below"].get("air", 0), 5.0),
    ("z 0.6: absolute E counts only the moves whose E rises", layer[0.6]["bridge_mm"], 4.0),
    ("z 0.2 has neither kind, so it is not a row", float(0.2 in layer), 0.0),
    ("a file with neither kind sums to no bridge", none["totals"]["bridge_mm"], 0.0),
    ("a file with neither kind sums to no overhang", none["totals"]["overhang_mm"], 0.0),
    ("--near 0.5: the bridge 1 mm beside the infill is over air", near_layer[0.4]["bridge_below"].get("Internal infill", 0), 0.0),
]
failed = 0
for text, got, want in checks:
    ok = abs(got - want) < 0.01
    failed += not ok
    print(f"  {'ok  ' if ok else 'FAIL'}  {text} (got {got}, wanted {want})")
print()
print(f"{len(checks) - failed} passed, {failed} failed, of {len(checks)}")
sys.exit(1 if failed else 0)
PY
