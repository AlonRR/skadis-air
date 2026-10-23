"""The simulation's positive controls, each shown able to fail (D323 c).

    uv run python controls.py                 every control; exit 1 if any fails
    uv run python controls.py --seed modulus  break one thing on purpose (modulus, load, volume, assembly or
                                                patch): the control that should catch it must then fail

1. assembly: this module's P2 stiffness against scikit-fem's own, entry by entry, on a small mesh;
2. patch: a homogeneous strain's energy on an irregular mesh against 1/2 V e:C:e, exact for any mesh;
3. bar: a thin bar at the members' scale, 30 x 3 x 0.9 mm, clamped at one end and loaded at the other in its thin
    direction, against the beam formulas: tip deflection P L^3 / 3EI (with Timoshenko's shear term) and the bending
    stress M c / I at mid-span, each within TOL_BEAM; the same bar with linear (P1) tetrahedra is reported beside it,
    to show why the runs use P2;
4. volume: a mesh's volume against the part's own volume from Manifold, within TOL_VOLUME, on an STL the library
    wrote (.check/physics/controls/coupon.stl, written by write-parts.mjs --controls).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import fe
import numpy as np
import skfem
from skfem.models.elasticity import lame_parameters, linear_elasticity

TOL_BEAM = 0.03  # 3 %
TOL_VOLUME = 0.01  # 1 %
TOL_ASSEMBLY = 1e-9  # relative, entry by entry
E, NU = 1000.0, 0.35  # any modulus: the controls compare like with like
BAR = dict(length=30.0, width=3.0, thick=0.9)
P = 0.1  # N at the tip


def check(name: str, ok: bool, detail: str, results: list) -> None:
    results.append({"control": name, "ok": bool(ok), "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'}  {name}: {detail}")


def control_assembly(seed: str | None, results: list) -> None:
    mesh = skfem.MeshTet.init_ball()
    model = fe.Model.of(mesh.p, mesh.t)
    mine = model.stiffness(E * (1.1 if seed == "assembly" else 1.0), NU)
    basis = skfem.Basis(model.mesh, skfem.ElementVector(skfem.ElementTetP2()))
    ref = skfem.asm(linear_elasticity(*lame_parameters(E, NU)), basis)
    # scikit-fem's dof of component c at vertex v is nodal_dofs[c, v], at edge e edge_dofs[c, e]
    perm = np.empty(model.ndof, dtype=np.int64)
    for c in range(3):
        perm[3 * np.arange(model.nv) + c] = basis.nodal_dofs[c]
        perm[3 * (model.nv + np.arange(model.mesh.edges.shape[1])) + c] = basis.edge_dofs[c]
    ref = ref[perm][:, perm]
    diff = abs(mine - ref).max() / abs(ref).max()
    check(
        "assembly",
        diff < TOL_ASSEMBLY,
        f"largest entry difference {diff:.2e} of the largest entry "
        f"({model.mesh.t.shape[1]} tets, {model.ndof} dofs; limit {TOL_ASSEMBLY:g})",
        results,
    )


def control_patch(seed: str | None, results: list) -> None:
    points, tets = fe.bar_mesh(10.0, 4.0, 2.0, 0.8)
    model = fe.Model.of(points, tets)
    k = model.stiffness(E, NU)
    eps = np.array([[1e-3, 2e-4, -3e-4], [2e-4, -5e-4, 1e-4], [-3e-4, 1e-4, 4e-4]])
    u = (eps @ model.nodes).T.ravel()
    energy = 0.5 * u @ (k @ u)
    lam, mu = fe.lame(E, NU)
    exact = 0.5 * model.volume() * (lam * np.trace(eps) ** 2 + 2 * mu * np.sum(eps * eps))
    if seed == "patch":
        exact *= 1.05
    err = abs(energy / exact - 1)
    check(
        "patch",
        err < 1e-9,
        f"strain energy of a uniform strain {energy:.6e} against {exact:.6e} "
        f"(relative {err:.1e}; {model.mesh.t.shape[1]} tets)",
        results,
    )


def beam(size: float, order: int, seed: str | None) -> dict:
    L, b, h = BAR["length"], BAR["width"], BAR["thick"]
    points, tets = fe.bar_mesh(L, b, h, size)
    model = fe.Model.of(points, tets)
    e_fe = E * (1.1 if seed == "modulus" else 1.0)
    load = P * (1.1 if seed == "load" else 1.0)
    bf, cen, nrm, area = model.boundary()
    tip = bf[cen[:, 0] > L - 1e-6]
    root = bf[cen[:, 0] < 1e-6]
    inertia = b * h**3 / 12
    g = E / (2 * (1 + NU))
    exact_tip = P * L**3 / (3 * E * inertia) + P * L / (5 / 6 * g * b * h)
    exact_mid = P * (L / 2) * (h / 2) / inertia
    if order == 2:
        k = model.stiffness(e_fe, NU)
        f = model.traction_load(tip, np.array([0, 0, -load]))
        u = model.solve(k, f, model.facet_nodes(root))
        tip_nodes = model.facet_nodes(tip)
        deflection = -u[3 * tip_nodes + 2].mean()
        s = model.stresses(u, e_fe, NU)
        cx = model.mesh.p[:, model.mesh.t].mean(axis=1)[0]
        near = np.abs(cx - L / 2) < size
        sxx = s[near, :, 0]
        vx = model.mesh.p[0, model.mesh.t[:, near]].T
        # the surface bending stress at mid-span: the vertex values within 0.05 mm of x = L/2, top and bottom
        at = np.abs(vx - L / 2) < 0.05 * size + 1e-9
        mid = np.abs(sxx[at]).max() if at.any() else float("nan")
        ndof = model.ndof
    else:
        basis = skfem.Basis(model.mesh, skfem.ElementVector(skfem.ElementTetP1()))
        k = skfem.asm(linear_elasticity(*lame_parameters(e_fe, NU)), basis)
        fb = skfem.FacetBasis(model.mesh, basis.elem, facets=tip)
        tip_area = area[np.isin(bf, tip)].sum()
        f = skfem.LinearForm(lambda v, w: -load / tip_area * v[2]).assemble(fb)
        fixed = basis.get_dofs(facets=root).all()
        u = skfem.solve(*skfem.condense(k, f, D=fixed))
        tip_dofs = basis.get_dofs(facets=tip).nodal["u^3"]
        deflection = -u[tip_dofs].mean()
        mid = float("nan")
        ndof = basis.N
    return {
        "size": size,
        "order": order,
        "tets": int(model.mesh.t.shape[1]),
        "dofs": int(ndof),
        "tip": deflection,
        "tip_exact": exact_tip,
        "tip_err": deflection / exact_tip - 1,
        "mid": mid,
        "mid_exact": exact_mid,
        "mid_err": mid / exact_mid - 1 if order == 2 else float("nan"),
    }


def control_bar(seed: str | None, results: list) -> None:
    rows = []
    for size, order in ((0.9, 2), (0.45, 2), (0.45, 1)):
        r = beam(size, order, seed)
        rows.append(r)
        across = BAR["thick"] / size
        label = f"P{order}, {size} mm ({across:.0f} element{'s' if across > 1.5 else ''} across 0.9 mm)"
        line = f"{label}: tip {r['tip']:.4f} mm against {r['tip_exact']:.4f} ({100 * r['tip_err']:+.1f} %)"
        if order == 2:
            line += f"; mid-span stress {r['mid']:.3f} MPa against {r['mid_exact']:.3f} ({100 * r['mid_err']:+.1f} %)"
        if order == 2 and size == 0.45:
            ok = abs(r["tip_err"]) < TOL_BEAM and abs(r["mid_err"]) < TOL_BEAM
            check("bar", ok, line + f"; limit {100 * TOL_BEAM:.0f} %", results)
        else:
            print(f"      ({line}; reported, not judged)")
    results[-1]["rows"] = rows


def control_volume(seed: str | None, results: list) -> None:
    root = Path(__file__).resolve().parents[2]
    stl = root / ".check" / "physics" / "controls" / "coupon.stl"
    meta = json.loads((stl.with_suffix(".json")).read_text())
    points, tets = fe.mesh_stl(str(stl), 1.0)
    model = fe.Model.of(points, tets)
    want = meta["volume"] * (1.02 if seed == "volume" else 1.0)
    err = model.volume() / want - 1
    check(
        "volume",
        abs(err) < TOL_VOLUME,
        f"{meta['name']}: mesh {model.volume():.1f} mm3 against Manifold's "
        f"{want:.1f} ({100 * err:+.2f} %; limit {100 * TOL_VOLUME:.0f} %)",
        results,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", choices=["modulus", "load", "volume", "assembly", "patch"])
    ap.add_argument("--json")
    args = ap.parse_args()
    results: list = []
    control_assembly(args.seed, results)
    control_patch(args.seed, results)
    control_bar(args.seed, results)
    control_volume(args.seed, results)
    failed = [r["control"] for r in results if not r["ok"]]
    print(
        f"{len(results)} controls run, {len(results) - len(failed)} passed"
        + (f"; failed: {', '.join(failed)}" if failed else "")
    )
    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=1, default=float))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
