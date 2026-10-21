# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Draw docs/figures/between-slots.svg: the questions D282 raises, seams that run between the slots.

    uv run scripts/figures/between-slots.py

Four panels, each a plan of the board's front, 1 mm to 6 px: seams through the slots (today, D15); seams between
them, the slot pattern moved 10 mm across and up; a corner tile so laid, where the corner screw hole lands on a slot
and the hooks' rooms leave little for a standoff; and where a slot clip's pegs can go at such a seam. Every slot is
placed from the SKADIS grid, and every distance printed is worked out from the same numbers, so the figure cannot
show a slot or a gap the grid does not have.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "figures" / "between-slots.svg"

PX = 6  # px a mm
W, H = 5.2, 15.2  # the slot as the board cuts it, 0.2 mm clearance (D40)
CHAMFER = 1  # D41
PITCH = 40
TAB_W, TAB_DROP, MARGIN = 4.5, 8.25, 2  # a hook's back tab (docs/skadis-standard.md) and C99's margin
STANDOFF = 10  # a 4 mm screw's standoff (C83)


def slots(x0, x1, y0, y1):
    """Every slot centre of the SKADIS grid whose centre lies in the box, both grids."""
    out = []
    for gx in range(-80, 240, 20):
        for gy in range(-80, 240, 20):
            if ((gx % PITCH == 0) == (gy % PITCH == 0)) and x0 - 10 <= gx <= x1 + 10 and y0 - 10 <= gy <= y1 + 10:
                out.append((gx, gy))
    return out


def inside(v, lo, hi):
    """A value held between two others."""
    return max(lo, min(hi, v))


class Panel:
    def __init__(self, ox, oy, x0, y0, size):
        self.ox, self.oy, self.x0, self.y0, self.size = ox, oy, x0, y0, size
        self.parts = []

    def p(self, x, y):
        """A point in mm, y up, as px in the panel, y down."""
        return self.ox + (x - self.x0) * PX, self.oy + (self.y0 + self.size - y) * PX

    def rect(self, x0, y0, x1, y1, cls, rx=0):
        (a, b), (c, d) = self.p(x0, y1), self.p(x1, y0)
        self.parts.append(
            f'<rect x="{a:.1f}" y="{b:.1f}" width="{c - a:.1f}" height="{d - b:.1f}" rx="{rx * PX:.1f}" class="{cls}"/>'
        )

    def slot(self, x, y, grow=0.0, cls="slot"):
        self.rect(x - W / 2 - grow, y - H / 2 - grow, x + W / 2 + grow, y + H / 2 + grow, cls, W / 2 + grow)

    def circle(self, x, y, d, cls):
        cx, cy = self.p(x, y)
        self.parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{d / 2 * PX:.1f}" class="{cls}"/>')

    def line(self, x0, y0, x1, y1, cls):
        (a, b), (c, d) = self.p(x0, y0), self.p(x1, y1)
        self.parts.append(f'<line x1="{a:.1f}" y1="{b:.1f}" x2="{c:.1f}" y2="{d:.1f}" class="{cls}"/>')

    def text(self, x, y, s, cls="s", anchor="start"):
        a, b = self.p(x, y)
        self.parts.append(f'<text x="{a:.1f}" y="{b:.1f}" class="{cls}" text-anchor="{anchor}">{s}</text>')

    def boards(self, edges_x, edges_y):
        """The boards between the given edges, and the slots each holds, cut at its edges and at the panel's."""
        x1, y1 = self.x0 + self.size, self.y0 + self.size
        self.clip = f"c{self.ox}{self.oy}"
        self.parts.append(f'<clipPath id="{self.clip}">')
        for i in range(len(edges_x) - 1):
            for j in range(len(edges_y) - 1):
                xa, xb = inside(edges_x[i], self.x0, x1), inside(edges_x[i + 1], self.x0, x1)
                ya, yb = inside(edges_y[j], self.y0, y1), inside(edges_y[j + 1], self.y0, y1)
                (a, b), (c, d) = self.p(xa, yb), self.p(xb, ya)
                self.parts.append(f'<rect x="{a:.1f}" y="{b:.1f}" width="{c - a:.1f}" height="{d - b:.1f}"/>')
        self.parts.append("</clipPath>")
        self.rect(self.x0, self.y0, x1, y1, "off")
        self.parts.append(f'<g clip-path="url(#{self.clip})">')
        self.rect(self.x0, self.y0, x1, y1, "board")
        for x, y in slots(self.x0, x1, self.y0, y1):
            self.slot(x, y, CHAMFER, "chamfer")
            self.slot(x, y)
        self.parts.append("</g>")
        for x in edges_x:
            if self.x0 <= x <= x1:
                self.line(x, self.y0, x, y1, "seam")
        for y in edges_y:
            if self.y0 <= y <= y1:
                self.line(self.x0, y, x1, y, "seam")

    def hook_room(self, x, y):
        bottom = y - H / 2
        self.parts.append(f'<g clip-path="url(#{self.clip})">')
        self.rect(x - TAB_W / 2 - MARGIN, bottom - TAB_DROP - MARGIN, x + TAB_W / 2 + MARGIN, bottom, "tab")
        self.parts.append("</g>")


def title(parts, x, y, lines, cls="t"):
    for k, s in enumerate(lines):
        parts.append(f'<text x="{x}" y="{y + 22 * k}" class="{cls if k == 0 else "s"}">{s}</text>')


def main():
    parts = []
    size = 80  # mm a panel shows
    side = size * PX
    gap = 70
    left, top = 40, 120
    # the two layouts, seams where four boards meet
    a = Panel(left, top + 60, 0, 0, size)
    a.boards([0, 40, 80], [0, 40, 80])
    b = Panel(left + side + gap, top + 60, 10, 10, size)
    b.boards([10, 50, 90], [10, 50, 90])
    # distances from a seam between the slots to the slots beside it
    side_gap = 10 - W / 2  # 7.4 mm to a slot's side
    end_gap = 10 - H / 2  # 2.4 mm to a slot's end
    b.line(50, 64, 50 + side_gap, 64, "dim")
    b.text(50 + side_gap / 2, 66, f"{side_gap:.1f}", "n", "middle")
    b.line(40, 50, 40, 50 - end_gap, "dim")
    b.text(38, 47.5, f"{end_gap:.1f} to the slot's end", "n", "end")
    title(
        parts,
        left,
        top,
        ["Seams through the slots, as now (D15)", "a half slot each side; four quarters where four boards meet"],
    )
    title(
        parts,
        left + side + gap,
        top,
        [
            "Seams between the slots (D282): the slots 10 mm across and up",
            "every slot whole; a seam " + f"{side_gap:.1f} mm from slots' sides, {end_gap:.1f} from their ends",
        ],
    )
    # a corner tile laid between the slots: the board's bottom left corner at (10, 10)
    top2 = top + side + 190
    c = Panel(left, top2 + 60, 0, 0, size)
    c.boards([10, 90], [10, 90])
    for x, y in slots(10, 80, 10, 80):
        c.hook_room(x, y)
    c.circle(20, 20, 9, "near")  # the corner screw's countersink, 10 mm in from both edges: on the slot
    c.text(13, 3, "a screw 10 mm in: on the slot", "n")
    c.circle(30.6, 16.1, STANDOFF, "alt")
    c.text(37, 6.5, "the only room for a standoff: 1 mm off the edge", "b")
    c.rect(12.5, 8, 27.5, 32, "pad2", 7.5)  # a keyhole standoff behind the corner slot (D244), 15 x 24
    c.text(1, 50, "green: a keyhole standoff here (D244) is 2 mm past the edge", "g")
    title(
        parts,
        left,
        top2,
        [
            "A corner, between the slots: no place for the corner screw",
            "orange: the hooks' rooms below each slot, as a standoff must leave them (C99)",
        ],
    )
    # a slot clip at a seam between the slots
    d = Panel(left + side + gap, top2 + 60, 10, 10, size)
    d.boards([10, 50, 90], [10, 90])
    d.line(40, 40, 60, 60, "clip")  # (a) diagonal: the nearest slot each side, a row apart
    d.circle(40, 40, 3, "peg")
    d.circle(60, 60, 3, "peg")
    d.text(46, 69, "a: 10 mm each side, a row apart", "b")
    d.line(20, 20, 60, 20, "clip2")  # (b) one row: 30 mm one side, 10 the other
    d.circle(20, 20, 3, "peg2")
    d.circle(60, 20, 3, "peg2")
    d.text(22, 13, "b: one row, 30 mm and 10 mm", "g")
    title(
        parts,
        left + side + gap,
        top2,
        [
            "A slot clip where boards meet between the slots",
            "today its pegs go 20 mm each side, which such a seam does not have",
        ],
    )
    width = left * 2 + side * 2 + gap
    height = top2 + 60 + side + 40
    style = """<style>
    .t { font: 600 17px system-ui, sans-serif; fill: #1f2933; }
    .s { font: 13px system-ui, sans-serif; fill: #3e4c59; }
    .n { font: 600 13px system-ui, sans-serif; fill: #b42318; }
    .b { font: 600 13px system-ui, sans-serif; fill: #1d4ed8; }
    .g { font: 600 13px system-ui, sans-serif; fill: #1b7f3b; }
    .board { fill: #eef1f3; }
    .off { fill: #ffffff; stroke: #d0d5da; }
    .seam { stroke: #616e7c; stroke-width: 1.5; stroke-dasharray: 6 4; }
    .chamfer { fill: #c3cad1; }
    .slot { fill: #52606d; }
    .tab { fill: #fdebc8; fill-opacity: 0.8; stroke: #e0a03a; }
    .near { fill: none; stroke: #b42318; stroke-width: 2.5; }
    .alt { fill: none; stroke: #1d4ed8; stroke-width: 2; stroke-dasharray: 7 4; }
    .pad2 { fill: none; stroke: #1b7f3b; stroke-width: 2; stroke-dasharray: 5 3; }
    .dim { stroke: #b42318; stroke-width: 2; }
    .clip { stroke: #1d4ed8; stroke-width: 10; stroke-opacity: 0.35; stroke-linecap: round; }
    .clip2 { stroke: #1b7f3b; stroke-width: 10; stroke-opacity: 0.3; stroke-linecap: round; }
    .peg { fill: #1d4ed8; }
    .peg2 { fill: #1b7f3b; }
</style>"""
    head = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f'{style}<rect width="{width}" height="{height}" fill="#ffffff"/>'
        f'<text x="{left}" y="40" class="t" style="font-size:21px">D282: seams between the slots, '
        "and what they ask of the mounting and the clip</text>"
        f'<text x="{left}" y="66" class="s">Plans of the front, 1 mm to 6 px; dashed lines are board edges. '
        "Slots 5.2 x 15.2 mm, their 1 mm chamfers lighter.</text>"
    )
    for panel in (a, b, c, d):
        parts.extend(panel.parts)
    OUT.write_text(head + "".join(parts) + "</svg>\n", encoding="utf-8", newline="\n")
    print(OUT)


if __name__ == "__main__":
    main()
