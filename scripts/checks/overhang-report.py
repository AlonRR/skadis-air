# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
"""Sum, per layer of a PrusaSlicer G-code file, what it prints as overhang perimeter and as bridge infill, and what
lies under it in the layer below.

    uv run --no-project python scripts/checks/overhang-report.py [--json] [--near MM] FILE.gcode [FILE.gcode ...]

A length is the XY travel of the extruding moves (G1 with E > 0) under `;TYPE:Overhang perimeter` or
`;TYPE:Bridge infill`, layer by layer as `;Z:` marks the layers. Each such move is walked in 0.25 mm steps, and each
step is put down to the nearest extrusion of the layer below within `--near` mm (3 unless set): its type, or "air"
where there is none. A bridge over a room is mostly air, or the room's walls at its ends; PrusaSlicer's internal
bridge, the first solid layer over sparse infill, is mostly "Internal infill". 3 mm, as the profile's 15 % cubic
infill leaves points up to about 3 mm from its nearest line.

Prints, for each file, the layers that have either kind, and the totals; with --json, the same as one JSON document
for a script to read. The keyhole printability pass's tool (docs/research/2026-10-23-keyhole-printability.md);
tests/test-overhang-report.sh proves it counts what it should and nothing else.
"""

import json
import math
import re
import sys
from collections import defaultdict

WATCH = {"Overhang perimeter": "overhang", "Bridge infill": "bridge"}
STEP_MM = 0.25  # how finely a move is walked, both the moves looked at and the layer below
CELL_MM = 1.0  # the grid the layer below is kept in, for finding the nearest extrusion
WORD = re.compile(r"([XYZE])(-?[0-9]*\.?[0-9]+)")


def steps(x0: float, y0: float, x1: float, y1: float):
    """The points along a move every STEP_MM or less, each the middle of its step, with the step's length."""
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(1, math.ceil(length / STEP_MM))
    for k in range(n):
        t = (k + 0.5) / n
        yield x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, length / n


def layers(path: str):
    """Each layer's extruding moves, in order: (z, [(x0, y0, x1, y1, type), ...])."""
    z = None
    moves: list[tuple[float, float, float, float, str]] = []
    kind = ""
    x = y = None
    relative = False
    last_e = 0.0
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith(";Z:"):
                if z is not None and moves:
                    yield z, moves
                z, moves = round(float(line[3:]), 3), []
                continue
            if line.startswith(";TYPE:"):
                kind = line[6:].strip()
                continue
            code = line.split(";", 1)[0].strip()
            if code.startswith("M83"):
                relative = True
            elif code.startswith("M82"):
                relative = False
            elif code.startswith("G92"):
                words = dict(WORD.findall(code))
                if "E" in words:
                    last_e = float(words["E"])
            if not (code.startswith("G1 ") or code.startswith("G0 ")):
                continue
            words = dict(WORD.findall(code))
            nx = float(words["X"]) if "X" in words else x
            ny = float(words["Y"]) if "Y" in words else y
            extruding = False
            if "E" in words:
                e = float(words["E"])
                extruding = e > 0 if relative else e > last_e
                if not relative:
                    last_e = e
            if extruding and z is not None and None not in (x, y, nx, ny):
                moves.append((x, y, nx, ny, kind))
            x, y = nx, ny
    if z is not None and moves:
        yield z, moves


class Below:
    """A layer's extrusions, kept on a grid so the nearest one to a point is quick to find."""

    def __init__(self, moves):
        self.cells: dict[tuple[int, int], list[tuple[float, float, str]]] = defaultdict(list)
        for x0, y0, x1, y1, kind in moves:
            for px, py, _ in steps(x0, y0, x1, y1):
                self.cells[(math.floor(px / CELL_MM), math.floor(py / CELL_MM))].append((px, py, kind))
            for px, py in ((x0, y0), (x1, y1)):
                self.cells[(math.floor(px / CELL_MM), math.floor(py / CELL_MM))].append((px, py, kind))

    def nearest(self, px: float, py: float, near: float) -> str:
        reach = math.ceil(near / CELL_MM)
        cx, cy = math.floor(px / CELL_MM), math.floor(py / CELL_MM)
        best, what = near * near, "air"
        for i in range(cx - reach, cx + reach + 1):
            for j in range(cy - reach, cy + reach + 1):
                for qx, qy, kind in self.cells.get((i, j), ()):
                    d = (qx - px) ** 2 + (qy - py) ** 2
                    if d <= best:
                        best, what = d, kind
        return what


def report(path: str, near: float) -> dict:
    out = []
    below = None
    for z, moves in layers(path):
        watched = [m for m in moves if m[4] in WATCH]
        if watched:
            row = {"z": z}
            for key in WATCH.values():
                row[f"{key}_mm"] = 0.0
                row[f"{key}_below"] = defaultdict(float)
            for x0, y0, x1, y1, kind in watched:
                key = WATCH[kind]
                for px, py, step in steps(x0, y0, x1, y1):
                    row[f"{key}_mm"] += step
                    row[f"{key}_below"][below.nearest(px, py, near) if below else "air"] += step
            for key in WATCH.values():
                row[f"{key}_mm"] = round(row[f"{key}_mm"], 2)
                row[f"{key}_below"] = {k: round(v, 2) for k, v in sorted(row[f"{key}_below"].items())}
            out.append(row)
        below = Below(moves)
    totals = {f"{key}_mm": round(sum(r[f"{key}_mm"] for r in out), 2) for key in WATCH.values()}
    return {"file": path, "near_mm": near, "layers": out, "totals": totals}


def show(r: dict) -> None:
    print(r["file"])
    for row in r["layers"]:
        if row["overhang_mm"] < 0.5 and row["bridge_mm"] < 0.5:
            continue
        under = row["bridge_below"]
        most = max(under, key=under.get) if under else "-"
        share = 100 * under[most] / row["bridge_mm"] if under and row["bridge_mm"] else 0
        print(
            f"  z {row['z']:6.2f}  overhang perimeter {row['overhang_mm']:7.1f} mm"
            f" (over air {row['overhang_below'].get('air', 0):6.1f})"
            f"  bridge infill {row['bridge_mm']:7.1f} mm (over air {under.get('air', 0):6.1f};"
            f" most over {most}, {share:.0f} %)"
        )
    t = r["totals"]
    print(f"  total     overhang perimeter {t['overhang_mm']:7.1f} mm  bridge infill {t['bridge_mm']:7.1f} mm")


def main(argv: list[str]) -> int:
    as_json = "--json" in argv
    args = [a for a in argv if a != "--json"]
    near = 3.0
    if "--near" in args:
        i = args.index("--near")
        near = float(args[i + 1])
        del args[i : i + 2]
    if not args:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        return 2
    reports = [report(p, near) for p in args]
    if as_json:
        print(json.dumps(reports if len(reports) > 1 else reports[0], indent=1))
    else:
        for r in reports:
            show(r)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
