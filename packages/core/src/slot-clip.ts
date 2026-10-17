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
//
// The pegs grip by friction ribs, which crush as they go in, or by a snap lip that springs into the slot's
// front chamfer (D194, C199); the clip can be screwed to the wall through its free half, or hung on a wall
// screw by a keyhole in its wall face (D195, C199).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { keyhole, MIN_BEHIND_CHANNEL_MM, MOUNTING_DEFAULTS, screwHole, STANDOFF_DEFAULT_MM } from './mounting.js';
import { circle, ringedSolid, stadium } from './rings.js';
import { BOARD_THICKNESS_MM, GRID_PITCH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM } from './skadis.js';
import { TUNNEL_DEPTH_MM } from './standoff.js';

/** The boards it joins: 2 side by side, 2 one above the other (C191), or 4 where their corners meet. */
export type SlotClipBoards = '2' | '2-stacked' | '4';
/** How its pegs hold in the slots (D194). */
export type SlotClipGrip = 'ribs' | 'lip';
/** How it is fixed to the wall, if at all (D195). */
export type SlotClipFixing = 'none' | 'screw' | 'keyhole';

export interface SlotClipParams {
  boards: SlotClipBoards;
  depthMm: number; // the gap behind the boards, from the wall to their back faces (D187)
  pegClearanceMm: number; // how much smaller each peg is than the slot the board cuts (D189)
  grip: SlotClipGrip;
  fixing: SlotClipFixing;
  screwMm: number; // the screw's diameter, for a screw or a keyhole (D76)
}

export const SLOT_CLIP_DEFAULTS: SlotClipParams = {
  boards: '2',
  depthMm: STANDOFF_DEFAULT_MM,
  pegClearanceMm: 0.4,
  grip: 'ribs',
  fixing: 'none',
  screwMm: MOUNTING_DEFAULTS.screwMm,
};

/** The bar's width, as wide as a standoff (D189, C83). */
const BAR_MM = 10;
/** A post round each peg, where the clip meets the boards (C192). */
const POST_MM = 20;
/** The pegs with ribs stop this far short of the front of a 5 mm board (D189). */
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
/** The slot's chamfer at each face of the board the clip is made for (D41). */
const SLOT_CHAMFER_MM = SOLID_BOARD_DEFAULTS.slotChamferMm;

/** A rib (C199): a half-round 0.8 mm across, standing 0.3 mm proud of the peg's side, three along each side. */
const RIB_MM = 0.8;
const RIB_PROUD_MM = 0.3;
const RIB_SPACING_MM = 4;
/** The lip (C199): the peg split by a slit, its halves rising from a pocket in the post so they bend. */
const SLIT_MM = 1;
const POCKET_GAP_MM = 0.8;
const POCKET_DEPTH_MM = 6;
/** How far the lip stands past the slot's straight wall, and how far its catch sits inside the chamfer. */
const LIP_MM = 0.35;
const LIP_INSIDE_MM = 0.05;
/** The split peg reaches this close to the front face. */
const LIP_PEG_SHORT_MM = 0.1;
/** The keyhole's lips, which hold the screw head in, and its roof over the head's channel (C199). */
const KEYHOLE_LIPS_MM = 1.5;

/** The slot as the board cuts it at its starting clearance (D40), less the peg clearance. */
function pegSize(pegClearanceMm: number): [number, number] {
  const cut = SOLID_BOARD_DEFAULTS.slotClearanceMm - pegClearanceMm;
  return [SLOT_WIDTH_MM + cut, SLOT_HEIGHT_MM + cut];
}

/** Half the slot's width as the board cuts it, between its chamfers. */
const SLOT_HALF_MM = (SLOT_WIDTH_MM + SOLID_BOARD_DEFAULTS.slotClearanceMm) / 2;
/** Between the seam and a post, along the bar: where the screw goes, at its middle (C199). */
const SCREW_GAP_MM = HALF_GRID_MM - POST_MM / 2;
/** The least space kept between the screw's countersink and the seam or the post. */
const SCREW_SPARE_MM = 0.25;

/** The least depth a clip with a keyhole needs: the hooks' room, the keyhole's lips, the head's channel, a roof. */
export function keyholeClipDepth(screwMm: number): number {
  return TUNNEL_DEPTH_MM + KEYHOLE_LIPS_MM + keyhole(screwMm).channelMm + MIN_BEHIND_CHANNEL_MM;
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** A slot clip's settings, with the starting values filled in, refused when they cannot make one. */
export function slotClipParams(given: Partial<SlotClipParams>): SlotClipParams {
  const p: SlotClipParams = { ...SLOT_CLIP_DEFAULTS, ...given };
  if (!['2', '2-stacked', '4'].includes(p.boards)) throw new RangeError('A slot clip joins 2 or 4 boards');
  if (!['ribs', 'lip'].includes(p.grip)) throw new RangeError("A slot clip's pegs grip by ribs or a lip");
  if (!['none', 'screw', 'keyhole'].includes(p.fixing)) {
    throw new RangeError('A slot clip is fixed by a screw or a keyhole, or not at all');
  }
  const least = TUNNEL_DEPTH_MM + MIN_BAR_DEPTH_MM;
  if (!(p.depthMm >= least)) {
    throw new RangeError(
      `A slot clip needs to be at least ${least} mm deep: ${TUNNEL_DEPTH_MM} mm of room for hooks next to the ` +
        `boards and ${MIN_BAR_DEPTH_MM} mm of bar behind it`,
    );
  }
  if (!(p.pegClearanceMm >= 0)) throw new RangeError('The peg clearance cannot be less than 0 mm');
  // the tip's chamfer on both sides, and the lip's slit between its halves; a ribbed peg has none
  if (!(pegSize(p.pegClearanceMm)[0] > 2 * PEG_CHAMFER_MM + (p.grip === 'lip' ? SLIT_MM : 0))) {
    throw new RangeError('The peg clearance leaves no peg');
  }
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (p.fixing === 'screw' && screwHole(p.screwMm).countersinkMm > SCREW_GAP_MM - 2 * SCREW_SPARE_MM) {
    throw new RangeError(
      `A slot clip's screw goes between the seam and a post, ${SCREW_GAP_MM} mm apart: a ${nice(p.screwMm)} mm ` +
        "screw's countersink is too wide; choose a smaller screw",
    );
  }
  if (p.fixing === 'keyhole' && p.depthMm < keyholeClipDepth(p.screwMm) - 1e-9) {
    throw new RangeError(
      `A slot clip with a keyhole for a ${nice(p.screwMm)} mm screw needs to be at least ` +
        `${nice(keyholeClipDepth(p.screwMm))} mm deep`,
    );
  }
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

/**
 * Where the screw goes (C199): on the bar, midway between the seam and the post, on the side of the board that
 * goes up second, so it is driven once the first board is up with the clip pegged into it: right of the seam for
 * boards side by side, above it for boards one above the other, and for 4 boards on the ring's top side, right
 * of the seam, under the top right board, the last to go up.
 */
function screwCentre(boards: SlotClipBoards): [number, number] {
  const s = SCREW_GAP_MM / 2;
  if (boards === '2') return [s, 0];
  if (boards === '2-stacked') return [0, s];
  return [s, HALF_GRID_MM];
}

/** The middle of the keyhole's channel (C199): the clip's middle, or for 4 boards the middle of the ring's top. */
function keyholeCentre(boards: SlotClipBoards): [number, number] {
  return boards === '4' ? [0, HALF_GRID_MM] : [0, 0];
}

/** A peg with three ribs along each long side, its tip chamfered (C199). */
function ribbedPeg(engine: Engine, [x, y]: [number, number], [w, h]: [number, number], depth: number): Manifold {
  const top = depth + PEG_LENGTH_MM;
  const peg = ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), [
    [depth - PEG_ROOT_MM, 0],
    [top - PEG_CHAMFER_MM, 0],
    [top, -PEG_CHAMFER_MM],
  ]);
  // each rib a round bar sunk into the peg's side, so it stands RIB_PROUD_MM proud, whole up to the tip's
  // chamfer and tapering out within it
  const r = RIB_MM / 2;
  const ribTop = top - 0.1;
  const ribs: Manifold[] = [];
  for (const side of [-1, 1]) {
    for (const k of [-1, 0, 1]) {
      const [cx, cy] = [x + side * (w / 2 + RIB_PROUD_MM - r), y + k * RIB_SPACING_MM];
      ribs.push(
        ringedSolid(engine, (grow) => circle(cx, cy, RIB_MM, grow), [
          [depth - PEG_ROOT_MM, 0],
          [top - PEG_CHAMFER_MM, 0],
          [ribTop, -r + 0.05],
        ]),
      );
    }
  }
  const part = engine.Manifold.union([peg, ...ribs]);
  for (const m of [peg, ...ribs]) m.delete();
  return part;
}

/**
 * A peg split along its length into two halves that bend (C199), rising from the floor of a pocket in its post,
 * each with a lip on its outer side: a 45 degree ramp from the tip that bends the half in as it passes the slot's
 * straight wall, then a catch at 45 degrees, just inside the slot's front chamfer, which it springs out into.
 */
function lippedPeg(engine: Engine, [x, y]: [number, number], [w, h]: [number, number], depth: number): Manifold {
  const { CrossSection, Manifold } = engine;
  const [floor, top] = [depth - POCKET_DEPTH_MM, depth + BOARD_THICKNESS_MM - LIP_PEG_SHORT_MM];
  const body = ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), [
    [floor - PEG_ROOT_MM, 0],
    [top, 0],
  ]);
  // from just below the pocket's floor, so the slit and the floor do not meet on one plane; the post fills it
  const block = Manifold.cube([SLIT_MM, h + 2, top - floor + 2]);
  const slit = block.translate([x - SLIT_MM / 2, y - h / 2 - 1, floor - 0.2]);
  const halves = body.subtract(slit);
  // the lip, drawn as (outward from the peg's middle, up from the boards' back faces), then laid along the peg
  const half = w / 2;
  const front = depth + BOARD_THICKNESS_MM; // the board's front face
  const chamferFoot = front - SLOT_CHAMFER_MM; // where the slot's straight wall meets its front chamfer
  const apex: Vec2 = [SLOT_HALF_MM + LIP_MM, chamferFoot + LIP_MM + LIP_INSIDE_MM];
  const catchFoot = chamferFoot + (half - (SLOT_HALF_MM - LIP_INSIDE_MM)); // 45 degrees down to the peg's side
  const tipOut = Math.max(half, SLOT_HALF_MM - 0.1);
  const profile: Vec2[] = [[half - 0.4, catchFoot], [half, catchFoot], apex, [tipOut, top], [half - 0.4, top]];
  const straight = h - w - 1; // along the slot's straight walls, 0.5 mm short of its round ends
  const lips: Manifold[] = [];
  for (const side of [-1, 1]) {
    // mirrored for the left side, which turns the outline over: NonZero fills it either way round
    const drawn = new CrossSection([profile.map(([u, v]): Vec2 => [side * u, v])], 'NonZero');
    const along = drawn.extrude(straight);
    const turned = along.rotate([90, 0, 0]);
    lips.push(turned.translate([x, y + straight / 2, 0]));
    for (const m of [along, turned]) m.delete();
    drawn.delete();
  }
  const part = Manifold.union([halves, ...lips]);
  for (const m of [body, block, slit, halves, ...lips]) m.delete();
  return part;
}

/** The keyhole in the clip's wall face (C199): the lips with the entry and the slot, the head's channel above them. */
function keyholeCutter(engine: Engine, [cx, cy]: [number, number], screwMm: number): Manifold {
  const { CrossSection, Manifold } = engine;
  const k = keyhole(screwMm);
  const [entry, rest] = [cy - k.slideMm / 2, cy + k.slideMm / 2]; // the screw rests at the top, as the clip hangs
  const lips = new CrossSection(
    [circle(cx, entry, k.entryMm), stadium(cx, cy, k.slotMm, k.slideMm + k.slotMm)],
    'NonZero',
  );
  const channel = new CrossSection([stadium(cx, cy, k.entryMm, rest - entry + k.entryMm)], 'Positive');
  const [back, front] = [lips.extrude(KEYHOLE_LIPS_MM + 1), channel.extrude(k.channelMm)];
  const [low, high] = [back.translate([0, 0, -1]), front.translate([0, 0, KEYHOLE_LIPS_MM])];
  const cutter = Manifold.union(low, high);
  for (const m of [back, front, low, high]) m.delete();
  for (const c of [lips, channel]) c.delete();
  return cutter;
}

/** The countersunk hole for the screw, its countersink at the bar's board face (C199). Past that face it goes on
 * 1 mm at the countersink's width, so the two do not meet on one plane, and no wider: the posts beside it stand
 * there, and a wider cone had notched one. */
function screwCutter(engine: Engine, [x, y]: [number, number], screwMm: number, bar: number): Manifold {
  const { holeMm, countersinkMm } = screwHole(screwMm);
  const sink = (countersinkMm - holeMm) / 2; // 45 degree walls
  return ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), [
    [-1, 0],
    [bar - sink, 0],
    [bar, sink],
    [bar + 1, sink],
  ]);
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
  const bar = p.depthMm - TUNNEL_DEPTH_MM; // the bar's depth, from the wall to the hooks' room

  // The bar: a band 10 mm wide from peg to peg, with round ends; for 4 boards a square ring through them. A
  // screw or a keyhole widens it into a pad there.
  const ends = centres.map(([x, y]) => keep(new CrossSection([circle(x, y, BAR_MM)])));
  const span = 2 * HALF_GRID_MM;
  const band =
    p.boards === '4'
      ? keep(keep(CrossSection.hull(ends)).subtract(keep(CrossSection.square([span - BAR_MM, span - BAR_MM], true))))
      : keep(CrossSection.hull(ends));
  const pads: CrossSection[] = [];
  if (p.fixing === 'screw') {
    const [x, y] = screwCentre(p.boards);
    pads.push(keep(new CrossSection([circle(x, y, screwHole(p.screwMm).countersinkMm + 4)])));
  } else if (p.fixing === 'keyhole') {
    const [x, y] = keyholeCentre(p.boards);
    const k = keyhole(p.screwMm);
    pads.push(keep(new CrossSection([stadium(x, y, k.entryMm + 4, k.slideMm + k.entryMm + 4)])));
  }
  const outline = pads.length > 0 ? keep(CrossSection.union([band, ...pads])) : band;
  const posts = keep(CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, POST_MM)])))));
  const [w, h] = pegSize(p.pegClearanceMm);
  const solids: Manifold[] = [outline.extrude(bar)];
  let postSolid = posts.extrude(p.depthMm);
  if (p.grip === 'lip') {
    // a pocket round each split peg, so its halves are free to bend over their whole length
    const pockets = keep(
      CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([stadium(x, y, w, h, POCKET_GAP_MM)])))),
    );
    const deep = pockets.extrude(POCKET_DEPTH_MM + 1);
    const pocket = deep.translate([0, 0, p.depthMm - POCKET_DEPTH_MM]);
    const hollowed = postSolid.subtract(pocket);
    for (const m of [postSolid, deep, pocket]) m.delete();
    postSolid = hollowed;
  }
  solids.push(postSolid);
  for (const s of sections) s.delete();
  for (const c of centres) {
    solids.push(p.grip === 'lip' ? lippedPeg(engine, c, [w, h], p.depthMm) : ribbedPeg(engine, c, [w, h], p.depthMm));
  }
  const joined = Manifold.union(solids);
  for (const m of solids) m.delete();
  if (p.fixing === 'none') return joined;
  const cutter =
    p.fixing === 'screw'
      ? screwCutter(engine, screwCentre(p.boards), p.screwMm, bar)
      : keyholeCutter(engine, keyholeCentre(p.boards), p.screwMm);
  const part = joined.subtract(cutter);
  for (const m of [joined, cutter]) m.delete();
  return part;
}
