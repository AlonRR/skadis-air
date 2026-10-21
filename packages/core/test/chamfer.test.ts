// The chamfered extrusion (D270; the practice's "how a part looks"): any outline, convex or not, holes and all,
// extruded with a 45 degree chamfer round its bottom and its top edges. Each claim is measured on the solid.
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { chamferedExtrusion, longBlend } from '../src/chamfer.js';
import { loadEngine } from '../src/engine.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets } from './facets.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});
const outline = (rings: Vec2[][]) => keep(new engine.CrossSection(rings));
const SQUARE: Vec2[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
// an L: a 10 x 10 square less its top right 5 x 5 quarter, one concave corner
const L: Vec2[] = [
  [0, 0],
  [10, 0],
  [10, 5],
  [5, 5],
  [5, 10],
  [0, 10],
];

describe('chamferedExtrusion', () => {
  it('chamfers a square 1 mm at 45 degrees, bottom and top, as worked out by hand', () => {
    const part = keep(chamferedExtrusion(engine, outline([SQUARE]), 7, { bottomMm: 1, topMm: 1 }));
    // each band: the integral of (8 + 2z)^2 over a millimetre, (1000 - 512) / 6, against 100 for a plain one
    expect(part.volume()).toBeCloseTo(500 + 2 * (488 / 6), 3);
    expect(keep(part.slice(1e-6)).area()).toBeCloseTo(64, 3); // 8 x 8 at the bed
    expect(keep(part.slice(0.5)).area()).toBeCloseTo(81, 3); // 9 x 9 halfway up the chamfer
    expect(keep(part.slice(3.5)).area()).toBeCloseTo(100, 3);
    expect(keep(part.slice(7 - 1e-6)).area()).toBeCloseTo(64, 3);
  });

  it('chamfers a concave outline along every edge, its inside corner mitred, and stays one closed solid', () => {
    const part = keep(chamferedExtrusion(engine, outline([L]), 5, { bottomMm: 1, topMm: 0 }));
    expect(part.genus()).toBe(0);
    // at the bed, the L moved in 1 mm along every edge: 8 x 8, less the 5 x 5 its inside corner, now at (4, 4), cuts off
    const bed = keep(part.slice(1e-6));
    expect(bed.area()).toBeCloseTo(8 * 8 - 5 * 5, 3);
    expect(keep(part.slice(5 - 1e-6)).area()).toBeCloseTo(75, 3); // no top chamfer asked for
    expect(degenerateFacets(meshOf(part))).toBe(0);
  });

  it('chamfers a hole too, its edge moved out into the hole', () => {
    const hole: Vec2[] = [
      [3, 3],
      [3, 7],
      [7, 7],
      [7, 3],
    ];
    const part = keep(chamferedExtrusion(engine, outline([SQUARE, hole]), 5, { bottomMm: 1, topMm: 1 }));
    expect(part.genus()).toBe(1);
    expect(keep(part.slice(1e-6)).area()).toBeCloseTo(64 - 36, 3); // the square in to 8 x 8, the hole out to 6 x 6
  });

  it('chamfers each edge by its own amount where a function gives them, its corners mitred to suit (D276)', () => {
    // the square's bottom edge, along y = 0, left square at the bed, its other three edges chamfered 1 mm
    const alongBottom = ([, ay]: Vec2, [, by]: Vec2) => (ay === 0 && by === 0 ? 0 : 1);
    const part = keep(chamferedExtrusion(engine, outline([SQUARE]), 5, { bottomMm: alongBottom, topMm: 0 }));
    const bed = keep(part.slice(1e-6));
    expect(bed.area()).toBeCloseTo(8 * 9, 3); // in 1 mm from the left, the right and the top
    const { min, max } = bed.bounds();
    for (const [v, at] of [
      [min[0], 1],
      [min[1], 0],
      [max[0], 9],
      [max[1], 9],
    ] as const) {
      expect(v).toBeCloseTo(at, 5);
    }
    expect(keep(part.slice(5 - 1e-6)).area()).toBeCloseTo(100, 3);
    expect(degenerateFacets(meshOf(part))).toBe(0);
  });

  it('extrudes plainly where no chamfer is asked for', () => {
    const part = keep(chamferedExtrusion(engine, outline([SQUARE]), 4, { bottomMm: 0, topMm: 0 }));
    expect(part.volume()).toBeCloseTo(400, 6);
  });

  it('refuses chamfers that meet, or one larger than the outline takes', () => {
    expect(() => chamferedExtrusion(engine, outline([SQUARE]), 1.5, { bottomMm: 1, topMm: 1 })).toThrow(RangeError);
  });
});

describe('longBlend', () => {
  it('leaves a straight edge tangent and meets a round at its own slope, on a parabola (the practice)', () => {
    // an edge 5 mm out along a bar from a round of radius 10 at the origin, meeting it 8 mm out
    const ring = longBlend({ radiusMm: 10, edgeMm: 5, meetMm: 8 });
    const [s0, t0] = ring[0] ?? [0, 0];
    expect([s0, t0]).toEqual([14, 5]); // leaves the edge 14 mm along: 2 x 3 x 8 / 6 past where it meets the round
    // where it meets the round: on it, 6 mm along
    const meet = ring.find(([s, t]) => Math.abs(s - 6) < 1e-9 && Math.abs(t - 8) < 1e-9);
    expect(meet).toBeDefined();
    // every point of the curve is outside the round or on it
    for (const [s, t] of ring) expect(s * s + t * t).toBeGreaterThan(100 - 1e-6);
  });
});
