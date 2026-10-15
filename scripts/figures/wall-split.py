# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["matplotlib"]
# ///
"""Draw docs/figures/wall-split.png: one wall split into panels two ways, for tiling's questions (D175 to D178).

    uv run scripts/figures/wall-split.py

A 440 x 280 mm wall on a 200 x 200 mm bed, so no panel is more than 5 tiles (200 mm) each way: (A) full
panels from the bottom left and what is left over in the top row and the right column; (B) the panels as even
as they can be, none larger than the bed. The slots are the SKADIS grid (docs/skadis-standard.md); the wall's
outer edge is closed and its seams open, half a slot on each side (D15, D37).
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "wall-split.png"
INK, MUTED, PLASTIC, SEAM = "#16222c", "#5a6773", "#c9cdd1", "#0469b0"
TILE = 40
WALL = (11, 7)  # tiles across and up: 440 x 280 mm
MOST = 5  # tiles: 200 mm, the bed


def full_then_rest(n: int) -> list[int]:
    return [MOST] * (n // MOST) + ([n % MOST] if n % MOST else [])


def even(n: int) -> list[int]:
    parts = -(-n // MOST)
    base, extra = divmod(n, parts)
    return [base + 1] * extra + [base] * (parts - extra)


def slot(ax, x, y):
    w, h = 5.2, 15.2
    ax.add_patch(FancyBboxPatch((x, y - h / 2 + w / 2), 0, h - w, boxstyle=f"round,pad={w / 2}", fc="white", ec=MUTED, lw=0.4))


def draw(ax, cols, rows, title):
    width, height = WALL[0] * TILE, WALL[1] * TILE
    x = 0
    for c in cols:
        y = 0
        for r in rows:
            ax.add_patch(Rectangle((x, y), c * TILE, r * TILE, fc=PLASTIC, ec="none"))
            ax.annotate(f"{c * TILE} × {r * TILE}", (x + c * TILE / 2, y + r * TILE / 2), ha="center", va="center",
                        fontsize=8, color=INK, bbox=dict(fc="white", ec="none", alpha=0.8, pad=1))
            y += r * TILE
        x += c * TILE
    for i in range(WALL[0] + 1):
        for j in range(WALL[1] + 1):
            on_edge = i in (0, WALL[0]) or j in (0, WALL[1])
            if not on_edge:
                slot(ax, i * TILE, j * TILE)
    for i in range(WALL[0]):
        for j in range(WALL[1]):
            slot(ax, i * TILE + 20, j * TILE + 20)
    # seams, open: half a slot on each side; the outer edge, closed
    x = 0
    for c in cols[:-1]:
        x += c * TILE
        ax.plot([x, x], [0, height], color=SEAM, lw=1.4, ls="--")
    y = 0
    for r in rows[:-1]:
        y += r * TILE
        ax.plot([0, width], [y, y], color=SEAM, lw=1.4, ls="--")
    ax.add_patch(Rectangle((0, 0), width, height, fc="none", ec=INK, lw=1.6))
    kinds = len({(c, r) for c in cols for r in rows})
    ax.set_title(f"{title}\n{len(cols) * len(rows)} panels, {kinds} sizes", fontsize=9.5, color=INK)
    ax.set_xlim(-10, width + 10)
    ax.set_ylim(-10, height + 10)
    ax.set_aspect("equal")
    ax.axis("off")


fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))
A = "A. Full panels from the bottom left, the rest at the top and right"
draw(axes[0], full_then_rest(WALL[0]), full_then_rest(WALL[1]), A)
draw(axes[1], even(WALL[0]), even(WALL[1]), "B. The panels as even as they can be")
TITLE = "A 440 × 280 mm wall on a 200 × 200 mm bed: closed round the outside, open at the dashed seams"
fig.suptitle(TITLE, fontsize=10.5, color=INK)
fig.tight_layout(rect=(0, 0, 1, 0.94))
OUT.parent.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT, dpi=150)
print("wrote", OUT.relative_to(ROOT))
