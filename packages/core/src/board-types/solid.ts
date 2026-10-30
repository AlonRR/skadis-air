// The solid board as a board type (D11): its settings, as the page shows them, and its build, with the
// mounting (D73 to D75) after its own settings. The boards built on it (the lightened board) take its
// settings, its board and its file name from here, so the two cannot drift apart.
import { makeSolidBoard, solidBoardParams, SOLID_BOARD_DEFAULTS, type SolidBoardParams } from '../board-solid.js';
import { MOUNTING_SETTINGS, mountingCuts, mountingLabel, mountingOf, mountingScrews } from '../mounting.js';
import { TILE_MM } from '../skadis.js';
import { MAX_PANEL_TILES, MAX_WALL_MM } from '../tiling.js';
import { defineSettings, SettingsProblem, type Values } from '../settings.js';
import { ALL_OPEN } from '../slots.js';
import { defineBoardType } from './define.js';

// One board, or a panel of a wall, is at most 400 mm a side (C51); a wall is any size up to a kilometre each way
// (D196), past which a size is taken for a slip of the keys (D223).
const SIZE = {
  unit: 'mm',
  min: TILE_MM,
  max: MAX_WALL_MM,
  step: TILE_MM,
  onStep: true,
  count: { one: 'tile', other: 'tiles' },
} as const;
const PANEL = { ...SIZE, max: MAX_PANEL_TILES * TILE_MM, default: MAX_PANEL_TILES * TILE_MM, advanced: true } as const;

/** The solid board's own settings, before the mounting's: its open sides and sides, size, thickness and slots. */
export const BOARD_SETTINGS = defineSettings([
  // Open sides, then the sides it moves, first (D529 a, 30 Oct 2026: right under the Look, where a board has one)
  {
    kind: 'choice',
    key: 'seams',
    label: 'Open sides',
    options: [
      { value: 'through', label: 'Through the slots' },
      { value: 'between', label: 'Between the slots' },
    ],
    default: 'through',
    help:
      'Where an open side runs. Through the slots, it cuts a line of them in half, and a neighbour has the other ' +
      'halves. Between the slots, it runs midway between two columns of them, or across the plate between two ' +
      "slots' ends, 10 mm right of or above where it would otherwise run, so every slot is whole; a board with one " +
      'side of a pair open and the other closed is 10 mm larger or smaller that way. A corner screw that would land ' +
      'on a slot there moves in to the nearest place with as much room round it as a corner through the slots has.',
  },
  {
    kind: 'sides',
    key: 'sides',
    label: 'Sides',
    default: ALL_OPEN,
    help: 'An open side has half slots, to join a neighbour or add one later; a closed side is a solid edge.',
  },
  { kind: 'number', key: 'widthMm', label: 'Width', default: 4 * TILE_MM, ...SIZE },
  { kind: 'number', key: 'heightMm', label: 'Height', default: 4 * TILE_MM, ...SIZE },
  {
    kind: 'number',
    key: 'thicknessMm',
    label: 'Thickness',
    unit: 'mm',
    default: SOLID_BOARD_DEFAULTS.thicknessMm,
    min: 2.5,
    max: 10,
    step: 0.1,
    warnOutside: [4, 5.5], // the range IKEA hooks accept (C43)
    help: 'IKEA hooks fit boards about 4 to 5.5 mm thick.',
  },
  {
    kind: 'choice',
    key: 'panels',
    label: 'Panels',
    options: [
      { value: 'one', label: 'One board' },
      { value: 'split', label: 'Split into panels' },
    ],
    default: 'one',
    help: "Split, the width and height are a wall's, cut into panels your printer's bed takes; the sides are the wall's outer edges, and the seams are open.",
  },
  {
    kind: 'number',
    key: 'slotClearanceMm',
    label: 'Slot clearance',
    unit: 'mm',
    default: SOLID_BOARD_DEFAULTS.slotClearanceMm,
    min: -0.5,
    max: 1,
    step: 0.05,
    help: 'Added to the 5 × 15 mm slot. A test print of a few slots settles it for your printer.',
    advanced: true,
  },
  {
    kind: 'number',
    key: 'slotChamferMm',
    label: 'Slot chamfer',
    unit: 'mm',
    default: SOLID_BOARD_DEFAULTS.slotChamferMm,
    min: 0,
    max: 2,
    step: 0.1,
    help: 'Round each slot, at both faces.',
    advanced: true,
  },
  {
    kind: 'number',
    key: 'cornerRadiusMm',
    label: 'Corner radius',
    unit: 'mm',
    default: SOLID_BOARD_DEFAULTS.cornerRadiusMm,
    min: 0,
    max: TILE_MM / 2,
    step: 0.5,
    help: 'Where both sides at a corner are closed; open corners stay square, to fit a neighbour.',
    advanced: true,
  },
  {
    kind: 'number',
    key: 'panelWidthMm',
    label: 'Largest panel width',
    ...PANEL,
    help: 'Split, panels are as large as the bed takes, and no larger than this.',
  },
  {
    kind: 'number',
    key: 'panelHeightMm',
    label: 'Largest panel height',
    ...PANEL,
    help: 'Split, panels are as large as the bed takes, and no taller than this.',
  },
]);

type BoardValues = Values<typeof BOARD_SETTINGS>;

/** The solid board its settings describe; one board larger than a panel can be is refused (C51). */
export function boardParamsOf(v: BoardValues): SolidBoardParams {
  const over = (['widthMm', 'heightMm'] as const).filter((key) => v[key] > MAX_PANEL_TILES * TILE_MM);
  if (over.length > 0) {
    throw new SettingsProblem(
      `One board is at most ${MAX_PANEL_TILES * TILE_MM} mm a side; choose "Split into panels" to make a wall`,
      over,
    );
  }
  return solidBoardParams({
    columns: v.widthMm / TILE_MM,
    rows: v.heightMm / TILE_MM,
    thicknessMm: v.thicknessMm,
    sides: v.sides,
    slotClearanceMm: v.slotClearanceMm,
    slotChamferMm: v.slotChamferMm,
    cornerRadiusMm: v.cornerRadiusMm,
    seams: v.seams,
  });
}

/** The file name's size and closed sides, and where its open sides run if not through the slots, as only a board with
 * an open side differs so: `240x200-closed-left-between-slots`. */
export function boardLabel(v: BoardValues): string {
  const closed = (['left', 'right', 'bottom', 'top'] as const).filter((side) => v.sides[side] === 'closed');
  const between = v.seams === 'between' && closed.length < 4 ? '-between-slots' : '';
  return `${v.widthMm}x${v.heightMm}${closed.length > 0 ? `-closed-${closed.join('-')}` : ''}${between}`;
}

export const SOLID = defineBoardType({
  id: 'solid',
  name: 'Solid',
  description: 'A plain plate with the SKÅDIS slots.',
  settings: defineSettings([...BOARD_SETTINGS, ...MOUNTING_SETTINGS]),
  build: (engine, v) => {
    const params = boardParamsOf(v);
    return makeSolidBoard(engine, params, mountingCuts(mountingOf(v), params));
  },
  label: (v) => `${boardLabel(v)}${mountingLabel(v)}`,
  screws: (v) => mountingScrews(mountingOf(v), v.thicknessMm),
});
