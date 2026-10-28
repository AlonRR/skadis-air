#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Prove scripts/checks/stl-check.sh discriminates: a closed cube must pass it, and the same cube
# with one face missing, or with a facet whose corners are two of one point, must fail it. Two
# cubes apart are two parts: they fail unless a <name>.parts file beside the STL says 2, and fail
# again when it says another count (D69, C107). A check that passes everything looks exactly like
# one that found nothing wrong.
#
#   bash tests/test-stl-check.sh
#
# Needs PrusaSlicer (PSLICER) and uv, as the check itself does.
set -u
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Three binary STLs from a 10 mm cube's 12 triangles, written with Python's standard library only.
# Each facet gets its real normal: PrusaSlicer refuses to load a binary STL whose normals are all
# zero ("Loading of a model file failed"), which made the closed cube fail here at first (12 Oct 2026).
uv run --no-project -q python - "$tmp" << 'PY'
import struct, sys
from pathlib import Path
out = Path(sys.argv[1])
v = [(0,0,0),(10,0,0),(10,10,0),(0,10,0),(0,0,10),(10,0,10),(10,10,10),(0,10,10)]
faces = [(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)]
def normal(a, b, c):
    u = [b[i] - a[i] for i in range(3)]
    w = [c[i] - a[i] for i in range(3)]
    n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    length = sum(x * x for x in n) ** 0.5 or 1
    return [x / length for x in n]
def write(name, tris):
    data = bytearray(b"test cube".ljust(80, b" ")) + struct.pack("<I", len(tris))
    for a, b, c in tris:
        data += struct.pack("<3f", *normal(a, b, c))
        for p in (a, b, c):
            data += struct.pack("<3f", *p)
        data += b"\0\0"
    (out / name).write_bytes(data)
write("closed.stl", [tuple(v[i] for i in f) for f in faces])
write("open.stl", [tuple(v[i] for i in f) for f in faces[:-2]])          # the left face missing
write("degenerate.stl", [tuple(v[i] for i in f) for f in faces] + [(v[0], v[1], v[1])])
apart = [tuple((p[0] + 20, p[1], p[2]) for p in t) for t in [tuple(v[i] for i in f) for f in faces]]
for name in ("two.stl", "two-declared.stl", "two-miscounted.stl"):
    write(name, [tuple(v[i] for i in f) for f in faces] + apart)
(out / "two-declared.parts").write_text("2")
far = [tuple((p[0] + 190, p[1], p[2]) for p in t) for t in [tuple(v[i] for i in f) for f in faces]]
write("two-far.stl", [tuple(v[i] for i in f) for f in faces] + far)  # 200 mm across, a 250 mm bed's edges
(out / "two-far.parts").write_text("2")
(out / "two-miscounted.parts").write_text("3")
PY

pass=0
fail=0
expect() { # want-exit file description
  bash "$root/scripts/checks/stl-check.sh" "$tmp/$2" > "$tmp/out.txt" 2>&1
  got=$?
  if [ "$got" = "$1" ]; then
    pass=$((pass + 1))
    printf '  ok    (exit %s) %s\n' "$got" "$3"
  else
    fail=$((fail + 1))
    printf '  FAIL  (exit %s, wanted %s) %s\n' "$got" "$1" "$3"
    sed 's/^/        /' "$tmp/out.txt"
  fi
}
echo "stl-check.sh:"
expect 0 closed.stl "a closed cube passes"
expect 1 open.stl "a cube with a face missing fails"
expect 1 degenerate.stl "a cube with a facet whose corners are two of one point fails"
expect 1 two.stl "two cubes apart, with nothing to say so, fail as two parts"
expect 0 two-declared.stl "two cubes apart pass when two-declared.parts says 2"
expect 1 two-miscounted.stl "two cubes apart fail when two-miscounted.parts says 3"
# The parts of a plate are arranged together round the bed's middle, as the slicer's arrange does, not left where the
# STL put them: a plate's parts near the bed's edges print worse (the owner, 28 Oct 2026). Measured on what is printed,
# the first layer change on, so the purge line in front of the bed does not count.
bash "$root/scripts/checks/stl-check.sh" "$tmp/two-far.stl" > "$tmp/out.txt" 2>&1
span=$(awk '/^;LAYER_CHANGE/ {on = 1} on && /^G1/ && / E[0-9.]/ {
    for (i = 1; i <= NF; i++) if ($i ~ /^X/) { x = substr($i, 2) + 0; if (n == 0 || x < lo) lo = x; if (n == 0 || x > hi) hi = x; n++ }
  } END { printf "%.0f", hi - lo }' "$tmp/two-far.gcode" 2> /dev/null)
if [ -n "$span" ] && [ "$span" -lt 60 ]; then
  pass=$((pass + 1))
  printf '  ok    two cubes 200 mm apart are printed together, %s mm across
' "$span"
else
  fail=$((fail + 1))
  printf '  FAIL  two cubes 200 mm apart are printed %s mm across, not arranged together
' "${span:-?}"
  sed 's/^/        /' "$tmp/out.txt"
fi
echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
