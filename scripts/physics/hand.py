"""The hand calculations beside the simulation (D323 c), from `printed-part-engineering`: the members as beams, the
hook's bearing, the screw holes' edge distance, load along and across the layers, the connectors' bending, creep, and
how far a printed section differs from the solid model. Every figure is per 10 N, the runs' reference load.

    node scripts/physics/sections.mjs > .check/physics/sections-today.json        (and per version, --lib/--version)
    uv run python hand.py .check/physics/sections-today.json ...                   prints the tables in Markdown

The sections are cut from the built boards (sections.mjs); every other input is named where it is used.
"""

from __future__ import annotations

import json
import math
import sys

from materials import MATERIALS

W = 10.0  # N, the reference load
T = 5.0  # board thickness, mm
ROD = 4.5  # the hook's rod or tab width, mm (docs/skadis-standard.md)
CHAMFER = 1.0  # the slots' chamfer, front and back (D41)
DEPTH = 25.0  # how far in front the load hangs (C332)
ARM = 27.6  # between the back tab's push and the front push, mm, as the runs found it (C332)
SLOT_W = 5.2  # the slot as cut at 0.2 mm clearance
WEB_SPAN = 28.28 - 2 * (2.6 + 3.0)  # a diagonal web's clear length between two slots' rims, mm (inferred)


def bearing() -> dict:
    area = ROD * (T - 2 * CHAMFER)
    return {"area": area, "stress": W / area}


def prying() -> float:
    return W * (DEPTH + T / 2) / ARM


def rim_in_plane(sec: dict) -> float:
    """The rim under the slot as a beam fixed at the two lower webs, the hook's weight at its middle: M = W L / 8."""
    span = (
        SLOT_W + 3.0
    )  # web centre to web centre where they leave the rim, about the slot's width and a rim (inferred)
    return (W * span / 8) * sec["cu"] / sec["Iu"]


def web_out_of_plane(sec: dict, r: float) -> float:
    """The prying push R at a slot shared by its four webs, each fixed at the next slot and guided at this one:
    M = (R / 4) L / 2."""
    return (r / 4 * WEB_SPAN / 2) * sec["cv"] / sec["Iv"]


def web_axial(sec: dict) -> float:
    """The hook's weight as a truss carries it: four webs at 45 degrees, W / (4 cos 45) each."""
    return W / (4 * math.cos(math.pi / 4)) / sec["area"]


def standoff() -> dict:
    """The standoff for 1 board, a tube 10 mm across round a 4.5 mm hole (C83), 15 mm tall, a cantilever from the wall
    with 10 N down at its board face: its bending stress runs along its axis, which is the build direction."""
    od, idm, h = 10.0, 4.5, 15.0
    inertia = math.pi * (od**4 - idm**4) / 64
    return {"M": W * h, "I": inertia, "stress": W * h * (od / 2) / inertia}


def clip_bar() -> dict:
    """The slot clip's bar, 10 mm wide (a standoff's width, D189) and 7 mm tall (15 mm depth less the hooks' 8 mm
    room), one peg held and the other 40 mm away carrying 10 N: a cantilever bent in its own plane, along the
    layers."""
    b, h, span = 10.0, 7.0, 40.0
    inertia = h * b**3 / 12
    return {"stress": W * span * (b / 2) / inertia}


def edge_distance() -> dict:
    """printed-part-engineering section 5: at least the hole's diameter or twice the part's thickness, whichever is
    greater, read here from the hole's edge; the corner screws stand 10 mm in from both edges (D73), their clearance
    hole 4.5 mm (C83)."""
    hole = 4.5
    need = max(hole, 2 * T)
    have = 10.0 - hole / 2
    return {"need": need, "have": have}


def printed_box(width: float = 3.0, perimeters: float = 0.9, infill: float = 0.15, skin: float = 0.6) -> dict:
    """A lightened board's 3 mm member as it prints: two 0.45 mm perimeters a side, the middle 15 % infill, solid
    skins top and bottom `skin` mm thick (relayed: the brief; the skins are a PrusaSlicer profile's, inferred). Its
    second moments against the solid section's."""
    core = width - 2 * perimeters
    i_in_solid = T * width**3 / 12
    i_in = (T / 12) * (width**3 - core**3) + infill * (T / 12) * core**3
    i_out_solid = width * T**3 / 12
    walls = 2 * perimeters * T**3 / 12
    skins = core * (T**3 - (T - 2 * skin) ** 3) / 12
    fill = infill * core * (T - 2 * skin) ** 3 / 12
    return {"in": i_in / i_in_solid, "out": (walls + skins + fill) / i_out_solid}


def main() -> None:
    sections = {}
    for path in sys.argv[1:]:
        d = json.loads(open(path, encoding="utf-8").read())
        for kind, sec in d["sections"].items():
            sections[(d["version"], kind)] = sec
    b = bearing()
    r = prying()
    print(
        f"- Bearing of the hook's rod on the slot's end: {W:.0f} N over {ROD} x {T - 2 * CHAMFER:.0f} mm "
        f"= {b['stress']:.2f} MPa (computed)"
    )
    print(f"- Prying push at the back tab and at the lower slot: R = W (e + t/2) / arm = {r:.1f} N (computed)")
    print()
    print(
        "| Version | Board | Rim in plane (MPa) | Web axial (MPa) | Web out of plane (MPa) | Rim I in / out (mm4) "
        "| Web I in / out (mm4) |"
    )
    print("|---|---|---|---|---|---|---|")
    for (version, kind), sec in sorted(sections.items()):
        if kind == "solid":
            continue
        rim, web = sec["rim"], sec["web"]
        print(
            f"| {version} | {kind} | {rim_in_plane(rim):.2f} | {web_axial(web):.2f} | {web_out_of_plane(web, r):.2f} "
            f"| {rim['Iu']:.1f} / {rim['Iv']:.1f} | {web['Iu']:.2f} / {web['Iv']:.1f} |"
        )
    print()
    s = standoff()
    c = clip_bar()
    e = edge_distance()
    box = printed_box()
    print(
        f"- Standoff (1 board), 10 N down at its board face: M = {s['M']:.0f} N mm, I = {s['I']:.0f} mm4, "
        f"{s['stress']:.2f} MPa along its axis, across its layers (computed)"
    )
    print(f"- Slot clip's bar, 10 N carried 40 mm: {c['stress']:.2f} MPa in its own plane, along its layers (computed)")
    print(
        f"- Corner screw's edge distance: the rule wants {e['need']:.1f} mm from the hole's edge, the board has "
        f"{e['have']:.2f} mm (computed)"
    )
    print(
        f"- A 3 mm lightened member as printed: {100 * box['in']:.0f} % of the solid's stiffness in its plane, "
        f"{100 * box['out']:.0f} % through the board (computed, from relayed and inferred print settings)"
    )
    print()
    print(
        "| Material | Board's 10 N rim stress reaches yield at (N), lightened today | Standoff across layers, "
        "load to reach interlayer adhesion (N) | Below HDT at 23 C (C) |"
    )
    print("|---|---|---|---|")
    today = sections.get(("today", "lightened"))
    for name, m in MATERIALS.items():
        rim = rim_in_plane(today["rim"]) if today else float("nan")
        print(f"| {name} | {W * m['strength'] / rim:.0f} | {W * m['across'] / s['stress']:.0f} | {m['hdt'] - 23:.0f} |")


if __name__ == "__main__":
    main()
