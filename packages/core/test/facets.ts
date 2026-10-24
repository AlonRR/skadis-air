// A facet is degenerate when two of its corners are one point as 32-bit floats, which is how a
// slicer reads an STL: PrusaSlicer removes such facets as it loads the file (scad-tools' stl-mesh.py).
// Shared by the tests of every part that is cut; not a test file itself.
import type { MeshData } from '../src/stl.js';

export function degenerateFacets(mesh: MeshData): number {
  let count = 0;
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const corners = [0, 1, 2].map((k) => {
      const v = (mesh.triangles[t * 3 + k] ?? 0) * 3;
      return [0, 1, 2].map((d) => Math.fround(mesh.positions[v + d] ?? 0)).join(',');
    });
    if (new Set(corners).size < 3) count++;
  }
  return count;
}

/** The edges, between corners as 32-bit floats, that do not lie on exactly two facets: a mesh a slicer reads as closed
 * has none, as scad-tools' stl-mesh.py counts "edges on more than two faces" (D375). */
export function edgesNotOnTwoFacets(mesh: MeshData): number {
  const corner = (v: number) => [0, 1, 2].map((d) => Math.fround(mesh.positions[v * 3 + d] ?? 0)).join(',');
  const edges = new Map<string, number>();
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const corners = [0, 1, 2].map((k) => corner(mesh.triangles[t * 3 + k] ?? 0));
    corners.forEach((a, k) => {
      const b = corners[(k + 1) % 3] ?? a;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    });
  }
  return [...edges.values()].filter((n) => n !== 2).length;
}
