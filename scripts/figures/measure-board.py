# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Draw docs/figures/measure-board.png: what to measure with calipers on a real SKADIS board (T17), and on
the printed fit coupon and seam-test pair (T109, Q110).

    uv run scripts/figures/measure-board.py

Each measurement has a letter, so the answers can come back as "a 5.20, b 15.15". The values written as
"about" are worked out here from the cited figures in docs/skadis-standard.md (a 5.2 x 15.2 mm slot on a
real board, a 40 mm pitch, the first slot centre 20 mm in), so the drawing and its text cannot disagree;
every slot drawn is checked against the SKADIS grid first. Uses the Segoe UI fonts that come with Windows.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "measure-board.png"

# The cited figures (docs/skadis-standard.md), all <<CONFIRM>> until measured: what the answers check.
SLOT_W, SLOT_H = 5.2, 15.2  # a slot on a real board, as measured by ShugyoPrint
PITCH = 40  # the grid, with a second grid shifted 20 mm in x and y
MARGIN = 20  # the first slot centre from the edge
THICKNESS = 5
SPACER = 20  # how far IKEA's spacers hold the board off the wall
HOLE = (9, 9, 2.5)  # a corner hole, for the drawing only: IKEA's position and size are not published

BACKGROUND, BOARD, PRINTED = (248, 248, 248), (222, 222, 218), (206, 220, 236)
SLOT, EDGE, TXT, NOTE, DIM = (70, 70, 74), (90, 90, 90), (30, 30, 30), (75, 75, 75), (0, 110, 60)


def font(size, bold=False):
    return ImageFont.truetype("C:/Windows/Fonts/segoeui%s.ttf" % ("b" if bold else ""), size)


def on_grid(x, y):
    """The SKADIS grid, from a corner whose first slot centre is MARGIN in."""
    a = (x - MARGIN) % PITCH == 0 and (y - MARGIN) % PITCH == 0
    b = (x - MARGIN - PITCH / 2) % PITCH == 0 and (y - MARGIN - PITCH / 2) % PITCH == 0
    return a or b


def nice(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


class Sheet:
    """Millimetres to pixels for one drawing: origin at its top-left, y downward, K pixels per mm."""

    def __init__(self, d, ox, oy, k):
        self.d, self.ox, self.oy, self.k = d, ox, oy, k

    def p(self, x, y):
        return (self.ox + x * self.k, self.oy + y * self.k)

    def slot(self, x, y, colour=SLOT):
        k = self.k
        cx, cy = self.p(x, y)
        self.d.rounded_rectangle(
            [cx - SLOT_W / 2 * k, cy - SLOT_H / 2 * k, cx + SLOT_W / 2 * k, cy + SLOT_H / 2 * k],
            radius=SLOT_W / 2 * k,
            fill=colour,
        )

    def arrow(self, tip, tail):
        (x1, y1), (x0, y0) = tip, tail
        ang = math.atan2(y1 - y0, x1 - x0)
        size = 9
        pts = [tip] + [(x1 - size * math.cos(ang + s * 0.42), y1 - size * math.sin(ang + s * 0.42)) for s in (1, -1)]
        self.d.polygon(pts, fill=DIM)

    def dim(self, a, b, letter, at):
        """A dimension from a to b (mm), arrows at both ends, its letter in a circle at `at` (mm)."""
        pa, pb = self.p(*a), self.p(*b)
        self.d.line([pa, pb], fill=DIM, width=3)
        self.arrow(pa, pb)
        self.arrow(pb, pa)
        c = self.p(*at)
        mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        if math.dist(c, mid) > 20:
            self.d.line([c, mid], fill=DIM, width=1)
        self.d.ellipse([c[0] - 15, c[1] - 15, c[0] + 15, c[1] + 15], fill=(255, 255, 255), outline=DIM, width=3)
        self.d.text(c, letter, font=font(20, True), fill=DIM, anchor="mm")


def text_block(d, x, y, title, rows, width_letter=46):
    """A heading, then rows of (letter, text); returns the y below it."""
    d.text((x, y), title, font=font(24, True), fill=TXT)
    y += 40
    for letter, text in rows:
        if letter:
            d.text((x, y), letter, font=font(21, True), fill=DIM)
        for line in text.split("\n"):
            d.text((x + width_letter, y), line, font=font(19), fill=NOTE)
            y += 26
        y += 8
    return y


def main():
    img = Image.new("RGB", (1860, 1590), BACKGROUND)
    d = ImageDraw.Draw(img)
    d.text((40, 24), "What to measure, with calipers, in mm to 0.05", font=font(34, True), fill=TXT)
    d.text(
        (40, 72),
        "Each measurement has a letter: reply with the letters and the numbers, such as "
        '"a 5.20, b 15.15". Measure twice and give both if they differ by more than 0.1.',
        font=font(20),
        fill=NOTE,
    )

    # 1. The real board, its front, top-left corner.
    W, H = 110, 95
    s = Sheet(d, 120, 235, 7)
    d.text((40, 125), "1. Your SKÅDIS board: the front, its top-left corner", font=font(26, True), fill=TXT)
    x0, y0 = s.p(0, 0)
    x1, y1 = s.p(W, H)
    d.rounded_rectangle([x0, y0, x1 + 40, y1 + 40], radius=8 * s.k, fill=BOARD, corners=(True, False, False, False))
    d.line([(x0 + 8 * s.k, y0), (x1, y0)], fill=EDGE, width=3)
    d.line([(x0, y0 + 8 * s.k), (x0, y1)], fill=EDGE, width=3)
    d.arc([x0, y0, x0 + 16 * s.k, y0 + 16 * s.k], 180, 270, fill=EDGE, width=3)
    d.rectangle([x1 + 1, y0 - 2, x1 + 60, y1 + 60], fill=BACKGROUND)  # the board goes on beyond the drawing
    d.rectangle([x0 - 2, y1 + 1, x1 + 60, y1 + 60], fill=BACKGROUND)
    d.text(s.p(W - 1, H + 3), "the board goes on", font=font(17), fill=NOTE, anchor="ra")
    # Whole slots only: a real board has none cut by its edge.
    slots = [
        (x, y)
        for x in range(0, W + 1, 5)
        for y in range(0, H + 1, 5)
        if on_grid(x, y) and SLOT_W / 2 <= x <= W - SLOT_W / 2 and SLOT_H / 2 <= y <= H - SLOT_H / 2
    ]
    hx, hy, hr = HOLE
    for x, y in slots:
        clear_x = abs(x - hx) - SLOT_W / 2 - hr
        clear_y = abs(y - hy) - SLOT_H / 2 - hr
        if max(clear_x, clear_y) < 1:
            raise SystemExit(f"the corner hole drawn at ({hx}, {hy}) runs into the slot at ({x}, {y})")
        s.slot(x, y)
    if (MARGIN, MARGIN) not in slots:
        raise SystemExit("e and f are drawn to a first slot that is not on the board")
    d.ellipse([*s.p(hx - hr, hy - hr), *s.p(hx + hr, hy + hr)], fill=SLOT)

    s.dim((60 - SLOT_W / 2, 20), (60 + SLOT_W / 2, 20), "a", (52, 6))
    s.dim((60 + SLOT_W / 2 + 3, 20 - SLOT_H / 2), (60 + SLOT_W / 2 + 3, 20 + SLOT_H / 2), "b", (70, 6))
    s.dim((60 + SLOT_W / 2, 60), (100 - SLOT_W / 2, 60), "d", (80, 60))
    s.dim((0, 60), (20 - SLOT_W / 2, 60), "e", (9, 70))
    s.dim((MARGIN, 0), (MARGIN, MARGIN - SLOT_H / 2), "f", (28, 5))
    s.dim((hx - hr, hy), (hx + hr, hy), "g", (-9, 19))
    s.dim((0, hy), (hx - hr, hy), "h", (-9, hy))
    s.dim((hx, 0), (hx, hy - hr), "i", (hx, -9))

    # The thickness, seen from the side.
    t = Sheet(d, 120, 950, 7)
    d.text((40, 910), "The board from its side edge", font=font(19, True), fill=TXT)
    d.rectangle([*t.p(0, 0), *t.p(70, THICKNESS)], fill=BOARD, outline=EDGE, width=2)
    t.dim((50, 0), (50, THICKNESS), "c", (58, 2.5))

    text_block(
        d,
        960,
        225,
        "On your board",
        [
            (
                "a",
                f"A slot's width, halfway up it. Inside jaws, their tips pushed\nhalfway into the slot, past its "
                f"rounded edge. About {nice(SLOT_W)}.",
            ),
            ("b", f"The same slot's height, end to end. Inside jaws. About {nice(SLOT_H)}."),
            (
                "c",
                f"The thickness, on plain board between slots, not at the\nedge. Outside jaws. About {nice(THICKNESS)}.",
            ),
            (
                "d",
                f"The strip between two slots side by side. Outside jaws, one\ntip in each slot. About "
                f"{nice(PITCH - SLOT_W)}: the {PITCH} mm pitch less a slot.",
            ),
            (
                "e",
                f"The side edge to the first slot in from it. Outside jaws: one\njaw on the edge, the other's tip in "
                f"the slot. About {nice(MARGIN - SLOT_W / 2)}.",
            ),
            (
                "f",
                f"The top edge to the end of the first slot below it, the same\nway. About {nice(MARGIN - SLOT_H / 2)}.",
            ),
            (
                "g",
                "The round hole in the corner, if your board has them: its\nwidth. Inside jaws. IKEA does not publish it.",
            ),
            ("h, i", "The side edge and the top edge to that hole, as e and f.\nNot published either."),
            ("j", f"Not drawn: one of IKEA's spacers, if you have them, its\nlength. About {nice(SPACER)}."),
        ],
        width_letter=56,
    )

    # 2. The printed parts, their smooth faces up: the faces that were on the bed, where the dots are.
    d.text(
        (40, 1050),
        "2. The printed coupon and seam pair: the smooth face up (it was on the bed; the dots are on it)",
        font=font(26, True),
        fill=TXT,
    )
    c = Sheet(d, 120, 1130, 4.2)
    d.rectangle([*c.p(0, 0), *c.p(160, 40)], fill=PRINTED, outline=EDGE, width=2)
    for i in range(4):
        x = 20 + 40 * i
        c.slot(x, 20)
        for j in range(i + 1):  # 1.6 mm dots, 3 mm apart, centred over the slot, 6 mm below the top edge
            dx = x + (j - i / 2) * 3
            d.ellipse([*c.p(dx - 0.8, 6 - 0.8), *c.p(dx + 0.8, 6 + 0.8)], fill=SLOT)
        d.text(
            c.p(x, 44),
            f"{i + 1} dot{'s' if i else ''}: {nice(0.1 * i) if i else '0'} mm",
            font=font(17),
            fill=NOTE,
            anchor="ma",
        )
    c.dim((20 - SLOT_W / 2, 20), (20 + SLOT_W / 2, 20), "a", (10, 33))
    c.dim((20 + SLOT_W / 2 + 2, 20 - SLOT_H / 2), (20 + SLOT_W / 2 + 2, 20 + SLOT_H / 2), "b", (31, 33))
    d.text(c.p(0, 52), "the fit coupon: a and b on every slot", font=font(18, True), fill=TXT)

    p = Sheet(d, 860, 1130, 4.2)  # the pair pushed together, the seam down the middle
    d.rectangle([*p.p(0, 0), *p.p(80, 80)], fill=PRINTED, outline=EDGE, width=2)
    d.line([p.p(40, 0), p.p(40, 80)], fill=EDGE, width=2)
    for x, y in [(20, 20), (60, 20), (20, 60), (60, 60), (40, 40)]:
        p.slot(x, y)
    p.dim((40 - SLOT_W / 2, 40), (40 + SLOT_W / 2, 40), "k", (40, 29))
    p.dim((20 + SLOT_W / 2, 60), (60 - SLOT_W / 2, 60), "l", (40, 72))
    d.text(p.p(0, 84), "the seam pair, pushed together", font=font(18, True), fill=TXT)

    text_block(
        d,
        1250,
        1120,
        "On the printed parts",
        [
            (
                "a, b",
                "On each coupon slot. The dots say which is which;\nthe slot whose a is nearest your board's a is "
                "the\nclearance to use.",
            ),
            (
                "k",
                "The slot across the seam: its width, as a. Compare\nit with a on the pair's other slots, printed at "
                "0.2.",
            ),
            (
                "l",
                f"The strip between the two slots facing each other\nacross the seam. About {nice(PITCH - SLOT_W)}, "
                "as d,\nif the 40 mm pitch holds across the seam.",
            ),
        ],
        width_letter=56,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
