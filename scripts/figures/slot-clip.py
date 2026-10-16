# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["matplotlib", "shapely"]
# ///
"""Draw docs/figures/slot-clip.png: the slot clip (conn-slot-clip; D185) for 2 boards and for 4, from the front,
and cut through a peg, for its questions (D187 to D189).

    uv run scripts/figures/slot-clip.py

The slots are the SKADIS grid (docs/skadis-standard.md: 5.2 x 15.2 mm, a 40 mm grid and a second shifted
20 mm); seams are open, half a slot on each side (D15). The clip's sizes are the proposal.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import PathPatch
from matplotlib.path import Path as MplPath
from shapely.geometry import LineString, Point, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "slot-clip.png"
INK, MUTED, PLASTIC, CLIP, WALL, SEAM = "#16222c", "#5a6773", "#c9cdd1", "#d9822b", "#9aa7b5", "#0469b0"
SLOT_W, SLOT_H = 5.2, 15.2
PEG_W, PEG_H = 4.8, 14.8  # the slot as the board cuts it (5 x 15 and 0.2 mm, D40) less a 0.4 mm peg clearance
BAR = 10.0  # the bar's width behind the boards, as wide as a standoff (C83)
POST = 20.0  # a round post behind each peg, where the clip meets the boards (C192)
HOOK_ROOM = 8.0  # kept clear behind the boards between the pegs: a hook's 6 mm and 2 mm (C99)
RECESS = 2.5  # the pegs stop this far short of the front face


def stadium(x, y, w, h):
    return LineString([(x, y - (h - w) / 2), (x, y + (h - w) / 2)]).buffer(w / 2, quad_segs=24)


def fill(ax, geom, colour, edge=INK, lw=0.8, alpha=1.0, ls="-"):
    """A shape with its holes left open, so what lies under a hole shows through."""
    for poly in getattr(geom, "geoms", [geom]):
        if poly.is_empty:
            continue
        rings = [poly.exterior, *poly.interiors]
        path = MplPath.make_compound_path(*(MplPath(list(ring.coords), closed=True) for ring in rings))
        ax.add_patch(PathPatch(path, fc=colour, ec=edge, lw=lw, alpha=alpha, ls=ls))


def boards(ax, size, seams):
    area = box(0, 0, size, size)
    slots = []
    for i in range(0, size + 1, 40):
        for j in range(0, size + 1, 40):
            slots.append(stadium(i, j, SLOT_W, SLOT_H))
    for i in range(20, size, 40):
        for j in range(20, size, 40):
            slots.append(stadium(i, j, SLOT_W, SLOT_H))
    fill(ax, area.difference(unary_union(slots)), PLASTIC, edge="none")
    for (x0, y0), (x1, y1) in seams:
        ax.plot([x0, x1], [y0, y1], color=SEAM, lw=1.4, ls="--")
    ax.set_xlim(-4, size + 4)
    ax.set_ylim(-4, size + 4)
    ax.set_aspect("equal")
    ax.axis("off")


def two(ax):
    boards(ax, 80, [((40, 0), (40, 80))])
    pegs = [(20, 20), (60, 20)]  # the nearest whole slot on each side of the seam, 40 mm apart
    bar = unary_union([LineString(pegs).buffer(BAR / 2, cap_style="round"), *(Point(p).buffer(POST / 2) for p in pegs)])
    fill(ax, bar, CLIP, edge=CLIP, alpha=0.35, ls="--")
    for x, y in pegs:
        fill(ax, stadium(x, y, PEG_W, PEG_H), CLIP, edge=INK)
    ax.annotate("seam", (41, 72), fontsize=7.5, color=SEAM)
    ax.set_title("For 2 boards: a bar behind the seam,\na peg in the nearest whole slot each side", fontsize=9, color=INK)


def four(ax):
    boards(ax, 80, [((40, 0), (40, 80)), ((0, 40), (80, 40))])
    pegs = [(20, 20), (60, 20), (60, 60), (20, 60)]  # the four whole slots round the corner where they meet
    # a square ring through the four pegs: its sides cross no slot, so the slot where the four meet stays free
    ring = LineString([*pegs, pegs[0]]).buffer(BAR / 2, cap_style="round", join_style="round")
    ring = unary_union([ring, *(Point(p).buffer(POST / 2) for p in pegs)])
    fill(ax, ring, CLIP, edge=CLIP, alpha=0.35, ls="--")
    for x, y in pegs:
        fill(ax, stadium(x, y, PEG_W, PEG_H), CLIP, edge=INK)
    title = "For 4 boards: a square ring behind the corner, a peg in\neach board's nearest whole slot, the slot they share free"
    ax.set_title(title, fontsize=9, color=INK)


def section(ax):
    """Cut through the two pegs; the front at the bottom, the wall at the top, the boards on standoffs."""
    t, gap = 5.0, 20.0
    slots = unary_union([box(20 - SLOT_W / 2, 0, 20 + SLOT_W / 2, t), box(60 - SLOT_W / 2, 0, 60 + SLOT_W / 2, t)])
    for board in (box(-10, 0, 40, t), box(40, 0, 90, t)):  # the two boards, meeting at the seam, x = 40
        fill(ax, board.difference(slots), PLASTIC, lw=0.6)
    posts = [box(x - POST / 2, t, x + POST / 2, t + HOOK_ROOM) for x in (20, 60)]
    pegs = [box(x - PEG_W / 2, RECESS, x + PEG_W / 2, t + 0.1) for x in (20, 60)]
    clip = unary_union([box(20 - POST / 2, t + HOOK_ROOM, 60 + POST / 2, t + gap), *posts, *pegs])
    fill(ax, clip, CLIP, lw=0.6)
    fill(ax, box(-10, t + gap, 90, t + gap + 2), WALL, edge="none")
    ax.annotate("wall", (-9, t + gap + 3), fontsize=7.5, color=MUTED)
    ax.annotate("the gap the\nstandoffs\nleave, 20 mm", (-9, t + 5), fontsize=7, color=MUTED)
    ax.annotate("8 mm clear\nfor hooks\n(C99)", (31, t + 0.8), fontsize=6.5, color=MUTED)
    ax.annotate("pegs stop 2.5 mm\nshort of the front", (66.5, -4.6), fontsize=7.5, color=MUTED)
    ax.annotate("front", (-9, -3.2), fontsize=7.5, color=MUTED)
    ax.annotate("seam", (38.5, -3.2), fontsize=7.5, color=SEAM)
    ax.plot([40, 40], [0, t], color=SEAM, lw=1.2, ls="--")
    ax.set_xlim(-12, 92)
    ax.set_ylim(-6, t + gap + 6)
    ax.set_aspect("equal")
    ax.axis("off")
    title = "Cut through the pegs: the clip reaches the wall, which keeps it on, and stands clear of the boards between its pegs"
    ax.set_title(title, fontsize=9, color=INK)


fig = plt.figure(figsize=(11, 6.2))
grid = fig.add_gridspec(2, 2, height_ratios=[1.35, 1])
two(fig.add_subplot(grid[0, 0]))
four(fig.add_subplot(grid[0, 1]))
section(fig.add_subplot(grid[1, :]))
TITLE = "The slot clip, seen from the front: the bar (pale) is behind the boards, the pegs (orange) in the slots"
fig.suptitle(TITLE, fontsize=10.5, color=INK)
fig.tight_layout(rect=(0, 0, 1, 0.95))
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=150)
print("wrote", OUT.relative_to(ROOT))
