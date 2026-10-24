# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy>=2.1,<3", "matplotlib>=3.9,<4"]
# ///
"""The stress meshes for D439's figure (explain.mjs): the model's saved surface of the lightened 80 x 80 mm board on
keyholes, cropped to the hook room's walls round one hook's slot and coloured by von Mises stress per 10 N on one scale,
for each version named. Read only: the saved runs (`fields/<version>/lightened-80-keyholes/*-L2-surface.npz`) are
the physics tool's (scripts/physics), found under the folder given.

    uv run scripts/figures/explain-stress.py <physics folder> <output json> <top MPa> <version> [<version> ...]
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from matplotlib import colormaps

# the crop: the room behind the slot at (20, 60), its tab's walls at x = 15.75 and 24.25, a little beyond them
LOW = np.array([8.0, 36.0, -16.0])
HIGH = np.array([32.0, 62.0, 6.0])
CASE = "spread-keyholes-standing-L2-surface.npz"


def crop(folder: Path, version: str, top: float) -> dict:
    d = np.load(folder / "fields" / version / "lightened-80-keyholes" / CASE)
    xyz, tri, vm = d["xyz"].astype(np.float64), d["tri"], d["vmMean"].astype(np.float64)
    middle = xyz[tri].mean(axis=1)
    keep = np.nonzero(np.all((middle >= LOW) & (middle <= HIGH), axis=1))[0]
    used, inverse = np.unique(tri[keep], return_inverse=True)
    rgb = colormaps["viridis"](np.clip(vm[used] / top, 0, 1))[:, :3]
    # the largest stress within 1 mm of each of the tab's two walls where they meet the back (z = 0), for the caption
    spots = {}
    for wall in (15.75, 24.25):
        near = (np.abs(xyz[:, 0] - wall) < 1.0) & (np.abs(xyz[:, 2]) < 1.0) & (xyz[:, 1] > 40) & (xyz[:, 1] < 56)
        spots[str(wall)] = round(float(vm[near].max()), 2) if near.any() else None
    return {
        "positions": [round(float(c), 3) for c in xyz[used].ravel()],
        "triangles": [int(i) for i in inverse.ravel()],
        "colors": [round(float(c), 4) for c in rgb.ravel()],
        "wallEdges": spots,
        "peak": round(float(vm.max()), 2),
    }


def main() -> int:
    folder, out, top, versions = Path(sys.argv[1]), Path(sys.argv[2]), float(sys.argv[3]), sys.argv[4:]
    stops = ["#" + "".join(f"{round(255 * c):02x}" for c in colormaps["viridis"](i / 10)[:3]) for i in range(11)]
    result = {"top": top, "stops": stops, "versions": {v: crop(folder, v, top) for v in versions}}
    out.write_text(json.dumps(result), encoding="utf-8")
    for v, r in result["versions"].items():
        print(v, "peak", r["peak"], "tab walls' edges", r["wallEdges"], "triangles", len(r["triangles"]) // 3)
    return 0


if __name__ == "__main__":
    sys.exit(main())
