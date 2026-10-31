// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, between the corner and the first slot, where no slot reaches whether the sides are open or
// closed; countersunk at the front by default, or plain for a round head; and, as an option, standoffs
// on the back round the holes, which hold the board off the wall so hooks have room. A board prints
// face down (D66), so a countersink is a 45 degree overhang at the bed and the standoffs print on top.
// Or keyholes at the top two corners (backlog item mounting-ikea; D156, D157), so the board drops onto two
// screws and lifts off them, with countersunk lock screws at the bottom as an option. A board on keyholes
// stands on standoffs, so a hook has room behind it (D190), and the keyholes are cut in the top two standoffs'
// wall faces, the head sliding behind lips there as on the slot clip, the board's face left plain (D235), and seating on
// a 45 degree countersink, for a countersunk screw, so nothing over it prints over air (D358); each
// top standoff is the keyhole and its walls, behind its corner tile's centre slot, as IKEA's spacer stands behind
// a slot, with a pocket that leaves a hook its room behind that slot (D244); on a lattice board, the outline of the
// frame round that slot, so it stands flush with it (D306); where the hook's room runs out of a standoff, its ceiling
// rises at 45 degrees to the standoff's face (D369). On a board whose open sides run between
// the slots (D282), a corner screw whose usual place would land on a slot goes to the nearest place with a normal
// corner's room round it, its standoff with it (D371 a), and each standoff behind a slot stands behind the slot nearest
// its corner that keeps it on the board (D289 a). Every standoff's root on the back runs out onto it on a long eased
// curve, as far as the back leaves it room (D375, root.ts), and so do the walls of a hook's room round its slot (D411).
// Any board type built on the solid board takes these as its third argument (BoardCuts).
import type { CrossSection, Manifold, Vec2, Vec3 } from 'manifold-3d';
import { boardFace, type BoardCuts, SOLID_BOARD_DEFAULTS, type SolidBoardParams } from './board-solid.js';
import { EDGE_CHAMFER_MM, grownRing, HOLE_MOUTH_MM } from './chamfer.js';
import type { Engine } from './engine.js';
import { circle, HALF_STEP, loftedSolid, ringedSolid, stadium } from './rings.js';
import { densified, insideRings, rootProfile, rootReach, rootSize } from './root.js';
import {
  KEYHOLE_SCREW,
  LOCK_SCREW,
  SCREW_MM,
  SCREW_SIZE_SETTING,
  screwAt,
  screwPlaceSettings,
} from './screw-places.js';
import { defineSettings, type NumberSetting, SettingsProblem, type Values } from './settings.js';
import {
  TAPE_LENGTH_MM,
  TAPE_LENGTH_SETTING,
  TAPE_MM,
  TAPE_STANDOFF_MM,
  TAPE_WIDTH_SETTING,
  tapeHolds,
} from './tape.js';
import { HOOK_DEPTH_MM, HOOK_DROP_MM, HOOK_WIDTH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { ALL_OPEN, boardExtent, type Extent, slotPlaces } from './slots.js';

/** How a board holds to the wall (D74; "Mounting", D617 c): a screw in each corner, countersunk or round; keyholes at
 * the top two corners (D156); lock screws alone at all four (D289); tape (D619 a); or nothing. */
export type ScrewHead = 'countersunk' | 'round' | 'keyhole' | 'lock' | 'tape' | 'none';
/** Where a board's standoffs stand (D618 a): round the corner screws, or behind the corner tiles' slots, as keyholes,
 * lock screws and tape have them (D619). */
export type StandoffPlace = 'corners' | 'slots';

export interface MountingParams {
  screwHead: ScrewHead;
  /** Where the standoffs stand, when there are any: behind the slots with keyholes, lock screws and tape, at the
   * corners with a corner screw; with neither, either, at the corners unless given (D619). */
  standoffs: StandoffPlace;
  screwMm: number; // the screw size, 4 mm unless set (D76): the corner screws', and every other's unless given (D479)
  keyholeScrewMm: number; // the keyholes' screw: the screw size unless given (D479)
  standoffHeightMm: number; // how far the standoffs stand behind the board; 0 for none (D75)
  lockScrews: boolean; // with keyholes: screws through the bottom corner slots too, tucked behind them (D156, A248)
  /** The lock screws' size, the screw size unless given (D479): a head up to 5 mm passes the slot, a larger one, as a
   * 4 mm screw's 8 mm head, a groove cut in it (A248). */
  lockScrewMm: number;
  /** On tape (D593, D619 a): the tape's width, which each standoff's rectangular pad at the wall is across; TAPE_MM
   * unless given, and only on tape. */
  tapeMm?: number;
  /** On tape: the piece's length, the pad's side along the board's width (C601); TAPE_LENGTH_MM unless given. */
  tapeLengthMm?: number;
}

export const MOUNTING_DEFAULTS: MountingParams = {
  screwHead: 'countersunk',
  standoffs: 'corners',
  screwMm: SCREW_MM,
  keyholeScrewMm: SCREW_MM,
  standoffHeightMm: 0,
  lockScrews: false,
  lockScrewMm: SCREW_MM, // an 8 mm head, which a groove passes through the slot (D479, A248)
};

/** How far the parts that stand behind a board hold it off the wall unless set, mm: the boards' standoffs, the
 * standoff connector and the slot clip, so the parts of one wall match. Less than IKEA's spacers (D238). */
export const STANDOFF_DEFAULT_MM = 15;

/** The holes' centres are this far in from both edges at each corner (D73). */
export const SCREW_INSET_MM = 10;
/** The least plain hole a countersink must leave behind it, so the head cannot pull through (C84). */
const MIN_PLAIN_HOLE_MM = 1;
const HEADS: ReadonlySet<string> = new Set(['countersunk', 'round', 'keyhole', 'lock', 'tape', 'none']);
/** The mountings that stand on standoffs behind the slots, and only there (D190, D289, D619 a). */
const BEHIND_SLOTS: ReadonlySet<string> = new Set(['keyhole', 'lock', 'tape']);
/** The mountings with a screw in each corner, whose standoffs stand round it (D619). */
const AT_CORNERS: ReadonlySet<string> = new Set(['countersunk', 'round']);
/** What a keyhole leaves behind its channel (D157): about three lines of a 0.4 mm nozzle. */
export const MIN_BEHIND_CHANNEL_MM = 1.2;
/** The least standoff a board on keyholes stands on: the room a hook takes behind it and C99's margin (D190). */
export const MIN_KEYHOLE_STANDOFF_MM = HOOK_DEPTH_MM + 2;
/** The lips a keyhole's head slides behind, at the wall face of the part it is cut in (C199, D235). */
export const KEYHOLE_LIPS_MM = 1.5;
/** A keyhole standoff's wall round its keyhole on the solid board (D244): 15 x 24 mm for a 4 mm screw, which leaves
 * about 2 mm round the hook's room behind the slot. */
const KEYHOLE_WALL_MM = 3;
/** The room a hook takes behind a board, C99's margin and all (D190): its back tab's depth and 2 mm. */
const HOOK_ROOM_MM = HOOK_DEPTH_MM + 2;
/** A tape pad's edge at the wall, straight before its flare (D593): enough for its 0.5 mm chamfer and 0.5 mm more. */
const TAPE_BAND_MM = 1;
/** A tape pad's rectangle at the wall round a standoff's middle: the piece, its length along the board's width (C601). */
const tapeRect = ([x, y]: readonly [number, number], tapeMm: number, lengthMm: number): Vec2[] =>
  [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a = 0, b = 0]): Vec2 => [x + (a * lengthMm) / 2, y + (b * tapeMm) / 2]);

/** How far a point lies outside a ring, 0 inside it. */
function pastRing(ring: readonly Vec2[], p: Vec2): number {
  if (insideRings([ring], p)) return 0;
  let least = Infinity;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length] ?? a;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    least = Math.min(least, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  });
  return least;
}

/** How far a tape pad's corners reach out past its standoff's outline, which its 45 degree flare takes as much height
 * for: no face of the hull of the two runs out further than the farthest corner lies past the outline, a convex one.
 * The flare starts behind the hooks' room, so a board, printing face down, prints nothing of it over air (D593, C601,
 * D619 a). */
const tapeFlareMm = (post: readonly Vec2[], place: readonly [number, number], tapeMm: number, lengthMm: number) =>
  Math.max(0, ...tapeRect(place, tapeMm, lengthMm).map((c) => pastRing(post, c)));
/** How far the hook's room behind a slot reaches past the slot's chamfer (D244): past the slot cutter's flare. */
const ROOM_PAST_CHAMFER_MM = 1.5;
/** On a lattice board, the least wall a standoff behind a slot keeps round what is cut in it (D306): about three lines
 * of a 0.4 mm nozzle. */
const STANDOFF_WALL_MM = 1.2;
/** On a lattice board, how far inside the frame round its slot a standoff behind it stands (D306): flush to the eye,
 * and off the pockets' walls, which a standoff lying on them shared and left degenerate facets (C240). */
export const FRAME_INSET_MM = 0.1;
/** The widest head that passes through a slot, mm: a larger lock screw's head gets a groove in the slot (A248). */
const HEAD_THROUGH_SLOT_MM = 5;
/** What a lock screw's head and shank are given round them, mm, and the standoff left under its head. */
const HEAD_ROOM_MM = 0.4;
const GROOVE_ROOM_MM = 0.5;
const UNDER_HEAD_MM = 2;

/** A pan head (D157's proportions): twice the screw across, 0.8 times it tall; a lock screw's, or the slot clip's
 * round head (D265). */
export const panHead = (screwMm: number) => ({ acrossMm: 2 * screwMm, tallMm: 0.8 * screwMm });
/** A round head's counterbore (D265, D279): the head and 0.5 mm across, its height and 0.2 mm deep, as the practice
 * sinks a head below the face; the slot clip's and the boards' alike. */
export function counterbore(screwMm: number): { acrossMm: number; deepMm: number } {
  const head = panHead(screwMm);
  return { acrossMm: head.acrossMm + 0.5, deepMm: head.tallMm + 0.2 };
}
/** A round head's counterbore on a board this thick, or null where it would leave less board under it than a
 * countersink must, and the head stands on the front instead, a step the thickness forces (D279). */
function sunkRound(m: Pick<MountingParams, 'screwHead' | 'screwMm'>, thicknessMm: number) {
  const bore = counterbore(m.screwMm);
  return m.screwHead === 'round' && thicknessMm - bore.deepMm >= MIN_PLAIN_HOLE_MM ? bore : null;
}
/** Whether a lock screw's head, twice the screw across, is too wide to pass a slot, and gets a groove in the slot's
 * sides (A248): from a 3 mm screw. Such a lock screw is a countersunk one, as the screw size's is, and seats on a 45
 * degree countersink, as a keyhole's head does (D479, D370 a, D358); one whose head passes the slot, up to a 2.5 mm
 * screw's 5 mm, a pan head in a flat recess, as before. */
export const countersunkLock = (lockScrewMm: number) => panHead(lockScrewMm).acrossMm > HEAD_THROUGH_SLOT_MM;
const grooved = countersunkLock;
/** A lock screw's shank's hole: the screw and 0.5 mm, as every screw's (C83). */
const lockHoleMm = (lockScrewMm: number) => lockScrewMm + 0.5;
/** How far behind the hook's room a lock screw's head bears (A248): a pan head on the floor of a recess its height and
 * 0.3 mm deep; a countersunk head on a 45 degree countersink from the shank's hole, the top of the head 0.3 mm short of
 * the room, as the keyhole's seat leaves its channel's 0.3 mm (D479, D358). */
const lockRecessMm = (lockScrewMm: number) =>
  countersunkLock(lockScrewMm)
    ? countersunkHead(lockScrewMm).tallMm - (lockHoleMm(lockScrewMm) - lockScrewMm) / 2 + 0.3
    : panHead(lockScrewMm).tallMm + 0.3;
/** How wide a lock screw's recess is: its head and the room round it (A248). */
const lockRecessAcross = (lockScrewMm: number) =>
  panHead(lockScrewMm).acrossMm + (grooved(lockScrewMm) ? GROOVE_ROOM_MM : HEAD_ROOM_MM);

/** A screw's hole, its 90 degree countersink across the front, and the standoff round it (C83). */
export function screwHole(screwMm: number): { holeMm: number; countersinkMm: number; standoffDiameterMm: number } {
  const holeMm = screwMm + 0.5;
  return { holeMm, countersinkMm: 2 * screwMm + 1, standoffDiameterMm: holeMm + 5.5 };
}

/**
 * A keyhole (D157): the entry 1 mm wider than the head, which is twice the screw across (8 mm for a 4 mm screw), the
 * slide from the entry's centre up to the resting screw as long as the entry, the slot the screw's hole. Behind the
 * lips the head seats on a countersink and its channel runs on, as wide as the entry (keyholeSeat, D358).
 */
export function keyhole(screwMm: number): { slotMm: number; entryMm: number; slideMm: number } {
  const entryMm = 2 * screwMm + 1;
  return { slotMm: screwHole(screwMm).holeMm, entryMm, slideMm: entryMm };
}

/** A 90 degree countersunk head (D358): DIN 7991's proportions for M3 to M5 (ISO 10642's alike), twice the screw
 * across and 0.62 times it tall, 8 x 2.48 mm for a 4 mm screw, <<CONFIRM>> against the owner's screws (Q359). The
 * seat is sized from its height; any head as tall or less, and narrower than the entry, seats in it. */
export const countersunkHead = (screwMm: number) => ({ acrossMm: 2 * screwMm, tallMm: 0.62 * screwMm });
/** What a keyhole's channel leaves past a seated head's top: D155's 0.3 mm. */
const CHANNEL_SPARE_MM = 0.3;

/** A keyhole's seat, from the wall face in (D358): the slot's straight part through the lips, the 45 degree cone from
 * the slot out to the channel's width, and the depth to the channel's floor; and how far a seated head's top stands
 * out of the wall. */
export interface KeyholeSeatSize {
  lipsMm: number;
  coneMm: number;
  depthMm: number;
  headOutMm: number;
}

/**
 * The seat of a keyhole for this screw (D358): a 90 degree countersunk head's cone crosses the slot's edge at the lips'
 * top, a quarter of a millimetre out from the shank, as the slot is 0.5 mm wider than the screw, and bears on the
 * seat's cone, which runs on at 45 degrees to the channel's width, so nothing over the head faces down more steeply as
 * a board prints face down. The channel ends the head's height and 0.3 mm in, and never before the cone does.
 */
export function keyholeSeat(screwMm: number): KeyholeSeatSize {
  const k = keyhole(screwMm);
  const lipsMm = KEYHOLE_LIPS_MM;
  const coneMm = (k.entryMm - k.slotMm) / 2;
  const headOutMm = lipsMm - (k.slotMm - screwMm) / 2 + countersunkHead(screwMm).tallMm;
  return { lipsMm, coneMm, depthMm: Math.max(lipsMm + coneMm, headOutMm + CHANNEL_SPARE_MM), headOutMm };
}

/** The mounting asked for, with the starting values filled in, refused when it cannot be made: the keyholes' and the
 * lock screws' size the screw size unless given (D479). */
export function mountingParams(given: Partial<MountingParams>): MountingParams {
  const screwMm = given.screwMm ?? MOUNTING_DEFAULTS.screwMm;
  const head = given.screwHead ?? MOUNTING_DEFAULTS.screwHead;
  const m: MountingParams = {
    ...MOUNTING_DEFAULTS,
    ...given,
    screwMm,
    keyholeScrewMm: given.keyholeScrewMm ?? screwMm,
    lockScrewMm: given.lockScrewMm ?? screwMm,
    standoffs: given.standoffs ?? (BEHIND_SLOTS.has(head) ? 'slots' : 'corners'),
  };
  if (!HEADS.has(m.screwHead)) {
    throw new RangeError('The mounting must be countersunk, round, keyholes, lock screws, tape or none');
  }
  if (m.standoffs !== 'corners' && m.standoffs !== 'slots') {
    throw new RangeError('The standoffs stand at the corners or behind the slots');
  }
  // keyholes, lock screws and tape stand behind the slots, and a corner screw needs its standoff round it (D619)
  if (BEHIND_SLOTS.has(m.screwHead) && m.standoffs !== 'slots') {
    throw new RangeError(`${behindWhat(m)} stand on standoffs behind the slots, not at the corners`);
  }
  if (AT_CORNERS.has(m.screwHead) && m.standoffs !== 'corners') {
    throw new RangeError('A corner screw needs its standoff round it, at the corner, not behind a slot');
  }
  if (!(m.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (!(m.keyholeScrewMm > 0)) throw new RangeError('The keyhole screw size must be more than 0 mm');
  if (!(m.standoffHeightMm >= 0)) throw new RangeError('The standoffs cannot be less than 0 mm tall');
  if (typeof m.lockScrews !== 'boolean') throw new RangeError('Lock screws must be on or off');
  if (!(m.lockScrewMm > 0)) throw new RangeError('The lock screw size must be more than 0 mm');
  if (m.screwHead === 'tape') {
    m.tapeMm ??= TAPE_MM;
    m.tapeLengthMm ??= TAPE_LENGTH_MM;
    if (!(m.tapeMm > 0)) throw new RangeError('The tape must be more than 0 mm wide');
    if (!(m.tapeLengthMm > 0)) throw new RangeError('A piece of tape must be more than 0 mm long');
    if (!(m.standoffHeightMm > 0)) throw new RangeError('Tape goes on standoffs: they must be more than 0 mm tall');
  } else if (m.tapeMm !== undefined || m.tapeLengthMm !== undefined) {
    throw new RangeError('A piece of tape is for a board on tape (D619 a)');
  }
  return m;
}

/** What stands on standoffs behind the slots, as a message names it. */
function behindWhat(m: Pick<MountingParams, 'screwHead'>): string {
  const names: Partial<Record<ScrewHead, string>> = { keyhole: 'Keyholes', lock: 'Lock screws', tape: 'Tape' };
  return names[m.screwHead] ?? 'Standoffs behind the slots';
}

/** Whether a board stands on standoffs behind its corner slots (D190, D289, D619): with keyholes, lock screws and tape
 * always, and with no screws when its standoffs are put there. */
const standsBehindSlots = (m: MountingParams) =>
  BEHIND_SLOTS.has(m.screwHead) || (m.standoffs === 'slots' && m.standoffHeightMm > 0);

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** Where a keyhole's screw stands (D264, D358): a countersunk one, left standing out of the wall with its head's top
 * as far out as the head sits on the seat, up to the channel's floor. */
export function keyholeScrews(start: string, screwMm: number): string {
  const seat = keyholeSeat(screwMm);
  return (
    `${start} hangs on a ${nice(screwMm)} mm countersunk screw (a 90 degree head) left standing out of the wall, ` +
    `the top of its head ${nice(seat.headOutMm)} to ${nice(seat.depthMm)} mm out.`
  );
}

/** The least standoff a board on keyholes or lock screws stands on, mm; 0 for screws in the corners. The lips, the
 * head's seat and channel and a roof over it, then a hook's room behind the slot in front (D235, D244, D358); a lock
 * screw's head in its recess behind the room, and some standoff under it (A248). */
function leastStandoffMm(m: MountingParams): number {
  const underLock = HOOK_ROOM_MM + lockRecessMm(m.lockScrewMm) + UNDER_HEAD_MM;
  if (m.screwHead === 'lock') return underLock;
  if (m.screwHead !== 'keyhole') return 0;
  return Math.max(
    keyholeSeat(m.keyholeScrewMm).depthMm + MIN_BEHIND_CHANNEL_MM + HOOK_ROOM_MM,
    m.lockScrews ? underLock : 0,
  );
}

/** Refuses standoffs too short for the keyholes or lock screws they stand behind, saying how tall they must be: the
 * build and what the screws pass alike, so neither gives a length the board cannot have (Q9). */
function checkStandoffs(m: MountingParams): void {
  const least = leastStandoffMm(m);
  if (m.standoffHeightMm < least - 1e-9) {
    throw new SettingsProblem(
      `${m.screwHead === 'keyhole' ? 'Keyholes' : 'Lock screws'} stand the board off the wall, with a hook's room ` +
        `behind the slot in front of each: choose standoffs at least ${nice(least)} mm tall`,
      ['standoffHeightMm'],
    );
  }
}

/** What a board's tape holds (D609 a): a piece on each of its four posts behind the corner slots (D619 a); nothing
 * off tape. */
export function mountingTape(m: MountingParams): string | undefined {
  return m.screwHead !== 'tape' || m.tapeMm === undefined
    ? undefined
    : tapeHolds(4, m.tapeMm, m.tapeLengthMm ?? TAPE_LENGTH_MM, 'board');
}

/** What each of a board's screws passes (D264): the board, and its standoffs when it has them; a keyhole's screw
 * stands in the wall instead, and a lock screw passes what the standoff leaves under its head. Every corner has its
 * screw, between the slots too (D371 a). Refuses, as the build does, standoffs too short for keyholes or lock screws,
 * where a lock screw would pass less than nothing (Q9). */
export function mountingScrews(m: MountingParams, thicknessMm: number): string | undefined {
  if (m.screwHead === 'none' || m.screwHead === 'tape') return undefined;
  checkStandoffs(m);
  if (m.screwHead === 'lock') {
    const under = m.standoffHeightMm - HOOK_ROOM_MM - lockRecessMm(m.lockScrewMm);
    return `Each lock screw passes ${nice(under)} mm of standoff under its head, plus your wall plug.`;
  }
  if (m.screwHead === 'keyhole') {
    const under = m.standoffHeightMm - HOOK_ROOM_MM - lockRecessMm(m.lockScrewMm);
    const lock = m.lockScrews
      ? ` Each lock screw passes ${nice(under)} mm of standoff under its head, plus your wall plug.`
      : '';
    return keyholeScrews('Each keyhole', m.keyholeScrewMm) + lock;
  }
  const bore = sunkRound(m, thicknessMm);
  const board = thicknessMm - (bore?.deepMm ?? 0);
  if (m.standoffHeightMm > 0) {
    const under = bore ? ' under its head' : '';
    return `Each corner screw passes ${nice(board + m.standoffHeightMm)} mm of board and standoff${under}, plus your wall plug.`;
  }
  return bore
    ? `Each corner screw passes ${nice(board)} mm of board under its head, plus any standoff behind it and your wall plug.`
    : `Each corner screw passes the board's ${nice(thicknessMm)} mm, plus any standoff behind it and your wall plug.`;
}

/** A board as the mounting places things on it: its tiles, and its sides and seams where they move its edges (D288 a);
 * open all round and through the slots unless given; its slots, as the solid board's unless given; and on a lattice
 * board, how far the frame round each slot reaches past the slot's drawn edge, which the standoffs behind the slots
 * take as their outline (D306). */
export type MountingBoard = Pick<SolidBoardParams, 'columns' | 'rows'> &
  Partial<Pick<SolidBoardParams, 'sides' | 'seams' | 'slotClearanceMm' | 'slotChamferMm' | 'cornerRadiusMm'>> & {
    frameMm?: number;
    /** On a lattice board, its pockets at the back face, given the pads the mounting keeps solid: what a standoff's
     * root keeps out of (D375). */
    pocketsOf?: (engine: Engine, pads: readonly Vec2[][]) => Vec2[][];
  };

/** A board's slot as it cuts it: its drawn width and height, and its chamfer. */
function slotOf(b: MountingBoard): { widthMm: number; heightMm: number; chamferMm: number } {
  const clearance = b.slotClearanceMm ?? SOLID_BOARD_DEFAULTS.slotClearanceMm;
  return {
    widthMm: SLOT_WIDTH_MM + clearance,
    heightMm: SLOT_HEIGHT_MM + clearance,
    chamferMm: b.slotChamferMm ?? SOLID_BOARD_DEFAULTS.slotChamferMm,
  };
}

const extentOfBoard = (b: MountingBoard): Extent =>
  boardExtent(b.columns, b.rows, b.sides ?? ALL_OPEN, b.seams ?? 'through');

/**
 * The least room round a corner screw's hole (D371 a): what a corner through the slots has, from its hole's centre to
 * the corner tile's slot in the section at mid-thickness, its clearance in, 8.58 mm at the starting clearance, taken
 * down to the 0.1 mm, so 8.5 mm, the owner's figure; at any clearance a corner through the slots keeps its usual place.
 */
export function leastScrewRoomMm(board: Pick<MountingBoard, 'slotClearanceMm'>): number {
  const slot = slotOf({ columns: 1, rows: 1, ...board });
  const straight = (slot.heightMm - slot.widthMm) / 2;
  const reach = Math.hypot(TILE_MM / 2 - SCREW_INSET_MM, TILE_MM / 2 - straight - SCREW_INSET_MM);
  return Math.floor((reach - slot.widthMm / 2) * 10 + 1e-9) / 10;
}

/** The room round a hole whose centre is at (x, y) (D371 a): its distance to the nearest of the slots' outlines as the
 * board cuts them, in the section at mid-thickness, where the owner measured it, or to the nearest edge. A chamfer
 * would take the same 1 mm from every corner's room and the least alike, and move no screw. */
function roomAt(board: MountingBoard, [x, y]: readonly [number, number]): number {
  const [e, slot] = [extentOfBoard(board), slotOf(board)];
  const straight = (slot.heightMm - slot.widthMm) / 2;
  let room = Math.min(x - e.x0, e.x1 - x, y - e.y0, e.y1 - y);
  for (const s of slotPlaces(board.columns, board.rows, board.sides ?? ALL_OPEN, board.seams ?? 'through')) {
    const along = Math.max(s.yMm - straight, Math.min(s.yMm + straight, y));
    room = Math.min(room, Math.hypot(x - s.xMm, y - along) - slot.widthMm / 2);
  }
  return room;
}

/** The step of the places a moved corner screw is looked for on, from its usual place in (D371 a). */
const SCREW_SEARCH_STEP_MM = 0.5;
/** How far from its usual place a corner screw is looked for, at most: a tile, far past where every board ends its
 * search (14.1 mm, on a board one tile across). */
const SCREW_SEARCH_MM = TILE_MM;
/** Two corners whose screws would stand nearer than this share one, the first's (D371 a): the two screws of a board
 * one tile across through the slots, which only a board one tile across between them comes nearer than. */
const SHARED_SCREW_MM = 2 * SCREW_INSET_MM;

/**
 * Where a corner's screw goes (D371 a): its usual place, 10 mm in from both edges (D73), where that has a normal
 * corner's room round it; else the nearest place at least 10 mm in from both edges that has, on a 0.5 mm grid, of two
 * as near the one nearer the corner's bottom or top edge, as the keyhole standoffs choose (D289 a). Its corner is at
 * (ux, uy) less 10 mm each way, toward (-sx, -sy).
 */
function screwPlaceOf(board: MountingBoard, [ux, uy]: readonly [number, number], [sx, sy]: readonly [number, number]) {
  const least = leastScrewRoomMm(board);
  if (roomAt(board, [ux, uy]) >= least - 1e-9) return [ux, uy] as const;
  const e = extentOfBoard(board);
  const step = SCREW_SEARCH_STEP_MM;
  const far = SCREW_SEARCH_MM / step;
  const [across, up] = [e.x1 - e.x0 - 2 * SCREW_INSET_MM, e.y1 - e.y0 - 2 * SCREW_INSET_MM].map((d) =>
    Math.min(far, Math.floor(d / step + 1e-9)),
  );
  const steps: [number, number][] = [];
  for (let i = 0; i <= (across ?? 0); i++) for (let j = 0; j <= (up ?? 0); j++) steps.push([i, j]);
  // in whole steps, so two as near are as near exactly
  steps.sort(([ai, aj], [bi, bj]) => ai * ai + aj * aj - (bi * bi + bj * bj) || aj - bj || ai - bi);
  for (const [i, j] of steps) {
    const place = [ux + sx * step * i, uy + sy * step * j] as const;
    if (roomAt(board, place) >= least - 1e-9) return place;
  }
  throw new RangeError('A corner screw finds no place with room round it on this board');
}

/** The screw holes' centres: one for each corner, 10 mm in from both edges (D73), or where that would land on a slot,
 * as between the slots, the nearest place with a normal corner's room round it (D371 a); a corner whose screw would
 * stand within 20 mm of another's, which only a board one tile across between the slots has, shares that one, a usual
 * place's before a moved one. Bottom left, bottom right, top left, top right, those of them that have their own. */
export function screwPlaces(board: MountingBoard): readonly (readonly [number, number])[] {
  const [e, i] = [extentOfBoard(board), SCREW_INSET_MM];
  const corners: [[number, number], [number, number]][] = [
    [
      [e.x0 + i, e.y0 + i],
      [1, 1],
    ],
    [
      [e.x1 - i, e.y0 + i],
      [-1, 1],
    ],
    [
      [e.x0 + i, e.y1 - i],
      [1, -1],
    ],
    [
      [e.x1 - i, e.y1 - i],
      [-1, -1],
    ],
  ];
  const places = corners.map(([usual, inward]) => {
    const place = screwPlaceOf(board, usual, inward);
    return { place, usual: place[0] === usual[0] && place[1] === usual[1] };
  });
  const kept: (typeof places)[number][] = [];
  for (const p of [...places.filter((q) => q.usual), ...places.filter((q) => !q.usual)]) {
    const near = kept.some(
      (q) => Math.hypot(q.place[0] - p.place[0], q.place[1] - p.place[1]) < SHARED_SCREW_MM - 1e-9,
    );
    if (!near) kept.push(p);
  }
  return places.filter((p) => kept.includes(p)).map((p) => p.place);
}

/** How far a pad that nothing may be cut from reaches past a screw's countersink, all round (D144; C83's margin). */
export const PAD_MARGIN_MM = 2;

/** How near a pad may come to the frame round a slot and not reach it, on a lattice board: past the 2.8 mm a skeleton's
 * pocket widens into a rim (D147, D161), so a pocket left between the two is not too narrow to taper. */
const PAD_TO_FRAME_MM = 3;
/** How far a pad that reaches the frame round a slot runs into it, so the two overlap rather than touch. */
const PAD_INTO_FRAME_MM = 0.5;

/**
 * A corner screw's pad on a lattice board, its radius (D144, D371 a): the countersink and 2 mm all round, or where the
 * frame round a slot comes nearer than 3 mm past that, as round a usual place between the slots that is clear by 10 to
 * 13.5 mm, out to 0.5 mm into it, so no sliver of pocket is left between them, which a skeleton's taper turned inside
 * out; through the slots the frame overlaps every pad, which stays as it was.
 */
function padRadiusMm(board: MountingBoard, [x, y]: readonly [number, number], radiusMm: number): number {
  if (board.frameMm === undefined) return radiusMm;
  const slot = slotOf(board);
  const straight = (slot.heightMm - slot.widthMm) / 2;
  const frames = slotPlaces(board.columns, board.rows, board.sides ?? ALL_OPEN, board.seams ?? 'through').map((s) => {
    const along = Math.max(s.yMm - straight, Math.min(s.yMm + straight, y));
    return Math.hypot(x - s.xMm, y - along) - slot.widthMm / 2 - (board.frameMm ?? 0);
  });
  let radius = radiusMm;
  for (let grown = true; grown;) {
    const reach = frames.filter((d) => d > radius && d < radius + PAD_TO_FRAME_MM);
    grown = reach.length > 0;
    if (grown) radius = Math.max(...reach) + PAD_INTO_FRAME_MM;
  }
  return radius;
}

/** What a root keeps clear of beside a slot behind a board (D375): the slot's room, its chamfer and C83's 2 mm, the
 * zone every standoff keeps out of. */
const ROOT_SLOT_ROOM_MM = 2;
/** And below it, the room a hook's back tab takes: its width and drop each with C99's 2 mm, as hookRoomOutline cuts it
 * from a standoff behind a slot; the root's own margin keeps it 0.25 mm off. */
const ROOT_HOOK_ROOM_MM = 2;
/** How much of a standoff a root leaves plain above its foot's chamfer, at the least. */
const ROOT_BELOW_FOOT_MM = 0.5;
/** How far from a post a slot or a pocket can be and matter to its root, mm: past the post, the root and every room. */
const ROOT_NEAR_MM = 40;

/**
 * Where on a board's back a standoff's root may run out to (D375): inside the outline, off the back's chamfer at an
 * edge; out of every slot's room and the room a hook takes below it; on a lattice board, on a corner screw's pad, which
 * nothing is cut from (D144), and off every pocket. The board's outline is convex, its corners rounded, so a point's
 * room to its edge is the least of its distances to the outline's sides' lines.
 */
function backFree(
  board: MountingBoard,
  [cx, cy]: readonly [number, number],
  { pad, pockets = [] }: { pad?: { centre: readonly [number, number]; radiusMm: number }; pockets?: Vec2[][] } = {},
): (p: Vec2) => boolean {
  const face = boardFace({
    columns: board.columns,
    rows: board.rows,
    sides: board.sides ?? ALL_OPEN,
    seams: board.seams ?? 'through',
    cornerRadiusMm: board.cornerRadiusMm ?? SOLID_BOARD_DEFAULTS.cornerRadiusMm,
  });
  const sides = face.map((a, i) => {
    const b = face[(i + 1) % face.length] ?? a;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, n: [-(b[1] - a[1]) / length, (b[0] - a[0]) / length] as const };
  });
  const slot = slotOf(board);
  const straight = (slot.heightMm - slot.widthMm) / 2;
  const clear = slot.widthMm / 2 + slot.chamferMm + ROOT_SLOT_ROOM_MM;
  const [tab, drop] = [HOOK_WIDTH_MM / 2 + ROOT_HOOK_ROOM_MM, HOOK_DROP_MM + ROOT_HOOK_ROOM_MM];
  const slots = slotPlaces(board.columns, board.rows, board.sides ?? ALL_OPEN, board.seams ?? 'through').filter(
    (s) => Math.hypot(s.xMm - cx, s.yMm - cy) < ROOT_NEAR_MM,
  );
  const near = pockets.filter((ring) => ring.some(([x, y]) => Math.hypot(x - cx, y - cy) < ROOT_NEAR_MM));
  return ([x, y]) => {
    if (sides.some(({ a, n }) => (x - a[0]) * n[0] + (y - a[1]) * n[1] < EDGE_CHAMFER_MM)) return false;
    for (const s of slots) {
      const along = Math.max(s.yMm - straight, Math.min(s.yMm + straight, y));
      if (Math.hypot(x - s.xMm, y - along) < clear) return false;
      // the tab's room, from 1 mm past the slot's bottom end down, as it is cut (hookRoomOutline)
      const bottom = s.yMm - slot.heightMm / 2;
      if (Math.abs(x - s.xMm) < tab && y < bottom + 1 && y > bottom - drop) return false;
    }
    if (pad !== undefined && Math.hypot(x - pad.centre[0], y - pad.centre[1]) > pad.radiusMm) return false;
    return !insideRings(near, [x, y]);
  };
}

/** A standoff's outline round the middle of the slot it stands behind. */
type Outline = (place: readonly [number, number]) => Vec2[];

/**
 * The slot a standoff at a corner of a board between the slots stands behind (D289 a): the one nearest the corner
 * whose standoff lies on the board 1 mm in from its edges, clear of their chamfer; of two as near, the one nearer the
 * corner's bottom or top edge, then its side.
 */
function standoffSlot(board: MountingBoard, outline: Outline, [cx, cy]: readonly [number, number]): [number, number] {
  const e = extentOfBoard(board);
  const fits = (place: readonly [number, number]) => {
    const pad = outline(place);
    const [xs, ys] = [pad.map((q) => q[0]), pad.map((q) => q[1])];
    const m = EDGE_CHAMFER_MM;
    return (
      Math.min(...xs) >= e.x0 + m &&
      Math.max(...xs) <= e.x1 - m &&
      Math.min(...ys) >= e.y0 + m &&
      Math.max(...ys) <= e.y1 - m
    );
  };
  const [best] = slotPlaces(board.columns, board.rows, board.sides ?? ALL_OPEN, 'between')
    .map((s): [number, number] => [s.xMm, s.yMm])
    .filter(fits)
    .map((q) => ({ q, d: Math.hypot(q[0] - cx, q[1] - cy), dy: Math.abs(q[1] - cy), dx: Math.abs(q[0] - cx) }))
    .sort((a, b) => a.d - b.d || a.dy - b.dy || a.dx - b.dx);
  if (best === undefined) throw new RangeError('The board is too small for a standoff behind a slot at each corner');
  return best.q;
}

/** The middles of a board's two keyholes: its top corner tiles' centre slots, which the standoffs stand behind,
 * 11.25 mm clear of every other slot and hook where panels meet (D244); between the slots, the slot nearest each top
 * corner that keeps its standoff on the board (D289 a), the standoff a keyhole's and its walls unless given. Left, then
 * right. */
export function keyholePlaces(
  board: MountingBoard,
  screwMm = MOUNTING_DEFAULTS.screwMm,
  outline: Outline = (q) => keyholePad(screwMm, q),
): readonly (readonly [number, number])[] {
  if (board.seams === 'between') {
    const e = extentOfBoard(board);
    return [standoffSlot(board, outline, [e.x0, e.y1]), standoffSlot(board, outline, [e.x1, e.y1])];
  }
  const [width, height] = [TILE_MM * board.columns, TILE_MM * board.rows];
  return [
    [TILE_MM / 2, height - TILE_MM / 2],
    [width - TILE_MM / 2, height - TILE_MM / 2],
  ];
}

/** The middles of a board's bottom corner tiles' centre slots, which a board on keyholes stands behind at the
 * bottom too, unless lock screws hold it there (D245); between the slots, the slot nearest each bottom corner that
 * keeps its standoff on the board (D289 a), the standoff a keyhole's and its walls unless given. Left, then right. */
export function bottomSlotPlaces(
  board: MountingBoard,
  screwMm = MOUNTING_DEFAULTS.screwMm,
  outline: Outline = (q) => keyholePad(screwMm, q),
): readonly (readonly [number, number])[] {
  if (board.seams === 'between') {
    const e = extentOfBoard(board);
    return [standoffSlot(board, outline, [e.x0, e.y0]), standoffSlot(board, outline, [e.x1, e.y0])];
  }
  const width = TILE_MM * board.columns;
  return [
    [TILE_MM / 2, TILE_MM / 2],
    [width - TILE_MM / 2, TILE_MM / 2],
  ];
}

/** A keyhole standoff's outline round a keyhole whose middle is at (x, y): the keyhole and its walls (D237), grown
 * by `grow` all round. */
export function keyholePad(screwMm: number, [x, y]: readonly [number, number], grow = 0): Vec2[] {
  const k = keyhole(screwMm);
  return stadium(x, y, k.entryMm + 2 * KEYHOLE_WALL_MM, k.slideMm + k.entryMm + 2 * KEYHOLE_WALL_MM, grow);
}

/** The screw a standoff behind a slot is sized for: the keyhole's, or for lock screws alone, tape or no screws, which
 * have no such screw, a 4 mm screw's (D289, D619), whatever the screw size, which their lock screws take (D479). */
const standoffScrewOf = (m: MountingParams) => (m.screwHead === 'keyhole' ? m.keyholeScrewMm : SCREW_MM);
/** Whether lock screws go through any of the slots the standoffs stand behind (A248, D289). */
const lockScrewsOf = (m: MountingParams) => m.screwHead === 'lock' || (m.screwHead === 'keyhole' && m.lockScrews);

/**
 * How far past its slot's drawn edge a standoff behind a slot reaches on a lattice board (D306): the frame round the
 * slot, less FRAME_INSET_MM, so it stands flush with the frame and no plate is missing in front of it; or, where that
 * would leave less than STANDOFF_WALL_MM round the keyhole's channel, the hook's room or a lock screw's recess, as far
 * as that wall needs, and the frame grows round it (mountingPads). Undefined on the solid board, which has no frame:
 * there the standoff is the keyhole and its walls (keyholePad).
 */
export function standoffGrowMm(m: MountingParams, board: MountingBoard): number | undefined {
  if (board.frameMm === undefined) return undefined;
  const slot = slotOf(board);
  const wall = STANDOFF_WALL_MM;
  const needs = [slot.chamferMm + ROOM_PAST_CHAMFER_MM + wall]; // the hook's room
  if (m.screwHead === 'keyhole') {
    // the channel, as wide as the entry and from the entry's bottom to past the resting screw, twice the entry long
    const entry = keyhole(m.keyholeScrewMm).entryMm;
    needs.push((entry + 2 * wall - slot.widthMm) / 2, (2 * entry + 2 * wall - slot.heightMm) / 2);
  }
  if (lockScrewsOf(m)) needs.push((lockRecessAcross(m.lockScrewMm) + 2 * wall - slot.widthMm) / 2);
  return Math.max(board.frameMm - FRAME_INSET_MM, ...needs);
}

/** The outline of every standoff a board stands on behind its slots, round the middle of the slot it stands behind:
 * the frame's on a lattice board (D306), a keyhole's and its walls on the solid board (D244). */
function standoffOutline(m: MountingParams, board: MountingBoard): Outline {
  const grow = standoffGrowMm(m, board);
  if (grow === undefined) return (q) => keyholePad(standoffScrewOf(m), q);
  const slot = slotOf(board);
  return ([x, y]) => stadium(x, y, slot.widthMm, slot.heightMm, grow);
}

/**
 * The outlines a lightened board keeps solid round the mounting (D144, D158): round each screw hole or standoff,
 * the countersink and 2 mm all round, 13 mm across for a 4 mm screw, which also covers the standoff. On keyholes or
 * lock screws every standoff stands behind a slot inside the frame round it, which meets that slot's rim and the webs as
 * they are, so those slots look like every other (D250 f, D306); none, unless the standoff needs more than the frame
 * holds, and then the frame grows round it, FRAME_INSET_MM past it, so the two stay flush. None where there is neither
 * a hole nor a standoff.
 */
export function mountingPads(m: MountingParams, board: MountingBoard): Vec2[][] {
  if (m.screwHead === 'none' && m.standoffHeightMm === 0) return [];
  const padMm = screwHole(m.screwMm).countersinkMm + 2 * PAD_MARGIN_MM;
  if (!standsBehindSlots(m))
    return screwPlaces(board).map(([x, y]) => circle(x, y, 2 * padRadiusMm(board, [x, y], padMm / 2)));
  const grow = standoffGrowMm(m, board);
  if (grow === undefined || board.frameMm === undefined || grow <= board.frameMm - FRAME_INSET_MM + 1e-9) return [];
  if (board.rows < 2 || board.columns < 2) return []; // refused by mountingCuts
  const slot = slotOf(board);
  const [tops, bottoms] = slotStandoffPlaces(m, board);
  return [...tops, ...bottoms].map(([x, y]) => stadium(x, y, slot.widthMm, slot.heightMm, grow + FRAME_INSET_MM));
}

/**
 * The slots a board's standoffs stand behind, top then bottom, each left then right: its corner tiles' through the
 * slots (D244, D245); between them, the slot nearest each corner that keeps the standoff on the board (D289 a), and on
 * tape its pad too, so a larger piece takes a slot further in rather than reach past the edge (D619 a). Refuses, on
 * tape, a board with no such slot for its pad.
 */
function slotStandoffPlaces(
  m: MountingParams,
  board: MountingBoard,
): [readonly (readonly [number, number])[], readonly (readonly [number, number])[]] {
  const [screwMm, outline] = [standoffScrewOf(m), standoffOutline(m, board)];
  const tape = m.screwHead === 'tape' ? ([m.tapeMm ?? TAPE_MM, m.tapeLengthMm ?? TAPE_LENGTH_MM] as const) : undefined;
  const fits: Outline = tape === undefined ? outline : (q) => [...outline(q), ...tapeRect(q, ...tape)];
  try {
    return [keyholePlaces(board, screwMm, fits), bottomSlotPlaces(board, screwMm, fits)];
  } catch (error) {
    if (tape === undefined || !(error instanceof RangeError)) throw error;
    throw new SettingsProblem(
      `On this board no slot near a corner leaves a tape pad ${nice(tape[0])} x ${nice(tape[1])} mm room on it: ` +
        'choose a smaller piece, or make the board a tile larger',
      ['tapeWidthMm', 'tapeLengthMm'],
    );
  }
}

/**
 * A keyhole in a part's wall face, at z = footZ, its middle at (x, y) (C199, D235): through the lips, the entry the
 * head goes in by and the slot the screw slides up, to where it rests at the top; behind them the head's seat and
 * channel (D358), one solid of rings, the slot's outline grown from the lips' top out to the channel's width at 45
 * degrees and on to the channel's floor, and the entry a cylinder through the lips and the seat, up to where the slot
 * reaches the channel's width, so the two meet on one ring there rather than on a wall. The slot clip and a board's
 * top standoffs share it.
 */
export function wallKeyholeCutter(
  engine: Engine,
  [x, y]: readonly [number, number],
  screwMm: number,
  footZ = 0,
): Manifold {
  const k = keyhole(screwMm);
  const seat = keyholeSeat(screwMm);
  const entry = y - k.slideMm / 2; // the screw rests at the top, as the part hangs
  const [lipTop, coneTop] = [footZ + seat.lipsMm, footZ + seat.lipsMm + seat.coneMm];
  const slot = ringedSolid(engine, (grow) => stadium(x, y, k.slotMm, k.slideMm + k.slotMm, grow), [
    [footZ - 1, 0],
    [lipTop, 0],
    [coneTop, seat.coneMm],
    [footZ + seat.depthMm, seat.coneMm],
  ]);
  const way = ringedSolid(engine, (grow) => circle(x, entry, k.entryMm, grow), [
    [footZ - 1, 0],
    [coneTop, 0],
  ]);
  const cutter = engine.Manifold.union(slot, way);
  for (const m of [slot, way]) m.delete();
  return cutter;
}

/**
 * The outline of the room a hook takes behind the slot whose middle is at (x, y) (D244), which the keyhole standoff
 * behind it leaves empty: the slot and its chamfer and 1.5 mm more, and below it the hook's back tab, its width and
 * drop each with C99's 2 mm. The 1.5 mm is past the slot cutter's flare, which reaches 1 mm past the chamfer 1 mm
 * behind the board: within it the two met on one ring of points and left degenerate facets.
 */
function hookRoomOutline(
  engine: Engine,
  [x, y]: readonly [number, number],
  slot: { widthMm: number; heightMm: number; chamferMm: number },
): CrossSection {
  const { CrossSection } = engine;
  const [tabWidth, drop] = [HOOK_WIDTH_MM + 4, HOOK_DROP_MM + 2];
  const bottom = y - slot.heightMm / 2; // the slot's bottom end, where the hook rests
  const tab: Vec2[] = [
    [x - tabWidth / 2, bottom - drop],
    [x + tabWidth / 2, bottom - drop],
    // up to 1 mm past the slot's bottom end, inside the slot's part of the room, clear of a lock screw's groove
    [x + tabWidth / 2, bottom + 1],
    [x - tabWidth / 2, bottom + 1],
  ];
  const room = stadium(x, y, slot.widthMm, slot.heightMm, slot.chamferMm + ROOM_PAST_CHAMFER_MM);
  return new CrossSection([room, tab], 'NonZero');
}

/** Where the ramp under a room's ceiling starts below the keyhole's channel (D369): 0.5 mm short of its end, so at
 * the least standoff, where 1.2 mm of roof is all there is under the channel, the ramp's 45 degrees still pass its
 * end's edge (1.2 + 0.5) / root 2 = 1.20 mm off (MIN_BEHIND_CHANNEL_MM). */
const RAMP_SHORT_MM = 0.5;

/** A point's key, to 10 nm, as an extrusion gives its outline's points back. */
const pointKey = (x: number, y: number) => `${Math.round(x * 1e5)},${Math.round(y * 1e5)}`;

/** The unit normal to the left of the edge from a to b: into the region an outline's ring has on its left. */
const into = (a: Vec2, b: Vec2): Vec2 => {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
};

/**
 * A hook's room behind the slot whose middle is at (x, y), as a cutter: its outline from HOOK_ROOM_MM behind the
 * board's back to past the plate's middle, and where its walls meet the back, a rounded root on each wall, as a
 * standoff's outside has (D411, D375): the room's outline moved into the room at each level of the root's curve by
 * each point's reach, from 3 mm behind the back down to its foot a hair inside the plate, and on into the plate so, so
 * what the cutter leaves of the standoff there lies in the plate. A root keeps out of all a hook takes (C429): the slot
 * as the board cuts it and its chamfer, which slotClearZone keeps, and the back tab's room exactly as hookRoomOutline
 * cuts it, its width and drop each with C99's 2 mm; so the walls round the slot, 1.5 mm past its chamfer, have a root
 * 1.25 mm out with the margin, and the tab's walls none. One extrusion of the outline, each level moved to its height
 * and its points into the room along the mitres of their edges, in 64-bit points, so the tab's walls, which no root
 * moves, still lie in the planes the ramp's sides go on in (D369).
 */
function roomWithRoots(
  engine: Engine,
  rings: Vec2[][],
  [x, y]: readonly [number, number],
  slot: { widthMm: number; heightMm: number; chamferMm: number },
  thicknessMm: number,
): Manifold {
  const bottom = y - slot.heightMm / 2;
  const [tabHalf, drop] = [HOOK_WIDTH_MM / 2 + 2, HOOK_DROP_MM + 2];
  const hook = [stadium(x, y, slot.widthMm, slot.heightMm, slot.chamferMm)];
  const free = (p: Vec2) =>
    insideRings(rings, p) &&
    !insideRings(hook, p) &&
    !(Math.abs(p[0] - x) < tabHalf && p[1] > bottom - drop && p[1] < bottom + 1);
  const root = rootSize(HOOK_ROOM_MM / 2);
  // the levels, from the room's ceiling to past the plate's middle: [z, the share of each point's reach it is moved]
  const levels: [number, number][] = [
    [-HOOK_ROOM_MM, 0],
    ...rootProfile(root.riseMm).map(([up, share]): [number, number] => [-up, share]),
    [thicknessMm / 2 + 1, 1],
  ];
  // each point's reach, had on the ring turned round, so the standoff lies on its left and its normal runs out into the
  // room; and its mitre into the room, which lies on the ring's left: moved by the mitre times d, its two edges move d in
  const points = new Map<string, { reach: number; mitre: Vec2 }>();
  for (const ring of rings) {
    const n = ring.length;
    const at = (i: number): Vec2 => ring[((i % n) + n) % n] ?? [0, 0];
    const turned = rootReach(
      ring.map((_, i) => at(n - 1 - i)),
      free,
      root.reachMm,
    );
    const reach = ring.map((_, i) => turned[n - 1 - i] ?? 0);
    ring.forEach((q, i) => {
      const [n1, n2] = [into(at(i - 1), q), into(q, at(i + 1))];
      const k = 1 / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      points.set(pointKey(q[0], q[1]), { reach: reach[i] ?? 0, mitre: [k * (n1[0] + n2[0]), k * (n1[1] + n2[1])] });
    });
  }
  const prism = engine.Manifold.extrude(rings, 1, levels.length - 2);
  const room = prism.warp((v) => {
    const point = points.get(pointKey(v[0] ?? 0, v[1] ?? 0));
    if (point === undefined) throw new Error("a point of a hook's room is not on its outline");
    const [z, share] = levels[Math.round((v[2] ?? 0) * (levels.length - 1))] ?? [0, 0];
    const d = share * point.reach;
    [v[0], v[1], v[2]] = [(v[0] ?? 0) + d * point.mitre[0], (v[1] ?? 0) + d * point.mitre[1], z];
  });
  prism.delete();
  return room;
}

/**
 * The room a hook takes behind the slot whose middle is at (x, y) (D244), which the standoff behind it leaves empty:
 * hookRoomOutline from HOOK_ROOM_MM behind the board's back to past its middle, its walls' roots on the back rounded
 * where they leave a hook all it takes (roomWithRoots, D411); and under its ceiling over the hook's
 * back tab, a wedge as wide as the tab, rising at 45 degrees toward the wall from 0.5 mm short of the keyhole's
 * channel to the tab's end, so where the room runs out of the standoff its ceiling ends on a 45 degree face, not an
 * edge over air (D369). The wedge meets the room on the ceiling's plane and its sides go on in the tab's, so no two
 * walls lie on each other; below the standoff it cuts only air. A standoff without a keyhole has the ramp of one for
 * the screw given, as its standoff is sized for that screw's.
 */
export function hookRoomCutter(
  engine: Engine,
  place: readonly [number, number],
  board: MountingBoard & Pick<SolidBoardParams, 'thicknessMm'>,
  screwMm = MOUNTING_DEFAULTS.screwMm,
): Manifold {
  const { CrossSection, Manifold } = engine;
  const slot = slotOf(board);
  const outline = hookRoomOutline(engine, place, slot);
  const room = roomWithRoots(engine, outline.toPolygons(), place, slot, board.thicknessMm);
  outline.delete();
  const [x, y] = place;
  const k = keyhole(screwMm);
  const tabWidth = HOOK_WIDTH_MM + 4;
  const end = y - slot.heightMm / 2 - (HOOK_DROP_MM + 2); // the tab's end, below the slot
  const start = y - (k.slideMm + k.entryMm) / 2 - RAMP_SHORT_MM; // short of the channel's end
  const rise = start - end;
  // the wedge's side, in the plane across the tab: (y, z) as (u, v), counter-clockwise; extruded along x
  const side = new CrossSection([
    [
      [end, 0],
      [end, -rise],
      [start, 0],
    ],
  ]);
  const flat = side.extrude(tabWidth);
  const turned = flat.rotate([90, 0, 90]); // (u, v, w) to (w, u, v): across the tab along x
  const wedge = turned.translate([x - tabWidth / 2, 0, -HOOK_ROOM_MM]);
  const both = Manifold.union(room, wedge);
  for (const m of [room, flat, turned, wedge]) m.delete();
  side.delete();
  return both;
}

/** Whether any two standoffs behind slots would meet: their outlines' boxes overlap, or two stand behind one slot. */
function standoffsMeet(places: readonly (readonly [number, number])[], outline: Outline): boolean {
  const boxes = places.map((q) => {
    const pad = outline(q);
    const [xs, ys] = [pad.map((v) => v[0]), pad.map((v) => v[1])];
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  return boxes.some((a, i) => boxes.some((b, j) => j > i && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1));
}

/** How deep past the hook's room the ramp over a hook's tab cuts a standoff behind a slot (hookRoomCutter, D369), at
 * the standoff's lowest point, `belowMm` below the slot's middle: from 0 where the ramp starts, short of a keyhole's
 * channel, to its whole rise at the tab's end. */
function rampDepthMm(board: MountingBoard, screwMm: number, belowMm: number): number {
  const slot = slotOf(board);
  const k = keyhole(screwMm);
  const start = -(k.slideMm + k.entryMm) / 2 - RAMP_SHORT_MM;
  const end = -slot.heightMm / 2 - (HOOK_DROP_MM + 2);
  return Math.min(start - end, Math.max(0, start + belowMm));
}

/** How far below its slot's middle a standoff behind it reaches, with its tape pad if it has one. */
function lowestMm(ring: readonly Vec2[], [, y]: readonly [number, number], tape?: number[]): number {
  const ys = ring.map((p) => p[1]);
  return Math.max(y - Math.min(...ys), (tape?.[0] ?? 0) / 2);
}

/**
 * Refuses a tape pad that would reach past the board, or meet another (D619 a): centred on its standoff behind a corner
 * slot, it is at most twice that standoff's room to the nearest edge each way, 40 mm where the slot is a corner tile's,
 * through the slots, so the pads of two panels at a seam never meet.
 */
function checkTape(
  board: MountingBoard,
  places: readonly (readonly [number, number])[],
  outline: Outline,
  [tapeMm = TAPE_MM, lengthMm = TAPE_LENGTH_MM]: number[],
): void {
  const e = extentOfBoard(board);
  const across = Math.min(...places.flatMap(([x]) => [x - e.x0, e.x1 - x]));
  const up = Math.min(...places.flatMap(([, y]) => [y - e.y0, e.y1 - y]));
  const over = [
    ['tapeLengthMm', lengthMm > 2 * across + 1e-9],
    ['tapeWidthMm', tapeMm > 2 * up + 1e-9],
  ] as const;
  const keys = over.filter(([, past]) => past).map(([key]) => key);
  if (keys.length > 0) {
    throw new SettingsProblem(
      `On this board a tape pad is at most ${nice(2 * across)} mm long and ${nice(2 * up)} mm wide: centred on its ` +
        "standoff behind a corner slot, a larger one would reach past the board's edge",
      keys,
    );
  }
  if (standoffsMeet(places, (q) => [...outline(q), ...tapeRect(q, tapeMm, lengthMm)])) {
    throw new SettingsProblem(
      'On this board two tape pads would meet, behind the slots nearest its corners: choose smaller pieces, or make ' +
        'it a tile larger',
      ['tapeWidthMm', 'tapeLengthMm'],
    );
  }
}

/**
 * Refuses standoffs behind the slots, with tape or no screws, too short for what they hold (D619): the hook's room
 * behind the slot and the ramp over its tab where the standoff runs out below it, with 1.2 mm behind them; on tape,
 * besides, a pad's corners flaring out from the standoff behind the hooks' room (D593).
 */
function checkPosts(
  m: MountingParams,
  board: MountingBoard,
  places: readonly (readonly [number, number])[],
  outline: Outline,
  screwMm: number,
  tape?: number[],
): void {
  let least = 0;
  let flare = 0;
  for (const place of places) {
    const ring = outline(place);
    least = Math.max(least, HOOK_ROOM_MM + rampDepthMm(board, screwMm, lowestMm(ring, place, tape)));
    if (tape !== undefined)
      flare = Math.max(flare, tapeFlareMm(ring, place, tape[0] ?? TAPE_MM, tape[1] ?? TAPE_LENGTH_MM));
  }
  least += MIN_BEHIND_CHANNEL_MM;
  if (tape !== undefined) least = Math.max(least, HOOK_ROOM_MM + flare + TAPE_BAND_MM);
  if (m.standoffHeightMm >= least - 1e-9) return;
  if (tape !== undefined) {
    throw new SettingsProblem(
      `A tape pad ${nice(tape[0] ?? TAPE_MM)} x ${nice(tape[1] ?? TAPE_LENGTH_MM)} mm flares out to its corners ` +
        `from its standoff behind the hooks' room: choose standoffs at least ${nice(least)} mm tall, or a smaller piece`,
      ['standoffHeightMm', 'tapeWidthMm', 'tapeLengthMm'],
    );
  }
  throw new SettingsProblem(
    'Standoffs behind the slots leave a hook its room behind the slot in front of each: choose standoffs at least ' +
      `${nice(least)} mm tall`,
    ['standoffHeightMm'],
  );
}

/** What the mounting adds to and cuts from a board of this size: BoardCuts for makeSolidBoard. */
export function mountingCuts(
  m: MountingParams,
  board: MountingBoard & Pick<SolidBoardParams, 'thicknessMm'>,
): BoardCuts {
  const t = board.thicknessMm;
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(m.screwMm);
  const depth = (countersinkMm - holeMm) / 2; // 45 degree walls
  const keyholes = m.screwHead === 'keyhole';
  // lock screws alone (D289): the keyholes' standoffs and the bottom ones, a lock screw through each
  const locked = m.screwHead === 'lock';
  // keyholes, lock screws and tape stand behind the corner slots, and with no screws standoffs put there (D619)
  const behindSlots = standsBehindSlots(m);
  const what = behindWhat(m);
  // the standoffs behind the slots: on a lattice board the frame round the slot (D306); on the solid board a keyhole's
  // and its walls (D237), sized from its screw, or with none, a 4 mm screw's
  const [standoffScrewMm, outline] = [standoffScrewOf(m), standoffOutline(m, board)];
  const recessMm = lockRecessMm(m.lockScrewMm);
  checkStandoffs(m);
  if (behindSlots && (board.rows < 2 || board.columns < 2)) {
    throw new RangeError(
      `${what} need a board at least ${2 * TILE_MM} x ${2 * TILE_MM} mm: on one tile, the top standoffs would ` +
        'meet the bottom ones or each other',
    );
  }
  const [tops, bottoms] = behindSlots ? slotStandoffPlaces(m, board) : [[], []];
  if (behindSlots && standoffsMeet([...tops, ...bottoms], outline)) {
    throw new RangeError(
      `${what} need a larger board: between the slots, two of its standoffs would meet, behind the slots nearest ` +
        'its corners; open a side, or make it a tile larger',
    );
  }
  const tape = m.screwHead === 'tape' ? [m.tapeMm ?? TAPE_MM, m.tapeLengthMm ?? TAPE_LENGTH_MM] : undefined;
  if (tape !== undefined) checkTape(board, [...tops, ...bottoms], outline, tape);
  if (behindSlots && !keyholes && !locked) checkPosts(m, board, [...tops, ...bottoms], outline, standoffScrewMm, tape);
  const countersunk = m.screwHead === 'countersunk';
  if (countersunk && t - depth < MIN_PLAIN_HOLE_MM) {
    throw new SettingsProblem(
      `A countersunk ${nice(m.screwMm)} mm screw needs a board at least ${nice(depth + MIN_PLAIN_HOLE_MM)} mm ` +
        'thick; choose a round head or a smaller screw',
      ['thicknessMm'],
    );
  }
  const bore = sunkRound(m, t); // a round head sunk in a counterbore, flush with the front (D279)
  // the corner screws' places, which the standoffs behind the slots never look for
  const places = behindSlots ? [] : screwPlaces(board);
  const back = -m.standoffHeightMm - 1; // through the standoffs too, and a millimetre beyond
  const levels: [number, number][] = countersunk
    ? [
        [back, 0],
        [t - depth, 0],
        [t + 1, depth + 1],
      ]
    : [
        [back, 0],
        [t + 1, 0],
      ];
  // through a standoff, the hole's mouth at the wall chamfered 0.5 mm, as the standoff connector's (C275, D276)
  const mouth: [number, number][] = [
    [back, HOLE_MOUTH_MM + 1],
    [-m.standoffHeightMm + HOLE_MOUTH_MM, 0],
  ];
  const shaftLevels = m.standoffHeightMm > 0 ? [...mouth, ...levels.slice(1)] : levels;
  const cuts: BoardCuts = {};
  const hole = (engine: Engine, [x, y]: readonly [number, number]) => {
    const shaft = ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), shaftLevels);
    if (bore === null) return shaft;
    const cup = ringedSolid(engine, (grow) => circle(x, y, bore.acrossMm, grow), [
      [t - bore.deepMm, 0],
      [t + 1, 0],
    ]);
    const both = engine.Manifold.union(shaft, cup);
    for (const s of [shaft, cup]) s.delete();
    return both;
  };
  // A lock screw goes in through its corner slot, head and all: its shank's hole from the wall up through the
  // standoff, and its head in a recess just behind the hook's room, so the slot still takes a hook; a head too wide
  // to pass the slot gets a groove, the recess carried on up through the slot's sides (A248). Such a head is a
  // countersunk one, and bears on a 45 degree countersink from the shank's hole out to the recess, one solid of rings
  // with them, so nothing over the head faces down more steeply as a board prints face down (D479, D370 a, D358); a
  // pan head, small enough to pass the slot, bears on the recess's flat floor.
  const lockHole = lockHoleMm(m.lockScrewMm);
  const lockScrew = (engine: Engine, [x, y]: readonly [number, number]): Manifold[] => {
    const floor = -HOOK_ROOM_MM - recessMm;
    if (countersunkLock(m.lockScrewMm)) {
      const cone = (lockRecessAcross(m.lockScrewMm) - lockHole) / 2;
      return [
        ringedSolid(engine, (grow) => circle(x, y, lockHole, grow), [
          [-m.standoffHeightMm - 1, 0],
          [floor, 0],
          [floor + cone, cone],
          [t + 1, cone],
        ]),
      ];
    }
    const shank = ringedSolid(engine, (grow) => circle(x, y, lockHole, grow), [
      [-m.standoffHeightMm - 1, 0],
      [floor + 0.5, 0],
    ]);
    const recess = ringedSolid(engine, (grow) => circle(x, y, lockRecessAcross(m.lockScrewMm), grow), [
      [floor, 0],
      [-HOOK_ROOM_MM + 0.5, 0],
    ]);
    return [shank, recess];
  };
  if (locked) {
    // a lock screw through each corner's slot, the top ones where the keyholes would be (D289)
    cuts.extraCutters = (engine: Engine): Manifold[] => [...bottoms, ...tops].flatMap((p) => lockScrew(engine, p));
  } else if (keyholes) {
    // the keyholes in the top standoffs' wall faces (D235, D244); lock screws through the bottom slots (A248)
    cuts.extraCutters = (engine: Engine): Manifold[] => [
      ...(m.lockScrews ? bottoms.flatMap((p) => lockScrew(engine, p)) : []),
      ...tops.map((p) => wallKeyholeCutter(engine, p, m.keyholeScrewMm, -m.standoffHeightMm)),
    ];
  } else if (m.screwHead !== 'none') {
    cuts.extraCutters = (engine: Engine): Manifold[] => places.map((p) => hole(engine, p));
  }
  if (m.standoffHeightMm > 0) {
    // From the standoff's foot into the middle of the plate, so the two overlap rather than touch; its foot, at the
    // wall, chamfered as every part's outer edge is (D276); and its root on the board's back rounded (D375), from up
    // to 3 mm up the standoff, below its foot's chamfer, out over the back as far as the back leaves it room.
    const foot = Math.min(EDGE_CHAMFER_MM, m.standoffHeightMm / 2);
    const root = rootSize(m.standoffHeightMm - foot - ROOT_BELOW_FOOT_MM);
    /** A standoff of this outline, its root rounded out to `free`'s room, one mesh from its foot into the plate. */
    const standoff = (engine: Engine, drawn: Vec2[], free: (p: Vec2) => boolean) => {
      const ring = densified(drawn);
      const reach = rootReach(ring, free, root.reachMm);
      // grown out of the solid, which lies on the ring's left: by a negative amount
      const out = (by: readonly number[]): Vec2[][] => [
        grownRing(
          ring,
          by.map((d) => -d),
        ),
      ];
      return loftedSolid(engine, [
        [-m.standoffHeightMm, out(ring.map(() => -foot))],
        [-m.standoffHeightMm + foot, [ring]],
        // the root's curve, from where it leaves the standoff's side to its foot a hair inside the plate; its first
        // level is the standoff's own outline
        ...rootProfile(root.riseMm).map(([up, share]): [number, Vec2[][]] => [-up, out(reach.map((r) => r * share))]),
        // and back in to the standoff's outline in the middle of the plate, inside it, so its end is the outline's
        [t / 2, [ring]],
      ]);
    };
    // its points half a step round, off the diagonal on which a rounded corner's chamfer has its own: where a post
    // stands past that chamfer, at a 20 mm corner and a 5 mm screw, the two met on one line and left two facets of
    // no area in the printed part (D276)
    const padMm = screwHole(m.screwMm).countersinkMm + 2 * PAD_MARGIN_MM;
    const round = (engine: Engine, place: readonly [number, number]) => {
      const ring = circle(place[0], place[1], standoffDiameterMm, 0, HALF_STEP);
      // on a lattice board, the root on the screw's pad (D144)
      const onPad =
        board.frameMm === undefined ? {} : { pad: { centre: place, radiusMm: padRadiusMm(board, place, padMm / 2) } };
      return standoff(engine, ring, backFree(board, place, onPad));
    };
    // with keyholes or lock screws alone, the standoffs behind the slots: the frame's outline on a lattice board (D306),
    // the keyhole and its walls on the solid board (D244)
    // The standoff from its foot into the plate, less the hook's room from the room's ceiling up past the standoff's
    // top, taken out before the standoff joins the plate: the plate fills the room's top, so it stops at the board's
    // back face and never cuts the plate. Two prisms joined round the room instead shared their outer walls where
    // they overlapped and left degenerate facets (D244, D245). Its root is rounded as a post's is (D375); on a lattice
    // board, where it stands flush with the frame round its slot (D306), the root runs out only where a web or the edge
    // band meets the frame, off every pocket.
    const pad = (engine: Engine, place: readonly [number, number], pockets: Vec2[][]) => {
      const room = hookRoomCutter(engine, place, board, standoffScrewMm);
      const whole = standoff(engine, outline(place), backFree(board, place, { pockets }));
      const solid = whole.subtract(room);
      for (const s of [whole, room]) s.delete();
      return solid;
    };
    // On tape (D619 a): each post behind its corner slot ends at the wall in a rectangular pad, the piece of tape, its
    // length along the board's width, its edge 1 mm straight at the wall, chamfered 0.5 mm; from there the hull of it
    // and the post's outline 0.5 mm in, as high as its corners reach out past that outline, so no face of the flare is
    // past 45 degrees (D593, C601). Below the band's top the hull is cut back to the piece, so the pad at the wall is
    // the piece and nothing more where the post is longer than the piece across. The post stops 0.25 mm inside the
    // flare, where the flare, 0.5 mm in from the post at its top and at most 45 degrees, is still inside the post: at
    // 0.5 mm the two met on the post's edge and left facets of no area on a lattice board (C622). The hook's room and
    // the ramp over its tab are cut from them together, as from a post alone.
    const taped = (
      engine: Engine,
      place: readonly [number, number],
      pockets: Vec2[][],
      [tapeMm, lengthMm]: number[],
    ) => {
      const h = m.standoffHeightMm;
      const ring = outline(place);
      const out = tapeFlareMm(ring, place, tapeMm ?? TAPE_MM, lengthMm ?? TAPE_LENGTH_MM);
      const edge = Math.min(0.5, TAPE_BAND_MM / 2);
      const rect = (grow: number, z: number): Vec3[] =>
        tapeRect(place, (tapeMm ?? TAPE_MM) + 2 * grow, (lengthMm ?? TAPE_LENGTH_MM) + 2 * grow).map(([x, y]): Vec3 => [
          x,
          y,
          z,
        ]);
      const top = -h + TAPE_BAND_MM + out + 0.5;
      const inner = grownRing(
        ring,
        ring.map(() => 0.5),
      ).map(([x, y]): Vec3 => [x, y, top]);
      const hull = engine.Manifold.hull([
        ...rect(-edge, -h),
        ...rect(0, -h + edge),
        ...rect(0, -h + TAPE_BAND_MM),
        ...inner,
      ]);
      // below the band's top, what the hull holds past the piece, where the post is longer than the piece across
      const band = engine.Manifold.hull([...rect(-edge, -h), ...rect(0, -h + edge), ...rect(0, -h + TAPE_BAND_MM + 1)]);
      const [x, y] = place;
      const reach = Math.max(tapeMm ?? TAPE_MM, lengthMm ?? TAPE_LENGTH_MM) + 2 * (out + 1) + 40;
      const slab = engine.Manifold.cube([reach, reach, TAPE_BAND_MM + 1]).translate([
        x - reach / 2,
        y - reach / 2,
        -h - 1,
      ]);
      const past = slab.subtract(band);
      const flare = hull.subtract(past);
      const whole = standoff(engine, ring, backFree(board, place, { pockets }));
      const post = whole.trimByPlane([0, 0, 1], top - 0.25);
      const both = engine.Manifold.union(post, flare);
      const room = hookRoomCutter(engine, place, board, standoffScrewMm);
      const solid = both.subtract(room);
      for (const s of [hull, band, slab, past, flare, whole, post, both, room]) s.delete();
      return solid;
    };
    cuts.extraSolids = (engine: Engine): Manifold[] => {
      if (!behindSlots) return places.map((p) => round(engine, p));
      const pockets = board.pocketsOf?.(engine, mountingPads(m, board)) ?? [];
      // at the bottom, behind the corner slots as at the top (D245), the lock screws through them (A248)
      return [...bottoms, ...tops].map((p) =>
        tape === undefined ? pad(engine, p, pockets) : taped(engine, p, pockets, tape),
      );
    };
  }
  return cuts;
}

/** The mountings with a screw, which the screw size is for (D620 a: shown only with one). */
const SCREWED: ReadonlySet<unknown> = new Set(['countersunk', 'round', 'keyhole', 'lock']);
const NAMES: Readonly<Record<string, string>> = { keyhole: 'Keyholes', lock: 'Lock screws', tape: 'Tape' };
/** Why the standoffs are ruled out at the corners, or not at all, by the D589 mechanism: keyholes, lock screws and
 * tape stand on standoffs behind the slots (D190, D289, D619 a). */
const onlyBehindSlots = (v: Readonly<Record<string, unknown>>) => {
  const name = NAMES[String(v['screwHead'])];
  return name === undefined
    ? undefined
    : `${name} stand the board on standoffs behind its corner slots, which hold it off the wall so a hook has room ` +
        'behind it.';
};

/** The mounting's choices, on the main form: how the board holds to the wall (D617 c: "Mounting"), and where its
 * standoffs stand (D618 a), which keyholes, lock screws and tape need behind the slots (D589, D619); the tape's width
 * and length with tape alone (D593, Q594, D620 a). */
export const MOUNTING_HOLES = defineSettings([
  {
    kind: 'choice',
    key: 'screwHead',
    label: 'Mounting',
    options: [
      { value: 'countersunk', label: 'Countersunk' },
      { value: 'round', label: 'Round head' },
      { value: 'keyhole', label: 'Keyholes' },
      { value: 'lock', label: 'Lock screws' },
      { value: 'tape', label: 'Tape' },
      { value: 'none', label: 'None' },
    ],
    default: MOUNTING_DEFAULTS.screwHead,
    help:
      'Countersunk and round head: a screw in each corner, 10 mm in from both edges, or where that would land on a ' +
      'slot, as between the slots, the nearest place with as much room round it. A countersunk head keeps the front ' +
      'flat, and a round head is sunk in a counterbore, flush too, where the board leaves 1 mm under it. Keyholes, ' +
      'in the top two standoffs, behind the top corner slots, let the board drop onto two countersunk screws ' +
      'standing about 4 mm out of the wall and lift off them; the front stays plain, and hooks still fit those slots. ' +
      'Lock screws, one through a slot at each corner into the standoff behind it, head and all, hold the board ' +
      'without keyholes; every slot still takes a hook. Tape: each standoff behind a corner slot ends at the wall in ' +
      'a rectangular pad for a piece of double-sided tape, and the board has no screw holes.',
  },
  {
    kind: 'choice',
    key: 'standoffs',
    label: 'Standoffs',
    options: [
      { value: 'none', label: 'None', offWhen: onlyBehindSlots },
      { value: 'corners', label: 'At the corners', offWhen: onlyBehindSlots },
      {
        value: 'slots',
        label: 'Behind slots',
        // a corner screw needs its standoff round it (D619)
        offWhen: (v) =>
          v['screwHead'] === 'countersunk' || v['screwHead'] === 'round'
            ? 'A corner screw needs its standoff round it, at the corner. Lock screws are the screws that go ' +
              'through the slots into the standoffs behind them.'
            : undefined,
      },
    ],
    default: 'none',
    help:
      'Posts on the back that hold the board off the wall, so hooks have room behind it. At the corners, round the ' +
      "corner screws. Behind slots, behind the four corner tiles' slots, each leaving its slot a hook's room: " +
      'keyholes, lock screws and tape stand on these.',
  },
  { ...TAPE_WIDTH_SETTING, appliesWhen: (v) => v['screwHead'] === 'tape' }, // D593, Q594, D620 a
  { ...TAPE_LENGTH_SETTING, appliesWhen: (v) => v['screwHead'] === 'tape' }, // C601
]);

/** The screw size, on a board's form with a screw only, a corner screw, keyholes or lock screws (D620 a). */
export const MOUNTING_SCREW_SIZE = {
  ...SCREW_SIZE_SETTING,
  appliesWhen: (v) => SCREWED.has(v['screwHead']),
} as const satisfies NumberSetting;

/** The mounting's fine settings, under Advanced (D48): the keyholes' and lock screws' own sizes, the lock screws at the
 * bottom with keyholes, and the standoffs' height. */
export const MOUNTING_FINE = defineSettings([
  ...screwPlaceSettings(KEYHOLE_SCREW),
  {
    kind: 'choice',
    key: 'lockScrews',
    label: 'Lock screws',
    options: [
      { value: 'none', label: 'None' },
      { value: 'bottom', label: 'At the bottom' },
    ],
    default: 'none',
    help:
      'With keyholes: screws through the bottom corner slots into the standoffs behind, which hold the board in ' +
      "place; each goes in head and all, its head behind the hook's room, so the slot still takes a hook.",
    advanced: true,
    appliesWhen: (v) => v['screwHead'] === 'keyhole', // D372
  },
  ...screwPlaceSettings(LOCK_SCREW),
  {
    kind: 'number',
    key: 'standoffHeightMm',
    label: 'Standoff height',
    unit: 'mm',
    default: STANDOFF_DEFAULT_MM,
    startsAt: (v) => (v['screwHead'] === 'tape' ? TAPE_STANDOFF_MM : STANDOFF_DEFAULT_MM), // D603 b, C604
    min: 3,
    max: 40,
    step: 0.5,
    help:
      'With standoffs, which keyholes, lock screws and tape stand on: how far the ' +
      'standoffs hold the board off the wall, 15 mm unless set, and 18 mm for tape, as the taped standoff connector, so ' +
      'the parts of a taped wall match; ' +
      "IKEA's spacers hold it about 20 mm off.",
    advanced: true,
    appliesWhen: (v) => v['standoffs'] !== 'none' || NAMES[String(v['screwHead'])] !== undefined,
  },
]);

/** The mounting's settings, as a board type lists them (D48: the fine ones under Advanced): the screw holes and
 * standoffs, the screw size on the main form, the screw for every hole, and the fine ones (D479). */
export const MOUNTING_SETTINGS = defineSettings([...MOUNTING_HOLES, MOUNTING_SCREW_SIZE, ...MOUNTING_FINE]);

type MountingValues = Values<typeof MOUNTING_SETTINGS>;

/** The mounting a board type's values ask for: the keyholes' and the lock screws' size the screw size unless "Own" is
 * chosen for them (D479). */
export function mountingOf(v: MountingValues): MountingParams {
  return mountingParams({
    screwHead: v.screwHead,
    screwMm: v.screwMm,
    keyholeScrewMm: screwAt(v, KEYHOLE_SCREW),
    standoffHeightMm: v.standoffs === 'none' ? 0 : v.standoffHeightMm,
    ...(v.standoffs === 'none' ? {} : { standoffs: v.standoffs }), // D618 a
    lockScrews: v.lockScrews === 'bottom',
    lockScrewMm: screwAt(v, LOCK_SCREW),
    ...(v.screwHead === 'tape' ? { tapeMm: v.tapeWidthMm, tapeLengthMm: v.tapeLengthMm } : {}), // D593, C601
  });
}

/** The end of a file name: only what differs from the starting mounting, so a plain name keeps its meaning (C85); each
 * screw by the size it takes, so two ways to one board give one name (D479). */
export function mountingLabel(v: MountingValues): string {
  const parts: string[] = [];
  if (v.screwHead === 'round') parts.push('round-head');
  if (v.screwHead === 'none') parts.push('no-holes');
  if (v.screwHead === 'keyhole') parts.push(v.lockScrews === 'bottom' ? 'keyholes-lock-screws' : 'keyholes');
  if (v.screwHead === 'lock') parts.push('lock-screws');
  const locks = v.screwHead === 'lock' || (v.screwHead === 'keyhole' && v.lockScrews === 'bottom');
  const lockMm = screwAt(v, LOCK_SCREW);
  if (locks && lockMm !== SCREW_MM) parts.push(`${lockMm}mm`);
  // the corner screws' size or the keyholes', which lock screws alone have none of
  const screwMm = v.screwHead === 'keyhole' ? screwAt(v, KEYHOLE_SCREW) : v.screwMm;
  if (SCREWED.has(v.screwHead) && v.screwHead !== 'lock' && screwMm !== SCREW_MM) parts.push(`screw-${screwMm}mm`);
  if (v.screwHead === 'tape') parts.push(`tape-${v.tapeWidthMm}x${v.tapeLengthMm}mm`);
  // behind the slots with no screws, which keyholes, lock screws and tape say for themselves (D618 a)
  const where = v.screwHead === 'none' && v.standoffs === 'slots' ? 'behind-slots-' : '';
  if (v.standoffs !== 'none') parts.push(`standoffs-${where}${v.standoffHeightMm}mm`);
  return parts.map((p) => `-${p}`).join('');
}
