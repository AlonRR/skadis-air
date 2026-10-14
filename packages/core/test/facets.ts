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
