# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Draw docs/figures/tile-seams.png: three ways printed tiles can keep the SKADIS slot grid across a seam (D15).

    uv run scripts/figures/tile-seams.py

Every slot drawn is checked against the panel's slot grid first, so the figure cannot show an arrangement
that does not work: tiles turned 180 degrees keep the grid when the seams fall between slot columns, and
tiles cut through slot centres in 40 mm steps keep it, half a slot on each side of a seam (the design the
owner chose, D15, 12 Oct 2026). A slot cut anywhere but through its centre stops the script.
Uses the Segoe UI fonts that come with Windows.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "tile-seams.png"

K = 3.2  # pixels per mm
TILE, TURNED, MIRRORED = (222, 222, 218), (196, 214, 236), (226, 212, 236)
SEAM, SLOT, TXT, NOTE, DIM = (210, 40, 40), (70, 70, 74), (30, 30, 30), (60, 60, 60), (0, 110, 60)
BACKGROUND = (248, 248, 248)


def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/segoeui%s.ttf" % ("b" if bold else ""), size)


def on_grid(x, y, phase):
    """The SKADIS grid in wall millimetres: a 40 mm grid plus a second one shifted 20 mm in x and y."""
    a = (x - phase) % 40 == 0 and (y - phase) % 40 == 0
    b = (x - phase - 20) % 40 == 0 and (y - phase - 20) % 40 == 0
    return a or b


def base_slots(w, h, phase, margin):
    """Slot centres of the tile as printed, in its own frame: grid points at least `margin` from each edge."""
    return [(x, y) for x in range(0, w + 1, 5) for y in range(0, h + 1, 5)
            if on_grid(x, y, phase) and margin[0] <= x <= w - margin[0] and margin[1] <= y <= h - margin[1]]


def place(slots, w, h, how):
    if how == "turned":
        return [(w - x, h - y) for x, y in slots]
    if how == "mirror-x":
        return [(w - x, y) for x, y in slots]
    if how == "mirror-y":
        return [(x, h - y) for x, y in slots]
    return slots


def draw_wall(d, ox, oy, wall_h, tiles, phase, margin):
    """tiles: (x0, y0, w, h, how, label). Raises if any slot drawn is off the wall's grid."""
    for x0, y0, w, h, how, label in tiles:
        X0, Y0 = ox + x0 * K, oy + (wall_h - y0 - h) * K
        fill = TILE if how == "same" else TURNED if how == "turned" else MIRRORED
        d.rectangle([X0, Y0, X0 + w * K, Y0 + h * K], fill=fill, outline=SEAM, width=3)
        for x, y in place(base_slots(w, h, phase, margin), w, h, how):
            if not on_grid(x0 + x, y0 + y, phase):
                raise SystemExit(f"slot off the grid at ({x0 + x}, {y0 + y}) in a '{how}' tile")
            cx, cy = ox + (x0 + x) * K, oy + (wall_h - y0 - y) * K
            d.rounded_rectangle([cx - 2.5 * K, cy - 7.5 * K, cx + 2.5 * K, cy + 7.5 * K], radius=2.5 * K, fill=SLOT)
        if label:
            c = (X0 + w * K / 2, Y0 + h * K / 2)
            b = d.multiline_textbbox(c, label, font=font(20, True), anchor="mm", align="center")
            d.rectangle([b[0] - 6, b[1] - 4, b[2] + 6, b[3] + 4], fill=(255, 255, 255), outline=(40, 70, 120))
            d.multiline_text(c, label, font=font(20, True), fill=(40, 70, 120), anchor="mm", align="center")


def grid_range(a, b):
    """Every 20 mm grid line from a to b, in wall millimetres: the steps must sit on the grid, not on a tile edge."""
    return range(math.floor(a / 20) * 20, math.ceil(b / 20) * 20 + 1, 20)


def draw_cut_wall(d, ox, oy, wall_w, wall_h, tiles, outer_open, background):
    """The chosen design (D15): tiles cut through slot columns and rows. A slot whose centre lies on an open
    edge is cut in half; on a closed edge it is left out. tiles: (x0, y0, w, h, how, label); outer_open: the
    wall's open sides among {"left", "right", "bottom", "top"}. Raises on a slot cut anywhere but its centre."""
    for x0, y0, w, h, how, _ in tiles:
        X0, Y0 = ox + x0 * K, oy + (wall_h - y0 - h) * K
        fill = TILE if how == "same" else TURNED if how == "turned" else MIRRORED
        d.rectangle([X0, Y0, X0 + w * K, Y0 + h * K], fill=fill)
    edges = {"left": 0, "right": wall_w, "bottom": 0, "top": wall_h}
    for x in grid_range(-20, wall_w + 20):
        for y in grid_range(-20, wall_h + 20):
            if not on_grid(x, y, 0):
                continue
            touches = -2.5 < x < wall_w + 2.5 and -7.5 < y < wall_h + 7.5
            if not touches:
                continue
            for side, at in edges.items():
                on_this = (x == at) if side in ("left", "right") else (y == at)
                if on_this and side not in outer_open:
                    break                                  # a closed side: the slot is left out
            else:
                crossing = [s for s, at in edges.items()
                            if (s in ("left", "right") and abs(x - at) < 2.5 and x != at)
                            or (s in ("bottom", "top") and abs(y - at) < 7.5 and y != at)]
                for x0, y0, w, h, _, _ in tiles:           # inner seams must run through slot centres too
                    for at in (x0, x0 + w):
                        if 0 < at < wall_w and abs(x - at) < 2.5 and x != at and y0 - 7.5 < y < y0 + h + 7.5:
                            crossing.append(f"seam x={at}")
                    for at in (y0, y0 + h):
                        if 0 < at < wall_h and abs(y - at) < 7.5 and y != at and x0 - 2.5 < x < x0 + w + 2.5:
                            crossing.append(f"seam y={at}")
                if crossing:
                    raise SystemExit(f"slot at ({x}, {y}) cut off its centre by {crossing}")
                cx, cy = ox + x * K, oy + (wall_h - y) * K
                d.rounded_rectangle([cx - 2.5 * K, cy - 7.5 * K, cx + 2.5 * K, cy + 7.5 * K], radius=2.5 * K, fill=SLOT)
    # trim the half slots on the wall's open outer sides back to the wall
    X0, Y0, X1, Y1 = ox, oy, ox + wall_w * K, oy + wall_h * K
    m = 8 * K  # a half slot reaches 7.5 mm past an edge; no further, or it paints over a neighbouring drawing
    for box in ([X0 - m, Y0 - m, X0, Y1 + m], [X1, Y0 - m, X1 + m, Y1 + m],
                [X0, Y0 - m, X1, Y0], [X0, Y1, X1, Y1 + m]):
        d.rectangle([box[0] + (1 if box[0] == X1 else 0), box[1], box[2] - (1 if box[2] == X0 else 0), box[3]],
                    fill=background)
    for x0, y0, w, h, how, text in tiles:
        X0, Y0 = ox + x0 * K, oy + (wall_h - y0 - h) * K
        d.rectangle([X0, Y0, X0 + w * K, Y0 + h * K], outline=SEAM, width=3)
        if text:
            c = (X0 + w * K / 2, Y0 + h * K / 2)
            b = d.multiline_textbbox(c, text, font=font(20, True), anchor="mm", align="center")
            d.rectangle([b[0] - 6, b[1] - 4, b[2] + 6, b[3] + 4], fill=(255, 255, 255), outline=(40, 70, 120))
            d.multiline_text(c, text, font=font(20, True), fill=(40, 70, 120), anchor="mm", align="center")


def label(d, ox, oy, wall_h, x_mm, y_mm, text):
    X, Y = ox + x_mm * K, oy + (wall_h - y_mm) * K
    b = d.textbbox((X, Y), text, font=font(20, True), anchor="lm")
    d.rectangle([b[0] - 3, b[1] - 2, b[2] + 3, b[3] + 2], fill=(255, 255, 255), outline=DIM)
    d.text((X, Y), text, font=font(20, True), fill=DIM, anchor="lm")


def text_block(d, x, y, title, lines, recommended=False):
    d.text((x, y), title, font=font(26, True), fill=TXT)
    y += 36
    if recommended:
        d.text((x, y), "(recommended)", font=font(22, True), fill=DIM)
        y += 34
    for k, line in enumerate(lines):
        d.text((x, y + 6 + k * 31), line, font=font(22), fill=NOTE)


def main():
    img = Image.new("RGB", (2150, 2150), BACKGROUND)
    d = ImageDraw.Draw(img)
    d.text((30, 20), "D15: how printed tiles keep the SKÅDIS slot grid across a seam: (c) is the one chosen", font=font(30, True), fill=TXT)
    subtitle = ("Front view, to scale. Red lines are seams; the dark stadiums are the 5 × 15 mm slots on the 40 mm grid "
                "with its 20 mm offset. Every slot is checked against that grid.")
    d.text((30, 64), subtitle, font=font(21), fill=(80, 80, 80))

    # (a) seams between slot columns; every tile the same; 40 mm steps
    ox, oy, wh = 60, 150, 240
    tiles = [
        (0, 0, 120, 120, "same", ""), (120, 0, 120, 120, "same", ""),
        (0, 120, 120, 120, "same", ""), (120, 120, 120, 120, "same", ""),
    ]
    draw_wall(d, ox, oy, wh, tiles, 10, (10, 10))
    Y = oy + (wh - 226) * K
    d.line([ox + 112.5 * K, Y, ox + 120 * K, Y], fill=DIM, width=3)
    label(d, ox, oy, wh, 123, 226, "7.5 mm")
    X = ox + 131 * K
    d.line([X, oy + (wh - 122.5) * K, X, oy + (wh - 120) * K], fill=DIM, width=3)
    label(d, ox, oy, wh, 134, 128, "2.5 mm")
    text_block(d, ox + 240 * K + 40, oy, "(a)  40 mm steps, every tile the same", [
        "Tile sizes 40, 80, 120 … mm, in both directions.",
        "Every slot whole, none missing at a seam.",
        "Any tile goes in any place: one file per size. A join",
        "built into the edges can be a tongue on one side and",
        "a groove on the other.",
        "Material beside a seam: 7.5 mm at a vertical seam,",
        "2.5 mm at a straight horizontal seam (a stepped seam",
        "round the slot ends leaves 7.5 mm there too).",
    ])

    # (b) seams between slot columns; every other tile turned 180 degrees; 20 mm steps one way
    oy = 150 + 240 * K + 80
    wh = 120
    tiles = [
        (0, 0, 100, 120, "same", ""), (100, 0, 100, 120, "turned", "turned\n180°"),
        (200, 0, 100, 120, "same", ""),
    ]
    draw_wall(d, ox, oy, wh, tiles, 10, (10, 10))
    text_block(d, ox + 300 * K + 40, oy, "(b)  20 mm steps one way, every other tile turned", [
        "Tile sizes 60, 100, 140 … mm in ONE direction; the",
        "other stays at 40 mm steps. Every slot whole.",
        "One file, printed once and placed turned every other time.",
        "A join built into the edges must be the same on both",
        "sides, since turning swaps them: a tongue would meet a",
        "tongue. Separate connectors work either way.",
    ])

    # (c) the chosen design (D15): seams cut through slot columns and rows, half a slot on each open side
    oy = oy + 120 * K + 80
    wh = 160
    tiles = [
        (0, 0, 80, 80, "same", "2 sides\nclosed"), (80, 0, 80, 80, "same", "1 side\nclosed"),
        (0, 80, 80, 80, "same", "1 side\nclosed"), (80, 80, 80, 80, "same", "all\nopen"),
    ]
    draw_cut_wall(d, ox, oy, 160, wh, tiles, {"right", "top"}, BACKGROUND)
    # the smallest tile on its own, every side open: one whole slot and four quarter slots
    sx = ox + 160 * K + 70
    all_open = {"left", "right", "bottom", "top"}
    draw_cut_wall(d, sx, oy + 120 * K, 40, 40, [(0, 0, 40, 40, "same", "")], all_open, BACKGROUND)
    d.text((sx + 20 * K, oy + 120 * K - 14), "40 × 40", font=font(20, True), fill=TXT, anchor="mb")
    text_block(d, sx + 40 * K + 50, oy, "(c)  CHOSEN (D15): cut through slot centres", [
        "As Azat's and AU3D's boards: tile sizes in 40 mm steps, the",
        "smallest 40 × 40 mm, one whole slot in its centre and a",
        "quarter slot at each corner. Every tile is the same.",
        "Neighbours' halves and quarters make whole slots, so no",
        "slot is missing and the grid runs on across the seams.",
        "Each side is open (half and quarter slots: to join a",
        "neighbour, or to add one later) or closed (a solid edge).",
        "Open or closed is chosen side by side (D34): in this wall",
        "two tiles have one side closed, one has two, one is open",
        "all round. By default (D37) a single panel is open all",
        "round, and a wall is closed round its outer edge and open",
        "at its seams; a wall's panels are n × 40 mm, n chosen.",
        "An open side has a notch every 40 mm: 2.5 mm deep down a",
        "side, 7.5 mm deep along the top and bottom. Joins built",
        "into the edges must fit between the notches.",
    ])

    img.save(OUT)
    print(OUT.relative_to(ROOT), img.size)


if __name__ == "__main__":
    main()
