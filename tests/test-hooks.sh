#!/usr/bin/env bash
# Prove the two hooks DISCRIMINATE - that each one separates a case which must be
# refused from a case which must pass.
#
#   ./tests/test-hooks.sh
#
# Copied from the convention kit (repo-secret-scan tests/test-hooks.sh at 628aed2,
# 5 Oct 2026). Changed for this repo only where its layout differs: the hooks live in
# .githooks/ (the kit ships them in hooks/ and runs copies in .githooks/), so the
# paths point there, and the kit's block checking that those two copies match is
# dropped because this repo has only the one copy.
#
# Copied again into skadis_ultralight_generator from parametric-window-sealer, 12 Oct 2026;
# changed only in marking its three refused fixtures `secret-gate: allow` for the push gate.
#
# A hook that accepts everything and a hook that is never invoked are
# indistinguishable from the outside: both look like a clean commit. And a hook that
# refuses too much is worse than one that refuses nothing, because the way people
# get past it is `--no-verify`, which switches off every other check in the same
# hook at the same time. So both columns below matter equally.
#
# The rows marked OLD-BUG are the cases the previous hand-written hooks got wrong.
# They are kept as regressions, not as documentation:
#
#   - `test:` was REFUSED by the old commit-msg hook, which required a scope, while
#     onedrive-sync/CLAUDE.md listed `test:` as a valid subject. The hook was relaxed to
#     match on 18 Sep 2026 - and on 5 Oct 2026 the owner REVERSED that for every repo:
#     "they must be type(scope): summary", "type: summary is forbidden". So a bare
#     `test:` is refused again, now deliberately, and the doc was corrected instead.
#   - `Merge ...` / `On main: ...` were refused, so any merge or stash needed
#     --no-verify - which also skipped the attribution check, the one thing in that
#     hook that cannot be fixed later.
#   - Gitea's lowercased address was refused by the old pre-commit hook even though
#     it is the same GitHub account. Measured 11 Sep 2026.
#
# Note what MUST PASS: "feat(bus): deliver to Claude Code sessions". Naming a product
# the code interoperates with is a technical fact a reader needs. The ban is on
# branding the AUTHORSHIP. A hook that matched the vocabulary instead of the trailer
# shape would refuse a correct commit, so that row is a real requirement.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CM="$HERE/.githooks/commit-msg"
PC="$HERE/.githooks/pre-commit"
# A made-up identity. The pre-commit hook reads the expected one from git config, so
# the suite needs no real person in it.
ID_EMAIL="12345678+SomeOne@users.noreply.github.com"
ID_NAME="Some A. Person"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
pass=0
fail=0

msg() { # msg <expected-rc> <label> <line...>
  local exp=$1 label=$2
  shift 2
  printf '%s\n' "$@" > "$TMP/m"
  sh "$CM" "$TMP/m" > /dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$exp" ]; then
    pass=$((pass + 1))
    printf '  ok    (rc=%s) %s\n' "$got" "$label"
  else
    fail=$((fail + 1))
    printf '  FAIL  expected rc=%s got %s: %s\n' "$exp" "$got" "$label"
  fi
}

ident() { # ident <expected-rc> <label> <author> [committer]
  local exp=$1 label=$2 ae=$3 ce=${4:-$3}
  git -C "$TMP/r" config user.email "$ae"
  (cd "$TMP/r" && GIT_COMMITTER_EMAIL="$ce" bash "$PC") > /dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$exp" ]; then
    pass=$((pass + 1))
    printf '  ok    (rc=%s) %s\n' "$got" "$label"
  else
    fail=$((fail + 1))
    printf '  FAIL  expected rc=%s got %s: %s\n' "$exp" "$got" "$label"
  fi
}

name() { # name <expected-rc> <label> <author-name> [committer-name]
  local exp=$1 label=$2 an=$3 cn=${4:-$3}
  git -C "$TMP/r" config user.email "$ID_EMAIL"
  git -C "$TMP/r" config user.name "$an"
  (cd "$TMP/r" && GIT_COMMITTER_NAME="$cn" bash "$PC") > /dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$exp" ]; then
    pass=$((pass + 1))
    printf '  ok    (rc=%s) %s\n' "$got" "$label"
  else
    fail=$((fail + 1))
    printf '  FAIL  expected rc=%s got %s: %s\n' "$exp" "$got" "$label"
  fi
}

echo "commit-msg -- must PASS:"
msg 0 "scoped subject" "docs(readme): record the sweep procedure"
msg 0 "scoped test subject" "test(sync): cover the divergence case"
msg 0 "breaking-change marker" "feat(api)!: drop the v1 endpoint"
msg 0 "merge commit           [OLD-BUG]" "Merge branch 'upstream/main'"
msg 0 "revert commit          [OLD-BUG]" "Revert \"feat(x): y\""
msg 0 "git stash message      [OLD-BUG]" "On main: pre-pull working tree"
msg 0 "autosquash fixup" "fixup! feat(x): y"
msg 0 "interop naming is legal" "feat(bus): deliver to Claude Code sessions" "" "Anthropic's CLI is the transport; an LLM agent is a peer."
# Real bodies from real history. Every one of these was matched by the first draft of
# this hook, which used unanchored substrings. Two of them are commits ABOUT the rule.
msg 0 "prose: gcode generated with" "feat(slicer): bake temperatures in" "" "G-CODE IS GENERATED WITH THE TEMPERATURES BAKED IN rather than leaving four"
msg 0 "prose: token generated with -s" "feat(ci): scope the token" "" "the token was generated with -s alon/data-pipeline-2026, so the scope is"
msg 0 "prose: quoting the ban itself" "docs(rules): scope the relaxation" "" 'ends by restating that attribution, Co-Authored-By trailers, session links,' '"Generated with ..." footers and "AI" as a label all stay out.'
msg 0 "prose: naming the false positive" "docs(audit): classify the hits" "" '"generated with" is prose about G-code, mcu-workflow$(printf "\x27")s Co-Authored-By hit is a'

echo "commit-msg -- must REFUSE:"
msg 1 "no type prefix" "Fixed the thing"
# Scope REQUIRED, every repo (owner, 5 Oct 2026: "type: summary is forbidden").
msg 1 "bare subject 'test:'" "test: cover the divergence case"
msg 1 "bare subject 'docs:'" "docs: record the sweep procedure"
msg 1 "bare breaking change" "feat!: drop the v1 endpoint"
msg 1 "empty scope" "fix(): handle the empty case"
msg 1 "capitalised type" "Docs(readme): x"
msg 1 "empty summary" "feat(x):"
msg 1 "subject over 72 chars" "feat(scope): $(printf 'x%.0s' $(seq 1 66))"
msg 1 "Co-Authored-By trailer" "feat(x): y" "" "Co-Authored-By: Claude <noreply@anthropic.com>" # secret-gate: allow -- a fixture the hook must refuse
msg 1 "session-link trailer" "feat(x): y" "" "Claude-Session: https://claude.ai/s/abc"
msg 1 "generated-with footer" "feat(x): y" "" "Generated with [Claude Code](https://claude.com/claude-code)"
msg 1 "drafted-with footer" "feat(x): y" "" "Drafted with the help of an LLM agent."
# git's subject is the first PARAGRAPH. Without a blank line 2, a compliant 66-char
# first line becomes a 260-char subject and the hook never sees it, because the hook
# reads line 1. Real case, github-profile, 18 Sep 2026.
msg 1 "body with no blank line 2" "docs(x): a compliant first line" "then a body line straight after it, which git folds into the subject"
msg 0 "subject only, no body at all" "docs(x): a compliant first line"

echo "pre-commit -- identity:"
git init -q --template= "$TMP/r"
git -C "$TMP/r" config hooks.expectEmail "$ID_EMAIL"
git -C "$TMP/r" config hooks.expectName "$ID_NAME"
git -C "$TMP/r" config user.name "$ID_NAME"
ident 0 "expected address" "$ID_EMAIL"
ident 0 "Gitea's lowercase   [OLD-BUG]" "12345678+someone@users.noreply.github.com"
ident 1 "personal email" "someone.personal@example.com"
ident 1 "git-invented user@hostname" "root@server.internal.example" # a fixture the hook must refuse
ident 1 "placeholder identity" "t@t.t"                              # secret-gate: allow -- a fixture the hook must refuse
ident 1 "committer wrong, author right" "$ID_EMAIL" "someone.personal@example.com"

# The name, with the address already correct. Every refused name below stands for one
# that really reached a repository: a college server's account name (a variant
# spelling) reached 57 trees of one repo, the bare account name is how Gitea stamped
# web/API commits before its full_name was set, and the GitHub login is a third. A right
# address with a wrong name passes GitHub attribution and still publishes the wrong name.
echo "pre-commit -- name:"
name 0 "expected name" "$ID_NAME"
name 1 "college-server account name" "Some Persson"
name 1 "no middle initial" "Some Person"
name 1 "GitHub login as a name" "SomeOne"
name 1 "Gitea's pre-full_name stamp" "someone"
name 1 "committer name wrong, author right" "$ID_NAME" "Some Persson"
git -C "$TMP/r" config user.name "$ID_NAME"

# With nothing to compare against, the hook must REFUSE. A guard that passes every
# commit when unconfigured looks exactly like one that works. GIT_CONFIG_GLOBAL points
# at an empty file so a machine that HAS the keys set globally cannot mask the result.
# The last row is the control: same repo, keys set, accepted.
echo "pre-commit -- no expected identity configured (fail closed):"
git init -q --template= "$TMP/u"
: > "$TMP/no-global"
git -C "$TMP/u" config user.email "$ID_EMAIL"
git -C "$TMP/u" config user.name "$ID_NAME"
unconfigured() { # unconfigured <expected-rc> <label>
  (cd "$TMP/u" && GIT_CONFIG_GLOBAL="$TMP/no-global" GIT_CONFIG_NOSYSTEM=1 bash "$PC") > /dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$1" ]; then
    pass=$((pass + 1))
    printf '  ok    (rc=%s) %s\n' "$got" "$2"
  else
    fail=$((fail + 1))
    printf '  FAIL  expected rc=%s got %s: %s\n' "$1" "$got" "$2"
  fi
}
unconfigured 1 "neither key set"
git -C "$TMP/u" config hooks.expectEmail "$ID_EMAIL"
unconfigured 1 "address set, name not"
git -C "$TMP/u" config hooks.expectName "$ID_NAME"
unconfigured 0 "both set: accepted (the control)"

# ---------------------------------------------------------------------------
# End-to-end, through real `git commit`, with the hook's output PIPED.
#
# Everything above runs the hook files directly. That proves the logic and proves
# nothing about whether git honours the verdict. On 18 Sep 2026 it did not: with
# output piped to `head -1`, pre-commit printed REFUSING COMMIT and git committed
# anyway, because the second diagnostic write took SIGPIPE and killed the shell
# before `exit 1`. Unpiped, the same commit was refused. So this block is the only
# one that would have caught the worst bug either hook has had.
# ---------------------------------------------------------------------------
echo "end-to-end through git, output piped (the SIGPIPE regression):"
E="$TMP/e2e"
# --template=<dir> copies <dir>/hooks/*, so the argument is the PARENT of hooks/.
# Passing the hooks directory itself installs nothing, and the test then passes
# every "must refuse" row for the wrong reason: no hook ran at all. The row below
# that asserts a BAD subject is refused is what catches that mistake.
mkdir -p "$TMP/tpl/hooks" && cp "$HERE/.githooks/"* "$TMP/tpl/hooks/" && chmod +x "$TMP/tpl/hooks/"*
git init -q --template="$TMP/tpl" "$E"
[ -f "$E/.git/hooks/pre-commit" ] && [ -f "$E/.git/hooks/commit-msg" ] ||
  {
    printf '  FAIL  the temp repo got no hooks - every row below is meaningless\n'
    fail=$((fail + 1))
  }
git -C "$E" config hooks.expectEmail "$ID_EMAIL"
git -C "$E" config hooks.expectName "$ID_NAME"
git -C "$E" config user.name "$ID_NAME"
git -C "$E" config user.email "$ID_EMAIL"
echo base > "$E/f.txt"
git -C "$E" add f.txt
git -C "$E" commit -q -m 'feat(x): base' > /dev/null 2>&1
base=$(git -C "$E" rev-list --count HEAD 2> /dev/null || echo 0)
if [ "$base" = 1 ]; then
  pass=$((pass + 1))
  printf '  ok    a valid commit is accepted\n'
else
  fail=$((fail + 1))
  printf '  FAIL  valid commit was not created (count=%s)\n' "$base"
fi

git -C "$E" config user.email "someone.personal@example.com"
echo more > "$E/g.txt"
git -C "$E" add g.txt
(cd "$E" && git commit -m 'feat(x): wrong identity, piped' 2>&1 | head -1) > /dev/null 2>&1
n=$(git -C "$E" rev-list --count HEAD)
if [ "$n" = 1 ]; then
  pass=$((pass + 1))
  printf '  ok    wrong identity refused even when output is piped to head -1\n'
else
  fail=$((fail + 1))
  printf '  FAIL  wrong-identity commit LANDED through a closed pipe (count=%s, expected 1)\n' "$n"
  git -C "$E" log --format='          %h |%s| %ae' | head -2
fi

git -C "$E" config user.email "$ID_EMAIL"
git -C "$E" config user.name "Some Persson"
echo name > "$E/n.txt"
git -C "$E" add n.txt
(cd "$E" && git commit -m 'feat(x): right address, wrong name, piped' 2>&1 | head -1) > /dev/null 2>&1
n=$(git -C "$E" rev-list --count HEAD)
if [ "$n" = 1 ]; then
  pass=$((pass + 1))
  printf '  ok    wrong name refused even when output is piped to head -1\n'
else
  fail=$((fail + 1))
  printf '  FAIL  wrong-name commit LANDED through a closed pipe (count=%s, expected 1)\n' "$n"
fi
git -C "$E" config user.name "$ID_NAME"

echo bad > "$E/h.txt"
git -C "$E" add h.txt
git -C "$E" config user.email "$ID_EMAIL"
(cd "$E" && git commit -m 'no type prefix, piped' 2>&1 | head -1) > /dev/null 2>&1
n=$(git -C "$E" rev-list --count HEAD)
if [ "$n" = 1 ]; then
  pass=$((pass + 1))
  printf '  ok    bad subject refused even when output is piped to head -1\n'
else
  fail=$((fail + 1))
  printf '  FAIL  bad-subject commit LANDED through a closed pipe (count=%s, expected 1)\n' "$n"
fi

# Interactive shapes. Every row above uses -m or -F, and the file git hands the hook
# for an EDITOR commit is different: it still contains the "# Please enter..." block,
# and with -v the entire diff. Both were live hazards - the diff of a file that merely
# documents a banned trailer looked like a banned trailer on its context lines.
echo "end-to-end, interactive shapes (editor comment block, and commit -v diff):"
git -C "$E" config user.email "$ID_EMAIL"
# A real editor PREPENDS the subject and leaves git's comment block in place.
# shellcheck disable=SC2016  # the inner $1 must reach the spawned sh UNEXPANDED
export GIT_EDITOR='sh -c "{ printf \"docs(x): subject typed in an editor\\n\"; cat \$1; } > \$1.new && mv \$1.new \$1" --'
echo editor > "$E/e.txt"
git -C "$E" add e.txt
(cd "$E" && git commit > /dev/null 2>&1)
n=$(git -C "$E" rev-list --count HEAD)
if [ "$n" = 2 ]; then
  pass=$((pass + 1))
  printf '  ok    editor commit accepted (comment block did not read as a body)\n'
else
  fail=$((fail + 1))
  printf '  FAIL  editor commit refused - the comment block is being read as line 2 (count=%s, expected 2)\n' "$n"
fi

# commit -v on a file whose CONTEXT lines contain a banned trailer.
printf 'Rules doc.\nCo-Authored-By: trailers are banned here.\nmore text\n' > "$E/rules.md"
git -C "$E" add rules.md && (cd "$E" && git commit -q -m 'docs(rules): add the doc' > /dev/null 2>&1)
printf 'Rules doc.\nCo-Authored-By: trailers are banned here.\nmore text, edited\n' > "$E/rules.md"
git -C "$E" add rules.md
export GIT_EDITOR='sh -c "{ printf \"docs(rules): edit the banned-trailer doc\\n\"; cat \$1; } > \$1.new && mv \$1.new \$1" --'
before=$(git -C "$E" rev-list --count HEAD)
(cd "$E" && git commit -v > /dev/null 2>&1)
after=$(git -C "$E" rev-list --count HEAD)
if [ "$after" -gt "$before" ]; then
  pass=$((pass + 1))
  printf '  ok    commit -v accepted: a trailer in the DIFF is not a trailer in the message\n'
else
  fail=$((fail + 1))
  printf '  FAIL  commit -v refused - the diff is being scanned as message text\n'
fi
unset GIT_EDITOR

printf '\n%s\n' "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
