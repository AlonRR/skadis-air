#!/usr/bin/env bash
# Hold .github/workflows/checks.yml to the three bugs the convention kit's workflow showed on its
# first real run (5 Oct 2026), to this repo's own checks, and to actionlint.
#
#   bash tests/test-workflow.sh            # the real workflow: every check must pass
#
# Copied from repo-secret-scan tests/test-workflow.sh (its commit f190668) and pointed at this
# repo's workflow, 14 Oct 2026 (A102). A workflow cannot be run here, so these are static checks;
# each names the bug it stops coming back:
#   1. the identity hook ran in CI, where it compares the RUNNER (no expected identity, so it
#      refused every run). It must be SKIPped there, and the recorded identity of the pushed
#      commits checked instead (.githooks/check-identity-range).
#   2. the secrets job downloaded releases/latest/download/..., which is a 404 - release assets
#      carry the version in their names. And `curl` without -f saved the 404 page.
#   3. pre-commit was installed with pip; the house rule is uv.
# and 4, this repo's: the npm workspace's checks and the browser test run in CI.
#
# The controls: the same checks run against copies of the workflow, each with one of those
# bugs put back, and each copy must FAIL. A check that cannot fail is not a check.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REAL="$HERE/.github/workflows/checks.yml"
BASE="$HERE/.pre-commit-config.yaml"

# checks <workflow> - prints one line per check, returns the number that failed
checks() {
  local wf=$1 failed=0 label
  check() { # check <label> <command...>
    label=$1
    shift
    if "$@" > /dev/null 2>&1; then
      printf '    ok    %s\n' "$label"
    else
      printf '    FAIL  %s\n' "$label"
      failed=$((failed + 1))
    fi
  }
  absent() { ! grep -qE "$1" "$wf"; }
  present() { grep -qE "$1" "$wf"; }
  # Command lines only: a comment explaining why -f matters mentions curl without it.
  curl_lines() { grep -vE '^[[:space:]]*#' "$wf" | grep -E '(^|[[:space:]])curl[[:space:]]'; }
  every_curl_fails() { curl_lines > /dev/null && ! curl_lines | grep -vqE 'curl[[:space:]]+-[a-zA-Z]*f'; }

  check "actionlint passes" uvx --from actionlint-py actionlint "$wf"
  check "1. the pre-commit job skips house-identity" present '^[[:space:]]+SKIP:.*house-identity'
  check "1. a job runs check-identity-range" present 'check-identity-range'
  check "1. the expected identity comes from repository variables" present 'vars\.EXPECT_EMAIL'
  check "1. ... both of them" present 'vars\.EXPECT_NAME'
  check "2. no releases/latest/download URL" absent 'releases/latest/download'
  check "2. every curl fails on an HTTP error (-f)" every_curl_fails
  check "2. the download is checked against checksums.txt" present 'sha256sum[[:space:]]+--check'
  local wf_v pc_v
  wf_v=$(sed -n 's/^[[:space:]]*BETTERLEAKS_VERSION:[[:space:]]*"\{0,1\}\([0-9.]*\)"\{0,1\}.*/\1/p' "$wf" | head -1)
  pc_v=$(grep -A1 'betterleaks/betterleaks' "$BASE" | sed -n 's/.*rev:[[:space:]]*v\{0,1\}\([0-9.]*\).*/\1/p' | head -1)
  check "2. CI's betterleaks ($wf_v) is the pre-commit hook's ($pc_v)" test -n "$wf_v" -a "$wf_v" = "$pc_v"
  check "3. no pip install" absent 'pip[[:space:]]+install'
  check "3. pre-commit runs through uvx, pinned" present 'uvx[[:space:]]+pre-commit@[0-9]'
  check "3. setup-uv is pinned to an exact release" present 'astral-sh/setup-uv@v[0-9]+\.[0-9]+\.[0-9]+'
  check "4. the locked dependencies are installed (npm ci)" present 'run:[[:space:]]+npm ci'
  for script in 'typecheck --workspaces' 'lint' 'format:check' 'build -w skadis-air-web' 'test:browser -w skadis-air-web'; do
    check "4. it runs npm run $script" present "run:[[:space:]]+npm run $script\$"
  done
  check "4. it runs the unit tests of every workspace" present 'run:[[:space:]]+npm test --workspaces$'
  return "$failed"
}

echo "the workflow:"
out="$(checks "$REAL")"
printf '%s\n' "$out"
pass=$(grep -c '^    ok ' <<< "$out")
fail=$(grep -c '^    FAIL ' <<< "$out")
controls=0
refused=0

# The controls: one bug put back per copy; the checks must fail on each.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
control() { # control <label> <sed expression>
  local copy="$tmp/control.yml"
  sed -e "$2" "$REAL" > "$copy"
  controls=$((controls + 1))
  if cmp -s "$copy" "$REAL"; then
    printf '    FAIL  control "%s" changed nothing in the workflow\n' "$1"
  elif checks "$copy" > /dev/null; then
    printf '    FAIL  control "%s": the checks passed a broken workflow\n' "$1"
  else
    printf '    ok    control "%s": refused\n' "$1"
    refused=$((refused + 1))
  fi
}
echo "the controls, each a broken copy that must be refused:"
control "the identity hook not skipped" '/SKIP: house-identity/d'
control "an unversioned betterleaks download" 's|releases/download/v\${BETTERLEAKS_VERSION}|releases/latest/download|'
control "curl without -f" 's/curl -fsSLO/curl -sSLO/'
control "pre-commit through pip" 's|run: uvx pre-commit@4.6.2 run|run: pip install pre-commit \&\& pre-commit run|'
control "no browser test" '/run: npm run test:browser -w skadis-air-web/d'

printf '\n%s checks passed, %s failed; %s of %s controls refused\n' "$pass" "$fail" "$refused" "$controls"
[ "$fail" -eq 0 ] && [ "$pass" -gt 0 ] && [ "$refused" -eq "$controls" ]
