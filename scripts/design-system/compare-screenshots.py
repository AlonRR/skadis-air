# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow", "numpy", "scipy"]
# ///
"""Compare two folders of screenshots from screenshots.mjs (D153): for each state, whether it is
identical, or how many pixels differ and the boxes round the regions that do, drawn in red on a copy of
the later shot in the third folder. A page that changed width is reported as such.

    uv run scripts/design-system/compare-screenshots.py BEFORE AFTER CHANGES

Run it first on two folders shot from the same page: they must come out identical, or the comparison
cannot tell a change from noise (on 15 Oct 2026, 7 states of 7 were). Exits 1 when anything differs.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy import ndimage

THRESHOLD = 24  # a channel must move this much (of 255) to count, which ignores no real change measured


def padded(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    canvas = Image.new("RGB", size, (255, 0, 255))
    canvas.paste(im)
    return canvas


def main(before: Path, after: Path, out: Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    shots = sorted(before.glob("*.png"))
    if not shots:
        print(f"no screenshots in {before}")
        return 2
    changed = 0
    for b in shots:
        a = after / b.name
        if not a.exists():
            print(f"{b.stem}: missing from {after}")
            changed += 1
            continue
        ib, ia = Image.open(b).convert("RGB"), Image.open(a).convert("RGB")
        note = ""
        if ib.size != ia.size:
            note = f" (size {ib.size[0]}x{ib.size[1]} -> {ia.size[0]}x{ia.size[1]})"
            size = (max(ib.size[0], ia.size[0]), max(ib.size[1], ia.size[1]))
            ib, ia = padded(ib, size), padded(ia, size)
        diff = np.asarray(ImageChops.difference(ib, ia)).max(axis=2) > THRESHOLD
        if not diff.any():
            print(f"{b.stem}: identical{note}")
            continue
        changed += 1
        labels, count = ndimage.label(ndimage.binary_dilation(diff, iterations=12))
        shown = ia.copy()
        draw = ImageDraw.Draw(shown)
        boxes = []
        for region in ndimage.find_objects(labels):
            y0, y1, x0, x1 = region[0].start, region[0].stop, region[1].start, region[1].stop
            draw.rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=3)
            boxes.append(f"[{x0},{y0} {x1 - x0}x{y1 - y0}]")
        shown.save(out / b.name)
        print(f"{b.stem}: {int(diff.sum())} px differ in {count} region(s){note}: {' '.join(boxes[:12])}")
    print(f"{len(shots)} states compared, {changed} changed")
    return 1 if changed else 0


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*map(Path, sys.argv[1:])))
