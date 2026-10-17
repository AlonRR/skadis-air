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
import { circle } from './rings.js';
import { HOOK_DEPTH_MM, SLOT_WIDTH_MM } from './skadis.js';

export type StandoffBoards = 1 | 2 | 4;

export interface StandoffParams {
  boards: StandoffBoards; // how many boards' corners it serves (D92)
  heightMm: number; // how far it holds the boards off the wall (D94)
  screwMm: number; // the screw's diameter (D76)
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

/** A standoff's settings, with the starting values filled in, refused when they cannot make one. */
export function standoffParams(given: Partial<StandoffParams>): StandoffParams {
  const p: StandoffParams = { ...STANDOFF_DEFAULTS, ...given };
  if (![1, 2, 4].includes(p.boards)) throw new RangeError('A standoff serves 1, 2 or 4 boards');
  if (!(p.heightMm > 0)) throw new RangeError('The standoff must be more than 0 mm tall');
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  const least = TUNNEL_DEPTH_MM + MIN_BRIDGE_MM;
  if (p.boards > 1 && p.heightMm < least) {
    throw new RangeError(
      `A standoff for ${p.boards} boards needs to be at least ${least} mm tall: ${TUNNEL_DEPTH_MM} mm of room ` +
        `for hooks next to the boards and ${MIN_BRIDGE_MM} mm of bridge behind it`,
    );
  }
  return p;
}

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
  const holes = keep(CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, holeMm)])))));
  const body = keep(outline.subtract(holes)).extrude(p.heightMm);
  for (const s of sections) s.delete();
  if (p.boards === 1) return body;

  // The tunnels at the board face (D97): across the holes' line, and for 4 boards the other way too.
  const [w, d, h, span] = [TUNNEL_WIDTH_MM, TUNNEL_DEPTH_MM, p.heightMm, 4 * SCREW_INSET_MM];
  const blocks = [Manifold.cube([w, span, d + 1])];
  if (p.boards === 4) blocks.push(Manifold.cube([span, w, d + 1]));
  const tunnels = blocks.map((b, k) => b.translate(k === 0 ? [-w / 2, -span / 2, h - d] : [-span / 2, -w / 2, h - d]));
  const cut = Manifold.union(tunnels);
  const part = body.subtract(cut);
  for (const m of [...blocks, ...tunnels, cut, body]) m.delete();
  return part;
}
