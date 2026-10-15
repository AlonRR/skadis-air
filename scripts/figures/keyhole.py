# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["matplotlib", "shapely"]
# ///
"""Draw docs/figures/keyhole.png: a keyhole in a board's top-left corner tile, for mounting-ikea's
questions (D155 to D158), and two ways to hold its screw head, cut along the keyhole.

    uv run scripts/figures/keyhole.py

The slots and the grid are the board's own (docs/skadis-standard.md: a 5.2 x 15.2 mm slot with a 1 mm
chamfer, a 40 mm tile, the screw 10 mm in from both edges, D73); the screw is a 4 mm pan head, 8 mm
across and about 3.2 mm tall (ISO 7045, as vendors list it). The keyhole's sizes are the proposal.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from shapely.geometry import LineString, Point, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "keyhole.png"

INK, MUTED, PLASTIC, RECESS, HEAD, WALL = "#16222c", "#5a6773", "#c9cdd1", "#e3e7ea", "#0469b0", "#9aa7b5"
T = 5.0  # board thickness
SLOT_W, SLOT_H, CHAMFER = 5.2, 15.2, 1.0
SHANK = 4.5  # the screw hole, D76
HEAD_D, HEAD_K = 8.0, 3.2  # the pan head
ENTRY = 9.0  # the head and 1 mm to spare
SLIDE = 9.0  # from the entry's centre up to where the screw rests
DEPTH = 3.5  # the front channel: the head's 3.2 mm and a little
REST = (10.0, 30.0)  # 10 mm in from the left and top edges of the tile (D73)


def stadium(x, y, w, h):
    return LineString([(x, y - (h - w) / 2), (x, y + (h - w) / 2)]).buffer(w / 2, quad_segs=32)


def fill(ax, geom, colour, edge=INK, lw=0.8):
    for poly in getattr(geom, "geoms", [geom]):
        if poly.is_empty:
            continue
        ax.fill(*poly.exterior.xy, fc=colour, ec=edge, lw=lw)
        for hole in poly.interiors:
            ax.fill(*hole.xy, fc="white", ec=edge, lw=lw)


def front(ax):
    tile = box(0, 0, 40, 40)
    corners = [(0, 40), (40, 40), (0, 0), (40, 0), (20, 20)]
    slots = unary_union([stadium(x, y, SLOT_W + 2 * CHAMFER, SLOT_H + 2 * CHAMFER) for x, y in corners])
    x, y = REST
    entry_y = y - SLIDE
    entry = Point(x, entry_y).buffer(ENTRY / 2, quad_segs=32)
    through = unary_union([entry, LineString([(x, entry_y), (x, y)]).buffer(SHANK / 2, quad_segs=32)])
    channel = LineString([(x, entry_y), (x, y)]).buffer(ENTRY / 2, quad_segs=32)
    fill(ax, tile.difference(slots).difference(channel), PLASTIC)
    fill(ax, channel.difference(through), RECESS, lw=0.6)
    ax.add_patch(plt.Circle((x, y), HEAD_D / 2, fc="none", ec=HEAD, lw=1.4, ls=":"))
    ax.annotate("the screw rests here,\n10 mm in (D73)", (x + 5, y + 2.5), fontsize=7.5, color=INK)
    ax.annotate(f"the head goes in here,\n{ENTRY:g} mm across", (x - 8.5, entry_y - 10.5), fontsize=7.5, color=INK)
    ax.annotate("", (x - 6.3, y), (x - 6.3, entry_y), arrowprops=dict(arrowstyle="<->", color=MUTED, lw=0.7))
    ax.annotate(f"{SLIDE:g} mm", (x - 9.8, entry_y + SLIDE / 2 - 0.4), fontsize=7.5, color=MUTED)
    ax.set_xlim(-2, 42)
    ax.set_ylim(-2, 42)
    ax.set_aspect("equal")
    ax.set_title(
        "The top-left corner tile, from the front;\nin pale grey, the channel A sinks the head in",
        fontsize=9.5,
        color=INK,
    )
    ax.axis("off")


def section(ax, kind):
    """Cut along the keyhole; z = 0 is the front face, at the bottom (printed face down); the wall above."""
    x0, x1 = -13.0, 13.0
    entry, rest = -SLIDE / 2, SLIDE / 2
    board = box(x0, 0, x1, T)
    slot = box(entry, 0, rest + SHANK / 2, T) if kind == "through" else box(entry, DEPTH, rest + SHANK / 2, T)
    voids = [box(entry - ENTRY / 2, 0, entry + ENTRY / 2, T), slot]
    if kind == "channel":
        voids.append(box(entry - ENTRY / 2, 0, rest + ENTRY / 2, DEPTH))
    fill(ax, board.difference(unary_union(voids)), PLASTIC)
    head_z = DEPTH - HEAD_K if kind == "channel" else -HEAD_K
    fill(ax, box(x0, T, x1, T + 1.6), WALL, edge="none")
    fill(ax, box(rest - HEAD_D / 2, head_z, rest + HEAD_D / 2, head_z + HEAD_K), HEAD, lw=0.6)
    fill(ax, box(rest - 2, head_z + HEAD_K, rest + 2, T + 1.6), HEAD, lw=0.6)
    ax.annotate("wall", (x0 + 0.4, T + 2.2), fontsize=7.5, color=MUTED)
    ax.annotate("front", (x0 + 0.4, -1.7), fontsize=7.5, color=MUTED)
    if kind == "channel":
        title = f"A. Recessed: the head in a {DEPTH:g} mm channel from the front, below the face"
        note = f"{T - DEPTH:g} mm of board holds the head"
    else:
        title = f"B. Through: the head stands {HEAD_K:g} mm proud of the front"
        note = f"all {T:g} mm of board holds the head"
    ax.annotate(note, (x1 + 0.6, T / 2 - 0.4), fontsize=7.5, color=INK)
    ax.set_xlim(x0, x1 + 13)
    ax.set_ylim(-4.5, T + 3.5)
    ax.set_aspect("equal")
    ax.set_title(title, fontsize=9.5, color=INK)
    ax.axis("off")


fig = plt.figure(figsize=(11.5, 5.4))
grid = fig.add_gridspec(2, 2, width_ratios=[1, 1.3])
front(fig.add_subplot(grid[:, 0]))
section(fig.add_subplot(grid[0, 1]), "channel")
section(fig.add_subplot(grid[1, 1]), "through")
TITLE = "A keyhole for a 4 mm pan-head screw (8 mm head): the board drops onto the screw and lifts off it"
fig.suptitle(TITLE, fontsize=11, color=INK)
fig.tight_layout(rect=(0, 0, 1, 0.93))
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=150)
print("wrote", OUT.relative_to(ROOT))
