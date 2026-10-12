// The files the user downloads, as binary STL. Copied from parametric-window-sealer's
// packages/core/src/export.ts (C32). Whatever is generated is the user's (D8).
import type { Manifold } from 'manifold-3d';

export interface MeshData {
  positions: Float32Array; // x, y, z per vertex, in mm
  triangles: Uint32Array; // three vertex indices per triangle
}

export function meshOf(solid: Manifold): MeshData {
  const mesh = solid.getMesh();
  const count = mesh.vertProperties.length / mesh.numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) positions[v * 3 + k] = mesh.vertProperties[v * mesh.numProp + k] ?? 0;
  }
  return { positions, triangles: Uint32Array.from(mesh.triVerts) };
}

export function toStl(mesh: MeshData, name: string): Uint8Array {
  const count = mesh.triangles.length / 3;
  const bytes = new Uint8Array(84 + 50 * count);
  const view = new DataView(bytes.buffer);
  // A binary STL whose header starts with "solid" is misread as text by some readers.
  bytes.set(new TextEncoder().encode(`SKADIS board generator: ${name}`).slice(0, 80));
  view.setUint32(80, count, true);
  const p = mesh.positions;
  for (let t = 0; t < count; t++) {
    const vertex = (k: number) => (mesh.triangles[t * 3 + k] ?? 0) * 3;
    const [a, b, c] = [vertex(0), vertex(1), vertex(2)];
    const u = [0, 1, 2].map((k) => (p[b + k] ?? 0) - (p[a + k] ?? 0));
    const w = [0, 1, 2].map((k) => (p[c + k] ?? 0) - (p[a + k] ?? 0));
    const n = [
      (u[1] ?? 0) * (w[2] ?? 0) - (u[2] ?? 0) * (w[1] ?? 0),
      (u[2] ?? 0) * (w[0] ?? 0) - (u[0] ?? 0) * (w[2] ?? 0),
      (u[0] ?? 0) * (w[1] ?? 0) - (u[1] ?? 0) * (w[0] ?? 0),
    ];
    const length = Math.hypot(...n) || 1;
    const at = 84 + t * 50;
    n.forEach((x, k) => view.setFloat32(at + k * 4, x / length, true));
    [a, b, c].forEach((v, corner) => {
      for (let k = 0; k < 3; k++) view.setFloat32(at + 12 + (corner * 3 + k) * 4, p[v + k] ?? 0, true);
    });
    // The last two bytes of each triangle, the attribute count, stay zero.
  }
  return bytes;
}
