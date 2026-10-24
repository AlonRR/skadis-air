// A rounded root where a post meets the face it stands on (D375): the physics tests found each such root a sharp
// inner edge, its stress rising with every finer mesh, and a standoff's root on a board's back the weakest place on
// every board on standoffs. The root runs out from the post onto the face on a long eased curve, as the practice asks
// (printed-part-design, how a part looks): a parabola, tangent to the post's side 3 mm up it and to a plane 0.05 mm
// inside the face, so the curve crosses the face at a slant rather than touching it. The curve is part of the post's
// own mesh, its outline grown point by point at each level, so nothing is joined to the post along a tangent.
//
// How far the root runs out is the room the face leaves it, point by point round the post: where a slot's room, a
// hook's, the chamfer at an edge, a pocket or a screw's head comes near, it runs out less, or not at all. A post
// prints upward from the face its root is on, as a board prints face down and the slot clip wall face down, so each
// layer of the root lies within the one below and nothing of it is printed over air, at any size.
import type { Vec2 } from 'manifold-3d';

/** How far a root runs out over its face, at most, mm. */
export const ROOT_REACH_MM = 1.5;
/** How far up its post a root starts, at most: twice its reach, a long curve rather than a short round. */
export const ROOT_RISE_MM = 2 * ROOT_REACH_MM;
/** How far inside the face the curve's foot is drawn (the practice's 0.05 mm), so the two cross at a slant. */
export const ROOT_SINK_MM = 0.05;
/** The steps the curve is drawn in. */
const ROOT_STEPS = 10;
/** A level of the curve this near the face is left out: one 2 microns inside it, as eight steps put one for a 3 mm
 * rise, lies on the face as a 32-bit mesh's points are. Ten steps leave none out from 1.5 to 3 mm of rise. */
const OFF_FACE_MM = 0.01;
/** What a root leaves between its foot and whatever it keeps out of. */
export const ROOT_MARGIN_MM = 0.25;
/** How fast a root's reach may change round its post, mm per mm along it, so its foot runs on a smooth curve. */
const ROOT_EASE = 0.5;
/** The step a root's room is looked for in, mm. */
const ROOM_STEP_MM = 0.05;
/** The least rise a root is drawn with: below it, none, as its levels would lie too near each other. */
const LEAST_RISE_MM = 0.5;

/** The unit normal to the right of the edge from a to b: out of the solid, which lies on a ring's left. */
function right(a: Vec2, b: Vec2): Vec2 {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy);
  return [dy / length, -dx / length];
}

/** Each point's outward normal on a ring drawn anticlockwise, the solid on its left: the mean of its two edges'. */
function outwardNormals(ring: readonly Vec2[]): Vec2[] {
  const n = ring.length;
  const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
  return ring.map((p, i) => {
    const [a, b] = [right(at(i - 1), p), right(p, at(i + 1))];
    const [x, y] = [a[0] + b[0], a[1] + b[1]];
    const length = Math.hypot(x, y);
    return [x / length, y / length];
  });
}

/** The longest edge a post's outline may have where its root is drawn, mm. */
const ROOT_EDGE_MM = 0.5;

/**
 * A post's outline with points added along each edge longer than ROOT_EDGE_MM, evenly, so its root's reach is had all
 * the way round it: a long straight side's two ends alone, reaching out over a web where the side meets it, carried
 * their root straight along the side across the pocket between (a lattice board's standoff behind a slot, whose
 * straight sides are 10 mm, spilled 23 mm2 over the skeleton's pockets).
 */
export function densified(ring: readonly Vec2[]): Vec2[] {
  return ring.flatMap((a, i): Vec2[] => {
    const b = ring[(i + 1) % ring.length] ?? a;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / ROOT_EDGE_MM - 1e-9);
    if (n <= 1) return [a];
    return Array.from({ length: n }, (_, k): Vec2 => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
}

/**
 * How far the root runs out from each point of a post's outline, mm: as far along the point's outward normal as the
 * face is free, by `free`, less ROOT_MARGIN_MM, up to `mostMm`; then eased round the post, each point's reach no more
 * than any other's and half the distance between them, so it changes smoothly and stays inside what is free. The
 * outline's points are where the root is had, so none may be far from the next (densified).
 */
export function rootReach(ring: readonly Vec2[], free: (p: Vec2) => boolean, mostMm: number): number[] {
  const normals = outwardNormals(ring);
  const room = ring.map(([x, y], i) => {
    const [nx, ny] = normals[i] ?? [0, 0];
    let s = 0;
    while (s < mostMm + ROOT_MARGIN_MM && free([x + (s + ROOM_STEP_MM) * nx, y + (s + ROOM_STEP_MM) * ny]))
      s += ROOM_STEP_MM;
    return Math.max(0, Math.min(mostMm, s - ROOT_MARGIN_MM));
  });
  return ring.map(([x, y]) =>
    Math.min(...ring.map(([u, v], j) => (room[j] ?? 0) + ROOT_EASE * Math.hypot(x - u, y - v))),
  );
}

/**
 * The root's curve, from the top down: each level's height above the face, to the foot ROOT_SINK_MM inside it, and
 * the share of its reach it is out there. A quadratic Bezier whose control point is on the post's side at the sink's
 * depth: tangent to the side where it leaves it, `riseMm` up, and to a plane the sink below the face at its foot, so
 * it crosses the face at a slant, about 15 degrees for a 3 mm rise.
 */
export function rootProfile(riseMm: number): [number, number][] {
  if (riseMm <= 0) return [];
  return Array.from({ length: ROOT_STEPS + 1 }, (_, i): [number, number] => {
    const t = i / ROOT_STEPS;
    return [(1 - t) ** 2 * (riseMm + ROOT_SINK_MM) - ROOT_SINK_MM, t * t];
  }).filter(([up]) => Math.abs(up) >= OFF_FACE_MM);
}

/** How far up a post its root may start, given how much of the post is clear of what else it has, and how far out it
 * may run: the rise twice the reach, at most ROOT_RISE_MM and ROOT_REACH_MM; none on a post too short. */
export function rootSize(clearMm: number): { riseMm: number; reachMm: number } {
  const riseMm = Math.min(ROOT_RISE_MM, clearMm);
  return riseMm < LEAST_RISE_MM ? { riseMm: 0, reachMm: 0 } : { riseMm, reachMm: riseMm / 2 };
}

/** Whether a point lies inside an outline's rings, holes and all: inside an odd number of them. */
export function insideRings(rings: readonly (readonly Vec2[])[], [x, y]: Vec2): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [a, b]: [Vec2, Vec2] = [ring[i] ?? [0, 0], ring[j] ?? [0, 0]];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
  }
  return inside;
}
