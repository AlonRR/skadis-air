// The standoff connector (backlog item conn-standoff; D92 to D94, D97): a hollow spacer that goes between
// boards and the wall at their corner screw holes, the screw through both (D93). It is the size of the
// built-in standoffs (D94, C83), so it keeps the same room round the slots: for 1 board a ring; for 2
// boards, at a seam, one spacer over their two corner holes, 20 mm apart; for 4, where their corners meet,
// over four holes on a 20 mm square. Built as it hangs: its wall face on z = 0, its board face toward +z,
// centred where the boards' corners meet.
//
// Across a seam runs a column of slots (D15), and a hook hangs its back tab below its slot behind the
// board. So a shared spacer is cut away next to the board along the seam, a tunnel as deep as a hook
// reaches behind the board and as wide as a slot's room, and is joined across the seam only on the wall
// side (D97). The 4-board spacer has a tunnel each way, so it fits either way up; the 2-board one, turned
// for a horizontal seam, has no slot column between its holes.
import type { CrossSection, Manifold } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { SCREW_INSET_MM, screwHole, STANDOFF_DEFAULT_MM } from './mounting.js';
import { chamferedExtrusion, EDGE_CHAMFER_MM, HOLE_MOUTH_MM as MOUTH_MM, longBlend, placed } from './chamfer.js';
import { circle, ringedSolid } from './rings.js';
import { HOOK_DEPTH_MM, SLOT_WIDTH_MM } from './skadis.js';

export type StandoffBoards = 1 | 2 | 4;

export interface StandoffParams {
  boards: StandoffBoards; // how many boards' corners it serves (D92)
  heightMm: number; // how far it holds the boards off the wall (D94)
  screwMm: number; // the screw's diameter (D76)
  /** For the trial only (D267): the top 2 mm of each hole this wide, so the screw pushed through the board cuts into
   * it and carries the standoff; none unless given. */
  pilotMm?: number;
}

export const STANDOFF_DEFAULTS: StandoffParams = { boards: 1, heightMm: STANDOFF_DEFAULT_MM, screwMm: 4 };

/** The room kept round a slot and a hook, beyond what each takes: the margin of C83. */
const ROOM_MARGIN_MM = 2;
/** The tunnel: as deep as a hook's back tab sits behind the board, and as wide as a slot's room (C83). */
export const TUNNEL_DEPTH_MM = HOOK_DEPTH_MM + ROOM_MARGIN_MM;
export const TUNNEL_WIDTH_MM =
  SLOT_WIDTH_MM + SOLID_BOARD_DEFAULTS.slotClearanceMm + 2 * (SOLID_BOARD_DEFAULTS.slotChamferMm + ROOM_MARGIN_MM);
/** The least bridge behind a tunnel, on the wall side (C99). */
const MIN_BRIDGE_MM = 4;
/** How far down from the board face a tight section reaches (D267). */
const PILOT_MM = 2;
/** How far past the bridge's side the 2-board standoff's blend meets a post (D270): 0.4 mm, all the margin C100
 * leaves, or two thirds of what the post stands past the bridge where that is less (a 3.5 mm screw's post, 4.75 mm
 * round); no blend where the post stands less than 0.2 mm past it (a 3 mm screw's). */
const BRIDGE_MEET_MM = 0.4;

/** A standoff's settings, with the starting values filled in, refused when they cannot make one. */
export function standoffParams(given: Partial<StandoffParams>): StandoffParams {
  const p: StandoffParams = { ...STANDOFF_DEFAULTS, ...given };
  if (![1, 2, 4].includes(p.boards)) throw new RangeError('A standoff serves 1, 2 or 4 boards');
  if (!(p.heightMm > 0)) throw new RangeError('The standoff must be more than 0 mm tall');
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (p.pilotMm !== undefined && !(p.pilotMm > 0 && p.pilotMm < screwHole(p.screwMm).holeMm)) {
    throw new RangeError("A standoff's tight section must be narrower than its hole");
  }
  const least = TUNNEL_DEPTH_MM + MIN_BRIDGE_MM;
  if (p.boards > 1 && p.heightMm < least) {
    throw new RangeError(
      `A standoff for ${p.boards} boards needs to be at least ${least} mm tall: ${TUNNEL_DEPTH_MM} mm of room ` +
        `for hooks next to the boards and ${MIN_BRIDGE_MM} mm of bridge behind it`,
    );
  }
  return p;
}

/** What each screw passes (D264): a board at its starting thickness and this standoff. */
export function standoffScrews(p: StandoffParams): string {
  const board = SOLID_BOARD_DEFAULTS.thicknessMm;
  return (
    `Each screw passes ${nice(board + p.heightMm)} mm of board and standoff, a ${nice(board)} mm board on this ` +
    `${nice(p.heightMm)} mm standoff, plus your wall plug.`
  );
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** Where its holes are, round the point where the boards' corners meet. */
function holeCentres(boards: StandoffBoards): [number, number][] {
  const i = SCREW_INSET_MM;
  if (boards === 1) return [[0, 0]];
  if (boards === 2) {
    return [
      [-i, 0],
      [i, 0],
    ];
  }
  return [
    [-i, -i],
    [i, -i],
    [-i, i],
    [i, i],
  ];
}

export function makeStandoff(engine: Engine, params: StandoffParams): Manifold {
  const { CrossSection, Manifold } = engine;
  const p = standoffParams(params);
  const { holeMm, standoffDiameterMm } = screwHole(p.screwMm);
  const centres = holeCentres(p.boards);
  const sections: CrossSection[] = [];
  const keep = (s: CrossSection) => {
    sections.push(s);
    return s;
  };
  // The outline stretched over the holes (D94), less the holes, extruded once: one solid, nothing joined.
  // For 2 boards the posts are joined by a bridge narrower than they are (C100): turned for a horizontal
  // seam, its sides would otherwise come within the margin of a slot at the boards' edge.
  const posts = centres.map(([x, y]) => keep(new CrossSection([circle(x, y, standoffDiameterMm)])));
  const bridge = 2 * (SCREW_INSET_MM - TUNNEL_WIDTH_MM / 2);
  const outline =
    p.boards === 2
      ? keep(CrossSection.union([...posts, keep(CrossSection.square([2 * SCREW_INSET_MM, bridge], true))]))
      : keep(CrossSection.hull(posts));
  // where the bridge meets each post, a long blend in plan (D270)
  const [round, side] = [standoffDiameterMm / 2, bridge / 2];
  const blends =
    p.boards === 2 && round - side >= 0.2
      ? centres.flatMap(([x, y]) =>
          [1, -1].map((across) => {
            const ring = longBlend({
              radiusMm: round,
              edgeMm: side,
              meetMm: side + Math.min(BRIDGE_MEET_MM, ((round - side) * 2) / 3),
              sinkMm: 0.05,
            });
            return keep(new CrossSection([placed(ring, [x, y], [x > 0 ? -1 : 1, 0], [0, across])], 'NonZero'));
          }),
        )
      : [];
  const footprint = blends.length > 0 ? keep(CrossSection.union([outline, ...blends])) : outline;
  const h = p.heightMm;
  const plain = chamferedExtrusion(engine, footprint, h, { bottomMm: EDGE_CHAMFER_MM, topMm: EDGE_CHAMFER_MM });
  for (const s of sections) s.delete();
  // each hole chamfered at both ends; a tight section at the board face for the trial (D267)
  const tight = Math.min(PILOT_MM, h);
  const holeCuts = centres.map(([x, y]) => {
    const bottom = ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), [
      [-1, MOUTH_MM + 1],
      [MOUTH_MM, 0],
      ...(p.pilotMm === undefined
        ? ([
            [h - MOUTH_MM, 0],
            [h + 1, MOUTH_MM + 1],
          ] as [number, number][])
        : ([[h - tight, 0]] as [number, number][])),
    ]);
    if (p.pilotMm === undefined) return bottom;
    const pilot = ringedSolid(engine, (grow) => circle(x, y, p.pilotMm ?? holeMm, grow), [
      [h - tight - 0.5, 0],
      [h + 1, 0],
    ]);
    const both = Manifold.union(bottom, pilot);
    for (const m of [bottom, pilot]) m.delete();
    return both;
  });
  const holes = Manifold.union(holeCuts);
  const body = plain.subtract(holes);
  for (const m of [plain, ...holeCuts, holes]) m.delete();
  if (p.boards === 1) return body;

  // The tunnels at the board face (D97): across the holes' line, and for 4 boards the other way too; each edge at
  // the board chamfered 1 mm (D270). Their floors' corners stay square: the tunnel is the hooks' room, margin and
  // all, and a fill there would stand in it, so the step is kept and made plain.
  const [w, d, span] = [TUNNEL_WIDTH_MM, TUNNEL_DEPTH_MM, 4 * SCREW_INSET_MM];
  const c = EDGE_CHAMFER_MM;
  const tunnel = (alongX: boolean) => {
    const slab = (half: number, z: number) => {
      const [sx, sy] = alongX ? [span, 2 * half] : [2 * half, span];
      return Manifold.cube([sx, sy, 0.001], true).translate([0, 0, z]);
    };
    // a straight tunnel, and over it a flare for the chamfer: each convex, so each a hull
    const [sx, sy] = alongX ? [span, w] : [w, span];
    const straight = Manifold.cube([sx, sy, d + 1], true).translate([0, 0, h - d / 2 + 0.5]);
    const slabs = [slab(w / 2, h - c), slab(w / 2 + c + 1, h + 1)];
    const flare = Manifold.hull(slabs);
    const cutter = Manifold.union(straight, flare);
    for (const m of [...slabs, straight, flare]) m.delete();
    return cutter;
  };
  const tunnels = p.boards === 4 ? [tunnel(false), tunnel(true)] : [tunnel(false)];
  const cut = Manifold.union(tunnels);
  const part = body.subtract(cut);
  for (const m of [...tunnels, cut, body]) m.delete();
  return part;
}
