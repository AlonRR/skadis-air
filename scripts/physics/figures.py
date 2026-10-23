# SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
# SPDX-License-Identifier: MPL-2.0
# /// script
# requires-python = ">=3.12,<3.14"
# dependencies = ["numpy>=2.1,<3", "scipy>=1.14,<2", "matplotlib>=3.9,<4"]
# ///
"""Write the stress figures' scenes: each part's skin coloured by its von Mises stress per 10 N, from a run's saved
surface (run.py's save_surface), seen from the side its weak spot is on, with a close-up of the spot, the part's peak
and its contact's marked with their values, and what it holds in PLA, PETG and ASA (tables.py's headline). The scenes
go to .check/physics/figures/; figures.mjs photographs them into docs/figures/physics/.

    uv run figures.py                 every figure whose run has a saved surface; the others named, with the run to redo
    uv run figures.py skeleton-today  these figures only
    uv run figures.py --into <report> and the list of the figures, between the report's figures markers

One scale per figure, viridis, from 0 to the part's own peak, the tables' value: past it (the load's contact, a held
face's edge) the colour stays at the top, as the scale's end says. The colour at a point is the stress averaged over
the elements meeting there, so the brightest spot reads a little under the peak, which is the largest at any element's
corner. Held faces, and 1 mm round them, are grey: a clamp's edge is singular, and no peak is read there (C338, C341).
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from matplotlib import colormaps
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from materials import MATERIALS  # noqa: E402
from tables import FIELDS, G, PARTS, ROOT, holds, level_note, load, row, where  # noqa: E402

OUT = ROOT / ".check" / "physics" / "figures"
GREY = (196, 200, 204)
EXCLUDE_MM = 1.0

CASES = {
    "hook-mid": "one hook in the middle slot, 10 N",
    "hook-edge": "one hook in a slot by the left edge, 10 N",
    "shear": "10 N down the wall",
    "wall-seam-hook": "one hook in the seam's slot, 10 N, each panel on its own corner screws",
    "wall-spread": "10 N spread over the wall's hooks, each panel on its own corner screws",
    "wall-seam-hook-outer-screws": "one hook in the seam's slot, 10 N, on the wall's four outer screws",
}
PER = {"hook": "per hook", "shear": "per connector", "wall": "per hook"}

WALL_CASES = ["wall-seam-hook", "wall-spread", "wall-seam-hook-outer-screws"]
# (id, what the part is, version, part, the cases of which the worse in the part is drawn, how the part is held)
FIGURES = [
    ("solid-today", "Solid board", "today", "solid-160", ["hook-mid", "hook-edge"], "on its four corner screws"),
    ("solid-v0.2.1", "Solid board", "v0.2.1", "solid-160", ["hook-mid", "hook-edge"], "on its four corner screws"),
    (
        "lightened-today",
        "Lightened board",
        "today",
        "lightened-160",
        ["hook-mid", "hook-edge"],
        "on its four corner screws",
    ),
    (
        "lightened-v0.2.1",
        "Lightened board",
        "v0.2.1",
        "lightened-160",
        ["hook-mid", "hook-edge"],
        "on its four corner screws",
    ),
    (
        "skeleton-today",
        "Skeleton board",
        "today",
        "skeleton-160",
        ["hook-mid", "hook-edge"],
        "on its four corner screws",
    ),
    (
        "skeleton-v0.4.2",
        "Skeleton board",
        "v0.4.2",
        "skeleton-160",
        ["hook-mid", "hook-edge"],
        "on its four corner screws",
    ),
    (
        "skeleton-v0.2.1",
        "Skeleton board",
        "v0.2.1",
        "skeleton-160",
        ["hook-mid", "hook-edge"],
        "on its four corner screws",
    ),
    ("standoff-1", "Standoff for one board, 15 mm", "today", "standoff-1", ["shear"], "its wall face held"),
    ("slot-clip-2", "Slot clip for two boards", "today", "slot-clip-2", ["shear"], "one peg held in its slot"),
    ("lightened-wall", "Two lightened panels joined by a slot clip", "today", "lightened-wall-2", WALL_CASES, ""),
    ("solid-wall", "Two solid panels joined by a slot clip", "today", "solid-wall-2", WALL_CASES, ""),
]


def nice_ticks(top: float) -> list[float]:
    step = 10 ** math.floor(math.log10(top / 4))
    for k in (1, 2, 2.5, 5, 10):
        if top / (k * step) <= 6:
            step *= k
            break
    return [i * step for i in range(int(top / step + 1e-9) + 1)]


def inside(q: np.ndarray, xyz: np.ndarray, tri: np.ndarray) -> bool:
    """Whether a point is inside the closed skin: a ray's crossings, counted (Moller and Trumbore's test)."""
    d = np.array([0.5772, 0.5781, 0.5766])
    a, b, c = xyz[tri[:, 0]], xyz[tri[:, 1]], xyz[tri[:, 2]]
    e1, e2 = b - a, c - a
    p = np.cross(d, e2)
    det = np.einsum("ij,ij->i", e1, p)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1 / np.where(ok, det, 1), 0)
    s = q - a
    u = np.einsum("ij,ij->i", s, p) * inv
    qv = np.cross(s, e1)
    v = (qv @ d) * inv
    t = np.einsum("ij,ij->i", e2, qv) * inv
    hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-9)
    return bool(hit.sum() % 2)


def outward_normal(at: np.ndarray, xyz: np.ndarray, tri: np.ndarray, reach: float = 0.3) -> np.ndarray:
    """The way out of the part from a point on its skin: the mean of the 26 directions round it whose point `reach`
    away is outside. At a re-entrant corner or the foot of a wall this is the open side, where a face's own normal
    would point into the wall beside it."""
    steps = np.array([(i, j, k) for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1) if (i, j, k) != (0, 0, 0)])
    steps = steps / np.linalg.norm(steps, axis=1, keepdims=True)
    # the triangles near the point are enough for a ray's crossings only if the ray leaves the part's bounding box,
    # so all of them are used
    out = np.array([not inside(at + reach * d, xyz, tri) for d in steps])
    if not out.any():
        return np.array([0.0, 0.0, 1.0])
    n = steps[out].mean(axis=0)
    return n / np.linalg.norm(n)


def creases(xyz: np.ndarray, tri: np.ndarray, angle_deg: float = 35.0) -> np.ndarray:
    """The skin's sharp edges, for the part's shape: edges whose two triangles meet at more than this angle. The
    triangles' winding is not consistent, so the angle is read unsigned; a fold past 145 degrees is missed."""
    a, b, c = xyz[tri[:, 0]], xyz[tri[:, 1]], xyz[tri[:, 2]]
    nrm = np.cross(b - a, c - a)
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-30)
    edges = np.sort(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1)
    owner = np.tile(np.arange(len(tri)), 3)
    key = edges[:, 0].astype(np.int64) * len(xyz) + edges[:, 1]
    order = np.argsort(key, kind="stable")
    shared = np.nonzero(key[order][1:] == key[order][:-1])[0]
    t1, t2 = owner[order][shared], owner[order][shared + 1]
    sharp = np.abs(np.einsum("ij,ij->i", nrm[t1], nrm[t2])) < math.cos(math.radians(angle_deg))
    return edges[order][shared][sharp]


def camera(position: np.ndarray, target: np.ndarray, fov: float, up=(0.0, 1.0, 0.0)) -> dict:
    return {"position": [float(c) for c in position], "target": [float(c) for c in target], "fov": fov, "up": list(up)}


def views(bbox: dict, at: np.ndarray, n: np.ndarray) -> tuple[dict, dict, str]:
    """Where the two views look from. A board, a plate seen from its front or back: the whole part from the side its
    weak spot faces, a little from above and the right; the spot close up, a face's straight along its way out (a face
    at the foot of a groove shows only so), a wall's from between that and the board's face it is nearer. A compact
    part, a connector: both views from the spot's own way out, the whole a little from above and the right."""
    lo, hi = np.array(bbox["min"]), np.array(bbox["max"])
    mid = (lo + hi) / 2
    size = hi - lo
    radius = 0.5 * np.linalg.norm(size)
    fov = 30.0
    field = min(26.0, 0.9 * float(np.max(size)))
    plate = size[2] < 0.25 * min(size[0], size[1])
    if plate:
        side = (1.0 if n[2] > 0 else -1.0) if abs(n[2]) > 0.5 else (1.0 if at[2] >= mid[2] else -1.0)
        seen = "the front" if side > 0 else "the back"
        whole_dir = np.array([0.2 * side, 0.28, side])
        if abs(n[2]) > 0.5:
            zoom_dir = n + np.array([0.04, 0.06, 0.0])
        else:
            flat = n.copy()
            flat[2] = 0
            zoom_dir = flat / np.linalg.norm(flat) + np.array([0.0, 0.1, 0.8 * side])
    else:
        seen = "the side its weak spot is on"
        whole_dir = n + np.array([0.35, 0.35, 0.35])
        zoom_dir = n + np.array([0.06, 0.08, 0.1])
    whole_dir /= np.linalg.norm(whole_dir)
    zoom_dir /= np.linalg.norm(zoom_dir)
    whole = camera(mid + whole_dir * radius / math.sin(math.radians(fov / 2)) * 0.92, mid, fov)
    zoom = camera(at + zoom_dir * (field / 2) / math.tan(math.radians(fov / 2)), at, fov)
    return whole, zoom, seen


def write_scene(spec: tuple, runs: dict) -> str | None:
    fid, what, version, part, cases, held_by = spec
    rows = [(c, row(runs, version, part, c)) for c in cases]
    rows = [(c, r) for c, r in rows if r is not None]
    if not rows:
        return f"{fid}: not run"
    pla = MATERIALS["PLA"]
    case_id, r = min(rows, key=lambda cr: holds(cr[1], pla)[0])
    level = r["level"]
    path = FIELDS / version / part / f"{case_id}-L{level}-surface.npz"
    if not path.exists():
        return f"{fid}: no surface; save it: uv run python run.py --resave {version} {part} {case_id} {level}"
    d = np.load(path)
    xyz, tri = d["xyz"].astype(np.float64), d["tri"]
    meta = json.loads((PARTS / version / f"{part}.json").read_text())
    peak = r["vm"]
    # colours: the averaged stress on one scale from 0 to the part's peak; held faces and 1 mm round them grey
    held_points = xyz[np.unique(tri[d["held"]])]
    dfix = cKDTree(held_points).query(xyz)[0] if len(held_points) else np.full(len(xyz), np.inf)
    loaded_points = xyz[np.unique(tri[d["loaded"]])]
    dload = cKDTree(loaded_points).query(xyz)[0] if len(loaded_points) else np.full(len(xyz), np.inf)
    # a spike, a peak past twice the part's 99.9th percentile (a sharp inner corner, singular): the scale stops at that
    # percentile, so the rest of the part still shows, and says the peak lies past it
    own = d["vmMean"][(dfix > EXCLUDE_MM) & (dload > 3.0)]
    p999 = float(np.percentile(own, 99.9)) if len(own) else peak
    top = p999 if peak > 2 * p999 else peak
    spike = top < peak
    rgb = (colormaps["viridis"](np.clip(d["vmMean"] / top, 0, 1))[:, :3] * 255).round().astype(np.uint8)
    rgb[dfix <= EXCLUDE_MM] = GREY
    # the close-up is on the spot that sets the part's capacity in PLA: its peak, or its stress across the layers
    governs = holds(r, pla)[1]
    key = "vm" if governs == "y" else "sn"
    at = np.array(r["vmXyz"] if governs == "y" else r["snXyz"], dtype=float)
    skin = cKDTree(xyz)
    depth, nearest = skin.query(at)
    if depth > 0.15:  # a peak inside the part: seen from its nearest skin
        n = (xyz[nearest] - at) / depth
    else:
        n = outward_normal(at, xyz, tri)
    whole, zoom, seen = views(meta["bbox"], at, n)
    # the scene's geometry, one binary file: positions, then the triangles, then the colours
    OUT.mkdir(parents=True, exist_ok=True)
    lines = creases(xyz, tri)
    blob = xyz.astype(np.float32).tobytes() + tri.astype(np.uint32).tobytes() + lines.astype(np.uint32).tobytes()
    blob += rgb.tobytes()
    (OUT / f"{fid}.bin").write_bytes(blob)
    per = PER["wall" if "wall" in case_id else "hook" if "hook" in case_id else "shear"]
    capacity = []
    for name, m in MATERIALS.items():
        newtons, tag = holds(r, m)
        capacity.append(f"{name} {newtons:.0f} N, {newtons / G:.1f} kg ({'yield' if tag == 'y' else 'layers'})")

    def under(point) -> str:
        d = float(skin.query(point)[0])
        return f" (inside, {d:.1f} mm under the skin)" if d > 0.15 else ""

    markers = [{"at": list(r["vmXyz"]), "text": f"{peak:.2f} MPa, the part's peak{under(r['vmXyz'])}", "kind": "peak"}]
    if math.dist(r["vmXyz"], r["snXyz"]) > 2.0:
        markers.append(
            {
                "at": list(r["snXyz"]),
                "text": f"{r['sn']:.2f} MPa across the layers{under(r['snXyz'])}",
                "kind": "layers",
            }
        )
    contact_line = ""
    if r["contact"]:
        markers.append(
            {
                "at": [float(c) for c in r["contactXyz"]],
                "text": f"{r['contact']:.2f} MPa at the contact",
                "kind": "contact",
            }
        )
        at_contact = " · ".join(
            f"{k} {10 * m['strength'] / r['contact']:.0f} N, {10 * m['strength'] / r['contact'] / G:.1f} kg"
            for k, m in MATERIALS.items()
        )
        contact_line = f"At the load's contact, the model's even pressure (C339), to the yield: {at_contact}"
    ticks = nice_ticks(top)
    held = f", {held_by}" if held_by else ""
    scene = {
        "id": fid,
        "case": case_id,
        "level": level,
        "title": f"{what}, {version}: {CASES.get(case_id, case_id)} ({case_id})",
        "caption": [
            f"Von Mises stress in MPa per 10 N, the part modelled as solid plastic{held}; seen from {seen}, the weak "
            f"spot close up at the right ({zoom_field(meta)} mm across).",
            f"The part's peak {where(version, part, case_id, r['vmXyz'])}"
            + (f"; across the layers {r['snAt']}" if governs == "l" and math.dist(r["vmXyz"], r["snXyz"]) > 2 else "")
            + (
                f" (at a held face's band, where the held face's idealisation sets it: 2 mm off it "
                f"{r['band'][key]['beyond2']:.2f} MPa, C345)"
                if r["band"][key]["atBand"]
                else ""
            )
            + ". "
            + (
                "Mesh level 1 only."
                if r["dvm"] is None
                else f"Mesh level {level_note(r)}"
                + (
                    "."
                    if r["from"] == 2
                    else " (from level 1: the part's peak / across the layers / the contact's / the deflection)."
                )
            ),
        ],
        "vertices": int(len(xyz)),
        "triangles": int(len(tri)),
        "creases": int(len(lines)),
        "views": [whole, zoom],
        "markers": markers,
        "scale": {
            "stops": [mpl_hex(colormaps["viridis"](i / 10)) for i in range(11)],
            "top": top,
            "ticks": [[t / top, f"{t:g}"] for t in ticks if t <= top * 1.0001],
            "end": (
                f"{top:.2f} and over: the part's peak, {peak:.2f}, is a spike past the scale"
                if spike
                else f"{peak:.2f} and over"
            ),
        },
        "grey": "held, and 1 mm round it: a clamp's edge, where no peak is read",
        "holds": [
            f"Holds {per}, to the yield in the part or the layers' adhesion: " + " · ".join(capacity),
            contact_line,
        ],
        "note": "A printed part is perimeters and infill in layers: these rank the designs and find the weak spots, "
        "they do not predict a breaking load.",
    }
    (OUT / f"{fid}.json").write_text(json.dumps(scene), encoding="utf-8")
    return None


def zoom_field(meta: dict) -> str:
    lo, hi = np.array(meta["bbox"]["min"]), np.array(meta["bbox"]["max"])
    return f"{min(26.0, 0.9 * float(np.max(hi - lo))):.0f}"


def mpl_hex(rgba) -> str:
    return "#" + "".join(f"{round(255 * c):02x}" for c in rgba[:3])


def figure_list(runs: dict) -> str:
    """The report's list of the figures: each one's picture, what it shows and the mesh level it is from."""
    lines = []
    for fid, what, version, part, cases, _ in FIGURES:
        scene = OUT / f"{fid}.json"
        if not scene.exists() or not (ROOT / "docs" / "figures" / "physics" / f"{fid}.png").exists():
            lines.append(f"- **{what}, {version}**: not drawn yet, its run's surface not saved")
            continue
        s = json.loads(scene.read_text(encoding="utf-8"))
        rows = [(c, row(runs, version, part, c)) for c in cases]
        case_id, r = min(((c, x) for c, x in rows if x), key=lambda cr: holds(cr[1], MATERIALS["PLA"])[0])
        if (s.get("case"), s.get("level")) != (case_id, r["level"]):
            lines.append(f"- **{what}, {version}**: its picture is of an older result; drawn again with the rest")
            continue
        held = s["holds"][0]
        lines.append(
            f"- [{s['title']}](../figures/physics/{fid}.png): mesh level {level_note(r)}; {held[0].lower()}{held[1:]}"
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    if len(sys.argv) > 2 and sys.argv[1] == "--into":
        from tables import splice

        splice(Path(sys.argv[2]), "figures", figure_list(load()))
        return 0
    runs = load()
    wanted = set(sys.argv[1:])
    notes, written = [], []
    for spec in FIGURES:
        if wanted and spec[0] not in wanted:
            continue
        note = write_scene(spec, runs)
        if note:
            notes.append(note)
        else:
            written.append(spec[0])
    if written and not wanted:
        (OUT / "index.json").write_text(json.dumps(written), encoding="utf-8")
    for w in written:
        print(f"wrote {OUT / w}.json")
    for note in notes:
        print(note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
