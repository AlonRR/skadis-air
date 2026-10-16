// The slot clip (backlog item conn-slot-clip; D185, D187 to D189): a part behind a seam that joins the boards
// by pegs in their slots, so it needs no screw holes. Each peg goes in the nearest whole slot of a board, 20 mm
// from the seam, so the clip crosses no slot and leaves every slot along the seam free; for 4 boards a square
// ring joins a peg in each board, round the slot they share (D188). The slots stand upright, so boards one
// above the other take a clip of their own, its pegs one above the other (C191).
//
// It is as deep as the gap behind the boards (D187), so once they are up the wall holds it on. Next to the
// boards only its posts reach them, for as far as a hook takes behind the board and a margin (C99), so a hook
// fits in every slot the pegs leave free; the bar runs behind that, on the wall side. Built as it hangs, as
// the standoff is: its wall face on z = 0, the boards' back faces at z = depth, the pegs above that, centred
// on the point between its pegs.
import type { CrossSection, Manifold } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { circle, ringedSolid, stadium } from './rings.js';
import { BOARD_THICKNESS_MM, GRID_PITCH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, WALL_DISTANCE_MM } from './skadis.js';
import { TUNNEL_DEPTH_MM } from './standoff.js';

/** The boards it joins: 2 side by side, 2 one above the other (C191), or 4 where their corners meet. */
export type SlotClipBoards = '2' | '2-stacked' | '4';

export interface SlotClipParams {
  boards: SlotClipBoards;
  depthMm: number; // the gap behind the boards, from the wall to their back faces (D187)
  pegClearanceMm: number; // how much smaller each peg is than the slot the board cuts (D189)
}

export const SLOT_CLIP_DEFAULTS: SlotClipParams = { boards: '2', depthMm: WALL_DISTANCE_MM, pegClearanceMm: 0.4 };

/** The bar's width, as wide as a standoff (D189, C83). */
const BAR_MM = 10;
/** A post round each peg, where the clip meets the boards (C192). */
const POST_MM = 20;
/** The pegs stop this far short of the front of a 5 mm board (D189). */
const PEG_SHORT_MM = 2.5;
const PEG_LENGTH_MM = BOARD_THICKNESS_MM - PEG_SHORT_MM;
/** Round each peg's tip, so it finds its slot (C192). */
const PEG_CHAMFER_MM = 0.4;
/** How far the pegs reach down into their posts, so the two are one solid without meeting on a plane. */
const PEG_ROOT_MM = 0.5;
/** The least bar behind the hooks' room, as the standoff's bridge behind its tunnel (C99). */
const MIN_BAR_DEPTH_MM = 4;
/** From the point between its pegs to each peg: half the grid, so each is the nearest whole slot. */
const HALF_GRID_MM = GRID_PITCH_MM / 2;

/** The slot as the board cuts it at its starting clearance (D40), less the peg clearance. */
function pegSize(pegClearanceMm: number): [number, number] {
  const cut = SOLID_BOARD_DEFAULTS.slotClearanceMm - pegClearanceMm;
  return [SLOT_WIDTH_MM + cut, SLOT_HEIGHT_MM + cut];
}

/** A slot clip's settings, with the starting values filled in, refused when they cannot make one. */
export function slotClipParams(given: Partial<SlotClipParams>): SlotClipParams {
  const p: SlotClipParams = { ...SLOT_CLIP_DEFAULTS, ...given };
  if (!['2', '2-stacked', '4'].includes(p.boards)) throw new RangeError('A slot clip joins 2 or 4 boards');
  const least = TUNNEL_DEPTH_MM + MIN_BAR_DEPTH_MM;
  if (!(p.depthMm >= least)) {
    throw new RangeError(
      `A slot clip needs to be at least ${least} mm deep: ${TUNNEL_DEPTH_MM} mm of room for hooks next to the ` +
        `boards and ${MIN_BAR_DEPTH_MM} mm of bar behind it`,
    );
  }
  if (!(p.pegClearanceMm >= 0)) throw new RangeError('The peg clearance cannot be less than 0 mm');
  if (!(pegSize(p.pegClearanceMm)[0] > 2 * PEG_CHAMFER_MM)) throw new RangeError('The peg clearance leaves no peg');
  return p;
}

/** Where its pegs are, round the point between them. */
function pegCentres(boards: SlotClipBoards): [number, number][] {
  const h = HALF_GRID_MM;
  if (boards === '2') {
    return [
      [-h, 0],
      [h, 0],
    ];
  }
  if (boards === '2-stacked') {
    return [
      [0, -h],
      [0, h],
    ];
  }
  return [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
}

export function makeSlotClip(engine: Engine, params: SlotClipParams): Manifold {
  const { CrossSection, Manifold } = engine;
  const p = slotClipParams(params);
  const centres = pegCentres(p.boards);
  const sections: CrossSection[] = [];
  const keep = (s: CrossSection) => {
    sections.push(s);
    return s;
  };
  const room = p.depthMm - TUNNEL_DEPTH_MM; // the bar's depth, from the wall to the hooks' room

  // The bar: a band 10 mm wide from peg to peg, with round ends; for 4 boards a square ring through them.
  const ends = centres.map(([x, y]) => keep(new CrossSection([circle(x, y, BAR_MM)])));
  const span = 2 * HALF_GRID_MM;
  const bar =
    p.boards === '4'
      ? keep(keep(CrossSection.hull(ends)).subtract(keep(CrossSection.square([span - BAR_MM, span - BAR_MM], true))))
      : keep(CrossSection.hull(ends));
  const posts = keep(CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, POST_MM)])))));
  const solids = [bar.extrude(room), posts.extrude(p.depthMm)];
  for (const s of sections) s.delete();

  const [w, h] = pegSize(p.pegClearanceMm);
  const top = p.depthMm + PEG_LENGTH_MM;
  for (const [x, y] of centres) {
    solids.push(
      ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), [
        [p.depthMm - PEG_ROOT_MM, 0],
        [top - PEG_CHAMFER_MM, 0],
        [top, -PEG_CHAMFER_MM],
      ]),
    );
  }
  const part = Manifold.union(solids);
  for (const m of solids) m.delete();
  return part;
}
