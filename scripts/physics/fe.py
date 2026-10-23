"""Linear static finite elements for the printed parts: mesh an STL with gmsh, assemble quadratic (P2)
tetrahedra, solve, and read the stresses back.

The stiffness is assembled here, vectorised over the elements, rather than by scikit-fem's generic form,
which took 99 s for 100k elements (23 Oct 2026); scikit-fem still supplies the mesh's edges and facets, and
its own assembly is the reference the controls compare this one with (`controls.py`).

Units: mm, N, MPa. Each node of the quadratic mesh is a vertex (0 .. nv-1) or an edge's midpoint (nv + edge);
its three degrees of freedom are 3 * node + (0, 1, 2).
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field

import gmsh
import numpy as np
import pypardiso
import scipy.sparse as sp
import skfem
from scipy.spatial import cKDTree

# Local edges of a tetrahedron in scikit-fem's order (MeshTet.t2e): checked in controls.py.
EDGES = ((0, 1), (1, 2), (0, 2), (0, 3), (1, 3), (2, 3))
# A degree-2 rule on the tetrahedron, exact for the P2 stiffness (its integrand is quadratic).
_A, _B = 0.5854101966249685, 0.1381966011250105
QUAD = np.array([[_A, _B, _B, _B], [_B, _A, _B, _B], [_B, _B, _A, _B], [_B, _B, _B, _A]])
QUAD_W = np.full(4, 0.25)
# the most unknowns PARDISO factors here: 2.5 million took 23 GB in its Cholesky (23 Oct 2026), of 64 GB
DIRECT_MAX = 2_600_000


def lame(e_mpa: float, nu: float) -> tuple[float, float]:
    return e_mpa * nu / ((1 + nu) * (1 - 2 * nu)), e_mpa / (2 * (1 + nu))


def elasticity_matrix(e_mpa: float, nu: float) -> np.ndarray:
    """Voigt order xx, yy, zz, xy, yz, xz, with engineering shear strains."""
    lam, mu = lame(e_mpa, nu)
    d = np.zeros((6, 6))
    d[:3, :3] = lam
    d[[0, 1, 2], [0, 1, 2]] += 2 * mu
    d[[3, 4, 5], [3, 4, 5]] = mu
    return d


# --- meshing -----------------------------------------------------------------------------------


@dataclass
class Refine:
    """A ball in which the mesh is `size` mm, growing to the global size over `grow` mm outside it."""

    centre: tuple[float, float, float]
    radius: float
    size: float
    grow: float = 4.0


def mesh_stl(
    path: str, size: float, refine: list[Refine] = (), angle_deg: float = 40.0
) -> tuple[np.ndarray, np.ndarray]:
    """Tetrahedra of the closed STL: its facets classified into surfaces at `angle_deg`, reparametrised and
    remeshed at `size` (finer inside each `refine` ball), then filled. Returns points (3, n) and tets (4, m)."""
    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 0)
    try:
        gmsh.merge(path)
        gmsh.model.mesh.classifySurfaces(angle_deg * math.pi / 180, True, True, math.pi)
        gmsh.model.mesh.createGeometry()
        surfaces = [s[1] for s in gmsh.model.getEntities(2)]
        loop = gmsh.model.geo.addSurfaceLoop(surfaces)
        gmsh.model.geo.addVolume([loop])
        gmsh.model.geo.synchronize()
        smallest = min([size] + [r.size for r in refine])
        if refine:
            balls = []
            for r in refine:
                f = gmsh.model.mesh.field.add("Ball")
                gmsh.model.mesh.field.setNumber(f, "XCenter", r.centre[0])
                gmsh.model.mesh.field.setNumber(f, "YCenter", r.centre[1])
                gmsh.model.mesh.field.setNumber(f, "ZCenter", r.centre[2])
                gmsh.model.mesh.field.setNumber(f, "Radius", r.radius)
                gmsh.model.mesh.field.setNumber(f, "Thickness", r.grow)
                gmsh.model.mesh.field.setNumber(f, "VIn", r.size)
                gmsh.model.mesh.field.setNumber(f, "VOut", size)
                balls.append(f)
            m = gmsh.model.mesh.field.add("Min")
            gmsh.model.mesh.field.setNumbers(m, "FieldsList", balls)
            gmsh.model.mesh.field.setAsBackgroundMesh(m)
            gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
            gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
            gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.MeshSizeMax", size)
        gmsh.option.setNumber("Mesh.MeshSizeMin", smallest / 4)
        gmsh.option.setNumber("Mesh.Algorithm3D", 10)
        gmsh.model.mesh.generate(3)
        tags, coords, _ = gmsh.model.mesh.getNodes()
        types, _, nodes = gmsh.model.mesh.getElements(3)
    finally:
        gmsh.finalize()
    tets = np.concatenate([n for t, n in zip(types, nodes) if t == 4]).reshape(-1, 4).astype(np.int64)
    index = np.zeros(int(tags.max()) + 1, dtype=np.int64)
    index[tags.astype(np.int64)] = np.arange(len(tags))
    tets = index[tets]
    points = coords.reshape(-1, 3)
    used = np.unique(tets)
    remap = -np.ones(len(points), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return points[used].T.copy(), remap[tets].T.copy()


def bar_mesh(length: float, width: float, height: float, size: float) -> tuple[np.ndarray, np.ndarray]:
    """A rectangular bar [0, length] x [0, width] x [0, height], meshed by gmsh's own box (the controls' bar)."""
    gmsh.initialize()
    gmsh.option.setNumber("General.Terminal", 0)
    try:
        gmsh.model.occ.addBox(0, 0, 0, length, width, height)
        gmsh.model.occ.synchronize()
        gmsh.option.setNumber("Mesh.MeshSizeMax", size)
        gmsh.option.setNumber("Mesh.MeshSizeMin", size / 4)
        gmsh.option.setNumber("Mesh.Algorithm3D", 10)
        gmsh.model.mesh.generate(3)
        tags, coords, _ = gmsh.model.mesh.getNodes()
        types, _, nodes = gmsh.model.mesh.getElements(3)
    finally:
        gmsh.finalize()
    tets = np.concatenate([n for t, n in zip(types, nodes) if t == 4]).reshape(-1, 4).astype(np.int64)
    index = np.zeros(int(tags.max()) + 1, dtype=np.int64)
    index[tags.astype(np.int64)] = np.arange(len(tags))
    return coords.reshape(-1, 3).T.copy(), index[tets].T.copy()


def drop_slivers(points: np.ndarray, tets: np.ndarray, quality: float = 1e-5) -> tuple[np.ndarray, np.ndarray, int]:
    """Leave out tetrahedra flat enough to be no element: volume / (longest edge)^3 under `quality` (a regular one is
    0.118). gmsh's HXT left one of 8.6e-18 in a skeleton board (23 Oct 2026), whose gradients made the stiffness
    singular to PARDISO's Cholesky. What they leave out is next to no volume; the volume control still judges it."""
    a, b, c, d = (points[:, tets[i]] for i in range(4))
    vol = np.abs(np.einsum("ij,ij->j", b - a, np.cross(c - a, d - a, axis=0))) / 6
    longest = np.max([np.linalg.norm(points[:, tets[i]] - points[:, tets[j]], axis=0) for i, j in EDGES], axis=0)
    keep = vol / longest**3 >= quality
    tets = tets[:, keep]
    used = np.unique(tets)
    remap = -np.ones(points.shape[1], dtype=np.int64)
    remap[used] = np.arange(len(used))
    return np.ascontiguousarray(points[:, used]), np.ascontiguousarray(remap[tets]), int((~keep).sum())


# --- the model -----------------------------------------------------------------------------------


@dataclass
class Model:
    mesh: skfem.MeshTet
    nv: int = 0
    nodes: np.ndarray = field(default=None, repr=False)  # (3, nnodes) coordinates of every P2 node
    t10: np.ndarray = field(default=None, repr=False)  # (10, nel) the element's P2 nodes: 4 vertices, 6 edges

    @classmethod
    def of(cls, points: np.ndarray, tets: np.ndarray) -> "Model":
        mesh = skfem.MeshTet(points, tets)
        m = cls(mesh)
        m.nv = mesh.p.shape[1]
        mid = 0.5 * (mesh.p[:, mesh.edges[0]] + mesh.p[:, mesh.edges[1]])
        m.nodes = np.hstack([mesh.p, mid])
        m.t10 = np.vstack([mesh.t, m.nv + mesh.t2e])
        return m

    @property
    def nnodes(self) -> int:
        return self.nodes.shape[1]

    @property
    def ndof(self) -> int:
        return 3 * self.nnodes

    def volume(self) -> float:
        p, t = self.mesh.p, self.mesh.t
        a, b, c, d = (p[:, t[i]] for i in range(4))
        return float(np.abs(np.einsum("ij,ij->j", b - a, np.cross(c - a, d - a, axis=0))).sum() / 6)

    # gradients of the barycentric coordinates and the element volumes
    def _geometry(self, el: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        p, t = self.mesh.p, self.mesh.t[:, el]
        x0 = p[:, t[0]].T
        jac = np.stack([p[:, t[k]].T - x0 for k in (1, 2, 3)], axis=2)  # (n, 3, 3): columns are edges
        det = np.linalg.det(jac)
        inv = np.linalg.inv(jac)  # rows: gradients of lambda_1..3
        g = np.empty((len(el), 4, 3))
        g[:, 1:, :] = inv
        g[:, 0, :] = -inv.sum(axis=1)
        return g, np.abs(det) / 6

    @staticmethod
    def _shape_gradients(g: np.ndarray, lam: np.ndarray) -> np.ndarray:
        """Gradients of the 10 P2 shape functions at barycentric point `lam` (4,): (n, 10, 3)."""
        dn = np.empty((g.shape[0], 10, 3))
        for i in range(4):
            dn[:, i, :] = (4 * lam[i] - 1) * g[:, i, :]
        for k, (i, j) in enumerate(EDGES):
            dn[:, 4 + k, :] = 4 * (lam[i] * g[:, j, :] + lam[j] * g[:, i, :])
        return dn

    @staticmethod
    def _strain_matrix(dn: np.ndarray) -> np.ndarray:
        """B (n, 6, 30), local dof 3 * a + c."""
        n = dn.shape[0]
        b = np.zeros((n, 6, 30))
        for a in range(10):
            dx, dy, dz = dn[:, a, 0], dn[:, a, 1], dn[:, a, 2]
            c = 3 * a
            b[:, 0, c] = dx
            b[:, 1, c + 1] = dy
            b[:, 2, c + 2] = dz
            b[:, 3, c] = dy
            b[:, 3, c + 1] = dx
            b[:, 4, c + 1] = dz
            b[:, 4, c + 2] = dy
            b[:, 5, c] = dz
            b[:, 5, c + 2] = dx
        return b

    def element_dofs(self, el: np.ndarray) -> np.ndarray:
        nodes = self.t10[:, el].T  # (n, 10)
        return (3 * nodes[:, :, None] + np.arange(3)[None, None, :]).reshape(len(el), 30)

    def stiffness(self, e_mpa: float, nu: float, chunk: int = 20000) -> sp.csr_matrix:
        d = elasticity_matrix(e_mpa, nu)
        nel = self.mesh.t.shape[1]
        k = None
        for start in range(0, nel, chunk):
            el = np.arange(start, min(nel, start + chunk))
            g, vol = self._geometry(el)
            ke = np.zeros((len(el), 30, 30))
            for lam, w in zip(QUAD, QUAD_W):
                b = self._strain_matrix(self._shape_gradients(g, lam))
                db = np.einsum("ij,njb->nib", d, b)
                ke += (w * vol)[:, None, None] * np.einsum("nia,nib->nab", b, db)
            dofs = self.element_dofs(el)
            rows = np.repeat(dofs, 30, axis=1).ravel()
            cols = np.tile(dofs, (1, 30)).ravel()
            part = sp.csr_matrix((ke.ravel(), (rows, cols)), shape=(self.ndof, self.ndof))
            k = part if k is None else k + part
        return k

    # --- boundary facets and what is applied on them ---

    def boundary(self) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """The boundary facets: their ids, centroids (n, 3), outward unit normals (n, 3) and areas (n,)."""
        mesh = self.mesh
        bf = mesh.boundary_facets()
        tri = mesh.facets[:, bf]
        p = mesh.p
        a, b, c = p[:, tri[0]].T, p[:, tri[1]].T, p[:, tri[2]].T
        n = np.cross(b - a, c - a)
        area = 0.5 * np.linalg.norm(n, axis=1)
        n = n / (2 * area[:, None])
        centroid = (a + b + c) / 3
        # orient outward: away from the owning element's fourth vertex
        tet = mesh.t[:, mesh.f2t[0, bf]]
        inside = p[:, tet].mean(axis=1).T
        flip = np.einsum("ij,ij->i", n, centroid - inside) < 0
        n[flip] *= -1
        return bf, centroid, n, area

    def facet_nodes(self, facets: np.ndarray) -> np.ndarray:
        """Every P2 node of these facets: their vertices and edge midpoints."""
        mesh = self.mesh
        return np.unique(np.concatenate([mesh.facets[:, facets].ravel(), self.nv + mesh.f2e[:, facets].ravel()]))

    def traction_load(self, facets: np.ndarray, force: np.ndarray) -> np.ndarray:
        """A load vector spreading `force` (3,) as a uniform traction over these facets. For a quadratic triangle
        under uniform traction the consistent load is nothing at the corners and a third at each edge's midpoint."""
        f = np.zeros(self.ndof)
        if len(facets) == 0:
            raise ValueError("no facets to load")
        mesh = self.mesh
        tri = mesh.facets[:, facets]
        p = mesh.p
        area = 0.5 * np.linalg.norm(np.cross(p[:, tri[1]].T - p[:, tri[0]].T, p[:, tri[2]].T - p[:, tri[0]].T), axis=1)
        traction = np.asarray(force, dtype=float) / area.sum()
        mids = self.nv + mesh.f2e[:, facets]  # (3, n)
        for c in range(3):
            np.add.at(f, 3 * mids.ravel() + c, np.repeat(area[None, :] / 3, 3, axis=0).ravel() * traction[c])
        return f

    def solve(
        self,
        k: sp.csr_matrix,
        f: np.ndarray,
        fixed_nodes: np.ndarray,
        method: str = "auto",
        rtol: float = 1e-8,
        direct_max: int = DIRECT_MAX,
    ) -> np.ndarray:
        """The displacements with these nodes held. "direct": PARDISO's Cholesky (mtype 2) on the upper triangle, as
        the held stiffness is symmetric and positive definite, about half the memory of the general LU (that took
        31 GB for 1.6 million unknowns, 23 Oct 2026); "amg": conjugate gradients preconditioned by smoothed
        aggregation with the six rigid-body modes, for problems too large to factor here (about 7 times slower on
        0.6 million unknowns, the same answer to 1e-10); "auto": direct up to DIRECT_MAX unknowns."""
        fixed = (3 * fixed_nodes[:, None] + np.arange(3)[None, :]).ravel()
        free = np.setdiff1d(np.arange(self.ndof), fixed)
        u = np.zeros(self.ndof)
        kff = k[free][:, free].tocsr()
        if method == "auto":
            method = "direct" if len(free) <= direct_max else "amg"
        self.solved_by = method
        if method == "direct":
            solver = pypardiso.PyPardisoSolver(mtype=2)
            u[free] = solver.solve(sp.triu(kff, format="csr"), f[free])
            solver.free_memory(everything=True)
            return u
        import pyamg
        from scipy.sparse.linalg import cg

        x = self.nodes.T
        modes = np.zeros((self.ndof, 6))
        modes[0::3, 0] = modes[1::3, 1] = modes[2::3, 2] = 1
        modes[0::3, 3], modes[1::3, 3] = -x[:, 1], x[:, 0]
        modes[1::3, 4], modes[2::3, 4] = -x[:, 2], x[:, 1]
        modes[0::3, 5], modes[2::3, 5] = x[:, 2], -x[:, 0]
        ml = pyamg.smoothed_aggregation_solver(
            kff, B=modes[free], symmetry="symmetric", strength=("symmetric", {"theta": 0.0}), max_coarse=2000
        )
        count = [0]
        sol, info = cg(
            kff,
            f[free],
            rtol=rtol,
            M=ml.aspreconditioner(cycle="V"),
            maxiter=5000,
            callback=lambda _: count.__setitem__(0, count[0] + 1),
        )
        if info != 0:
            raise RuntimeError(f"conjugate gradients did not converge in {count[0]} iterations")
        self.iterations = count[0]
        u[free] = sol
        return u

    def stresses(self, u: np.ndarray, e_mpa: float, nu: float, chunk: int = 50000) -> np.ndarray:
        """The stress tensor (Voigt, MPa) at each element's four vertices: (nel, 4, 6). P2 strains are linear in
        an element, so its extremes are at its vertices."""
        d = elasticity_matrix(e_mpa, nu)
        nel = self.mesh.t.shape[1]
        out = np.empty((nel, 4, 6))
        for start in range(0, nel, chunk):
            el = np.arange(start, min(nel, start + chunk))
            g, _ = self._geometry(el)
            ue = u[self.element_dofs(el)]
            for v in range(4):
                lam = np.zeros(4)
                lam[v] = 1
                b = self._strain_matrix(self._shape_gradients(g, lam))
                out[el, v, :] = np.einsum("ij,nj->ni", d, np.einsum("nia,na->ni", b, ue))
        return out


def von_mises(s: np.ndarray) -> np.ndarray:
    xx, yy, zz, xy, yz, xz = (s[..., i] for i in range(6))
    return np.sqrt(0.5 * ((xx - yy) ** 2 + (yy - zz) ** 2 + (zz - xx) ** 2) + 3 * (xy**2 + yz**2 + xz**2))


def normal_stress(s: np.ndarray, n: np.ndarray) -> np.ndarray:
    """The normal stress on planes whose normal is `n` (3,): across the layers when `n` is the build direction."""
    n = np.asarray(n, dtype=float) / np.linalg.norm(n)
    nx, ny, nz = n
    xx, yy, zz, xy, yz, xz = (s[..., i] for i in range(6))
    return xx * nx * nx + yy * ny * ny + zz * nz * nz + 2 * (xy * nx * ny + yz * ny * nz + xz * nx * nz)


def interlayer_shear(s: np.ndarray, n: np.ndarray) -> np.ndarray:
    """The shear stress on the layer planes whose normal is `n`."""
    n = np.asarray(n, dtype=float) / np.linalg.norm(n)
    xx, yy, zz, xy, yz, xz = (s[..., i] for i in range(6))
    tx = xx * n[0] + xy * n[1] + xz * n[2]
    ty = xy * n[0] + yy * n[1] + yz * n[2]
    tz = xz * n[0] + yz * n[1] + zz * n[2]
    sn = tx * n[0] + ty * n[1] + tz * n[2]
    return np.sqrt(np.maximum(tx * tx + ty * ty + tz * tz - sn * sn, 0))


def far_from(model: Model, points: np.ndarray, distance: float) -> np.ndarray:
    """Elements whose centroid is more than `distance` from every one of `points` (n, 3)."""
    centroids = model.mesh.p[:, model.mesh.t].mean(axis=1).T
    if len(points) == 0:
        return np.ones(len(centroids), dtype=bool)
    dist, _ = cKDTree(points).query(centroids)
    return dist > distance


class Timer:
    def __init__(self) -> None:
        self.t0 = time.perf_counter()
        self.marks: dict[str, float] = {}

    def mark(self, name: str) -> None:
        now = time.perf_counter()
        self.marks[name] = round(now - self.t0, 2)
        self.t0 = now


if __name__ == "__main__":
    # One mesh try in a process of its own (run.py's mesh_with_retries), so that a try gmsh never finishes can be
    # stopped: one sat 13 minutes in a surface it could not mesh, on 23 Oct 2026 (C338).
    import json
    import sys

    spec = json.loads(sys.argv[1])
    balls = [Refine(tuple(r["centre"]), r["radius"], r["size"], r["grow"]) for r in spec["refine"]]
    points, tets = mesh_stl(spec["stl"], spec["size"], balls, angle_deg=spec["angle"])
    np.savez(spec["out"], points=points, tets=tets)
