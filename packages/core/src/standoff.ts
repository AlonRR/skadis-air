// The standoff connector (backlog item conn-standoff; D92 to D94, D97, D281): a hollow spacer that goes between
// boards and the wall at their corner screw holes, the screw through both (D93). It is the size of the
// built-in standoffs (D94, C83), so it keeps the same room round the slots: for 1 board a ring; for 2
// boards, at a seam, a post over each of their two corner holes, 20 mm apart, side by side or one above the other;
// for 4, where their corners meet, a post over each of four holes on a 20 mm square. Built as it hangs: its wall face
// on z = 0, its board face toward +z, centred where the boards' corners meet.
//
// Across a seam runs a column of slots (D15), and a hook hangs its back tab below its slot behind the
// board. So a shared spacer has the slot clip's shape (D281): next to the boards only its posts reach them, for as
// far as a hook takes behind the board and a margin, and they are joined by a bar as wide as they are on the wall
// side, behind that room (D97, C99); for 4 boards the bars make a square ring.
import type { CrossSection, Manifold } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { SCREW_INSET_MM, screwHole, STANDOFF_DEFAULT_MM } from './mounting.js';
import { chamferedExtrusion, EDGE_CHAMFER_MM, HOLE_MOUTH_MM as MOUTH_MM } from './chamfer.js';
import { circle, ringedSolid } from './rings.js';
import { HOOK_DEPTH_MM } from './skadis.js';

/** The boards it serves: 1, 2 side by side, 2 one above the other, or 4, as the slot clip's choices (D281). */
export type StandoffBoards = '1' | '2' | '2-stacked' | '4';

export interface StandoffParams {
  boards: StandoffBoards; // how many boards' corners it serves (D92)
  heightMm: number; // how far it holds the boards off the wall (D94)
  screwMm: number; // the screw's diameter (D76)
  /** For the trial only (D267): the top 2 mm of each hole this wide, so the screw pushed through the board cuts into
   * it and carries the standoff; none unless given. */
  pilotMm?: number;
}

export const STANDOFF_DEFAULTS: StandoffParams = { boards: '1', heightMm: STANDOFF_DEFAULT_MM, screwMm: 4 };

/** The room kept round a slot and a hook, beyond what each takes: the margin of C83. */
const ROOM_MARGIN_MM = 2;
/** The hooks' room next to the boards, which only the posts reach into: as deep as a hook's back tab sits behind the
 * board, and a margin (C83, C99). */
export const TUNNEL_DEPTH_MM = HOOK_DEPTH_MM + ROOM_MARGIN_MM;
/** The least bar behind the hooks' room, on the wall side (C99). */
const MIN_BRIDGE_MM = 4;
/** How far inside the bar the posts rise from, where nothing of the bar's chamfer is, as the slot clip's (D270). */
const POST_ROOT_MM = 1.5;
/** How far down from the board face a tight section reaches (D267). */
const PILOT_MM = 2;

/** A standoff's settings, with the starting values filled in, refused when they cannot make one. */
export function standoffParams(given: Partial<StandoffParams>): StandoffParams {
  const p: StandoffParams = { ...STANDOFF_DEFAULTS, ...given };
  if (!['1', '2', '2-stacked', '4'].includes(p.boards)) {
    throw new RangeError('A standoff serves 1 board, 2 side by side or one above the other, or 4');
  }
  if (!(p.heightMm > 0)) throw new RangeError('The standoff must be more than 0 mm tall');
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (p.pilotMm !== undefined && !(p.pilotMm > 0 && p.pilotMm < screwHole(p.screwMm).holeMm)) {
    throw new RangeError("A standoff's tight section must be narrower than its hole");
  }
  const least = TUNNEL_DEPTH_MM + MIN_BRIDGE_MM;
  if (p.boards !== '1' && p.heightMm < least) {
    throw new RangeError(
      `A standoff for ${p.boards === '4' ? 4 : 2} boards needs to be at least ${least} mm tall: ${TUNNEL_DEPTH_MM} mm ` +
        `of room for hooks next to the boards and ${MIN_BRIDGE_MM} mm of bar behind it`,
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
  if (boards === '1') return [[0, 0]];
  if (boards === '2') {
    return [
      [-i, 0],
      [i, 0],
    ];
  }
  if (boards === '2-stacked') {
    return [
      [0, -i],
      [0, i],
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
  const posts = keep(
    CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, standoffDiameterMm)])))),
  );
  const h = p.heightMm;
  const edges = { bottomMm: EDGE_CHAMFER_MM, topMm: EDGE_CHAMFER_MM };
  let plain: Manifold;
  if (p.boards === '1') {
    plain = chamferedExtrusion(engine, posts, h, edges);
  } else {
    // The slot clip's shape (D281): a bar as wide as the posts from post to post on the wall side, for 4 boards a
    // square ring through them, up to the hooks' room; above it the posts alone, rising from inside the bar, their
    // outline the bar's own round them, chamfered at the board.
    const hull = keep(posts.hull());
    const inside = 2 * SCREW_INSET_MM - standoffDiameterMm;
    const band = p.boards === '4' ? keep(hull.subtract(keep(CrossSection.square([inside, inside], true)))) : hull;
    const bar = h - TUNNEL_DEPTH_MM;
    const rise = bar - POST_ROOT_MM;
    const barSolid = chamferedExtrusion(engine, band, bar, edges);
    const risen = chamferedExtrusion(engine, posts, h - rise, { bottomMm: 0, topMm: EDGE_CHAMFER_MM });
    const postSolid = risen.translate([0, 0, rise]);
    plain = Manifold.union(barSolid, postSolid);
    for (const m of [barSolid, risen, postSolid]) m.delete();
  }
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
  const part = plain.subtract(holes);
  for (const m of [plain, ...holeCuts, holes]) m.delete();
  return part;
}
