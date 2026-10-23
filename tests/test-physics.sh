#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Prove the physics runs' controls (scripts/physics/controls.py, D323) discriminate: unchanged they all pass, and each
# fault seeded on purpose fails the control that should catch it. A control that passes everything looks exactly like
# one that found nothing wrong.
#
#   bash tests/test-physics.sh
#
# Needs uv and the library built (`npm run build -w skadis-air`): the volume control meshes a part the library writes.
set -u
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/.." && pwd)
physics="$root/scripts/physics"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

node "$physics/write-parts.mjs" --controls > "$tmp/write.txt" 2>&1 || {
  cat "$tmp/write.txt"
  exit 1
}

pass=0
fail=0
expect() { # want-exit description [--seed what]
  want=$1
  what=$2
  shift 2
  (cd "$physics" && uv run -q python controls.py "$@") > "$tmp/out.txt" 2>&1
  got=$?
  if [ "$got" = "$want" ]; then
    pass=$((pass + 1))
    printf '  ok    (exit %s) %s\n' "$got" "$what"
    grep -E '^FAIL|controls run' "$tmp/out.txt" | sed 's/^/        /'
  else
    fail=$((fail + 1))
    printf '  FAIL  (exit %s, wanted %s) %s\n' "$got" "$want" "$what"
    sed 's/^/        /' "$tmp/out.txt"
  fi
}
echo "controls.py:"
expect 0 "every control passes unchanged"
expect 1 "a stiffness assembled at the wrong modulus fails the assembly control" --seed assembly
expect 1 "a wrong exact energy fails the patch test" --seed patch
expect 1 "a bar 10 % too stiff fails the beam control" --seed modulus
expect 1 "a load 10 % too large fails the beam control" --seed load
expect 1 "conjugate gradients stopped early fail the solver control" --seed solver
expect 1 "a part's volume 2 % off fails the volume control" --seed volume
echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
