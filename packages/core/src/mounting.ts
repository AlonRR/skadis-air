// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, between the corner and the first slot, where no slot reaches whether the sides are open or
// closed; countersunk at the front by default, or plain for a round head; and, as an option, standoffs
// on the back round the holes, which hold the board off the wall so hooks have room. A board prints
// face down (D66), so a countersink is a 45 degree overhang at the bed and the standoffs print on top.
// Or keyholes at the top two corners (backlog item mounting-ikea; D155 to D157), so the board drops onto
// two screws and lifts off them, with countersunk lock screws at the bottom as an option. A board on keyholes
// stands on standoffs, so a hook has room behind it (backlog item keyhole-pads; D190): the keyhole's slot runs
// on up through each top standoff, open at its foot, and the screw rests in it along the standoff's length.
// Any board type built on the solid board takes these as its third argument (BoardCuts).
import type { Manifold, Vec2 } from 'manifold-3d';
import type { BoardCuts, SolidBoardParams } from './board-solid.js';
import type { Engine } from './engine.js';
import { circle, ringedSolid, stadium } from './rings.js';
import { defineSettings, type NumberSetting, type Values } from './settings.js';
import { HOOK_DEPTH_MM, TILE_MM } from './skadis.js';

export type ScrewHead = 'countersunk' | 'round' | 'keyhole' | 'none';

export interface MountingParams {
  screwHead: ScrewHead; // D74; keyholes at the top two corners (D156)
  screwMm: number; // the screw's diameter, 4 mm unless set (D76)
  standoffHeightMm: number; // how far the standoffs stand behind the board; 0 for none (D75)
  lockScrews: boolean; // with keyholes: countersunk holes at the bottom two corners too (D156)
}

export const MOUNTING_DEFAULTS: MountingParams = {
  screwHead: 'countersunk',
  screwMm: 4,
  standoffHeightMm: 0,
  lockScrews: false,
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

/**
 * The outlines a lightened board keeps solid round the mounting (D144, D158): round each screw hole or standoff,
 * the countersink and 2 mm all round, 13 mm across for a 4 mm screw, which also covers the standoff; round a
 * keyhole, the whole keyhole and 2 mm. None where there is neither a hole nor a standoff.
 */
export function mountingPads(m: MountingParams, board: Pick<SolidBoardParams, 'columns' | 'rows'>): Vec2[][] {
  if (m.screwHead === 'none' && m.standoffHeightMm === 0) return [];
  const padMm = screwHole(m.screwMm).countersinkMm + 2 * PAD_MARGIN_MM;
  const [bottom, top] = [screwPlaces(board).slice(0, 2), screwPlaces(board).slice(2)];
  if (m.screwHead !== 'keyhole') return [...bottom, ...top].map(([x, y]) => circle(x, y, padMm));
  const k = keyhole(m.screwMm);
  const pad = 2 * PAD_MARGIN_MM;
  // at the bottom, a pad for a lock screw or a standoff (D190)
  return [
    ...(m.lockScrews || m.standoffHeightMm > 0 ? bottom.map(([x, y]) => circle(x, y, padMm)) : []),
    ...top.map(([x, y]) => stadium(x, y - k.slideMm / 2, k.entryMm + pad, k.slideMm + k.entryMm + pad)),
  ];
}

/**
 * One keyhole's cutter, the screw resting at (x, y): behind the channel the entry and the slot up to the screw,
 * through the back and on through the standoff from `footZ` (D190); in front, the channel the head slides in,
 * from the entry up past the screw. Two prisms stacked, which meet on one plane rather than overlapping, so no
 * two walls lie on each other.
 */
function keyholeCutter(engine: Engine, x: number, y: number, screwMm: number, t: number, footZ: number): Manifold {
  const { CrossSection } = engine;
  const k = keyhole(screwMm);
  const middle = y - k.slideMm / 2;
  const behind = new CrossSection(
    [circle(x, y - k.slideMm, k.entryMm), stadium(x, middle, k.slotMm, k.slideMm + k.slotMm)],
    'NonZero',
  );
  const channel = new CrossSection([stadium(x, middle, k.entryMm, k.slideMm + k.entryMm)], 'Positive');
  const zc = t - k.channelMm;
  const made = [behind, channel];
  const back = behind.extrude(zc - footZ);
  const front = channel.extrude(k.channelMm + 1);
  const [low, high] = [back.translate([0, 0, footZ]), front.translate([0, 0, zc])];
  const cutter = engine.Manifold.union(low, high);
  for (const m of [back, front, low, high]) m.delete();
  for (const c of made) c.delete();
  return cutter;
}

/** What the mounting adds to and cuts from a board of this size: BoardCuts for makeSolidBoard. */
export function mountingCuts(
  m: MountingParams,
  board: Pick<SolidBoardParams, 'columns' | 'rows' | 'thicknessMm'>,
): BoardCuts {
  const t = board.thicknessMm;
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(m.screwMm);
  const depth = (countersinkMm - holeMm) / 2; // 45 degree walls
  const keyholes = m.screwHead === 'keyhole';
  if (keyholes && m.standoffHeightMm < MIN_KEYHOLE_STANDOFF_MM) {
    throw new RangeError(
      'Keyholes stand the board off the wall, so a hook has room behind it: choose standoffs at least ' +
        `${MIN_KEYHOLE_STANDOFF_MM} mm tall`,
    );
  }
  const channelMm = keyhole(m.screwMm).channelMm;
  if (keyholes && t - channelMm < MIN_BEHIND_CHANNEL_MM - 1e-9) {
    throw new RangeError(
      `Keyholes for a ${nice(m.screwMm)} mm screw need a board at least ${nice(channelMm + MIN_BEHIND_CHANNEL_MM)} ` +
        'mm thick; choose a smaller screw or other screw holes',
    );
  }
  const countersunk = m.screwHead === 'countersunk' || (keyholes && m.lockScrews);
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
  if (keyholes) {
    // the bottom two only with lock screws; the top two are keyholes, the screw resting where a hole would be
    cuts.extraCutters = (engine: Engine): Manifold[] => [
      ...(m.lockScrews ? places.slice(0, 2).map((p) => hole(engine, p)) : []),
      ...places.slice(2).map(([x, y]) => keyholeCutter(engine, x, y, m.screwMm, t, back)),
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
    cuts.extraSolids = (engine: Engine): Manifold[] =>
      places.map(([x, y]) => ringedSolid(engine, (grow) => circle(x, y, standoffDiameterMm, grow), post));
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
      'in the top two corners, let the board drop onto two pan-head screws and lift off them; they stand ' +
      'on standoffs, so a hook has room behind the board.',
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
    help: 'With keyholes: countersunk holes in the bottom two corners too, for screws that hold the board in place.',
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
  });
}

/** The end of a file name: only what differs from the starting mounting, so a plain name keeps its meaning (C85). */
export function mountingLabel(v: MountingValues): string {
  const parts: string[] = [];
  if (v.screwHead === 'round') parts.push('round-head');
  if (v.screwHead === 'none') parts.push('no-holes');
  if (v.screwHead === 'keyhole') parts.push(v.lockScrews === 'bottom' ? 'keyholes-lock-screws' : 'keyholes');
  if (v.screwHead !== 'none' && v.screwMm !== MOUNTING_DEFAULTS.screwMm) parts.push(`screw-${v.screwMm}mm`);
  if (v.standoffs === 'back') parts.push(`standoffs-${v.standoffHeightMm}mm`);
  return parts.map((p) => `-${p}`).join('');
}
