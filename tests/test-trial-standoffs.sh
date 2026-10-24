#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
#
# The trial plate's three 1-board standoffs (T274, C463 to C465) must carry their 1, 2 or 3 dots as pockets in the
# board face, which is up as they print, and none in the bed face, so the dots cost no bed contact; the section 0.1 mm
# above the bed is the plain standoff's and at least 45 mm2. The controls: the old bed-face dots, and a dot too few,
# must be found wrong, or the checks are not looking.
#
#   bash tests/test-trial-standoffs.sh
#
# Needs the library built: npm run build -w skadis-air.
set -u
here=$(cd "$(dirname "$0")" && pwd)
cd "$here/.." || exit 1
node tests/trial-standoffs.check.mjs
