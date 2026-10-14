// Mounting (backlog item mounting; D73 to D75): a screw hole in each corner tile, 10 mm in from both
// edges, between the corner and the first slot, where no slot reaches whether the sides are open or
// closed; countersunk at the front by default, or plain for a round head; and, as an option, standoffs
// on the back round the holes, which hold the board off the wall so hooks have room. A board prints
// face down (D66), so a countersink is a 45 degree overhang at the bed and the standoffs print on top.
// Any board type built on the solid board takes these as its third argument (BoardCuts).
import type { Manifold } from 'manifold-3d';
import type { BoardCuts, SolidBoardParams } from './board-solid.js';
import type { Engine } from './engine.js';
import { circle, ringedSolid } from './rings.js';
import { defineSettings, type NumberSetting, type Values } from './settings.js';
import { TILE_MM, WALL_DISTANCE_MM } from './skadis.js';

export type ScrewHead = 'countersunk' | 'round' | 'none';

export interface MountingParams {
  screwHead: ScrewHead; // D74
  screwMm: number; // the screw's diameter, 4 mm unless set (D76)
  standoffHeightMm: number; // how far the standoffs stand behind the board; 0 for none (D75)
}

export const MOUNTING_DEFAULTS: MountingParams = { screwHead: 'countersunk', screwMm: 4, standoffHeightMm: 0 };

/** The holes' centres are this far in from both edges at each corner (D73). */
export const SCREW_INSET_MM = 10;
/** The least plain hole a countersink must leave behind it, so the head cannot pull through (C84). */
const MIN_PLAIN_HOLE_MM = 1;
const HEADS: ReadonlySet<string> = new Set(['countersunk', 'round', 'none']);

/** A screw's hole, its 90 degree countersink across the front, and the standoff round it (C83). */
export function screwHole(screwMm: number): { holeMm: number; countersinkMm: number; standoffDiameterMm: number } {
  const holeMm = screwMm + 0.5;
  return { holeMm, countersinkMm: 2 * screwMm + 1, standoffDiameterMm: holeMm + 5.5 };
}

/** The mounting asked for, with the starting values filled in, refused when it cannot be made. */
export function mountingParams(given: Partial<MountingParams>): MountingParams {
  const m: MountingParams = { ...MOUNTING_DEFAULTS, ...given };
  if (!HEADS.has(m.screwHead)) throw new RangeError('The screw holes must be countersunk, round or none');
  if (!(m.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  if (!(m.standoffHeightMm >= 0)) throw new RangeError('The standoffs cannot be less than 0 mm tall');
  return m;
}

const nice = (n: number) => String(Math.round(n * 100) / 100);

/** What the mounting adds to and cuts from a board of this size: BoardCuts for makeSolidBoard. */
export function mountingCuts(
  m: MountingParams,
  board: Pick<SolidBoardParams, 'columns' | 'rows' | 'thicknessMm'>,
): BoardCuts {
  const [width, height, t] = [TILE_MM * board.columns, TILE_MM * board.rows, board.thicknessMm];
  const { holeMm, countersinkMm, standoffDiameterMm } = screwHole(m.screwMm);
  const depth = (countersinkMm - holeMm) / 2; // 45 degree walls
  if (m.screwHead === 'countersunk' && t - depth < MIN_PLAIN_HOLE_MM) {
    throw new RangeError(
      `A countersunk ${nice(m.screwMm)} mm screw needs a board at least ${nice(depth + MIN_PLAIN_HOLE_MM)} mm ` +
        'thick; choose a round head or a smaller screw',
    );
  }
  const i = SCREW_INSET_MM;
  const places = [
    [i, i],
    [width - i, i],
    [i, height - i],
    [width - i, height - i],
  ] as const;
  const back = -m.standoffHeightMm - 1; // through the standoffs too, and a millimetre beyond
  const levels: [number, number][] =
    m.screwHead === 'countersunk'
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
  if (m.screwHead !== 'none') {
    cuts.extraCutters = (engine: Engine): Manifold[] =>
      places.map(([x, y]) => ringedSolid(engine, (grow) => circle(x, y, holeMm, grow), levels));
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
      { value: 'none', label: 'None' },
    ],
    default: MOUNTING_DEFAULTS.screwHead,
    help: 'One in each corner, 10 mm in from both edges. A countersunk head keeps the front flat.',
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
    help: 'Posts on the back at the corners, round the screws, that hold the board off the wall so hooks have room.',
  },
  SCREW_SIZE_SETTING,
  {
    kind: 'number',
    key: 'standoffHeightMm',
    label: 'Standoff height',
    unit: 'mm',
    default: WALL_DISTANCE_MM,
    min: 3,
    max: 40,
    step: 0.5,
    help: "How far the standoffs hold the board off the wall; IKEA's spacers hold it about 20 mm off.",
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
  });
}

/** The end of a file name: only what differs from the starting mounting, so a plain name keeps its meaning (C85). */
export function mountingLabel(v: MountingValues): string {
  const parts: string[] = [];
  if (v.screwHead === 'round') parts.push('round-head');
  if (v.screwHead === 'none') parts.push('no-holes');
  if (v.screwHead !== 'none' && v.screwMm !== MOUNTING_DEFAULTS.screwMm) parts.push(`screw-${v.screwMm}mm`);
  if (v.standoffs === 'back') parts.push(`standoffs-${v.standoffHeightMm}mm`);
  return parts.map((p) => `-${p}`).join('');
}
