"""The report's tables, from .check/physics/results.jsonl (run.py) and the parts' cases (write-parts.mjs).

    uv run python tables.py              prints the tables in Markdown

Per run, the stresses are for the case's 10 N reference load and do not depend on the material (C331); each
material's deflection is the run's times E_REF / E, and the load at which the model's peak reaches the material's
strength is 10 N times strength / peak. A result has converged when its peak and its deflection moved less than
STRESS_TOL and DEFLECTION_TOL between the two mesh levels (C338).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from materials import MATERIALS

ROOT = Path(__file__).resolve().parents[2]
RESULTS = ROOT / ".check" / "physics" / "results.jsonl"
PARTS = ROOT / ".check" / "physics" / "parts"
STRESS_TOL, DEFLECTION_TOL = 0.10, 0.05
E_REF, W = 1000.0, 10.0
G = 9.81  # N per kg
VERSIONS = ["v0.2.1", "v0.4.2", "today"]


def load() -> dict:
    runs = {}
    for line in RESULTS.read_text().splitlines():
        if line.strip():
            r = json.loads(line)
            runs[(r["version"], r["part"], r["case"], r["level"])] = r
    return runs


def where(version: str, part: str, case_id: str, at: list | None) -> str:
    """A place named from the case's own features: the hooks' slots, the held faces' centres."""
    if at is None:
        return "-"
    meta = json.loads((PARTS / version / f"{part}.json").read_text())
    case = next(c for c in meta["cases"] if c["id"] == case_id)
    x, y, z = at
    named = []
    for load in case["loads"]:
        if "hook" in load:
            sx, sy = load["hook"]["slot"]
            named.append((math.hypot(x - sx, y - sy), f"slot ({sx:g}, {sy:g})"))
            named.append((math.hypot(x - sx, y - sy + 40), f"slot below ({sx:g}, {sy - 40:g})"))
    for sel in case["fixed"]:
        if "rho" in sel:
            cx, cy = sel["rho"]["centre"]
            named.append((math.hypot(x - cx, y - cy), f"{sel['label']} ({cx:g}, {cy:g})"))
    if not named:
        # a connector: how far from its held face, a box (C336), and where
        for sel in case["fixed"]:
            if "box" in sel:
                lo, hi = sel["box"]
                gap = [max(lo[i] - c, 0.0, c - hi[i]) for i, c in enumerate(at)]
                named.append((math.hypot(*gap), sel["label"]))
        if not named:
            return f"({x:.1f}, {y:.1f}, {z:.1f})"
        d, name = min(named)
        return f"{d:.1f} mm from the {name}, at ({x:.1f}, {y:.1f}, {z:.1f})"
    d, name = min(named)
    face = "back" if z < 0.5 else "front" if z > 4.5 else "mid"
    if z < -0.5:
        face = f"z {z:.1f}"
    return f"{d:.1f} mm from {name}, {face}"


def change(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return abs(b - a) / abs(b)


def pct(x: float | None) -> str:
    return "-" if x is None else f"{100 * x:.0f} %"


def at_same_place(
    version: str, part: str, case_id: str, level: int, at: list, member: bool, wall: bool = False
) -> float | None:
    """A level's highest stress within 2 mm of `at`, from its saved stresses: the same place's value, so a peak whose
    twin across the slot takes the lead at the other level is not read as a moved peak."""
    import numpy as np

    path = FIELDS / version / part / f"{case_id}-L{level}.npz"
    if not path.exists():
        return None
    d = np.load(path)
    near = np.linalg.norm(d["xyz"] - np.array(at, dtype=np.float32), axis=1) <= 2.0
    region = (d["dfix"] > 1.0) & ((d["dload"] > 3.0) if member else (d["dload"] <= 3.0))
    if wall:
        clip, panels = wall_regions(d["xyz"])
        region &= clip | panels
    m = near & region
    return float(d["vm"][m].max()) if m.any() else None


def band(version: str, part: str, case_id: str, level: int, wall: bool) -> dict:
    """Whether the part's peaks lie at the edge of the 1 mm band round a held face, where no peak is read (C338): there
    the held face's idealisation, every degree of freedom, sets the value as much as the part does, and the peak read
    2 mm off the held faces is given beside it (C345)."""
    import numpy as np

    d = np.load(FIELDS / version / part / f"{case_id}-L{level}.npz")
    ok = (d["dload"] > 3.0) & (d["dfix"] > 1.0)
    if wall:
        clip, panels = wall_regions(d["xyz"])
        ok &= clip | panels
    out = {}
    for key, values in (("vm", d["vm"]), ("sn", d["sn"])):
        k = int(np.argmax(np.where(ok, values, -np.inf)))
        far = ok & (d["dfix"] > 2.0)
        out[key] = {
            "atBand": bool(d["dfix"][k] < 1.5),
            "beyond2": float(values[far].max()) if far.any() else None,
        }
    return out


def row(runs: dict, version: str, part: str, case_id: str) -> dict | None:
    one, two, three = (runs.get((version, part, case_id, lv)) for lv in (1, 2, 3))
    best = three or two or one
    if best is None:
        return None

    # a hook's case: how far the hook's slot moves; any other: the part's largest movement
    def deflection(r: dict) -> float:
        return r["uLoad"][0] if "hook" in case_id else r["umax"]["value"]

    # a wall's own peaks are its panels' and its clip's, read apart from the bonded pegs' edges (C337, C341)
    wall = "-wall-" in part
    member = {
        lv: (wall_peaks(version, part, case_id, lv) if wall else r) for lv, r in ((1, one), (2, two), (3, three)) if r
    }
    peak = member[best["level"]]
    out = {
        "best": best,
        "level": best["level"],
        "vm": peak["vmMember"]["value"],
        "vmAt": where(version, part, case_id, peak["vmMember"]["at"]),
        "vmXyz": peak["vmMember"]["at"],
        "snAt": where(version, part, case_id, peak["snMember"]["at"]),
        "snXyz": peak["snMember"]["at"],
        "contact": best["vmContact"]["value"],
        "contactXyz": best["vmContact"]["at"],
        "sn": peak["snMember"]["value"],
        "band": band(version, part, case_id, best["level"], wall),
        "u": deflection(best),
        "dvm": None,
        "dcontact": None,
        "du": None,
        "moved": None,
        "from": None,
    }
    # convergence between the last two levels: 1 to 2, or 2 to 3 where level 3 refined round level 2's peaks (C348)
    lo, hi = (2, 3) if three else (1, 2)
    first, last = {1: one, 2: two, 3: three}[lo], {1: one, 2: two, 3: three}[hi]
    if first and last:
        out["from"] = lo
        out["du"] = change(deflection(first), deflection(last))
        out["dcontact"] = change(first["vmContact"]["value"], last["vmContact"]["value"])
        # the peak's change at its own place (C338): the finer level's value within 2 mm of the coarser's peak; a
        # peak with no value near it there has moved
        at1, v2 = member[lo]["vmMember"]["at"], member[hi]["vmMember"]["value"]
        same = at_same_place(version, part, case_id, hi, at1, member=True, wall=wall)
        out["moved"] = same is None or same < 0.8 * v2
        out["dvm"] = change(member[lo]["vmMember"]["value"], v2 if out["moved"] else same)
    out["converged"] = None if out["dvm"] is None else out["dvm"] < STRESS_TOL and out["du"] < DEFLECTION_TOL
    return out


def print_table(runs: dict, title: str, items: list) -> None:
    print(f"### {title}\n")
    print(
        "| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) "
        "| Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) "
        "| Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    for label, version, part, case_id in items:
        r = row(runs, version, part, case_id)
        if r is None:
            print(f"| {label} | {version} | {case_id} | not run | | | | | | | |")
            continue
        defl = " / ".join(f"{r['u'] * E_REF / m['E']:.3f}" for m in MATERIALS.values())
        holds = " / ".join(capacity(r, m) for m in MATERIALS.values())
        across = " / ".join(
            f"{W * m['strength'] / r['contact'] / G:.1f}" if r["contact"] else "-" for m in MATERIALS.values()
        )
        if r["dvm"] is None:
            conv = "level 1 only"
        else:
            conv = f"{pct(r['dvm'])} / {pct(r['dcontact'])} / {pct(r['du'])}"
            if r["from"] == 2:
                conv += " (level 2 to 3)"
            if r["moved"]:
                conv += " (peak moved)"
            elif r["converged"] is False:
                conv += " (not converged)"
        contact = "-" if r["contact"] is None else f"{r['contact']:.2f}"
        print(
            f"| {label} | {version} | {case_id} | {r['vm']:.2f} | {r['vmAt']} | {contact} | {r['sn']:.2f} | {defl} "
            f"| {holds} | {across} | {conv} |"
        )
    print()


def holds(r: dict, m: dict, contact: bool = False) -> tuple[float, str]:
    """The load in N at which the model's peak reaches the material's strength (Q329), and what reaches it first: y
    the part's peak against the yield along the layers, l its stress across the layers against their adhesion, and
    with `contact`, c the hook's or the load's contact against the yield, the model's even pressure (C339)."""
    options = [(W * m["strength"] / r["vm"], "y")]
    if r["sn"] > 0:
        options.append((W * m["across"] / r["sn"], "l"))
    if contact and r["contact"]:
        options.append((W * m["strength"] / r["contact"], "c"))
    return min(options)


def capacity(r: dict, m: dict) -> str:
    """What the part holds before the model's peak reaches the material's strength, in kg, with which governs."""
    newtons, tag = holds(r, m)
    return f"{newtons / G:.1f} {tag}"


def wall_peaks(version: str, part: str, case_id: str, level: int) -> dict:
    """A wall's peaks in its panels and its clip (wall_regions), from the run's saved stresses, shaped as a run's own
    peaks are: the bonded pegs' edges, singular as a clamp's are, left out (C337)."""
    import numpy as np

    d = np.load(FIELDS / version / part / f"{case_id}-L{level}.npz")
    clip, panels = wall_regions(d["xyz"])
    ok = (d["dfix"] > 1.0) & (d["dload"] > 3.0) & (clip | panels)
    out = {}
    for key, values in (("vmMember", d["vm"]), ("snMember", d["sn"])):
        k = int(np.argmax(np.where(ok, values, -np.inf)))
        out[key] = {"value": float(values[k]), "at": [round(float(c), 2) for c in d["xyz"][k]]}
    return out


LOADS = {
    "hook": "one hook",
    "spread-screws": "spread, on corner screws",
    "spread-standoffs": "spread, on standoffs",
    "spread-keyholes": "spread, on keyholes, hung (the brief's)",
    "spread-keyholes-standing": "spread, on keyholes, standing on its standoffs (the design's)",
    "shear": "10 N down",
    "wall-seam-hook": "one hook at the seam, each panel on its screws",
    "wall-spread": "spread, each panel on its screws",
    "wall-seam-hook-outer-screws": "one hook at the seam, the wall's four outer screws",
}


def level_note(r: dict) -> str:
    """The mesh level a row is from, and how far its part's peak, its contact's and its deflection moved to it."""
    if r["dvm"] is None:
        return "1 only"
    moved = " (the part's peak moved)" if r["moved"] else ""
    verdict = "converged" if r["converged"] else "not converged"
    since = " (from level 2)" if r["from"] == 2 else ""
    return f"{r['level']}, {verdict}{moved}{since}: {pct(r['dvm'])} / {pct(r['dcontact'])} / {pct(r['du'])}"


def print_headline(runs: dict, items: list) -> None:
    """What each part holds, per material, in N and kg (Q329): in the part, the lesser of its peak against the yield
    (y) and its stress across the layers against their adhesion (l); and apart, at the load's contact against the yield,
    the model's even pressure (C339). Per hook for one hook, per board for the spread load, per connector for a
    connector. A row of two hook cases is the worse of them in the part, named."""
    print("### What each part holds (Q329)")
    print()
    print(
        "| Part | Version | Load | Case | In the part, PLA | PETG | ASA | Where | At the contact, PLA / PETG / ASA "
        "| Mesh level: part / contact / deflection |"
    )
    print("|---|---|---|---|---|---|---|---|---|---|")
    pla = MATERIALS["PLA"]
    for label, version, part, cases in items:
        rows = [(c, row(runs, version, part, c)) for c in cases]
        rows = [(c, r) for c, r in rows if r is not None]
        load = LOADS["hook" if cases[0].startswith("hook") else cases[0]]
        if not rows:
            print(f"| {label} | {version} | {load} | not run | | | | | | |")
            continue
        case_id, r = min(rows, key=lambda cr: holds(cr[1], pla)[0])
        cells = []
        for m in MATERIALS.values():
            newtons, tag = holds(r, m)
            cells.append(f"{newtons:.0f} N, {newtons / G:.1f} kg ({tag})")
        tag = holds(r, pla)[1]
        key = "vm" if tag == "y" else "sn"
        spot = f"{'yield' if tag == 'y' else 'across the layers'}: {r['vmAt'] if tag == 'y' else r['snAt']}"
        if r["band"][key]["atBand"]:
            spot += f"; at a held face's band, 2 mm off it {r['band'][key]['beyond2']:.2f} against {r[key]:.2f} MPa"
        if r["contact"]:
            at_contact = [W * m["strength"] / r["contact"] for m in MATERIALS.values()]
            contact = (
                " / ".join(f"{n:.0f}" for n in at_contact)
                + " N ("
                + " / ".join(f"{n / G:.1f}" for n in at_contact)
                + f" kg), {r['contact']:.2f} MPa"
            )
        else:
            contact = "-"
        print(
            f"| {label} | {version} | {load} | {case_id} | " + " | ".join(cells) + f" | {spot} | {contact} "
            f"| {level_note(r)} |"
        )
    print()


def headline_items() -> list:
    boards = ["solid", "lightened", "skeleton"]
    items = []
    for b in boards:
        for v in VERSIONS:
            if v == "v0.4.2" and b != "skeleton":
                continue
            items.append((b, v, f"{b}-160", ["hook-mid", "hook-edge"]))
    for b in boards:
        for v in VERSIONS:
            if v == "v0.4.2" and b != "skeleton":
                continue
            for m in ("screws", "standoffs", "keyholes"):
                items.append((b, v, f"{b}-80-{m}", [f"spread-{m}"]))
            items.append((b, v, f"{b}-80-keyholes", ["spread-keyholes-standing"]))
    items += [
        ("standoff, 1 board", "today", "standoff-1", ["shear"]),
        ("standoff, 4 boards", "today", "standoff-4", ["shear"]),
        ("slot clip, 2 boards", "today", "slot-clip-2", ["shear"]),
    ]
    for b in boards:
        for c in ("wall-seam-hook", "wall-spread", "wall-seam-hook-outer-screws"):
            items.append((f"{b} wall", "today", f"{b}-wall-2", [c]))
    return items


FIELDS = ROOT / ".check" / "physics" / "fields"
CLIP_XY = ((50.0, 110.0), (50.0, 70.0))  # the clip's outline on the wall, as write-parts.mjs places it
PEGS = [((57.0, 63.0), (52.0, 68.0)), ((97.0, 103.0), (52.0, 68.0))]  # the pegs' boxes, in the panels' slots


def wall_regions(xyz):
    """Each saved point's place in a wall: the clip (behind the panels' backs, 1 mm clear of them), the panels (1 mm
    clear of the clip's posts and pegs, whose bonded edges are singular as a clamp's are, C337), or neither."""
    import numpy as np

    x, y, z = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    in_clip_xy = (x >= CLIP_XY[0][0]) & (x <= CLIP_XY[0][1]) & (y >= CLIP_XY[1][0]) & (y <= CLIP_XY[1][1])
    near_peg = np.zeros(len(x), dtype=bool)
    for (x0, x1), (y0, y1) in PEGS:
        near_peg |= (x >= x0 - 1) & (x <= x1 + 1) & (y >= y0 - 1) & (y <= y1 + 1)
    clip = z < -1.0
    panels = (z > -0.05) & ~(in_clip_xy & (z < 1.0)) & ~near_peg
    return clip, panels


def print_walls(runs: dict, items: list) -> None:
    """The walls' peaks read again from the saved stresses, the panels and the clip apart (C337, C339)."""
    import numpy as np

    print("### The walls, the panels and the clip apart")
    print()
    print("| Wall | Case | Level | Peak in the panels (MPa) | Where | Peak in the clip (MPa) | Where |")
    print("|---|---|---|---|---|---|---|")
    for label, version, part, case_id in items:
        for level in (1, 2):
            path = FIELDS / version / part / f"{case_id}-L{level}.npz"
            if not path.exists():
                continue
            d = np.load(path)
            member = (d["dfix"] > 1.0) & (d["dload"] > 3.0)
            clip, panels = wall_regions(d["xyz"])
            cells = []
            for region in (panels, clip):
                m = member & region
                if m.any():
                    k = np.argmax(np.where(m, d["vm"], -np.inf))
                    at = d["xyz"][k]
                    cells += [f"{d['vm'][k]:.2f}", where(version, part, case_id, [float(c) for c in at])]
                else:
                    cells += [f"under {d['vm'].min():.2f}", "-"]
            print(f"| {label} | {case_id} | {level} | " + " | ".join(cells) + " |")
    print()


def main() -> None:
    runs = load()
    print_headline(runs, headline_items())
    boards = ["solid", "lightened", "skeleton"]
    hook_items = []
    spread_items = []
    for b in boards:
        for v in VERSIONS:
            if v == "v0.4.2" and b != "skeleton":
                continue
            for case in ("hook-mid", "hook-edge"):
                hook_items.append((b, v, f"{b}-160", case))
            for m in ("screws", "standoffs", "keyholes"):
                spread_items.append((b, v, f"{b}-80-{m}", f"spread-{m}"))
            spread_items.append((b, v, f"{b}-80-keyholes", "spread-keyholes-standing"))
    print_table(runs, "One hook, 10 N, on the 160 mm board held off the wall on its corner screws", hook_items)
    window_items = [
        (b, v, f"{b}-hook-{c}", f"hook-{c}")
        for b in boards
        for v in VERSIONS
        for c in ("mid", "edge")
        if not (v == "v0.4.2" and b != "skeleton")
    ]
    print_table(
        runs,
        "The same hooks in windows of the board, their cut faces held: the local stress alone (C334)",
        window_items,
    )
    print_table(runs, "10 N spread over an 80 mm board's hooks, on each mounting", spread_items)
    conn = [
        ("standoff, 1 board", "today", "standoff-1", "shear"),
        ("standoff, 4 boards", "today", "standoff-4", "shear"),
        ("slot clip, 2 boards", "today", "slot-clip-2", "shear"),
    ]
    print_table(runs, "The connectors, 10 N", conn)
    walls = [
        (f"{b} wall", "today", f"{b}-wall-2", c)
        for b in boards
        for c in ("wall-seam-hook", "wall-spread", "wall-seam-hook-outer-screws")
    ]
    print_table(runs, "Two-panel walls joined by a slot clip, 10 N", walls)
    print_walls(runs, walls)
    print_sensitivity(runs)
    done = len(runs)
    vol = [abs(r["volumeErr"]) for r in runs.values()]
    bal = [r["balance"] for r in runs.values()]
    print(
        f"{done} runs; mesh volume against Manifold's: largest difference {100 * max(vol):.2f} %; "
        f"reactions against loads: largest imbalance {max(bal):.1e}"
    )


def print_sensitivity(runs: dict) -> None:
    """C331: the one case run again at Poisson's ratios 0.30 and 0.40 (run.py --one with PHYSICS_NU, kept apart in
    .check/physics/sensitivity-nu.jsonl), beside the reported run at 0.35."""
    path = ROOT / ".check" / "physics" / "sensitivity-nu.jsonl"
    if not path.exists():
        return
    others = [json.loads(x) for x in path.read_text().splitlines() if x.strip()]
    if not others:
        return
    first = others[0]
    key = (first["version"], first["part"], first["case"], first["level"])
    ref = runs.get(key)
    if ref is None:
        return
    print(f"### Poisson's ratio (C331): {key[0]}'s {key[1]}, {key[2]}, level {key[3]}")
    print()
    print(
        "| Poisson's ratio | Peak in the part (MPa) | At the contact (MPa) | Across the layers (MPa) | Deflection (mm) |"
    )
    print("|---|---|---|---|---|")
    for r in sorted([ref] + others, key=lambda x: x["nu"]):
        cells = []
        for k in ("vmMember", "vmContact", "snMember"):
            change_ = "" if r is ref else f" ({100 * (r[k]['value'] / ref[k]['value'] - 1):+.0f} %)"
            cells.append(f"{r[k]['value']:.2f}{change_}")
        du = "" if r is ref else f" ({100 * (r['uLoad'][0] / ref['uLoad'][0] - 1):+.1f} %)"
        print(
            f"| {r['nu']:.2f}{' (the runs)' if r is ref else ''} | "
            + " | ".join(cells)
            + f" | {r['uLoad'][0]:.4f}{du} |"
        )
    print()


def splice(report: Path, marker: str, text: str) -> None:
    """Put `text` between the report's `<!-- marker:begin -->` and `<!-- marker:end -->` lines, replacing what was
    there, so the report's tables are this script's output and nothing typed by hand."""
    begin, end = f"<!-- {marker}:begin -->", f"<!-- {marker}:end -->"
    body = report.read_text(encoding="utf-8")
    if begin not in body or end not in body:
        raise SystemExit(f"{report.name} has no {begin} ... {end}")
    head, rest = body.split(begin, 1)
    _, tail = rest.split(end, 1)
    report.write_text(f"{head}{begin}\n\n{text.strip()}\n\n{end}{tail}", encoding="utf-8", newline="\n")


if __name__ == "__main__":
    import argparse
    import contextlib
    import io

    ap = argparse.ArgumentParser()
    ap.add_argument("--into", type=Path, help="the report, its tables replaced between their markers")
    ap.add_argument("--hand", type=Path, help="hand.py's output, put between the report's hand markers")
    args = ap.parse_args()
    if args.into is None:
        main()
    else:
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            main()
        splice(args.into, "tables", out.getvalue())
        if args.hand:
            splice(args.into, "hand", args.hand.read_text(encoding="utf-8"))
