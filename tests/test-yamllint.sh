#!/usr/bin/env bash
# Prove the kit's yamllint config does two things at once:
#
#   1. this repo's own YAML PASSES it. The `yaml` profile runs `yamllint --strict`, and on
#      yamllint's defaults that refused the kit's own files - 80-column lines, no `---`,
#      GitHub's `on:` read as a boolean, the aligned values of PROJECT.yml. A repo that
#      adopted the profile went red on files it got from this kit. Found by a session
#      assembling the kit into a new repo, 5 Oct 2026.
#   2. it still REFUSES broken YAML. A config that passes everything because it disables
#      everything would satisfy (1) and protect nothing, so every relaxation has a row
#      showing the rule around it still fires.
#
#   ./tests/test-yamllint.sh
#
# Copied from the convention kit (repo-secret-scan tests/test-yamllint.sh at 6ba4337,
# 5 Oct 2026). Changed for this repo only where its layout differs: the config is the
# repo-root .yamllint.yaml, not the kit's templates/yamllint.yaml.
#
# Copied again into skadis_ultralight_generator from parametric-window-sealer, 12 Oct 2026;
# changed only in the floor on the number of tracked YAML files (4 here, 5 there).
#
# Runs the version the profile pins (templates/profiles.yaml), through uv - never pip.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CFG="$HERE/.yamllint.yaml"
YL=(uvx yamllint@1.38.0)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

if ! "${YL[@]}" --version > /dev/null 2>&1; then
  echo "CANNOT RUN: '${YL[*]}' is not available. Install uv." >&2
  exit 2
fi
if [ ! -f "$CFG" ]; then
  printf '  FAIL  no config at .yamllint.yaml - every row below would test the defaults\n'
  printf '\n%s\n' "0 passed, 1 failed"
  exit 1
fi

lint() { # lint <expected-rc> <label> <rule-that-must-fire|-> <file...>
  local exp=$1 label=$2 rule=$3
  shift 3
  "${YL[@]}" --strict -c "$CFG" -f parsable "$@" > "$TMP/out" 2>&1
  local got=$?
  [ "$got" -gt 1 ] && got=1 # yamllint exits 1 on errors, 2 on warnings under --strict
  # A refusal only counts if the INTENDED rule fired. A long line that also ends in a space
  # is refused for trailing-spaces, and would pass a line-length row for the wrong reason.
  if [ "$got" = 1 ] && [ "$rule" != "-" ] && ! grep -q "($rule)" "$TMP/out"; then
    got="1-but-not-$rule"
  fi
  if [ "$got" = "$exp" ]; then
    pass=$((pass + 1))
    printf '  ok    (rc=%s) %s\n' "$got" "$label"
  else
    fail=$((fail + 1))
    printf '  FAIL  expected rc=%s got %s: %s\n' "$exp" "$got" "$label"
    sed 's/^/          /' "$TMP/out" | head -5
  fi
}

# Exactly what the profile's hook lints: tracked files pre-commit types as yaml. An
# extensionless file like .repo-status is YAML too, but the hook never sees it.
# Absolute paths, and NO subshell: `(cd "$HERE" && lint ...)` once ran this row in a
# subshell, so its FAIL was printed and then lost with the subshell's counters - the run
# reported "0 failed" and exited 0 with the kit's own files failing.
mapfile -t OWN < <(git -C "$HERE" ls-files '*.yaml' '*.yml' | sed "s|^|$HERE/|")
echo "this repo's own YAML (${#OWN[@]} files) -- must PASS:"
# This repo tracked 4 YAML files when the test was copied in (12 Oct 2026); raise the floor as
# more land, so a list that silently shrinks still fails here.
if [ "${#OWN[@]}" -lt 4 ]; then
  fail=$((fail + 1))
  printf '  FAIL  only %s YAML files found - the file list is wrong, not the YAML\n' "${#OWN[@]}"
fi
lint 0 "every tracked *.yaml / *.yml" - "${OWN[@]}"

echo "broken YAML -- must REFUSE (the rules around each relaxation still fire):"
w() { printf '%s\n' "${@:2}" > "$TMP/$1"; }
words() {
  local s
  s=$(printf 'word %.0s' $(seq 1 "$1"))
  printf '%s' "${s% }"
}
w dup.yaml 'a: 1' 'b: 2' 'a: 3'
lint 1 "duplicate key" key-duplicates "$TMP/dup.yaml"
w trail.yaml 'a: 1  '
lint 1 "trailing spaces" trailing-spaces "$TMP/trail.yaml"
w yes.yaml 'enabled: yes'
lint 1 "truthy VALUE 'yes' (only the key check is off, for on:)" truthy "$TMP/yes.yaml"
w long.yaml "a: $(words 30)"
lint 1 "line over 120 columns" line-length "$TMP/long.yaml"
w mixed.yaml 'a:' '  - 1' 'b:' '- 2'
lint 1 "indented and unindented lists in ONE file" indentation "$TMP/mixed.yaml"
w odd.yaml 'a:' '   b: 1'
lint 1 "3-space indentation (.editorconfig says 2)" indentation "$TMP/odd.yaml"
w comment.yaml 'a: 1 # too close'
lint 1 "inline comment one space from content" comments "$TMP/comment.yaml"
printf 'a: 1' > "$TMP/nofinal.yaml"
lint 1 "no newline at end of file" new-line-at-end-of-file "$TMP/nofinal.yaml"

echo "what the relaxations allow -- must PASS:"
w on.yaml 'on:' '  push:'
lint 0 "GitHub Actions' on: key" - "$TMP/on.yaml"
w aligned.yaml 'name:     x' 'kind:     build'
lint 0 "values aligned in a column" - "$TMP/aligned.yaml"
w flat.yaml 'repos:' '- repo: local'
lint 0 "unindented list, consistently" - "$TMP/flat.yaml"
w long112.yaml "a: $(words 22)"
lint 0 "line of 112 columns" - "$TMP/long112.yaml"

printf '\n%s\n' "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
