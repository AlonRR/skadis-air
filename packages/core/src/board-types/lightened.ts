// The lightened board as a board type (D141 to D145): the solid board's settings, then its own rim and
// web under Advanced, then the mounting, so everything the solid board takes it takes the same way. The
// skeleton board takes its rim and web, and its file name's, from here.
import { LATTICE_DEFAULTS, latticeParams, makeLightenedBoard, MIN_MEMBER_MM, WARN_MEMBER_MM } from '../lightened.js';
import { MOUNTING_SETTINGS, mountingLabel, mountingOf, mountingScrews } from '../mounting.js';
import { defineSettings, type NumberSetting, type Values } from '../settings.js';
import { defineBoardType } from './define.js';
import { BOARD_SETTINGS, boardLabel, boardParamsOf, cornerScrewsOf } from './solid.js';

const MEMBER = {
  kind: 'number',
  unit: 'mm',
  min: MIN_MEMBER_MM,
  max: 6,
  step: 0.1,
  warnOutside: [WARN_MEMBER_MM, 6], // D145: made, but thin
  advanced: true,
} as const satisfies Partial<NumberSetting>;

/** The lattice's own settings: the rim round each slot and the webs, at the faces (D143, D145). */
export const LATTICE_SETTINGS = defineSettings([
  {
    ...MEMBER,
    key: 'rimMm',
    label: 'Rim round each slot',
    default: LATTICE_DEFAULTS.rimMm,
    help: 'From the edge of the slot at the face. Under 2 mm a rim can break, or let a hook twist; a test print settles it.',
  },
  {
    ...MEMBER,
    key: 'webMm',
    label: 'Web width',
    default: LATTICE_DEFAULTS.webMm,
    help: 'The diagonal webs between the slots. Under 2 mm they can break; a test print settles it.',
  },
]);

export const mm = (n: number) => String(Math.round(n * 100) / 100);

/** The file name's rim and web, each only when it differs from the start: `-rim-2.5mm-web-4mm`. */
export function latticeLabel(v: Values<typeof LATTICE_SETTINGS>): string {
  const parts: string[] = [];
  if (v.rimMm !== LATTICE_DEFAULTS.rimMm) parts.push(`rim-${mm(v.rimMm)}mm`);
  if (v.webMm !== LATTICE_DEFAULTS.webMm) parts.push(`web-${mm(v.webMm)}mm`);
  return parts.map((p) => `-${p}`).join('');
}

export const LIGHTENED = defineBoardType({
  id: 'lightened',
  name: 'Lightened',
  description: 'Open pockets between the slots: a rim round each slot, joined to its neighbours by diagonal webs.',
  settings: defineSettings([...BOARD_SETTINGS, ...LATTICE_SETTINGS, ...MOUNTING_SETTINGS]),
  build: (engine, v) =>
    makeLightenedBoard(engine, boardParamsOf(v), latticeParams({ rimMm: v.rimMm, webMm: v.webMm }), mountingOf(v)),
  label: (v) => `${boardLabel(v)}${latticeLabel(v)}${mountingLabel(v)}`,
  screws: (v) => mountingScrews(mountingOf(v), v.thicknessMm, cornerScrewsOf(v)),
});
