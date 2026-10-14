// Outlines and the closed meshes stacked from them: a slot's stadium, a screw hole's circle, and a
// cutter made of rings of one outline at several depths, each grown by its own amount, so a chamfer
// or a countersink and the straight wall below it are one solid.
import type { Manifold, Vec2, Vec3 } from 'manifold-3d';
import type { Engine } from './engine.js';

/** Segments in a full circle, for the board's rounded corners, the slots' round ends and the screw holes. */
export const CIRCLE_SEGMENTS = 64;

export function arc(cx: number, cy: number, r: number, from: number, to: number, segments: number): Vec2[] {
  const points: Vec2[] = [];
  for (let k = 0; k <= segments; k++) {
    const a = from + ((to - from) * k) / segments;
    points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return points;
}

/** A slot's outline, counter-clockwise: a stadium w wide and h tall at (x, y), grown by `grow` all round. */
export function stadium(x: number, y: number, w: number, h: number, grow = 0): Vec2[] {
  const r = w / 2 + grow;
  const straight = (h - w) / 2;
  const half = CIRCLE_SEGMENTS / 2;
  return [...arc(x, y + straight, r, 0, Math.PI, half), ...arc(x, y - straight, r, Math.PI, 2 * Math.PI, half)];
}

/**
 * A circle's outline, counter-clockwise, d across at (x, y), grown by `grow`. Not a stadium of equal
 * width and height: that repeats a point where its two arcs meet, and a repeated point is a degenerate facet.
 */
export function circle(x: number, y: number, d: number, grow = 0): Vec2[] {
  return arc(x, y, d / 2 + grow, 0, 2 * Math.PI, CIRCLE_SEGMENTS).slice(0, -1);
}

/**
 * A closed mesh of rings: `ring(grow)` drawn at each [z, grow] level, from the lowest z up, every ring
 * with the same number of points. Built as one mesh rather than as cones and prisms joined by a union:
 * those meet exactly along an outline, and the cut left near-duplicate corners there, 440 degenerate
 * facets in a 40 x 40 tile, found by scad-tools' stl-mesh.py (12 Oct 2026).
 */
export function ringedSolid(engine: Engine, ring: (grow: number) => Vec2[], levels: [number, number][]): Manifold {
  const rings = levels.map(([z, grow]) => ring(grow).map(([px, py]): Vec3 => [px, py, z]));
  const n = rings[0]?.length ?? 0;
  const positions = new Float32Array(rings.flat(2));
  const triangles: number[] = [];
  const at = (level: number, i: number) => level * n + (i % n);
  for (let i = 1; i < n - 1; i++) triangles.push(at(0, 0), at(0, i + 1), at(0, i)); // bottom cap, facing down
  for (let level = 0; level < rings.length - 1; level++) {
    for (let i = 0; i < n; i++) {
      triangles.push(at(level, i), at(level, i + 1), at(level + 1, i + 1));
      triangles.push(at(level, i), at(level + 1, i + 1), at(level + 1, i));
    }
  }
  const top = rings.length - 1;
  for (let i = 1; i < n - 1; i++) triangles.push(at(top, 0), at(top, i), at(top, i + 1)); // top cap, facing up
  const mesh = new engine.Mesh({ numProp: 3, vertProperties: positions, triVerts: new Uint32Array(triangles) });
  return new engine.Manifold(mesh);
}
