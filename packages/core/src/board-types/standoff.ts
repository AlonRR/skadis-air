// The standoff connector as a type on the page (D91 to D94, D97): listed under "Connectors", for 1, 2 or
// 4 boards, its height on the main form and the screw size, shared with the board, under Advanced. It
// prints as built, wall face down, so the tunnel of a shared one opens upward and needs no bridging (C101).
import { MOUNTING_DEFAULTS, SCREW_SIZE_SETTING } from '../mounting.js';
import { defineSettings } from '../settings.js';
import { makeStandoff, standoffParams, STANDOFF_DEFAULTS } from '../standoff.js';
import { defineBoardType } from './define.js';

export const STANDOFF = defineBoardType({
  id: 'standoff',
  name: 'Standoff',
  group: 'connector',
  prints: 'as-built',
  description: 'A spacer between boards and the wall, at their corner screw holes; the screws go through it.',
  settings: defineSettings([
    {
      kind: 'choice',
      key: 'boards',
      label: 'For',
      options: [
        { value: '1', label: '1 board, at a corner' },
        { value: '2', label: '2 boards, where two corners meet' },
        { value: '4', label: '4 boards, where four corners meet' },
      ],
      default: '1',
      help: 'For 2 or 4 boards, a tunnel next to the boards, along the seam, leaves hooks their room.',
    },
    {
      kind: 'number',
      key: 'heightMm',
      label: 'Height',
      unit: 'mm',
      default: STANDOFF_DEFAULTS.heightMm,
      min: 3,
      max: 40,
      step: 0.5,
      help: "How far it holds the boards off the wall; IKEA's spacers hold them about 20 mm off. For 2 or 4 boards, at least 12 mm.",
    },
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) =>
    makeStandoff(
      engine,
      standoffParams({
        boards: v.boards === '4' ? 4 : v.boards === '2' ? 2 : 1,
        heightMm: v.heightMm,
        screwMm: v.screwMm,
      }),
    ),
  label: (v) =>
    `${v.boards}-board${v.boards === '1' ? '' : 's'}-${v.heightMm}mm` +
    (v.screwMm === MOUNTING_DEFAULTS.screwMm ? '' : `-screw-${v.screwMm}mm`),
});
