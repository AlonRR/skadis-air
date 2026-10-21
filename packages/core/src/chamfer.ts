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
 * Each point of the outline moved into the solid: to where its two edges, each moved in parallel by its own amount,
 * meet. The solid lies left of every ring as an outline gives them, its outer rings anticlockwise and its holes
 * clockwise. Refuses a move that turns an edge round, which is a chamfer larger than the outline takes there.
 */
function mitres(rings: readonly Vec2[][], by: EdgeMm): Map<string, Vec2> {
  const moved = new Map<string, Vec2>();
  for (const ring of rings) {
    const n = ring.length;
    const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
    const to = ring.map((p, i): Vec2 => {
      const [n1, n2] = [left(at(i - 1), p), left(p, at(i + 1))];
      const [d1, d2] = [by(at(i - 1), p), by(p, at(i + 1))];
      // the point v from p that lies d1 in from the edge before and d2 in from the one after
      const det = n1[0] * n2[1] - n1[1] * n2[0];
      if (Math.abs(det) < 1e-9) return [p[0] + d1 * n1[0], p[1] + d1 * n1[1]]; // on a straight line: both alike
      return [p[0] + (d1 * n2[1] - d2 * n1[1]) / det, p[1] + (n1[0] * d2 - n2[0] * d1) / det];
    });
    const movedAt = (i: number): Vec2 => to[((i % n) + n) % n] ?? [0, 0];
    for (let i = 0; i < n; i++) {
      const [a, b, a2, b2] = [at(i), at(i + 1), movedAt(i), movedAt(i + 1)];
      if ((b[0] - a[0]) * (b2[0] - a2[0]) + (b[1] - a[1]) * (b2[1] - a2[1]) <= 0) {
        throw new RangeError(`A ${by(a, b)} mm chamfer is larger than the outline takes`);
      }
      moved.set(key(a), a2);
    }
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
