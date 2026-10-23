"""Run the load cases of the parts write-parts.mjs wrote, one run per (version, part, case, mesh level), each in its
own process, appended to .check/physics/results.jsonl as it finishes. A run already there is skipped, so a killed
batch loses one run and starts again where it stopped.

    uv run python run.py                          every version under .check/physics/parts, both mesh levels
    uv run python run.py --only skeleton-hook     parts whose name contains this
    uv run python run.py --versions today --levels 1

Each case is run once, at the reference modulus E_REF: for prescribed loads the stresses do not depend on the
modulus, so a material's deflection is this one's times E_REF / E (Q326, materials.py).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

ROOT = Path(__file__).resolve().parents[2]
PARTS = ROOT / ".check" / "physics" / "parts"
RESULTS = ROOT / ".check" / "physics" / "results.jsonl"
FAILURES = ROOT / ".check" / "physics" / "failures.jsonl"  # skipped by the next batch unless --retry-failed
E_REF = 1000.0  # MPa
# Poisson's ratio, from no sheet (C331); PHYSICS_NU sets another for the sensitivity runs, which go to their own file
NU = float(os.environ.get("PHYSICS_NU", "0.35"))
CONTACT_MM = 3.0  # a peak within this of a loaded face is the load's contact, not the part's own (C339)
FIELDS = ROOT / ".check" / "physics" / "fields"
# the solid board factors with more fill; PHYSICS_SOLID_DIRECT raises its limit for a run watched for memory
SOLID_DIRECT_MAX = int(os.environ.get("PHYSICS_SOLID_DIRECT", "2200000"))
VOLUME_TOL = 0.01  # a mesh this far off the part's volume is refused (the brief's "about 1 %")
EXCLUDE_MM = 1.0  # stresses within this of a fixed surface are left out of the peak: a clamp's edge is singular (C338)

# Mesh levels (C338): (global size, size near the loads and supports), mm. Level 2, every size 0.85 and 0.8 times
# level 1's, is the convergence check: about 1.8 times the elements, which the direct solver still factors for most. The
# global size is the board type's, by its thinnest member: the solid board is a 5 mm plate, the lattices' members
# 3 mm (lightened) and 0.9 mm with a 0.4 mm flange (skeleton); the connectors are posts and bars 4 mm and more.
LEVELS = {
    "solid": {1: (1.5, 0.5), 2: (1.275, 0.4)},
    "lightened": {1: (1.0, 0.5), 2: (0.85, 0.4)},
    "skeleton": {1: (1.0, 0.5), 2: (0.85, 0.4)},
    "standoff": {1: (1.0, 0.5), 2: (0.85, 0.4)},
    "slot-clip": {1: (1.0, 0.5), 2: (0.85, 0.4)},
}
# The whole 160 mm board under one hook: coarser away from the hook and the screws, where the stress is low and smooth.
LEVELS_WHOLE = {
    "solid": {1: (2.0, 0.5), 2: (1.7, 0.4)},
    "lightened": {1: (1.5, 0.5), 2: (1.275, 0.4)},
    "skeleton": {1: (1.2, 0.5), 2: (1.02, 0.4)},
}


def single_level(part: str) -> bool:
    """A window of a board (C334) is run at level 1 alone: it bounds the whole board's result, which is reported."""
    return "-hook-" in part


def kind_of(meta: dict) -> str:
    return "connector" if meta["type"] in ("standoff", "slot-clip") else "board"


# --- selecting boundary facets -----------------------------------------------------------------------------------


def select(sel: dict, cen: np.ndarray, nrm: np.ndarray) -> np.ndarray:
    ok = np.ones(len(cen), dtype=bool)
    if "box" in sel:
        lo, hi = np.array(sel["box"][0]), np.array(sel["box"][1])
        ok &= np.all((cen >= lo) & (cen <= hi), axis=1)
    if "normal" in sel:
        n = np.array(sel["normal"], dtype=float)
        if np.linalg.norm(n) > 0:
            ok &= nrm @ (n / np.linalg.norm(n)) >= sel.get("minDot", 0.9)
    if "rho" in sel:
        c = np.array(sel["rho"]["centre"])
        rho = np.hypot(cen[:, 0] - c[0], cen[:, 1] - c[1])
        ok &= (rho >= sel["rho"]["range"][0]) & (rho <= sel["rho"]["range"][1])
    return ok


def hook_patches(h: dict, cen: np.ndarray, nrm: np.ndarray, area: np.ndarray) -> dict:
    """The three places a hook bears on the board (C332): its rod on the slot's bottom end, down; its back tab on the
    back face below the slot, outward; its body on the front face round the slot 40 mm below, inward."""
    xs, ys = h["slot"]
    hw, hh, t, b = h["halfWidth"], h["halfHeight"], h["thickness"], h["widthMm"] / 2
    bottom = ys - hh
    x, y, z = cen[:, 0], cen[:, 1], cen[:, 2]
    across = np.abs(x - xs) <= b
    bearing = across & (nrm[:, 1] > 0.45) & (np.abs(nrm[:, 2]) < 0.3) & (y >= bottom - 0.05) & (y <= bottom + hw + 0.05)
    bearing &= (z > -0.01) & (z < t + 0.01)
    back = across & (nrm[:, 2] < -0.9) & (np.abs(z) < 0.05) & (y <= bottom) & (y >= bottom - h["dropMm"])
    lower = ys - h["pegBelowMm"]
    front = across & (nrm[:, 2] > 0.9) & (np.abs(z - t) < 0.05) & (np.abs(y - lower) <= hh + 1 + b)
    out = {}
    for name, m in (("bearing", bearing), ("back", back), ("front", front)):
        if not m.any():
            raise ValueError(f"hook at {h['slot']}: no facets for its {name} patch")
        out[name] = (m, float(area[m].sum()), float((cen[m, 1] * area[m]).sum() / area[m].sum()))
    w = h["force"]
    arm = out["back"][2] - out["front"][2]
    r = w * (h["depthMm"] + t / 2) / arm
    return {"patches": out, "R": r, "arm": arm}


def save_field(version, part, case_id, level, model, vm_of, layer, dfix, dload, keep: int = 30000) -> None:
    """The highest stresses at element corners, with where they are and how far from the held and loaded faces, so a
    peak can be read again another way without running the case again."""
    import fe

    vm = fe.von_mises(vm_of).ravel()
    sn = fe.normal_stress(vm_of, np.array(layer, dtype=float)).ravel()
    pts = model.mesh.p[:, model.mesh.t].reshape(3, -1)  # corner-major, as the stress arrays are (nel, 4)
    pts = pts.reshape(3, 4, -1).transpose(0, 2, 1).reshape(3, -1)
    chosen = np.unique(np.concatenate([np.argsort(vm)[::-1][:keep], np.argsort(sn)[::-1][:keep]]))
    out = FIELDS / version / part
    out.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        out / f"{case_id}-L{level}.npz",
        vm=vm[chosen].astype(np.float32),
        sn=sn[chosen].astype(np.float32),
        xyz=pts[:, chosen].T.astype(np.float32),
        dfix=dfix.ravel()[chosen].astype(np.float32),
        dload=dload.ravel()[chosen].astype(np.float32),
    )


def save_surface(version, part, case_id, level, model, vm, bf, fixed_mask, loaded) -> None:
    """The part's skin with its stress, for the figures (figures.py): the boundary triangles, each surface point's von
    Mises stress averaged over every element corner there and the largest of them, and which triangles are held and
    which loaded. The largest at a corner is what the tables' peak reads; the average is what a figure colours."""
    tri = model.mesh.facets[:, bf]  # (3, n) vertex ids
    corners = model.mesh.t.ravel()  # corner-major (4, nel), as vm.T is
    values = vm.T.ravel()
    n = model.mesh.p.shape[1]
    count = np.bincount(corners, minlength=n)
    mean = np.bincount(corners, weights=values, minlength=n) / np.maximum(count, 1)
    top = np.full(n, -np.inf)
    np.maximum.at(top, corners, values)
    used, local = np.unique(tri, return_inverse=True)
    out = FIELDS / version / part
    out.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        out / f"{case_id}-L{level}-surface.npz",
        xyz=model.mesh.p[:, used].T.astype(np.float32),
        tri=local.reshape(3, -1).T.astype(np.int32),
        vmMean=mean[used].astype(np.float32),
        vmMax=top[used].astype(np.float32),
        held=fixed_mask,
        loaded=loaded,
    )


def mesh_with_retries(stl: str, size: float, refine: list, volume: float):
    """gmsh's remeshed surfaces can cross in a tight spot ("a segment and a facet intersect") or fail to
    parametrise, and a 40 degree classification can misread a 45 degree taper, bulging the mesh. Each retry moves every
    node: sizes a few % smaller or larger, the surfaces classified at 30, 35 or 45 degrees, at 50 last, which keeps a
    45 degree chamfer in one patch with its neighbour; and the same STL with its long triangles split to 3 or 1.5 mm
    (`<name>-r3.stl`, `-r15.stl`, Manifold's refineToLength, the same solid), whose parametrisation fails less
    (C338). A mesh whose volume is more than VOLUME_TOL off the part's is refused and the next tried; past every try,
    the closest is used and the run records it. Returns the points, the tets and the attempt: [angle, scale, which
    STL]."""
    import fe

    attempts = [(40, 1.0, stl), (40, 0.97, stl), (40, 0.94, stl), (40, 1.03, stl)]
    for tag in ("r3", "r15"):
        refined = stl[: -len(".stl")] + f"-{tag}.stl"
        if Path(refined).exists():
            attempts += [(40, 1.0, refined), (30, 1.0, refined)]
    attempts += [(a, sc, stl) for a, sc in ((40, 0.91), (30, 1.0), (30, 0.97), (35, 1.0), (45, 1.0), (50, 1.0))]
    errors, best = [], None
    for angle, scale, path in attempts:
        try:
            rs = [fe.Refine(r.centre, r.radius, r.size * scale, r.grow) for r in refine]
            points, tets = fe.mesh_stl(path, size * scale, rs, angle_deg=angle)
        except Exception as error:  # gmsh raises a bare Exception
            errors.append(f"{angle} deg x{scale}{' refined' if path != stl else ''}: {str(error).splitlines()[0]}")
            continue
        err = abs(fe.Model.of(points, tets).volume() / volume - 1)
        attempt = [angle, scale, Path(path).stem.rsplit("-", 1)[-1] if path != stl else "plain"]
        if err <= VOLUME_TOL:
            return points, tets, attempt
        errors.append(f"{angle} deg x{scale}: volume {100 * err:.2f} % off")
        if best is None or err < best[0]:
            best = (err, points, tets, attempt + ["volume over the limit"])
    if best is not None:
        return best[1], best[2], best[3]
    raise RuntimeError("meshing failed: " + "; ".join(errors))


# --- one run ----------------------------------------------------------------------------------------------------


def run_one(version: str, part: str, case_id: str, level: int) -> dict:
    import fe

    meta = json.loads((PARTS / version / f"{part}.json").read_text())
    case = next(c for c in meta["cases"] if c["id"] == case_id)
    levels = LEVELS_WHOLE if case.get("mesh") == "whole-160" else LEVELS
    size, fine = levels[meta["type"]][level]
    timer = fe.Timer()
    refine = [fe.Refine(tuple(r["centre"]), r["radius"], fine) for r in case.get("refine", [])]
    points, tets, attempt = mesh_with_retries(str(PARTS / version / f"{part}.stl"), size, refine, meta["volume"])
    points, tets, slivers = fe.drop_slivers(points, tets)
    timer.mark("mesh")
    model = fe.Model.of(points, tets)
    volume = model.volume()
    k = model.stiffness(E_REF, NU)
    timer.mark("assemble")
    bf, cen, nrm, area = model.boundary()

    fixed_mask = np.zeros(len(bf), dtype=bool)
    fixed_areas = {}
    for sel in case["fixed"]:
        m = select(sel, cen, nrm)
        fixed_areas[sel["label"]] = round(fixed_areas.get(sel["label"], 0) + float(area[m].sum()), 3)
        if not m.any():
            raise ValueError(f"{part}/{case_id}: nothing selected for {sel['label']}")
        fixed_mask |= m
    fixed_nodes = model.facet_nodes(bf[fixed_mask])

    f = np.zeros(model.ndof)
    applied = np.zeros(3)
    moment = np.zeros(3)
    loads_log = []
    probes = []
    loaded = np.zeros(len(bf), dtype=bool)
    for load in case["loads"]:
        if "hook" in load:
            h = load["hook"]
            hp = hook_patches(h, cen, nrm, area)
            pieces = [
                ("bearing", np.array([0, -h["force"], 0])),
                ("back", np.array([0, 0, hp["R"]])),
                ("front", np.array([0, 0, -hp["R"]])),
            ]
            for name, force in pieces:
                m = hp["patches"][name][0]
                loaded |= m
                f += model.traction_load(bf[m], force)
                applied += force
                c = (cen[m] * area[m, None]).sum(axis=0) / area[m].sum()
                moment += np.cross(c, force)
            probes.append(model.facet_nodes(bf[hp["patches"]["bearing"][0]]))
            loads_log.append(
                {
                    "hook": h["slot"],
                    "W": h["force"],
                    "R": round(hp["R"], 4),
                    "arm": round(hp["arm"], 3),
                    "areas": {n: round(v[1], 3) for n, v in hp["patches"].items()},
                }
            )
        else:
            m = select(load["select"], cen, nrm)
            if not m.any():
                raise ValueError(f"{part}/{case_id}: nothing selected for {load['label']}")
            force = np.array(load["force"], dtype=float)
            loaded |= m
            f += model.traction_load(bf[m], force)
            applied += force
            probes.append(model.facet_nodes(bf[m]))
            loads_log.append({"label": load["label"], "force": load["force"], "area": round(float(area[m].sum()), 3)})
    # nothing applied on a fixed node is lost: the load vector's sum is the applied force
    assert np.allclose(f.reshape(-1, 3).sum(axis=0), applied, atol=1e-9 * max(1, np.abs(applied).max()))
    timer.mark("loads")
    # a thin lattice factors with far less fill than the chunky solid board: 3.1 million unknowns direct, 2.2 for the
    # solid board, which conjugate gradients take past that (C338)
    u = model.solve(k, f, fixed_nodes, direct_max=SOLID_DIRECT_MAX if meta["type"] == "solid" else 3_100_000)
    timer.mark("solve")
    # equilibrium: the supports' reactions balance what was applied
    reaction = (k @ u - f).reshape(-1, 3)[fixed_nodes].sum(axis=0)
    balance = float(np.abs(reaction + applied).max() / max(1e-12, np.abs(applied).max()))
    if balance > 1e-6:  # a solution that does not balance its loads is not one: a near-singular stiffness
        raise RuntimeError(f"the supports' reactions miss the applied load by {100 * balance:.1f} %")

    s = model.stresses(u, E_REF, NU)
    vm = fe.von_mises(s)
    layer = np.array(meta.get("layerNormal", [0, 0, 1]), dtype=float)
    sn = fe.normal_stress(s, layer)
    tau = fe.interlayer_shear(s, layer)
    fixed_points = model.mesh.p[:, np.unique(model.mesh.facets[:, bf[fixed_mask]])].T
    # each element corner's distance from the held faces: a value is read only where its own point is more than
    # EXCLUDE_MM from them (C338), as the stress at a clamp's edge grows without bound as the mesh is refined
    corner_points = model.mesh.p[:, model.mesh.t].reshape(3, -1).T  # (4 * nel, 3), corner-major
    dist = cKDTree(fixed_points).query(corner_points)[0].reshape(4, -1).T  # (nel, 4)
    # and from the loaded faces: within CONTACT_MM a peak is the load's contact, past it the part's own (C339)
    load_points = model.mesh.p[:, np.unique(model.mesh.facets[:, bf[loaded]])].T
    dload = cKDTree(load_points).query(corner_points)[0].reshape(4, -1).T
    save_field(
        version, part, case_id, level, model, vm_of=s, layer=meta.get("layerNormal", [0, 0, 1]), dfix=dist, dload=dload
    )
    save_surface(version, part, case_id, level, model, vm, bf, fixed_mask, loaded)
    timer.mark("stress")

    def peak(values: np.ndarray, sign: float = 1.0, beyond: float = EXCLUDE_MM, region: str = "all") -> dict:
        ok = dist > beyond
        if region == "member":
            ok &= dload > CONTACT_MM
        elif region == "contact":
            ok &= dload <= CONTACT_MM
        if not ok.any():
            return {"value": None, "at": None}
        v = np.where(ok, sign * values, -np.inf)
        e, corner = np.unravel_index(np.argmax(v), v.shape)
        where = model.mesh.p[:, model.mesh.t[corner, e]]
        return {"value": float(sign * v[e, corner]), "at": [round(float(c), 2) for c in where]}

    def hot_spots(values: np.ndarray, n: int = 6, apart: float = 4.0) -> list:
        """The highest values at up to n places at least `apart` mm from each other: the part's weak spots."""
        v = np.where(dist > EXCLUDE_MM, values, -np.inf).ravel()
        order = np.argsort(v)[::-1][:20000]
        found: list = []
        for k in order:
            e, corner = np.unravel_index(k, values.shape)
            at = model.mesh.p[:, model.mesh.t[corner, e]]
            if all(np.linalg.norm(at - np.array(f["at"])) >= apart for f in found):
                found.append({"value": float(v[k]), "at": [round(float(c), 2) for c in at]})
                if len(found) == n:
                    break
        return found

    disp = u.reshape(-1, 3)
    mag = np.linalg.norm(disp, axis=1)
    worst = int(np.argmax(mag))
    probe = [float(np.linalg.norm(disp[p], axis=1).mean()) for p in probes]
    return {
        "version": version,
        "part": part,
        "case": case_id,
        "level": level,
        "size": size,
        "fine": fine,
        "tets": int(model.mesh.t.shape[1]),
        "dofs": int(model.ndof),
        "meshAttempt": attempt,
        "slivers": slivers,
        "solver": getattr(model, "solved_by", None),
        "iterations": getattr(model, "iterations", None),
        "volume": round(volume, 2),
        "volumeManifold": round(meta["volume"], 2),
        "volumeErr": round(volume / meta["volume"] - 1, 5),
        "fixedAreas": fixed_areas,
        "loads": loads_log,
        "applied": applied.round(6).tolist(),
        "appliedMoment": moment.round(5).tolist(),
        "balance": balance,
        "excludedCorners": int((dist <= EXCLUDE_MM).sum()),
        "elements": int(vm.shape[0]),
        "vm": peak(vm),
        "vm2": peak(vm, beyond=2.0),
        "vmSpots": hot_spots(vm),
        "vmMember": peak(vm, region="member"),
        "vmContact": peak(vm, region="contact"),
        "snMember": peak(sn, region="member"),
        "tauMember": peak(tau, region="member"),
        "vmRaw": float(vm.max()),
        "sn": peak(sn),
        "snCompression": peak(sn, -1.0),
        "tau": peak(tau),
        "umax": {"value": float(mag[worst]), "at": [round(float(c), 2) for c in model.nodes[:, worst]]},
        "uLoad": probe,
        "E": E_REF,
        "nu": NU,
        "times": timer.marks,
    }


# --- the batch ------------------------------------------------------------------------------------------------


def done_keys() -> set:
    keys = set()
    if RESULTS.exists():
        for line in RESULTS.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                keys.add((r["version"], r["part"], r["case"], r["level"]))
    return keys


def estimate(version: str, part: str, case_id: str, level: int) -> float | None:
    """A run's likely length in seconds, from its level 1 twin's: level 2 has about 1.8 times the elements; past what
    PARDISO factors (a solid board's past 2.2 million unknowns) conjugate gradients take about 0.26 ms an unknown (the
    solid 160 mm board's level 2, 2.5 million unknowns in 478 s)."""
    one = None
    if RESULTS.exists():
        for line in RESULTS.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                if (r["version"], r["part"], r["case"], r["level"]) == (version, part, case_id, 1):
                    one = r
    if one is None:
        return None
    took = sum(one["times"].values()) + 20  # and the process's start
    if level == 1:
        return took
    dofs = 1.75 * one["dofs"]
    limit = SOLID_DIRECT_MAX if part.startswith("solid") else 3_100_000
    return 2.6e-4 * dofs + 0.5 * took if dofs > limit else 2.5 * took


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--one", nargs=4, metavar=("VERSION", "PART", "CASE", "LEVEL"))
    ap.add_argument("--versions")
    ap.add_argument("--only")
    ap.add_argument("--levels", default="1,2")
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--budget", type=float, help="seconds: start no run that would likely end past them")
    ap.add_argument("--order", help="name pieces, comma-separated: parts containing the first run first, and so on")
    args = ap.parse_args()
    if args.one:
        v, p, c, lv = args.one
        print(json.dumps(run_one(v, p, c, int(lv))))
        return 0
    versions = args.versions.split(",") if args.versions else sorted(d.name for d in PARTS.iterdir() if d.is_dir())
    levels = [int(x) for x in args.levels.split(",")]
    done = done_keys()
    if FAILURES.exists() and not args.retry_failed:
        for line in FAILURES.read_text().splitlines():
            if line.strip():
                f = json.loads(line)
                done.add((f["version"], f["part"], f["case"], f["level"]))
    todo = []
    for v in versions:
        for part in json.loads((PARTS / v / "index.json").read_text()):
            if args.only and args.only not in part:
                continue
            meta = json.loads((PARTS / v / f"{part}.json").read_text())
            for case in meta["cases"]:
                for lv in levels:
                    if lv > 1 and single_level(part):
                        continue
                    if (v, part, case["id"], lv) not in done:
                        todo.append((v, part, case["id"], lv))
    if args.order:
        pieces = args.order.split(",")
        todo.sort(key=lambda item: next((i for i, k in enumerate(pieces) if k in item[1]), len(pieces)))
    print(f"{len(todo)} runs to do", flush=True)
    failed = 0
    started, longest, left = time.time(), 0.0, 0
    for i, (v, part, case, lv) in enumerate(todo, 1):
        # a session's watch on a batch lasts 30 minutes: start no run that would likely outlast the budget, judged by
        # its level 1 twin where there is one, and take the next that fits
        guess = estimate(v, part, case, lv)
        if args.budget and time.time() - started + (guess if guess else 1.5 * longest) > args.budget:
            left += 1
            print(f"[{i}/{len(todo)}] left for the next batch: {v} {part} {case} L{lv} (about {guess or 0:.0f} s)")
            continue
        t0 = time.time()
        proc = subprocess.run(
            [sys.executable, __file__, "--one", v, part, case, str(lv)], capture_output=True, text=True
        )
        if proc.returncode != 0:
            failed += 1
            with FAILURES.open("a") as fh:
                why = proc.stderr.strip().splitlines()[-1:] or ["?"]
                failure = {"version": v, "part": part, "case": case, "level": lv, "error": why[0]}
                fh.write(json.dumps(failure) + "\n")
            print(
                f"[{i}/{len(todo)}] FAILED {v} {part} {case} L{lv}: {proc.stderr.strip().splitlines()[-1:]}", flush=True
            )
            continue
        # the run's result is its one JSON line; gmsh writes its own messages to the same stream, sometimes after it
        r = None
        for line in reversed(proc.stdout.strip().splitlines()):
            if line.startswith("{"):
                try:
                    r = json.loads(line)
                    break
                except json.JSONDecodeError:
                    continue
        if r is None or r.get("case") != case:
            failed += 1
            print(f"[{i}/{len(todo)}] FAILED {v} {part} {case} L{lv}: no result line", flush=True)
            continue
        with RESULTS.open("a") as fh:
            fh.write(json.dumps(r) + "\n")
        longest = max(longest, time.time() - t0)
        print(
            f"[{i}/{len(todo)}] {v} {part} {case} L{lv}: {r['tets']} tets, vol {100 * r['volumeErr']:+.2f} %, "
            f"vm {r['vm']['value']:.2f} MPa at {r['vm']['at']}, u {r['umax']['value']:.4f} mm, "
            f"{time.time() - t0:.0f} s",
            flush=True,
        )
    print(f"{len(todo)} runs, {len(todo) - failed - left} done, {failed} failed, {left} left", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
