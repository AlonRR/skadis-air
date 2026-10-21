#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# The latest stable release, which the page on GitHub Pages is built from (A291, C292): the highest tag vX.Y.Z,
# compared as versions, with no pre-release or other suffix, whose commit is on BRANCH. Prints tag= and sha=, the
# commit's full hash, one a line, the form GITHUB_OUTPUT takes. Fails when there is no such tag, and when the
# highest is not on BRANCH: a release tag off main is a mistake to see, not one to step past to an older release.
#
#   bash scripts/release/latest-release.sh [BRANCH]     # BRANCH is HEAD unless given
#
# tests/test-latest-release.sh holds it to these rules, with controls.
set -euo pipefail
branch=${1:-HEAD}
tag=$(git tag --list 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1 || true)
[ -n "$tag" ] || {
  echo "no release: no tag vX.Y.Z" >&2
  exit 1
}
sha=$(git rev-parse --verify "$tag^{commit}")
git merge-base --is-ancestor "$sha" "$branch" || {
  echo "the latest release, $tag ($sha), is not on $branch" >&2
  exit 1
}
printf 'tag=%s\nsha=%s\n' "$tag" "$sha"
