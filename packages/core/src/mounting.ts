// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, between the corner and the first slot, where no slot reaches whether the sides are open or
// closed; countersunk at the front by default, or plain for a round head; and, as an option, standoffs
// on the back round the holes, which hold the board off the wall so hooks have room. A board prints
// face down (D66), so a countersink is a 45 degree overhang at the bed and the standoffs print on top.
// Or keyholes at the top two corners (backlog item mounting-ikea; D156, D157), so the board drops onto two
// screws and lifts off them, with countersunk lock screws at the bottom as an option. A board on keyholes
// stands on standoffs, so a hook has room behind it (D190), and the keyholes are cut in the top two standoffs'
// wall faces, the head sliding behind lips there as on the slot clip, the board's face left plain (D235); each
// top standoff is the keyhole and its walls, behind its corner tile's centre slot, as IKEA's spacer stands behind
// a slot, with a pocket that leaves a hook its room behind that slot (D244).
// Any board type built on the solid board takes these as its third argument (BoardCuts).
import type { CrossSection, Manifold, Vec2 } from 'manifold-3d';
import { type BoardCuts, SOLID_BOARD_DEFAULTS, type SolidBoardParams } from './board-solid.js';
import type { Engine } from './engine.js';
import { circle, ringedSolid, stadium } from './rings.js';
import { defineSettings, type NumberSetting, type Values } from './settings.js';
import { HOOK_DEPTH_MM, HOOK_DROP_MM, HOOK_WIDTH_MM, SLOT_HEIGHT_MM, SLOT_WIDTH_MM, TILE_MM } from './skadis.js';

export type ScrewHead = 'countersunk' | 'round' | 'keyhole' | 'none';

export interface MountingParams {
  screwHead: ScrewHead; // D74; keyholes at the top two corners (D156)
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
const HEADS: ReadonlySet<string> = new Set(['countersunk', 'round', 'keyhole', 'none']);
/** What a keyhole leaves behind its channel (D157): about three lines of a 0.4 mm nozzle. */
export const MIN_BEHIND_CHANNEL_MM = 1.2;
/** The least standoff a board on keyholes stands on: the room a hook takes behind it and C99's margin (D190). */
export const MIN_KEYHOLE_STANDOFF_MM = HOOK_DEPTH_MM + 2;
/** The lips a keyhole's head slides behind, at the wall face of the part it is cut in (C199, D235). */
export const KEYHOLE_LIPS_MM = 1.5;
/** A keyhole standoff's wall round its keyhole (D244): 15 x 24 mm for a 4 mm screw, which leaves about 2 mm round
 * the hook's room behind the slot. */
const KEYHOLE_WALL_MM = 3;
/** The room a hook takes behind a board, C99's margin and all (D190): its back tab's depth and 2 mm. */
const HOOK_ROOM_MM = HOOK_DEPTH_MM + 2;
/** The widest head that passes through a slot, mm: a larger lock screw's head gets a groove in the slot (A248). */
const HEAD_THROUGH_SLOT_MM = 5;
/** What a lock screw's head and shank are given round them, mm, and the standoff left under its head. */
const HEAD_ROOM_MM = 0.4;
const GROOVE_ROOM_MM = 0.5;
const UNDER_HEAD_MM = 2;

/** A lock screw's pan head (D157's proportions): twice the screw across, 0.8 times it tall. */
const lockHead = (lockScrewMm: number) => ({ acrossMm: 2 * lockScrewMm, tallMm: 0.8 * lockScrewMm });

/** A screw's hole, its 90 degree countersink across the front, and the standoff round it (C83). */
export function screwHole(screwMm: number): { holeMm: number; countersinkMm: number; standoffDiameterMm: number } {
  const holeMm = screwMm + 0.5;
  return { holeMm, countersinkMm: 2 * screwMm + 1, standoffDiameterMm: holeMm + 5.5 };
}

/**
 * A keyhole for a pan-head screw (D157): the head twice the screw across and 0.8 times it tall (8 and 3.2 mm for
 * a 4 mm screw; ISO 7045 gives 8 mm and 3.1 to 3.25 mm, as vendors list it). The entry is 1 mm wider than the
 * head, the slide from the entry's centre up to the resting screw as long as the entry, the slot the screw's
 * hole, and the channel from the front the head's height and 0.3 mm (D155).
 */
export function keyhole(screwMm: number): { slotMm: number; entryMm: number; slideMm: number; channelMm: number } {
  const entryMm = 2 * screwMm + 1;
  return { slotMm: screwHole(screwMm).holeMm, entryMm, slideMm: entryMm, channelMm: 0.8 * screwMm + 0.3 };
}

/** The mounting asked for, with the starting values filled in, refused when it cannot be made. */
export function mountingParams(given: Partial<MountingParams>): MountingParams {
  const m: MountingParams = { ...MOUNTING_DEFAULTS, ...given };
  if (!HEADS.has(m.screwHead)) throw new RangeError('The screw holes must be countersunk, round or none');
  if (!(m.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (!(m.standoffHeightMm >= 0)) throw new RangeError('The standoffs cannot be less than 0 mm tall');
  if (typeof m.lockScrews !== 'boolean') throw new RangeError('Lock screws must be on or off');
  if (!(m.lockScrewMm > 0)) throw new RangeError('The lock screw size must be more than 0 mm');
  return m;
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** The four screw holes' centres on a board of this size: one in each corner tile (D73). */
export function screwPlaces(board: Pick<SolidBoardParams, 'columns' | 'rows'>): readonly (readonly [number, number])[] {
  const [width, height, i] = [TILE_MM * board.columns, TILE_MM * board.rows, SCREW_INSET_MM];
  return [
    [i, i],
    [width - i, i],
    [i, height - i],
    [width - i, height - i],
  ];
}

/** How far a pad that nothing may be cut from reaches past a screw's countersink, all round (D144; C83's margin). */
export const PAD_MARGIN_MM = 2;

/** The middles of a board's two keyholes: its top corner tiles' centre slots, which the standoffs stand behind,
 * 11.25 mm clear of every other slot and hook where panels meet (D244). */
export function keyholePlaces(
  board: Pick<SolidBoardParams, 'columns' | 'rows'>,
): readonly (readonly [number, number])[] {
  const [width, height] = [TILE_MM * board.columns, TILE_MM * board.rows];
  return [
    [TILE_MM / 2, height - TILE_MM / 2],
    [width - TILE_MM / 2, height - TILE_MM / 2],
  ];
}

/** The middles of a board's bottom corner tiles' centre slots, which a board on keyholes stands behind at the
 * bottom too, unless lock screws hold it there (D245). */
export function bottomSlotPlaces(
  board: Pick<SolidBoardParams, 'columns' | 'rows'>,
): readonly (readonly [number, number])[] {
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

/**
 * The outlines a lightened board keeps solid round the mounting (D144, D158): round each screw hole or standoff,
 * the countersink and 2 mm all round, 13 mm across for a 4 mm screw, which also covers the standoff; with keyholes,
 * each top standoff's outline and 1 mm round it (D237), so a pocket's wall and the standoff's do not lie on one
 * another, which left 92 degenerate facets. None where there is neither a hole nor a standoff.
 */
export function mountingPads(m: MountingParams, board: Pick<SolidBoardParams, 'columns' | 'rows'>): Vec2[][] {
  if (m.screwHead === 'none' && m.standoffHeightMm === 0) return [];
  const padMm = screwHole(m.screwMm).countersinkMm + 2 * PAD_MARGIN_MM;
  const [bottom, top] = [screwPlaces(board).slice(0, 2), screwPlaces(board).slice(2)];
  if (m.screwHead !== 'keyhole') return [...bottom, ...top].map(([x, y]) => circle(x, y, padMm));
  // at the bottom, a pad for a lock screw in the corner, or for a standoff behind the corner slot (D190, D245)
  // behind the bottom corner slots, lock screws or not (D245, A248)
  const lowPads =
    m.standoffHeightMm > 0 || m.lockScrews
      ? bottomSlotPlaces(board).map((place) => keyholePad(m.screwMm, place, 1))
      : [];
  return [...lowPads, ...keyholePlaces(board).map((place) => keyholePad(m.screwMm, place, 1))];
}

/**
 * A keyhole in a part's wall face, at z = footZ, its middle at (x, y) (C199, D235): through the lips, the entry the
 * head goes in by and the slot the screw slides up, to where it rests at the top; behind them the head's channel,
 * as wide as the entry, from the entry up past the screw. The slot clip and a board's top standoffs share it. Two
 * prisms stacked, which meet on one plane rather than overlapping, so no two walls lie on each other.
 */
export function wallKeyholeCutter(
  engine: Engine,
  [x, y]: readonly [number, number],
  screwMm: number,
  footZ = 0,
): Manifold {
  const { CrossSection, Manifold } = engine;
  const k = keyhole(screwMm);
  const [entry, rest] = [y - k.slideMm / 2, y + k.slideMm / 2]; // the screw rests at the top, as the part hangs
  const lips = new CrossSection(
    [circle(x, entry, k.entryMm), stadium(x, y, k.slotMm, k.slideMm + k.slotMm)],
    'NonZero',
  );
  const channel = new CrossSection([stadium(x, y, k.entryMm, rest - entry + k.entryMm)], 'Positive');
  const [back, front] = [lips.extrude(KEYHOLE_LIPS_MM + 1), channel.extrude(k.channelMm)];
  const [low, high] = [back.translate([0, 0, footZ - 1]), front.translate([0, 0, footZ + KEYHOLE_LIPS_MM])];
  const cutter = Manifold.union(low, high);
  for (const m of [back, front, low, high]) m.delete();
  for (const c of [lips, channel]) c.delete();
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
  return new CrossSection([stadium(x, y, slot.widthMm, slot.heightMm, slot.chamferMm + 1.5), tab], 'NonZero');
}

/** What the mounting adds to and cuts from a board of this size: BoardCuts for makeSolidBoard. */
export function mountingCuts(
  m: MountingParams,
  board: Pick<SolidBoardParams, 'columns' | 'rows' | 'thicknessMm'> &
    Partial<Pick<SolidBoardParams, 'slotClearanceMm' | 'slotChamferMm'>>,
): BoardCuts {
  const t = board.thicknessMm;
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(m.screwMm);
  const depth = (countersinkMm - holeMm) / 2; // 45 degree walls
  const keyholes = m.screwHead === 'keyhole';
  // the lips, the head's channel and a roof over it, then a hook's room behind the slot in front (D235, D244); a
  // lock screw's head in its recess behind the room, and some standoff under it (A248)
  const head = lockHead(m.lockScrewMm);
  const recessMm = head.tallMm + 0.3;
  const leastStandoff = Math.max(
    KEYHOLE_LIPS_MM + keyhole(m.screwMm).channelMm + MIN_BEHIND_CHANNEL_MM + HOOK_ROOM_MM,
    m.lockScrews ? HOOK_ROOM_MM + recessMm + UNDER_HEAD_MM : 0,
  );
  if (keyholes && m.standoffHeightMm < leastStandoff - 1e-9) {
    throw new RangeError(
      "Keyholes stand the board off the wall, with a hook's room behind the slot in front of each: choose " +
        `standoffs at least ${nice(leastStandoff)} mm tall`,
    );
  }
  if (keyholes && (board.rows < 2 || board.columns < 2)) {
    throw new RangeError(
      `Keyholes need a board at least ${2 * TILE_MM} x ${2 * TILE_MM} mm: on one tile, the keyhole standoffs would ` +
        'meet the bottom ones or each other',
    );
  }
  const countersunk = m.screwHead === 'countersunk';
  if (countersunk && t - depth < MIN_PLAIN_HOLE_MM) {
    throw new RangeError(
      `A countersunk ${nice(m.screwMm)} mm screw needs a board at least ${nice(depth + MIN_PLAIN_HOLE_MM)} mm ` +
        'thick; choose a round head or a smaller screw',
    );
  }
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
  const cuts: BoardCuts = {};
  const hole = (engine: Engine, [x, y]: readonly [number, number]) =>
    ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), levels);
  // the slot as this board cuts it, for the hook's room behind the slots the keyhole standoffs stand behind
  const clearance = board.slotClearanceMm ?? SOLID_BOARD_DEFAULTS.slotClearanceMm;
  const slot = {
    widthMm: SLOT_WIDTH_MM + clearance,
    heightMm: SLOT_HEIGHT_MM + clearance,
    chamferMm: board.slotChamferMm ?? SOLID_BOARD_DEFAULTS.slotChamferMm,
  };
  if (keyholes) {
    // A lock screw goes in through its bottom corner slot, head and all: its shank's hole from the wall up through
    // the standoff, and its head in a recess just behind the hook's room, so the slot still takes a hook; a head
    // too wide to pass the slot gets a groove, the recess carried on up through the slot's sides (A248).
    const lockScrew = (engine: Engine, [x, y]: readonly [number, number]): Manifold[] => {
      const floor = -HOOK_ROOM_MM - recessMm;
      const shank = ringedSolid(engine, (grow) => circle(x, y, m.lockScrewMm + 0.5, grow), [
        [-m.standoffHeightMm - 1, 0],
        [floor + 0.5, 0],
      ]);
      const grooved = head.acrossMm > HEAD_THROUGH_SLOT_MM;
      const across = head.acrossMm + (grooved ? GROOVE_ROOM_MM : HEAD_ROOM_MM);
      const recess = ringedSolid(engine, (grow) => circle(x, y, across, grow), [
        [floor, 0],
        [grooved ? t + 1 : -HOOK_ROOM_MM + 0.5, 0],
      ]);
      return [shank, recess];
    };
    // the keyholes in the top standoffs' wall faces (D235, D244); lock screws through the bottom slots (A248)
    cuts.extraCutters = (engine: Engine): Manifold[] => [
      ...(m.lockScrews ? bottomSlotPlaces(board).flatMap((p) => lockScrew(engine, p)) : []),
      ...keyholePlaces(board).map((p) => wallKeyholeCutter(engine, p, m.screwMm, -m.standoffHeightMm)),
    ];
  } else if (m.screwHead !== 'none') {
    cuts.extraCutters = (engine: Engine): Manifold[] => places.map((p) => hole(engine, p));
  }
  if (m.standoffHeightMm > 0) {
    // From the standoff's foot into the middle of the plate, so the two overlap rather than touch.
    const post: [number, number][] = [
      [-m.standoffHeightMm, 0],
      [t / 2, 0],
    ];
    const round = (engine: Engine, [x, y]: readonly [number, number]) =>
      ringedSolid(engine, (grow) => circle(x, y, standoffDiameterMm, grow), post);
    // with keyholes, the top two are the keyholes' standoffs, the keyhole and its walls (D244)
    // The standoff from its foot into the plate, less the hook's room from the room's ceiling up past the standoff's
    // top, taken out before the standoff joins the plate: the plate fills the room's top, so it stops at the board's
    // back face and never cuts the plate. Two prisms joined round the room instead shared their outer walls where
    // they overlapped and left degenerate facets (D244, D245).
    const pad = (engine: Engine, place: readonly [number, number]) => {
      const outline = new engine.CrossSection([keyholePad(m.screwMm, place)]);
      const roomOutline = hookRoomOutline(engine, place, slot);
      const tall = outline.extrude(m.standoffHeightMm + t / 2);
      const roomTall = roomOutline.extrude(HOOK_ROOM_MM + t / 2 + 1);
      const whole = tall.translate([0, 0, -m.standoffHeightMm]);
      const room = roomTall.translate([0, 0, -HOOK_ROOM_MM]);
      const solid = whole.subtract(room);
      for (const s of [tall, roomTall, whole, room]) s.delete();
      for (const c of [outline, roomOutline]) c.delete();
      return solid;
    };
    cuts.extraSolids = (engine: Engine): Manifold[] =>
      keyholes
        ? [
            // at the bottom, behind the corner slots as at the top (D245), the lock screws through them (A248)
            ...bottomSlotPlaces(board).map((p) => pad(engine, p)),
            ...keyholePlaces(board).map((p) => pad(engine, p)),
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
      { value: 'none', label: 'None' },
    ],
    default: MOUNTING_DEFAULTS.screwHead,
    help:
      'One in each corner, 10 mm in from both edges. A countersunk head keeps the front flat. Keyholes, ' +
      'in the top two standoffs, behind the top corner slots, let the board drop onto two pan-head screws ' +
      'standing about 5 mm out of the wall and lift off them; the front stays plain, and hooks still fit those slots.',
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
      'Keyholes need them.',
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
      'With lock screws: their size. A pan head up to 5 mm across, about a 2.5 mm screw, passes through the slot; ' +
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
  if (v.screwHead === 'keyhole' && v.lockScrews === 'bottom' && v.lockScrewMm !== MOUNTING_DEFAULTS.lockScrewMm) {
    parts.push(`${v.lockScrewMm}mm`);
  }
  if (v.screwHead !== 'none' && v.screwMm !== MOUNTING_DEFAULTS.screwMm) parts.push(`screw-${v.screwMm}mm`);
  if (v.standoffs === 'back') parts.push(`standoffs-${v.standoffHeightMm}mm`);
  return parts.map((p) => `-${p}`).join('');
}
