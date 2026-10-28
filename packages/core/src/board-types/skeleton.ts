// The skeleton board as a board type (D146, D147, D161): the lightened board's settings, its look first (Q510), with
// the core every member narrows to under Advanced after the web, so the two boards cannot drift apart.
import type { PocketCorners } from '../lightened.js';
import { MOUNTING_SETTINGS, mountingLabel, mountingOf, mountingScrews } from '../mounting.js';
import { defineSettings } from '../settings.js';
import {
  makeSkeletonBoard,
  MAX_CORE_MM,
  MIN_CORE_MM,
  SKELETON_DEFAULTS,
  skeletonParams,
  WARN_CORE_MM,
} from '../skeleton.js';
import { defineBoardType } from './define.js';
import { LATTICE_SETTINGS, latticeLabel, LOOK_SETTING, LOOKS, lookLabel, mm } from './lightened.js';
import { BOARD_SETTINGS, boardLabel, boardParamsOf } from './solid.js';

/** How each look draws the skeleton's pocket corners: on D278's eased curves, or sharp, as S1's; through the board
 * both are today's I-beam (D514 a). */
const SKELETON_CORNERS: Record<string, PocketCorners> = {
  [LOOKS.curved.value]: 'eased',
  [LOOKS.straight.value]: 'sharp',
};

export const SKELETON = defineBoardType({
  id: 'skeleton',
  name: 'Skeleton',
  description:
    'The lightened board with every rim and web an I-beam: full width at both faces, thin through the middle.',
  settings: defineSettings([
    LOOK_SETTING,
    ...BOARD_SETTINGS,
    ...LATTICE_SETTINGS,
    {
      kind: 'number',
      key: 'coreMm',
      label: 'Core width',
      unit: 'mm',
      default: SKELETON_DEFAULTS.coreMm,
      min: MIN_CORE_MM,
      // no wider than the edge band, which every member narrows to the core from: refused on the field, not left to
      // fail in the geometry (Q6)
      max: MAX_CORE_MM,
      step: 0.1,
      warnOutside: [WARN_CORE_MM, MAX_CORE_MM], // D147: made, but thin
      help: 'How thin the rims and webs get through the middle of the board, narrowing at 45 degrees from the faces.',
      advanced: true,
    },
    ...MOUNTING_SETTINGS,
  ]),
  build: (engine, v) =>
    makeSkeletonBoard(
      engine,
      boardParamsOf(v),
      skeletonParams({
        rimMm: v.rimMm,
        webMm: v.webMm,
        coreMm: v.coreMm,
        corners: SKELETON_CORNERS[v.look] ?? 'eased',
      }),
      mountingOf(v),
    ),
  label: (v) => {
    const core = v.coreMm === SKELETON_DEFAULTS.coreMm ? '' : `-core-${mm(v.coreMm)}mm`;
    return `${lookLabel(v)}${boardLabel(v)}${latticeLabel(v)}${core}${mountingLabel(v)}`;
  },
  screws: (v) => mountingScrews(mountingOf(v), v.thicknessMm),
});
