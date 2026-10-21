// How a part looks (D270; the practice's section on it): edges chamfered at 45 degrees, and a section joined to the
// next on a long eased curve rather than a sharp corner. The chamfer is made on any outline, convex or not, holes
// and all, by moving the outline's points in along the mitre of their edges at the bottom or the top of a thin
// band: every edge moves in parallel, so every side face of the band is a flat 45 degree chamfer, and nothing is
// cut or joined but the bands to the middle. A Minkowski sum gives the same solid (to 2 mm3 in 5800), in about
// thirty times as long (measured on the slot clip, 21 Oct 2026).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import type { Engine } from './engine.js';

/** One chamfer for every outside edge of the connectors (D270): the slots' own 1 mm (D41), so the edges that repeat
 * read as one designer's work, and the bed's edges hide what spread the first layer keeps. */
export const EDGE_CHAMFER_MM = 1;
/** The chamfer round each end of a screw hole (D270): half the edges', as the wall round the hole is 2.75 mm. */
export const HOLE_MOUTH_MM = 0.5;

/** Moves each point of a ring drawn round a centre, as a blend's is, from the frame of a round at `centre` whose
 * `along` runs towards where its edge leads and `across` towards the edge's side, onto the page. */
export function placed(ring: readonly Vec2[], centre: Vec2, along: Vec2, across: Vec2): Vec2[] {
  return ring.map(([s, t]): Vec2 => [
    centre[0] + s * along[0] + t * across[0],
    centre[1] + s * along[1] + t * across[1],
  ]);
}

/** How far in an edge is chamfered: one amount for every edge, or each edge's own, from its two ends as the outline
 * gives them. Each edge's is 0 or the largest, so every chamfer runs at 45 degrees. */
export type ChamferMm = number | ((a: Vec2, b: Vec2) => number);

export interface Chamfers {
  bottomMm: ChamferMm; // round the bottom edges, at z = 0; 0 for none
  topMm: ChamferMm; // round the top edges, at the extrusion's height; 0 for none
}

const key = ([x, y]: readonly number[]) => `${Math.round((x ?? 0) * 1e5)},${Math.round((y ?? 0) * 1e5)}`;

/** The unit normal to the left of the edge from a to b, into the solid. */
const left = ([ax, ay]: Vec2, [bx, by_]: Vec2): Vec2 => {
  const [dx, dy] = [bx - ax, by_ - ay];
  const length = Math.hypot(dx, dy);
  return [-dy / length, dx / length];
};

/** Each edge's amount, from its two ends. */
type EdgeMm = (a: Vec2, b: Vec2) => number;

/** Every edge of the rings, from each point to the next. */
const edgesOf = (rings: readonly Vec2[][]): [Vec2, Vec2][] =>
  rings.flatMap((ring) => ring.map((p, i): [Vec2, Vec2] => [p, ring[(i + 1) % ring.length] ?? p]));

/**
 * A ring's points, each moved to where its two edges meet once each edge is moved in parallel by its own amount,
 * `amounts[i]` the edge from point i to the next: into the region on the ring's left where an amount is positive,
 * out of it where negative. Refuses a move that turns an edge round, more than the ring takes there.
 */
export function movedRing(ring: readonly Vec2[], amounts: readonly number[]): Vec2[] {
  const n = ring.length;
  const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
  const by = (i: number) => amounts[((i % n) + n) % n] ?? 0;
  const to = ring.map((p, i): Vec2 => {
    const [n1, n2] = [left(at(i - 1), p), left(p, at(i + 1))];
    const [d1, d2] = [by(i - 1), by(i)];
    // the point v from p that lies d1 in from the edge before and d2 in from the one after
    const det = n1[0] * n2[1] - n1[1] * n2[0];
    if (Math.abs(det) < 1e-9) return [p[0] + d1 * n1[0], p[1] + d1 * n1[1]]; // on a straight line: both alike
    return [p[0] + (d1 * n2[1] - d2 * n1[1]) / det, p[1] + (n1[0] * d2 - n2[0] * d1) / det];
  });
  for (let i = 0; i < n; i++) {
    const [a, b] = [at(i), at(i + 1)];
    const [a2, b2] = [to[i] ?? a, to[(i + 1) % n] ?? b];
    if ((b[0] - a[0]) * (b2[0] - a2[0]) + (b[1] - a[1]) * (b2[1] - a2[1]) <= 0) {
      throw new RangeError(`A ${Math.abs(by(i))} mm move is larger than the outline takes`);
    }
  }
  return to;
}

/**
 * A ring's points, each moved by its own amount along the mitre of its two edges, `amounts[i]` point i's: into the
 * region on the ring's left where positive, out of it where negative. Where a point's two edges are moved alike it is
 * where they meet, as movedRing puts it; where the amount changes along a curve, the curve moves smoothly, where
 * movedRing, meeting two near-straight-on edges moved by different amounts, would put their meeting far off.
 * Refuses a move that turns an edge round.
 */
export function grownRing(ring: readonly Vec2[], amounts: readonly number[]): Vec2[] {
  const n = ring.length;
  const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
  const to = ring.map((p, i): Vec2 => {
    const [n1, n2] = [left(at(i - 1), p), left(p, at(i + 1))];
    const k = (amounts[i] ?? 0) / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] + k * (n1[0] + n2[0]), p[1] + k * (n1[1] + n2[1])];
  });
  for (let i = 0; i < n; i++) {
    const [a, b] = [at(i), at(i + 1)];
    const [a2, b2] = [to[i] ?? a, to[(i + 1) % n] ?? b];
    if ((b[0] - a[0]) * (b2[0] - a2[0]) + (b[1] - a[1]) * (b2[1] - a2[1]) <= 0) {
      throw new RangeError(`A ${Math.abs(amounts[i] ?? 0)} mm move is larger than the outline takes`);
    }
  }
  return to;
}

/**
 * Each point of the outline moved into the solid: to where its two edges, each moved in parallel by its own amount,
 * meet. The solid lies left of every ring as an outline gives them, its outer rings anticlockwise and its holes
 * clockwise. Refuses a move that turns an edge round, which is a chamfer larger than the outline takes there.
 */
function mitres(rings: readonly Vec2[][], by: EdgeMm): Map<string, Vec2> {
  const moved = new Map<string, Vec2>();
  for (const ring of rings) {
    const amounts = ring.map((p, i) => by(p, ring[(i + 1) % ring.length] ?? p));
    let to: Vec2[];
    try {
      to = movedRing(ring, amounts);
    } catch {
      throw new RangeError(`A ${Math.max(...amounts)} mm chamfer is larger than the outline takes`);
    }
    ring.forEach((p, i) => moved.set(key(p), to[i] ?? p));
  }
  return moved;
}

/** The outline extruded `heightMm` tall, its bottom and top edges chamfered at 45 degrees by the amounts given. */
export function chamferedExtrusion(
  engine: Engine,
  outline: CrossSection,
  heightMm: number,
  chamfers: Chamfers,
): Manifold {
  // without the points that lie on the line through their neighbours, to within 5 microns: where two outlines
  // cross at a slant they leave a hair-short edge, whose two ends a chamfer would move onto one point
  const clean = outline.simplify(0.005);
  const rings = clean.toPolygons();
  const edges = edgesOf(rings);
  /** An amount as each edge's, and the largest, which is the band's height. */
  const amounts = (given: ChamferMm): [EdgeMm, number] => {
    const by: EdgeMm = typeof given === 'number' ? () => given : given;
    const each = edges.map(([a, b]) => by(a, b));
    const most = Math.max(0, ...each);
    if (!each.every((d) => d === 0 || d === most)) {
      clean.delete();
      throw new RangeError("Each edge's chamfer must be 0 mm or the largest, for every chamfer to run at 45 degrees");
    }
    return [by, most];
  };
  const [bottomBy, bottomMm] = amounts(chamfers.bottomMm);
  const [topBy, topMm] = amounts(chamfers.topMm);
  if (!(bottomMm + topMm < heightMm) || edges.some(([a, b]) => !(bottomBy(a, b) >= 0 && topBy(a, b) >= 0))) {
    clean.delete();
    throw new RangeError('The chamfers must be 0 mm or more, and leave some of the extrusion between them');
  }
  /** A band `c` tall whose points at `z` are moved in by each edge's amount. */
  const band = (by: EdgeMm, c: number, z: number) => {
    const moved = mitres(rings, by);
    const plain = clean.extrude(c);
    const warped = plain.warp((v) => {
      if (Math.abs((v[2] ?? 0) - z) > 1e-9) return;
      const to = moved.get(key(v));
      if (to === undefined) throw new Error('a point of the band is not on its outline');
      [v[0], v[1]] = to;
    });
    plain.delete();
    return warped;
  };
  const middle = heightMm - bottomMm - topMm;
  const pieces: Manifold[] = [];
  const keep = (m: Manifold) => {
    pieces.push(m);
    return m;
  };
  const parts = [keep(clean.extrude(middle)).translate([0, 0, bottomMm])];
  if (bottomMm > 0) parts.push(band(bottomBy, bottomMm, 0));
  if (topMm > 0) parts.push(keep(band(topBy, topMm, topMm)).translate([0, 0, heightMm - topMm]));
  const solid = engine.Manifold.union(parts);
  for (const m of [...pieces, ...parts]) m.delete();
  clean.delete();
  return solid;
}

/**
 * A long eased blend (the practice's): the region a parabola adds where a straight edge runs into a round, so the
 * outline leaves the edge tangent and meets the round at the round's own slope. In a round's own frame, its centre
 * at the origin: `s` along the edge, towards where it leads away from the round, and `t` across, the edge at
 * t = edgeMm; the parabola meets the round where t = meetMm. As the practice's reference works it out, the curve
 * leaves the edge 2 (meet - edge) meet / s_meet beyond where it meets the round. The ring runs along the parabola
 * from the edge to the round, then round the round back to the edge.
 */
export function longBlend({
  radiusMm,
  edgeMm,
  meetMm,
  sinkMm = 0,
}: {
  radiusMm: number;
  edgeMm: number;
  meetMm: number;
  sinkMm?: number; // drawn against a round this much smaller, so a round drawn as a polygon covers its end (the practice)
}): Vec2[] {
  if (!(edgeMm > 0 && meetMm > edgeMm && radiusMm > meetMm)) {
    throw new RangeError('A blend meets its round further out than its edge, and inside the round');
  }
  const steps = 16;
  const round = radiusMm - sinkMm;
  const sMeet = Math.sqrt(round ** 2 - meetMm ** 2);
  const sLeave = sMeet + (2 * (meetMm - edgeMm) * meetMm) / sMeet;
  const k = (meetMm - edgeMm) / (sLeave - sMeet) ** 2;
  const curve = Array.from({ length: steps + 1 }, (_, i): Vec2 => {
    const s = sLeave - ((sLeave - sMeet) * i) / steps;
    return [s, edgeMm + k * (sLeave - s) ** 2];
  });
  const [from, to] = [Math.atan2(meetMm, sMeet), Math.atan2(edgeMm, Math.sqrt(round ** 2 - edgeMm ** 2))];
  const arc = Array.from({ length: steps }, (_, i): Vec2 => {
    const a = from + ((to - from) * (i + 1)) / steps;
    return [round * Math.cos(a), round * Math.sin(a)];
  });
  return [...curve, ...arc];
}

/** A corner turning by more than this is blended; the rounds a part draws as polygons turn less at each point. */
const SHARP_TURN = (15 * Math.PI) / 180;
/** How far along its sides, at most, a blend reaches before the next corner: short of halfway, so two never meet. */
const LEG_SHARE = 0.45;
/** The points a blend is drawn with. */
const BLEND_STEPS = 8;

/** Where a ring's way turns at each point, left positive, in radians. */
function turns(ring: readonly Vec2[]): number[] {
  const n = ring.length;
  const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
  return ring.map((b, i) => {
    const [a, c] = [at(i - 1), at(i + 1)];
    const [ux, uy, vx, vy] = [b[0] - a[0], b[1] - a[1], c[0] - b[0], c[1] - b[1]];
    return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  });
}

/** One ring with its sharp corners blended: see blendCorners. */
function blendRing(ring: readonly Vec2[], legMm: number): Vec2[] {
  const n = ring.length;
  const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
  const along = [0];
  for (let i = 1; i <= n; i++)
    along.push((along[i - 1] ?? 0) + Math.hypot(at(i)[0] - at(i - 1)[0], at(i)[1] - at(i - 1)[1]));
  const perimeter = along[n] ?? 0;
  const turn = turns(ring);
  const stops = turn.flatMap((t, i) => (Math.abs(t) > SHARP_TURN ? [i] : []));
  if (!stops.some((i) => (turn[i] ?? 0) > 0)) return [...ring];
  const wrap = (d: number) => ((d % perimeter) + perimeter) % perimeter;
  /** How far round the ring to the next corner: all the way round where it is the only one. */
  const gap = (d: number) => (d > 1e-9 ? d : perimeter);
  /** The point `d` along the ring, and the way the ring runs there. */
  const pointAt = (d: number): [Vec2, Vec2] => {
    const x = wrap(d);
    let i = 0;
    while (i < n - 1 && (along[i + 1] ?? 0) <= x) i++;
    const [a, b] = [at(i), at(i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = (x - (along[i] ?? 0)) / length;
    return [
      [a[0] + k * (b[0] - a[0]), a[1] + k * (b[1] - a[1])],
      [(b[0] - a[0]) / length, (b[1] - a[1]) / length],
    ];
  };
  // each convex corner's blend: [where it starts along the ring, how far it runs, its points]
  const blends = stops.flatMap((c, k): [number, number, Vec2[]][] => {
    if ((turn[c] ?? 0) <= 0) return [];
    const m = stops.length;
    const [before, after] = [stops[(k - 1 + m) % m] ?? c, stops[(k + 1) % m] ?? c];
    const legIn = Math.min(legMm, LEG_SHARE * gap(wrap((along[c] ?? 0) - (along[before] ?? 0))));
    const legOut = Math.min(legMm, LEG_SHARE * gap(wrap((along[after] ?? 0) - (along[c] ?? 0))));
    const start = (along[c] ?? 0) - legIn;
    const [[p0, d0], [p2, d2]] = [pointAt(start), pointAt((along[c] ?? 0) + legOut)];
    // the control point: where the ways at the two ends meet, so the parabola leaves each tangent to its side
    const det = d0[0] * d2[1] - d0[1] * d2[0];
    const [gx, gy] = [p2[0] - p0[0], p2[1] - p0[1]];
    const t = (gx * d2[1] - gy * d2[0]) / det;
    const u = (d0[0] * gy - d0[1] * gx) / det;
    const control: Vec2 = Math.abs(det) > 1e-9 && t > 0 && u > 0 ? [p0[0] + t * d0[0], p0[1] + t * d0[1]] : at(c);
    const points = Array.from({ length: BLEND_STEPS + 1 }, (_, j): Vec2 => {
      const s = j / BLEND_STEPS;
      const [w0, w1, w2] = [(1 - s) ** 2, 2 * (1 - s) * s, s ** 2];
      return [w0 * p0[0] + w1 * control[0] + w2 * p2[0], w0 * p0[1] + w1 * control[1] + w2 * p2[1]];
    });
    return [[wrap(start), legIn + legOut, points]];
  });
  const within = (d: number, [from, span]: [number, number, Vec2[]]) => wrap(d - from) <= span + 1e-6;
  const pieces: [number, Vec2[]][] = [
    ...ring.flatMap((p, i): [number, Vec2[]][] =>
      blends.some((b) => within(along[i] ?? 0, b) || wrap((along[i] ?? 0) - b[0]) > perimeter - 1e-6)
        ? []
        : [[along[i] ?? 0, [p]]],
    ),
    ...blends.map(([from, , points]): [number, Vec2[]] => [from, points]),
  ];
  return pieces.sort((a, b) => a[0] - b[0]).flatMap(([, points]) => points);
}

/**
 * An outline's rings with each sharp corner of the region on their left (D278), an outer ring anticlockwise and a
 * hole clockwise as an outline gives them, run on a long eased curve: a parabola, as the practice asks, drawn as a
 * quadratic Bezier from `legMm` back along one side to `legMm` on along the other, tangent to each, its control
 * point where the two sides' ways meet; for two straight sides that is the corner itself. Each leg is held short of
 * halfway to the next corner. Corners the other way, the region's inside corners, are left as they are.
 */
export function blendCorners(rings: readonly Vec2[][], legMm: number): Vec2[][] {
  return rings.map((ring) => blendRing(ring, legMm));
}
