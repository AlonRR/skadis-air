// The standoff connector as a type on the page (D91 to D94): listed under "Connectors", its height on
// the main form and the screw size, shared with the board, under Advanced.
import { MOUNTING_DEFAULTS, SCREW_SIZE_SETTING } from '../mounting.js';
import { defineSettings } from '../settings.js';
import { makeStandoff, standoffParams, STANDOFF_DEFAULTS } from '../standoff.js';
import { defineBoardType } from './define.js';

export const STANDOFF = defineBoardType({
  id: 'standoff',
  name: 'Standoff',
  group: 'connector',
  description: 'A spacer between a board and the wall, at a corner screw hole; the screw goes through both.',
  settings: defineSettings([
    {
      kind: 'number',
      key: 'heightMm',
      label: 'Height',
      unit: 'mm',
      default: STANDOFF_DEFAULTS.heightMm,
      min: 3,
      max: 40,
      step: 0.5,
      help: "How far it holds the board off the wall; IKEA's spacers hold it about 20 mm off.",
    },
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) => makeStandoff(engine, standoffParams({ heightMm: v.heightMm, screwMm: v.screwMm })),
  label: (v) => `1-board-${v.heightMm}mm${v.screwMm === MOUNTING_DEFAULTS.screwMm ? '' : `-screw-${v.screwMm}mm`}`,
});
