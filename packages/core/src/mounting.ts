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
// the slots (D282), a corner one of whose sides does has no screw, which would land on a slot, and each standoff
// stands behind the slot nearest its corner that keeps it on the board (D289 a).
// Any board type built on the solid board takes these as its third argument (BoardCuts).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { type BoardCuts, SOLID_BOARD_DEFAULTS, type SolidBoardParams } from './board-solid.js';
import { chamferedExtrusion, EDGE_CHAMFER_MM, HOLE_MOUTH_MM } from './chamfer.js';
import type { Engine } from './engine.js';
import { circle, HALF_STEP, ringedSolid, stadium } from './rings.js';
import { defineSettings, type NumberSetting, SettingsProblem, type Values } from './settings.js';
import { HOOK_DEPTH_MM, HOOK_DROP_MM, HOOK_WIDTH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';
import { ALL_OPEN, boardExtent, type Extent, type Side, slotPlaces } from './slots.js';

export type ScrewHead = 'countersunk' | 'round' | 'keyhole' | 'lock' | 'none';

export interface MountingParams {
  screwHead: ScrewHead; // D74; keyholes at the top two corners (D156); lock screws alone at all four (D289)
  screwMm: number; // the screw's diameter, 4 mm unless set (D76)
  standoffHeightMm: number; // how far the standoffs stand behind the board; 0 for none (D75)
  lockScrews: boolean; // with keyholes: screws through the bottom corner slots too, tucked behind them (D156, A248)
  lockScrewMm: number; // their size: a head up to 5 mm passes the slot, a larger one a groove cut in it (A248)
}

export const MOUNTING_DEFAULTS: MountingParams = {
  screwHead: 'countersunk',
  screwMm: 4,
  standoffHeightMm: 0,
  lockScrews: false,
  lockScrewMm: 2.5, // a 5 mm head, which passes the slot (A248)
};

/** How far the parts that stand behind a board hold it off the wall unless set, mm: the boards' standoffs, the
 * standoff connector and the slot clip, so the parts of one wall match. Less than IKEA's spacers (D238). */
export const STANDOFF_DEFAULT_MM = 15;

/** The holes' centres are this far in from both edges at each corner (D73). */
export const SCREW_INSET_MM = 10;
/** The least plain hole a countersink must leave behind it, so the head cannot pull through (C84). */
const MIN_PLAIN_HOLE_MM = 1;
const HEADS: ReadonlySet<string> = new Set(['countersunk', 'round', 'keyhole', 'lock', 'none']);
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
/** A lock screw's head goes in a recess its height and 0.3 mm deep (A248). */
const lockRecessMm = (lockScrewMm: number) => panHead(lockScrewMm).tallMm + 0.3;
/** Whether a head too wide to pass a slot, which gets a groove in the slot's sides (A248). */
const grooved = (lockScrewMm: number) => panHead(lockScrewMm).acrossMm > HEAD_THROUGH_SLOT_MM;
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

/** The mounting asked for, with the starting values filled in, refused when it cannot be made. */
export function mountingParams(given: Partial<MountingParams>): MountingParams {
  const m: MountingParams = { ...MOUNTING_DEFAULTS, ...given };
  if (!HEADS.has(m.screwHead)) {
    throw new RangeError('The screw holes must be countersunk, round, keyholes, lock screws or none');
  }
  if (!(m.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (!(m.standoffHeightMm >= 0)) throw new RangeError('The standoffs cannot be less than 0 mm tall');
  if (typeof m.lockScrews !== 'boolean') throw new RangeError('Lock screws must be on or off');
  if (!(m.lockScrewMm > 0)) throw new RangeError('The lock screw size must be more than 0 mm');
  return m;
}

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
  return Math.max(keyholeSeat(m.screwMm).depthMm + MIN_BEHIND_CHANNEL_MM + HOOK_ROOM_MM, m.lockScrews ? underLock : 0);
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

/** What each of a board's screws passes (D264): the board, and its standoffs when it has them; a keyhole's screw
 * stands in the wall instead, and a lock screw passes what the standoff leaves under its head. Between the slots,
 * which corners keep a screw, of the `cornerScrews` its sides leave it (D289 a). Refuses, as the build does, standoffs
 * too short for keyholes or lock screws, where a lock screw would pass less than nothing (Q9). */
export function mountingScrews(m: MountingParams, thicknessMm: number, cornerScrews = 4): string | undefined {
  if (m.screwHead === 'none') return undefined;
  checkStandoffs(m);
  if (m.screwHead === 'lock') {
    const under = m.standoffHeightMm - HOOK_ROOM_MM - lockRecessMm(m.lockScrewMm);
    return `Each lock screw passes ${nice(under)} mm of standoff under its head, plus your wall plug.`;
  }
  if (m.screwHead !== 'keyhole' && cornerScrews === 0) {
    return (
      'No corner has a screw: each is on a side between the slots, where a screw would land on a slot. Keyholes hold ' +
      'such a board.'
    );
  }
  if (m.screwHead !== 'keyhole' && cornerScrews < 4) {
    const only =
      cornerScrews === 1
        ? 'Only the corner whose sides are both closed has a screw.'
        : `Only the ${cornerScrews} corners whose sides are both closed have a screw.`;
    return `${only} ${mountingScrews(m, thicknessMm) ?? ''}`;
  }
  if (m.screwHead === 'keyhole') {
    const under = m.standoffHeightMm - HOOK_ROOM_MM - lockRecessMm(m.lockScrewMm);
    const lock = m.lockScrews
      ? ` Each lock screw passes ${nice(under)} mm of standoff under its head, plus your wall plug.`
      : '';
    return keyholeScrews('Each keyhole', m.screwMm) + lock;
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
  Partial<Pick<SolidBoardParams, 'sides' | 'seams' | 'slotClearanceMm' | 'slotChamferMm'>> & { frameMm?: number };

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
/** Whether a side of the board runs between the slots (D282). */
const runsBetween = (b: MountingBoard, side: Side) => b.seams === 'between' && (b.sides ?? ALL_OPEN)[side] === 'open';

/** The screw holes' centres: one in each corner tile, 10 mm in from both edges (D73), but at a corner one of whose sides
 * runs between the slots, where it would land on a slot (D289 a). Bottom left, bottom right, top left, top right. */
export function screwPlaces(board: MountingBoard): readonly (readonly [number, number])[] {
  const [e, i] = [extentOfBoard(board), SCREW_INSET_MM];
  const corners: [number, number, Side, Side][] = [
    [e.x0 + i, e.y0 + i, 'left', 'bottom'],
    [e.x1 - i, e.y0 + i, 'right', 'bottom'],
    [e.x0 + i, e.y1 - i, 'left', 'top'],
    [e.x1 - i, e.y1 - i, 'right', 'top'],
  ];
  return corners.filter(([, , a, b]) => !runsBetween(board, a) && !runsBetween(board, b)).map(([x, y]) => [x, y]);
}

/** How far a pad that nothing may be cut from reaches past a screw's countersink, all round (D144; C83's margin). */
export const PAD_MARGIN_MM = 2;

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

/** The screw a standoff behind a slot is sized for: the keyhole's, or for lock screws alone, which have no such screw,
 * a 4 mm screw's (D289). */
const standoffScrewOf = (m: MountingParams) => (m.screwHead === 'lock' ? MOUNTING_DEFAULTS.screwMm : m.screwMm);
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
    const entry = keyhole(m.screwMm).entryMm;
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
  if (m.screwHead !== 'keyhole' && m.screwHead !== 'lock')
    return screwPlaces(board).map(([x, y]) => circle(x, y, padMm));
  const grow = standoffGrowMm(m, board);
  if (grow === undefined || board.frameMm === undefined || grow <= board.frameMm - FRAME_INSET_MM + 1e-9) return [];
  if (board.rows < 2 || board.columns < 2) return []; // refused by mountingCuts
  const [screwMm, outline] = [standoffScrewOf(m), standoffOutline(m, board)];
  const slot = slotOf(board);
  return [...keyholePlaces(board, screwMm, outline), ...bottomSlotPlaces(board, screwMm, outline)].map(([x, y]) =>
    stadium(x, y, slot.widthMm, slot.heightMm, grow + FRAME_INSET_MM),
  );
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

/**
 * The room a hook takes behind the slot whose middle is at (x, y) (D244), which the standoff behind it leaves empty:
 * hookRoomOutline from HOOK_ROOM_MM behind the board's back to past its middle; and under its ceiling over the hook's
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
  const tall = outline.extrude(HOOK_ROOM_MM + board.thicknessMm / 2 + 1);
  const room = tall.translate([0, 0, -HOOK_ROOM_MM]);
  tall.delete();
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
  const behindSlots = keyholes || locked;
  const what = keyholes ? 'Keyholes' : 'Lock screws';
  // the standoffs behind the slots: on a lattice board the frame round the slot (D306); on the solid board a keyhole's
  // and its walls (D237), sized from its screw, or for lock screws alone, which have no such screw, a 4 mm screw's
  const [standoffScrewMm, outline] = [standoffScrewOf(m), standoffOutline(m, board)];
  const recessMm = lockRecessMm(m.lockScrewMm);
  checkStandoffs(m);
  if (behindSlots && (board.rows < 2 || board.columns < 2)) {
    throw new RangeError(
      `${what} need a board at least ${2 * TILE_MM} x ${2 * TILE_MM} mm: on one tile, the top standoffs would ` +
        'meet the bottom ones or each other',
    );
  }
  const [tops, bottoms] = behindSlots
    ? [keyholePlaces(board, standoffScrewMm, outline), bottomSlotPlaces(board, standoffScrewMm, outline)]
    : [[], []];
  if (behindSlots && standoffsMeet([...tops, ...bottoms], outline)) {
    throw new RangeError(
      `${what} need a larger board: between the slots, two of its standoffs would meet, behind the slots nearest ` +
        'its corners; open a side, or make it a tile larger',
    );
  }
  const countersunk = m.screwHead === 'countersunk';
  if (countersunk && t - depth < MIN_PLAIN_HOLE_MM) {
    throw new SettingsProblem(
      `A countersunk ${nice(m.screwMm)} mm screw needs a board at least ${nice(depth + MIN_PLAIN_HOLE_MM)} mm ` +
        'thick; choose a round head or a smaller screw',
      ['thicknessMm'],
    );
  }
  const bore = sunkRound(m, t); // a round head sunk in a counterbore, flush with the front (D279)
  const places = screwPlaces(board);
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
  // to pass the slot gets a groove, the recess carried on up through the slot's sides (A248).
  const lockScrew = (engine: Engine, [x, y]: readonly [number, number]): Manifold[] => {
    const floor = -HOOK_ROOM_MM - recessMm;
    const shank = ringedSolid(engine, (grow) => circle(x, y, m.lockScrewMm + 0.5, grow), [
      [-m.standoffHeightMm - 1, 0],
      [floor + 0.5, 0],
    ]);
    const recess = ringedSolid(engine, (grow) => circle(x, y, lockRecessAcross(m.lockScrewMm), grow), [
      [floor, 0],
      [grooved(m.lockScrewMm) ? t + 1 : -HOOK_ROOM_MM + 0.5, 0],
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
      ...tops.map((p) => wallKeyholeCutter(engine, p, m.screwMm, -m.standoffHeightMm)),
    ];
  } else if (m.screwHead !== 'none') {
    cuts.extraCutters = (engine: Engine): Manifold[] => places.map((p) => hole(engine, p));
  }
  if (m.standoffHeightMm > 0) {
    // From the standoff's foot into the middle of the plate, so the two overlap rather than touch; its foot, at the
    // wall, chamfered as every part's outer edge is (D276).
    const foot = Math.min(EDGE_CHAMFER_MM, m.standoffHeightMm / 2);
    const post: [number, number][] = [
      [-m.standoffHeightMm, -foot],
      [-m.standoffHeightMm + foot, 0],
      [t / 2, 0],
    ];
    // its points half a step round, off the diagonal on which a rounded corner's chamfer has its own: where a post
    // stands past that chamfer, at a 20 mm corner and a 5 mm screw, the two met on one line and left two facets of
    // no area in the printed part (D276)
    const round = (engine: Engine, [x, y]: readonly [number, number]) =>
      ringedSolid(engine, (grow) => circle(x, y, standoffDiameterMm, grow, HALF_STEP), post);
    // with keyholes or lock screws alone, the standoffs behind the slots: the frame's outline on a lattice board (D306),
    // the keyhole and its walls on the solid board (D244)
    // The standoff from its foot into the plate, less the hook's room from the room's ceiling up past the standoff's
    // top, taken out before the standoff joins the plate: the plate fills the room's top, so it stops at the board's
    // back face and never cuts the plate. Two prisms joined round the room instead shared their outer walls where
    // they overlapped and left degenerate facets (D244, D245).
    const pad = (engine: Engine, place: readonly [number, number]) => {
      const section = new engine.CrossSection([outline(place)]);
      const tall = chamferedExtrusion(engine, section, m.standoffHeightMm + t / 2, { bottomMm: foot, topMm: 0 });
      const whole = tall.translate([0, 0, -m.standoffHeightMm]);
      const room = hookRoomCutter(engine, place, board, standoffScrewMm);
      const solid = whole.subtract(room);
      for (const s of [tall, whole, room]) s.delete();
      section.delete();
      return solid;
    };
    cuts.extraSolids = (engine: Engine): Manifold[] =>
      behindSlots
        ? [
            // at the bottom, behind the corner slots as at the top (D245), the lock screws through them (A248)
            ...bottoms.map((p) => pad(engine, p)),
            ...tops.map((p) => pad(engine, p)),
          ]
        : places.map((p) => round(engine, p));
  }
  return cuts;
}

/** The screw's size, one setting shared by every part a screw goes through, so they cannot drift apart. */
export const SCREW_SIZE_SETTING = {
  kind: 'number',
  key: 'screwMm',
  label: 'Screw size',
  unit: 'mm',
  default: MOUNTING_DEFAULTS.screwMm,
  min: 3,
  max: 5,
  step: 0.5,
  help: "The screw's diameter. The hole is 0.5 mm wider; a countersink is twice the screw plus 1 mm across.",
  advanced: true,
} as const satisfies NumberSetting;

/** The mounting's settings, as a board type lists them after its own (D48: the fine ones under Advanced). */
export const MOUNTING_SETTINGS = defineSettings([
  {
    kind: 'choice',
    key: 'screwHead',
    label: 'Screw holes',
    options: [
      { value: 'countersunk', label: 'Countersunk' },
      { value: 'round', label: 'Round head' },
      { value: 'keyhole', label: 'Keyholes' },
      { value: 'lock', label: 'Lock screws' },
      { value: 'none', label: 'None' },
    ],
    default: MOUNTING_DEFAULTS.screwHead,
    help:
      'One in each corner, 10 mm in from both edges. A countersunk head keeps the front flat, and a round head is sunk ' +
      'in a counterbore, flush too, where the board leaves 1 mm under it. Keyholes, ' +
      'in the top two standoffs, behind the top corner slots, let the board drop onto two countersunk screws ' +
      'standing about 4 mm out of the wall and lift off them; the front stays plain, and hooks still fit those slots. ' +
      'Lock screws, one through a slot at each corner into the standoff behind it, head and all, hold the board ' +
      'without keyholes; every slot still takes a hook.',
  },
  {
    kind: 'choice',
    key: 'standoffs',
    label: 'Standoffs',
    options: [
      { value: 'none', label: 'None' },
      { value: 'back', label: 'On the back' },
    ],
    default: 'none',
    help:
      'Posts on the back at the corners, round the screws, that hold the board off the wall so hooks have room. ' +
      'Keyholes and lock screws need them.',
  },
  SCREW_SIZE_SETTING,
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
  },
  {
    kind: 'number',
    key: 'lockScrewMm',
    label: 'Lock screw size',
    unit: 'mm',
    default: MOUNTING_DEFAULTS.lockScrewMm,
    min: 2,
    max: 5,
    step: 0.5,
    help:
      'For lock screws: their size. A pan head up to 5 mm across, about a 2.5 mm screw, passes through the slot; ' +
      "a larger one gets a groove cut in the slot's sides to pass.",
    advanced: true,
  },
  {
    kind: 'number',
    key: 'standoffHeightMm',
    label: 'Standoff height',
    unit: 'mm',
    default: STANDOFF_DEFAULT_MM,
    min: 3,
    max: 40,
    step: 0.5,
    help: "How far the standoffs hold the board off the wall: 15 mm unless set; IKEA's spacers hold it about 20 mm off.",
    advanced: true,
  },
]);

type MountingValues = Values<typeof MOUNTING_SETTINGS>;

/** The mounting a board type's values ask for. */
export function mountingOf(v: MountingValues): MountingParams {
  return mountingParams({
    screwHead: v.screwHead,
    screwMm: v.screwMm,
    standoffHeightMm: v.standoffs === 'back' ? v.standoffHeightMm : 0,
    lockScrews: v.lockScrews === 'bottom',
    lockScrewMm: v.lockScrewMm,
  });
}

/** The end of a file name: only what differs from the starting mounting, so a plain name keeps its meaning (C85). */
export function mountingLabel(v: MountingValues): string {
  const parts: string[] = [];
  if (v.screwHead === 'round') parts.push('round-head');
  if (v.screwHead === 'none') parts.push('no-holes');
  if (v.screwHead === 'keyhole') parts.push(v.lockScrews === 'bottom' ? 'keyholes-lock-screws' : 'keyholes');
  if (v.screwHead === 'lock') parts.push('lock-screws');
  const locks = v.screwHead === 'lock' || (v.screwHead === 'keyhole' && v.lockScrews === 'bottom');
  if (locks && v.lockScrewMm !== MOUNTING_DEFAULTS.lockScrewMm) parts.push(`${v.lockScrewMm}mm`);
  // the screw size names the corner screws or the keyholes', which lock screws alone have none of
  if (v.screwHead !== 'none' && v.screwHead !== 'lock' && v.screwMm !== MOUNTING_DEFAULTS.screwMm) {
    parts.push(`screw-${v.screwMm}mm`);
  }
  if (v.standoffs === 'back') parts.push(`standoffs-${v.standoffHeightMm}mm`);
  return parts.map((p) => `-${p}`).join('');
}
