#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Hold scripts/release/latest-release.sh, which picks the release the Pages workflow builds (A291, C292),
# to its rules, in a throwaway repository with tags of every kind:
#   1. the highest tag vX.Y.Z wins, compared as versions: v0.10.0 is above v0.9.0;
#   2. a pre-release or any other suffix is never a stable release: v0.11.0-rc.1 is passed over;
#   3. a release must be on the branch: the highest tag off it is refused, not stepped past;
#   4. no release at all is refused;
#   5. it prints tag= and sha=, the commit's full hash, the form GITHUB_OUTPUT takes.
#
#   bash tests/test-latest-release.sh
#
# The controls: the same cases run against copies of the script, each with one rule broken, and each copy
# must fail a case. A check that cannot fail is not a check.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$HERE/scripts/release/latest-release.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

repo="$tmp/repo"
# --template= leaves out the hooks a machine copies into each new repository: these commits are made up
git init -q --template= -b main "$repo"
g() { git -C "$repo" -c user.name=test -c user.email=test@example.com -c commit.gpgsign=false -c tag.gpgsign=false "$@"; }
commit() { g commit -q --allow-empty -m "$1"; }
commit one
g tag v0.1.0
commit two
g tag v0.2.1
g tag v0.9.0
commit three
g tag -a v0.10.0 -m 'an annotated release' # its sha= must be the commit's, not the tag object's
ten=$(g rev-parse HEAD)
commit four
g tag v0.11.0-rc.1
g tag v1.0.0-beta
g tag v2
g tag release-3.0.0
g checkout -q -b side
commit five
g tag v0.12.0
g checkout -q main

# run <script> <repository> - what the script prints, or FAILED when it exits non-zero
run() { (cd "$2" && bash "$1" main 2> /dev/null) || echo FAILED; }

# cases <script> - prints one line per case, returns the number that failed
cases() {
  local script=$1 failed=0 got
  case_() { # case_ <label> <got> <expected>
    if [ "$2" = "$3" ]; then
      printf '    ok    %s\n' "$1"
    else
      printf '    FAIL  %s: got %s\n' "$1" "$(printf '%s' "$2" | tr '\n' ' ')"
      failed=$((failed + 1))
    fi
  }
  g tag -d v0.12.0 > /dev/null
  got=$(run "$script" "$repo")
  case_ "1, 2, 5. the highest stable release on main, by version, with its commit" "$got" "$(printf 'tag=v0.10.0\nsha=%s' "$ten")"
  g tag v0.12.0 side
  case_ "3. the highest release off main is refused" "$(run "$script" "$repo")" FAILED
  g tag -d v0.12.0 > /dev/null
  local bare="$tmp/bare"
  rm -rf "$bare" && git init -q --template= -b main "$bare"
  repo=$bare g commit -q --allow-empty -m one
  repo=$bare g tag v1.0.0-rc.1
  case_ "4. no stable release is refused" "$(run "$script" "$bare")" FAILED
  g tag v0.12.0 side
  return "$failed"
}

echo "the script:"
out="$(cases "$SCRIPT")"
printf '%s\n' "$out"
pass=$(printf '%s\n' "$out" | grep -c '^    ok ')
fail=$(printf '%s\n' "$out" | grep -c '^    FAIL ')

controls=0
refused=0
control() { # control <label> <sed expression>
  local copy="$tmp/control.sh"
  sed -e "$2" "$SCRIPT" > "$copy"
  controls=$((controls + 1))
  if cmp -s "$copy" "$SCRIPT"; then
    printf '    FAIL  control "%s" changed nothing in the script\n' "$1"
  elif cases "$copy" > /dev/null; then
    printf '    FAIL  control "%s": the cases passed a broken script\n' "$1"
  else
    printf '    ok    control "%s": refused\n' "$1"
    refused=$((refused + 1))
  fi
}
echo "the controls, each a broken copy that must be refused:"
control "tags compared as text" 's/sort -V/sort/'
control "a suffix allowed" "s/\[0-9\]+\\$'/[0-9]+'/"
control "a release off the branch stepped past" '/merge-base --is-ancestor/d'
control "the tag object's hash, not the commit's" 's/\^{commit}//'

printf '\n%s cases passed, %s failed; %s of %s controls refused\n' "$pass" "$fail" "$refused" "$controls"
[ "$fail" -eq 0 ] && [ "$pass" -gt 0 ] && [ "$refused" -eq "$controls" ]
