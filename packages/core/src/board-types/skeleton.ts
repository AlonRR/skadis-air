// The skeleton board as a board type (D146, D147, D161, D314): the lightened board's settings, with the core every
// member narrows to under Advanced after the web, so the two boards cannot drift apart.
import { MOUNTING_SETTINGS, mountingLabel, mountingOf, mountingScrews } from '../mounting.js';
import { defineSettings } from '../settings.js';
import { makeSkeletonBoard, MIN_CORE_MM, SKELETON_DEFAULTS, skeletonParams, WARN_CORE_MM } from '../skeleton.js';
import { defineBoardType } from './define.js';
import { LATTICE_SETTINGS, latticeLabel, mm } from './lightened.js';
import { BOARD_SETTINGS, boardLabel, boardParamsOf, cornerScrewsOf } from './solid.js';

export const SKELETON = defineBoardType({
  id: 'skeleton',
  name: 'Skeleton',
  description:
    'The lightened board with every rim and web an I-beam: full width at both faces, thin through the middle.',
  settings: defineSettings([
    ...BOARD_SETTINGS,
    ...LATTICE_SETTINGS,
    {
      kind: 'number',
      key: 'coreMm',
      label: 'Core width',
      unit: 'mm',
      default: SKELETON_DEFAULTS.coreMm,
      min: MIN_CORE_MM,
      max: 6,
      step: 0.1,
      warnOutside: [WARN_CORE_MM, 6], // D147, C315: made, but under two lines
      help: 'How thin the rims and webs get inside the board: they step in just behind the front face and narrow at 45 degrees from the back.',
      advanced: true,
    },
    ...MOUNTING_SETTINGS,
  ]),
  build: (engine, v) =>
    makeSkeletonBoard(
      engine,
      boardParamsOf(v),
      skeletonParams({ rimMm: v.rimMm, webMm: v.webMm, coreMm: v.coreMm }),
      mountingOf(v),
    ),
  label: (v) => {
    const core = v.coreMm === SKELETON_DEFAULTS.coreMm ? '' : `-core-${mm(v.coreMm)}mm`;
    return `${boardLabel(v)}${latticeLabel(v)}${core}${mountingLabel(v)}`;
  },
  screws: (v) => mountingScrews(mountingOf(v), v.thicknessMm, cornerScrewsOf(v)),
});
