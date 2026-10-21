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
// The pegs grip by friction ribs, which crush as they go in (D194, C199); a snap lip that sprang into the slot's
// front chamfer was taken out, as it did not hold (T193, D261). The clip can be screwed to the wall through its free half, or hung on a wall
// screw by a keyhole in its wall face (D195, C199).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import {
  KEYHOLE_LIPS_MM,
  keyhole,
  counterbore,
  keyholeScrews,
  MIN_BEHIND_CHANNEL_MM,
  MOUNTING_DEFAULTS,
  screwHole,
  STANDOFF_DEFAULT_MM,
  wallKeyholeCutter,
} from './mounting.js';
import { chamferedExtrusion, EDGE_CHAMFER_MM, longBlend, placed } from './chamfer.js';
import { circle, ringedSolid, stadium } from './rings.js';
import { BOARD_THICKNESS_MM, GRID_PITCH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM } from './skadis.js';
import { TUNNEL_DEPTH_MM } from './standoff.js';

/** The boards it joins: 2 side by side, 2 one above the other (C191), or 4 where their corners meet. */
export type SlotClipBoards = '2' | '2-stacked' | '4';
/** How it is fixed to the wall, if at all (D195). */
export type SlotClipFixing = 'none' | 'screw' | 'keyhole';
/** A screw's head: in a countersink, or a round (pan) head in a counterbore (D265). */
export type SlotClipScrewHead = 'countersunk' | 'round';

export interface SlotClipParams {
  boards: SlotClipBoards;
  depthMm: number; // the gap behind the boards, from the wall to their back faces (D187)
  pegClearanceMm: number; // how much smaller each peg is than the slot the board cuts (D189)
  fixing: SlotClipFixing;
  screwHead: SlotClipScrewHead; // for a screw (D265)
  screwMm: number; // the screw's diameter, for a screw or a keyhole (D76)
  /** For the trial only (T268): the snap lip on split pegs, to be locked by a fill in the slit (makeSlotFill); ribs
   * unless given. The page's clip never asks for it (D261). */
  grip?: 'ribs' | 'lip';
  /** For the trial only (T268): nubs this far proud of a ribbed peg's sides, past the slot's straight wall; none
   * unless given. */
  nubMm?: number;
}

export const SLOT_CLIP_DEFAULTS: SlotClipParams = {
  boards: '2',
  depthMm: STANDOFF_DEFAULT_MM,
  pegClearanceMm: 0.4,
  fixing: 'screw', // D250 b
  screwHead: 'countersunk',
  screwMm: MOUNTING_DEFAULTS.screwMm,
};

/** The bar's width, as wide as a standoff (D189, C83). */
const BAR_MM = 10;
/** A post round each peg, where the clip meets the boards (C192). */
const POST_MM = 20;
/** Where the bar blends into a post (D270): the curve meets the post's round 8 mm out from the bar's middle, 3 mm past
 * the bar's side, and leaves the side 14 mm from the post's centre, short of the middle of the 40 mm between posts. */
const BAR_MEET_MM = 8;
/** The pegs with ribs reach the front of a 5 mm board, flush with it (D250 a); C192 stopped them 2.5 mm short. */
const PEG_LENGTH_MM = BOARD_THICKNESS_MM;
/** Round each peg's tip, so it finds its slot (C192). */
const PEG_CHAMFER_MM = 0.4;
/** How far the pegs reach down into their posts, so the two are one solid without meeting on a plane. */
const PEG_ROOT_MM = 0.5;
/** A chamfer round each peg's root (D266): no sharp corner on the layer line where the peg meets its post. It fits
 * inside the slot's 1 mm back chamfer and keeps the 0.2 mm the peg has beside the slot's wall. */
const ROOT_CHAMFER_MM = 0.8;
/** The least bar behind the hooks' room, as the standoff's bridge behind its tunnel (C99). */
const MIN_BAR_DEPTH_MM = 4;
/** From the point between its pegs to each peg: half the grid, so each is the nearest whole slot. */
const HALF_GRID_MM = GRID_PITCH_MM / 2;

/** The slot's chamfer at each face of the board the clip is made for (D41). */
const SLOT_CHAMFER_MM = SOLID_BOARD_DEFAULTS.slotChamferMm;
/** Half the slot's width as the board cuts it, between its chamfers. */
const SLOT_HALF_MM = (SLOT_WIDTH_MM + SOLID_BOARD_DEFAULTS.slotClearanceMm) / 2;
/** The trial's lip (T268, as C199 drew it before D261): the peg split by a slit, its halves rising from a pocket in
 * the post so they bend; the lip 0.35 mm past the slot's straight wall, its catch 0.05 mm inside the chamfer. */
const SLIT_MM = 1;
const POCKET_GAP_MM = 0.8;
const POCKET_DEPTH_MM = 6;
const LIP_MM = 0.35;
const LIP_INSIDE_MM = 0.05;
const LIP_PEG_SHORT_MM = 0.1;
/** The trial's fill (T268): 1.2 mm thick, six 0.2 mm layers, so in the 1 mm slit it spreads each half 0.1 mm, half
 * the 0.2 mm each has beside the slot's wall, and holds the halves from bending in. */
const FILL_MM = 1.2;
/** The trial's nubs (T268): two a side, between the ribs, wholly past the slot's straight wall. */
const NUB_ACROSS_MM = 0.9;
const NUB_TIP_MM = 0.4;
const NUB_SPACING_MM = 2;
/** A rib (C199): a half-round 0.8 mm across, standing 0.3 mm proud of the peg's side, three along each side. */
const RIB_MM = 0.8;
const RIB_PROUD_MM = 0.3;
const RIB_SPACING_MM = 4;

/** The slot as the board cuts it at its starting clearance (D40), less the peg clearance. */
function pegSize(pegClearanceMm: number): [number, number] {
  const cut = SOLID_BOARD_DEFAULTS.slotClearanceMm - pegClearanceMm;
  return [SLOT_WIDTH_MM + cut, SLOT_HEIGHT_MM + cut];
}

/** Between the seam and a post, along the bar: where the screw goes, at its middle (C199). */
const SCREW_GAP_MM = HALF_GRID_MM - POST_MM / 2;
/** The least space kept between the screw's countersink and the seam or the post. */
const SCREW_SPARE_MM = 0.25;
const BORE_FLOOR_MM = 2;

/** The least depth a clip with a round head needs: the hooks' room, the counterbore and its floor (D265). */
export function roundHeadClipDepth(screwMm: number): number {
  return TUNNEL_DEPTH_MM + counterbore(screwMm).deepMm + BORE_FLOOR_MM;
}

/** The least depth a clip with a keyhole needs: the hooks' room, the keyhole's lips, the head's channel, a roof. */
export function keyholeClipDepth(screwMm: number): number {
  return TUNNEL_DEPTH_MM + KEYHOLE_LIPS_MM + keyhole(screwMm).channelMm + MIN_BEHIND_CHANNEL_MM;
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** A slot clip's settings, with the starting values filled in, refused when they cannot make one. */
export function slotClipParams(given: Partial<SlotClipParams>): SlotClipParams {
  const p: SlotClipParams = { ...SLOT_CLIP_DEFAULTS, ...given };
  if (!['2', '2-stacked', '4'].includes(p.boards)) throw new RangeError('A slot clip joins 2 or 4 boards');
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
  if (p.grip !== undefined && !['ribs', 'lip'].includes(p.grip)) {
    throw new RangeError("A slot clip's pegs grip by ribs or a lip");
  }
  if (p.nubMm !== undefined && !(p.nubMm >= 0)) throw new RangeError('Nubs cannot stand less than 0 mm proud');
  if (p.grip === 'lip' && (p.nubMm ?? 0) > 0) throw new RangeError('Nubs go on ribbed pegs, not split ones');
  // the tip's chamfer on both sides, and a split peg's slit between its halves
  if (!(pegSize(p.pegClearanceMm)[0] > 2 * PEG_CHAMFER_MM + (p.grip === 'lip' ? SLIT_MM : 0))) {
    throw new RangeError('The peg clearance leaves no peg');
  }
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (!['countersunk', 'round'].includes(p.screwHead)) {
    throw new RangeError("A slot clip's screw is countersunk or has a round head");
  }
  const round = p.screwHead === 'round';
  const across = round ? counterbore(p.screwMm).acrossMm : screwHole(p.screwMm).countersinkMm;
  if (p.fixing === 'screw' && across > SCREW_GAP_MM - 2 * SCREW_SPARE_MM) {
    throw new RangeError(
      `A slot clip's screw goes between the seam and a post, ${SCREW_GAP_MM} mm apart: a ${nice(p.screwMm)} mm ` +
        `screw's ${round ? "head's counterbore" : 'countersink'} is too wide; choose a smaller screw`,
    );
  }
  if (p.fixing === 'screw' && round && p.depthMm < roundHeadClipDepth(p.screwMm) - 1e-9) {
    throw new RangeError(
      `A slot clip with a round head on a ${nice(p.screwMm)} mm screw needs to be at least ` +
        `${nice(roundHeadClipDepth(p.screwMm))} mm deep, to sink the head below the bar`,
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

/** What its screw passes (D264): the bar, or what a round head's counterbore leaves of it; a keyhole's screw stands in
 * the wall instead. None without a fixing. */
export function slotClipScrews(p: SlotClipParams): string | undefined {
  if (p.fixing === 'none') return undefined;
  if (p.fixing === 'keyhole') return keyholeScrews('The keyhole', p.screwMm);
  const bar = p.depthMm - TUNNEL_DEPTH_MM;
  return p.screwHead === 'round'
    ? `The screw passes ${nice(bar - counterbore(p.screwMm).deepMm)} mm of the clip's bar under its head, plus your wall plug.`
    : `The screw passes the clip's ${nice(bar)} mm bar, plus your wall plug.`;
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

/** A peg with three ribs along each long side, its tip chamfered (C199) and its root (D266). */
function ribbedPeg(
  engine: Engine,
  [x, y]: [number, number],
  [w, h]: [number, number],
  depth: number,
  nubMm = 0,
): Manifold {
  const top = depth + PEG_LENGTH_MM;
  const peg = ringedSolid(engine, (grow) => stadium(x, y, w, h, grow), [
    [depth - PEG_ROOT_MM, ROOT_CHAMFER_MM],
    [depth, ROOT_CHAMFER_MM],
    [depth + ROOT_CHAMFER_MM, 0],
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
  // the trial's nubs (T268): each a frustum along the peg's normal, from inside the peg to nubMm proud, centred
  // 0.5 mm into the slot's front chamfer, so all of it is past the straight wall once the peg is home
  const nubs: Manifold[] = [];
  if (nubMm > 0) {
    const zc = depth + BOARD_THICKNESS_MM - SLOT_CHAMFER_MM / 2;
    const inside = 0.6;
    for (const side of [-1, 1]) {
      for (const k of [-1, 1]) {
        const cone = engine.Manifold.cylinder(inside + nubMm, NUB_ACROSS_MM / 2, NUB_TIP_MM / 2, 24);
        const turned = cone.rotate([0, side * 90, 0]);
        nubs.push(turned.translate([x + side * (w / 2 - inside), y + k * NUB_SPACING_MM, zc]));
        for (const m of [cone, turned]) m.delete();
      }
    }
  }
  const part = engine.Manifold.union([peg, ...ribs, ...nubs]);
  for (const m of [peg, ...ribs, ...nubs]) m.delete();
  return part;
}

/**
 * The trial's split peg (T268; C199's, before D261): two halves that bend, rising from the floor of a pocket in its
 * post, each with a lip on its outer side: a 45 degree ramp from the tip that bends the half in as it passes the
 * slot's straight wall, then a catch at 45 degrees, just inside the slot's front chamfer, which it springs out into.
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

/**
 * The trial's fill for a lip clip (T268): a plate pushed into the first peg's slit from the board's front once the
 * clip is home, as the pin of an expansion rivet is, from the pocket's floor, which stops it, to flush with the
 * board's front. 1.2 mm thick in the 1 mm slit, it spreads the halves against the slot's walls, so they cannot bend
 * in and let their lips out. Its leading end is chamfered 0.3 mm, so it finds the slit. A second one, moved 40 mm,
 * serves the other peg; the trial plate lays each flat to print.
 */
export function makeSlotFill(engine: Engine, params: SlotClipParams): Manifold {
  const p = slotClipParams(params);
  if (p.grip !== 'lip') throw new RangeError('A fill is for a clip whose pegs are split for the lip');
  const [x, y] = pegCentres(p.boards)[0] ?? [0, 0];
  const h = pegSize(p.pegClearanceMm)[1];
  const [bottom, front] = [p.depthMm - POCKET_DEPTH_MM, p.depthMm + BOARD_THICKNESS_MM];
  const lead = 0.3;
  const { CrossSection } = engine;
  const plate = (inset: number) =>
    new CrossSection([
      [
        [x - FILL_MM / 2 + inset, y - h / 2 + inset],
        [x + FILL_MM / 2 - inset, y - h / 2 + inset],
        [x + FILL_MM / 2 - inset, y + h / 2 - inset],
        [x - FILL_MM / 2 + inset, y + h / 2 - inset],
      ],
    ]);
  const [narrow, full] = [plate(lead), plate(0)];
  const fill = engine.Manifold.hull([
    narrow.extrude(0.01).translate([0, 0, bottom]),
    full.extrude(front - bottom - lead).translate([0, 0, bottom + lead]),
  ]);
  for (const s of [narrow, full]) s.delete();
  return fill;
}

/** The countersunk hole for the screw, its countersink at the bar's board face (C199). Past that face it goes on
 * 1 mm at the countersink's width, so the two do not meet on one plane, and no wider: the posts beside it stand
 * there, and a wider cone had notched one. A round head's is a counterbore instead (D265), on 1 mm past the face. */
function screwCutter(
  engine: Engine,
  [x, y]: [number, number],
  screwMm: number,
  bar: number,
  head: SlotClipScrewHead,
): Manifold {
  const { holeMm, countersinkMm } = screwHole(screwMm);
  if (head === 'round') {
    const { CrossSection, Manifold } = engine;
    const bore = counterbore(screwMm);
    const [hole, wide] = [new CrossSection([circle(x, y, holeMm)]), new CrossSection([circle(x, y, bore.acrossMm)])];
    const [shaft, cup] = [hole.extrude(bar + 2), wide.extrude(bore.deepMm + 1)];
    const [low, high] = [shaft.translate([0, 0, -1]), cup.translate([0, 0, bar - bore.deepMm])];
    const cutter = Manifold.union(low, high);
    for (const m of [hole, wide, shaft, cup, low, high]) m.delete();
    return cutter;
  }
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
    const across = p.screwHead === 'round' ? counterbore(p.screwMm).acrossMm : screwHole(p.screwMm).countersinkMm;
    pads.push(keep(new CrossSection([circle(x, y, across + 4)])));
  } else if (p.fixing === 'keyhole') {
    const [x, y] = keyholeCentre(p.boards);
    const k = keyhole(p.screwMm);
    pads.push(keep(new CrossSection([stadium(x, y, k.entryMm + 4, k.slideMm + k.entryMm + 4)])));
  }
  const posts = keep(CrossSection.union(centres.map(([x, y]) => keep(new CrossSection([circle(x, y, POST_MM)])))));
  // where each bar meets a post, a long blend in plan each side, at the bar's height, below the hooks' room (D270)
  const bars: [Vec2, Vec2][] =
    p.boards === '4'
      ? centres.map((a, i): [Vec2, Vec2] => [a, centres[(i + 1) % centres.length] ?? a])
      : [[centres[0] ?? [0, 0], centres[1] ?? [0, 0]]];
  const blends = bars.flatMap(([a, b]) =>
    [
      [a, b],
      [b, a],
    ].flatMap(([from, to]) => {
      const [fx, fy] = from ?? [0, 0];
      const [tx, ty] = to ?? [0, 0];
      const length = Math.hypot(tx - fx, ty - fy);
      const along: Vec2 = [(tx - fx) / length, (ty - fy) / length];
      return [1, -1].map((side) => {
        const ring = longBlend({ radiusMm: POST_MM / 2, edgeMm: BAR_MM / 2, meetMm: BAR_MEET_MM, sinkMm: 0.15 });
        const across: Vec2 = [-along[1] * side, along[0] * side];
        return keep(new CrossSection([placed(ring, [fx, fy], along, across)], 'NonZero'));
      });
    }),
  );
  // One footprint for the wall face, the posts in it, so the bed is one face; the posts rise from 1.5 mm inside the
  // bar, where nothing of the bar's chamfers is, the same outline as the bar's round them (D270)
  const footprint = keep(CrossSection.union([band, ...pads, posts, ...blends]));
  const [w, h] = pegSize(p.pegClearanceMm);
  const edges = { bottomMm: EDGE_CHAMFER_MM, topMm: EDGE_CHAMFER_MM };
  const solids: Manifold[] = [chamferedExtrusion(engine, footprint, bar, edges)];
  const rise = bar - 1.5;
  const risen = chamferedExtrusion(engine, posts, p.depthMm - rise, { bottomMm: 0, topMm: EDGE_CHAMFER_MM });
  let postSolid = risen.translate([0, 0, rise]);
  risen.delete();
  if (p.grip === 'lip') {
    // a pocket round each split peg, so its halves are free to bend over their whole length (T268)
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
    solids.push(
      p.grip === 'lip' ? lippedPeg(engine, c, [w, h], p.depthMm) : ribbedPeg(engine, c, [w, h], p.depthMm, p.nubMm),
    );
  }
  const joined = Manifold.union(solids);
  for (const m of solids) m.delete();
  if (p.fixing === 'none') return joined;
  const cutter =
    p.fixing === 'screw'
      ? screwCutter(engine, screwCentre(p.boards), p.screwMm, bar, p.screwHead)
      : wallKeyholeCutter(engine, keyholeCentre(p.boards), p.screwMm);
  const part = joined.subtract(cutter);
  for (const m of [joined, cutter]) m.delete();
  return part;
}
