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
mirrored tiles keep it only when the seams fall where a slot column would be (that column left out).
Uses the Segoe UI fonts that come with Windows.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "tile-seams.png"

K = 3.2  # pixels per mm
TILE, TURNED, MIRRORED = (222, 222, 218), (196, 214, 236), (226, 212, 236)
SEAM, SLOT, TXT, NOTE, DIM = (210, 40, 40), (70, 70, 74), (30, 30, 30), (60, 60, 60), (0, 110, 60)


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
    img = Image.new("RGB", (2150, 2150), (248, 248, 248))
    d = ImageDraw.Draw(img)
    d.text((30, 20), "D15: how printed tiles keep the SKÅDIS slot grid across a seam", font=font(30, True), fill=TXT)
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
    ], recommended=True)

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

    # (c) seams where a slot column (or row) would be, that column left out; mirrored neighbours; 20 mm steps
    oy = oy + 120 * K + 80
    wh = 200
    tiles = [
        (0, 0, 100, 100, "same", ""), (100, 0, 100, 100, "mirror-x", "mirrored"),
        (0, 100, 100, 100, "mirror-y", "mirrored"), (100, 100, 100, 100, "turned", "turned\n180°"),
    ]
    draw_wall(d, ox, oy, wh, tiles, 0, (20, 20))
    text_block(d, ox + 200 * K + 40, oy, "(c)  20 mm steps both ways, mirrored neighbours", [
        "Tile sizes 60, 100, 140 … mm, in both directions: the layout",
        "of AU3D's 'Infinity' boards; IKEA's own boards butted",
        "together behave the same way.",
        "The seam falls where a slot column (or row) would be, and",
        "that column is left out: one column of slots is MISSING at",
        "every seam. Material beside a seam: 17.5 mm and 12.5 mm.",
        "Neighbours are mirror images, so a board with a different",
        "back (standoffs, chamfers) needs a second, mirrored file.",
        "Built-in edge joins: the same restriction as (b).",
    ])

    img.save(OUT)
    print(OUT.relative_to(ROOT), img.size)


if __name__ == "__main__":
    main()
