// The lightened board as a board type (D141 to D145): the solid board's settings, then its own rim and
// web under Advanced, then the mounting, so everything the solid board takes it takes the same way. The
// skeleton board takes its rim and web, and its file name's, from here, and the look both boards take (Q510).
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import {
  LATTICE_DEFAULTS,
  latticeParams,
  makeLightenedBoard,
  MIN_MEMBER_MM,
  type PocketCorners,
  WARN_MEMBER_MM,
} from '../lightened.js';
import { mountingLabel, mountingOf, mountingScrews } from '../mounting.js';
import { type ChoiceSetting, defineSettings, type NumberSetting, type Values } from '../settings.js';
import { defineBoardType } from './define.js';
import { boardLabel, boardParamsOf, boardSettings } from './solid.js';

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

/** The two looks a lattice board is drawn in (Q510; the owner's 515 answer, 28 Oct 2026), their names in this one place
 * while they are the owner's to settle (Q518): the value is what a file name carries, the label what the page shows. */
export const LOOKS = {
  curved: { value: 'curved', label: 'Curved' },
  straight: { value: 'straight', label: 'Straight' },
} as const;

/** The look, on the main form, first, so it follows the choice of board (Q510): today's board unless changed. */
export const LOOK_SETTING = {
  kind: 'choice',
  key: 'look',
  label: 'Look',
  options: [LOOKS.curved, LOOKS.straight],
  default: LOOKS.curved.value,
  help:
    `${LOOKS.curved.label}: the pockets run into the rims and webs on long smooth curves. ` +
    `${LOOKS.straight.label}: straight lines, the pockets meeting the rims and webs in small corners, as the first ` +
    'boards had them. The front edge chamfer, the V groove where boards meet, and the mounting are the same in both.',
} as const satisfies ChoiceSetting;

/** The file name's look, only when it is not the start's: `straight-`, so `skadis-lightened-straight-...`. */
export const lookLabel = (v: { look: string }) => (v.look === LOOKS.curved.value ? '' : `${v.look}-`);

/** The lightened board's settings: its look, the solid board's and the mounting's in the form's order (Q588), the
 * lattice's. */
export const LIGHTENED_SETTINGS = boardSettings([LOOK_SETTING], LATTICE_SETTINGS);

/** How each look draws the lightened board's pocket corners: on D278's eased curves, or 1 mm round, as L1's. */
const LIGHTENED_CORNERS: Record<string, PocketCorners> = {
  [LOOKS.curved.value]: 'eased',
  [LOOKS.straight.value]: 'round',
};

export const LIGHTENED = defineBoardType({
  id: 'lightened',
  name: 'Lightened',
  description: 'Open pockets between the slots: a rim round each slot, joined to its neighbours by diagonal webs.',
  settings: LIGHTENED_SETTINGS,
  build: (engine: Engine, v): Manifold =>
    makeLightenedBoard(
      engine,
      boardParamsOf(v),
      latticeParams({ rimMm: v.rimMm, webMm: v.webMm, corners: LIGHTENED_CORNERS[v.look] ?? 'eased' }),
      mountingOf(v),
    ),
  label: (v) => `${lookLabel(v)}${boardLabel(v)}${latticeLabel(v)}${mountingLabel(v)}`,
  screws: (v) => mountingScrews(mountingOf(v), v.thicknessMm),
});
