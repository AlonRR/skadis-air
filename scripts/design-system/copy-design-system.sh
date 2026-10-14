#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# Copy the shared design system's files into web/public/design-system/ from one of its tags, byte for
# byte as that tag's commit holds them (D111, C116, C119): tokens.css, components/bundle.css and
# fonts/ with the fonts' licence texts. They are read from the commit's blobs, never from a checkout:
# a checkout on Windows can change line endings, and the design system commits some of these files
# with CRLF and one with a byte-order mark. Each file written is then checked against its blob.
#
#   bash scripts/design-system/copy-design-system.sh REPOSITORY TAG
#
# REPOSITORY is the design system's clone address, AlonRR/printable-parts-design-system on GitHub,
# over SSH; it is not written here, so a fork can point at its own. Afterwards, name the tag and
# commit in web/public/design-system/README.md, and run the checks.
set -euo pipefail
[ $# -eq 2 ] || {
  echo "usage: copy-design-system.sh REPOSITORY TAG" >&2
  exit 2
}
repo=$1
tag=$2
root=$(cd "$(dirname "$0")/../.." && pwd)
dest=$root/web/public/design-system
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# A bare clone has no checkout, so nothing converts the files on the way. (git warns that the tag
# "is not a commit": it is an annotated tag, and the commit it names is what is read.)
git clone -q --bare --depth 1 --branch "$tag" "$repo" "$tmp/ds.git"
ds() { git -C "$tmp/ds.git" "$@"; }
commit=$(ds rev-parse "$tag^{commit}")
mapfile -t files < <(ds ls-tree -r --name-only "$commit" -- tokens.css components/bundle.css fonts)
[ "${#files[@]}" -gt 0 ] || {
  echo "nothing to copy: $tag has no tokens.css, components/bundle.css or fonts/" >&2
  exit 1
}

rm -rf "$dest/tokens.css" "$dest/components" "$dest/fonts" # never keep a file the new tag dropped
bad=0
for f in "${files[@]}"; do
  mkdir -p "$(dirname "$dest/$f")"
  ds cat-file blob "$commit:$f" > "$dest/$f"
  if [ "$(git hash-object --no-filters "$dest/$f")" != "$(ds rev-parse "$commit:$f")" ]; then
    echo "!! $f differs from the tag's copy" >&2
    bad=1
  fi
done
[ "$bad" -eq 0 ] || exit 1
echo "copied ${#files[@]} files from $tag, commit $commit, each identical to the tag's blob"
