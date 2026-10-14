// The seam-test pair as a board type (D69): beside the fit coupon, printed with it, its slot clearance
// and thickness on the form and its chamfer under Advanced, as the coupon has them.
import { SOLID_BOARD_DEFAULTS } from '../board-solid.js';
import { makeSeamTest, seamTestParams } from '../seam-test.js';
import { defineSettings } from '../settings.js';
import { defineBoardType } from './define.js';

const mm = (n: number) => String(Math.round(n * 100) / 100);

export const SEAM_TEST = defineBoardType({
  id: 'seam-test',
  name: 'Seam test pair',
  parts: 2, // the two tiles, apart on the bed (C107)
  description: 'Two tiles that push together into one slot across a seam, to test how tiles join.',
  settings: defineSettings([
    {
      kind: 'number',
      key: 'slotClearanceMm',
      label: 'Slot clearance',
      unit: 'mm',
      default: SOLID_BOARD_DEFAULTS.slotClearanceMm,
      min: -0.5,
      max: 1,
      step: 0.05,
      help: 'Added to the 5 × 15 mm slot. Print it with the fit coupon; if a coupon slot fits better, print the pair again at that clearance.',
    },
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
      help: 'Print it as thick as the board will be.',
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
  ]),
  build: (engine, v) => makeSeamTest(engine, seamTestParams(v)),
  label: (v) => `${mm(v.thicknessMm)}mm-${mm(v.slotClearanceMm)}`,
});
