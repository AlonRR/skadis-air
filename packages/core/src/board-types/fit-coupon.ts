// The fit coupon as a board type (backlog item fit-coupon; D67, D68): chosen on the page like a board.
import { SOLID_BOARD_DEFAULTS } from '../board-solid.js';
import { FIT_COUPON_TILES, fitCouponParams, makeFitCoupon } from '../fit-coupon.js';
import { defineSettings } from '../settings.js';
import { defineBoardType } from './define.js';

const mm = (n: number) => String(Math.round(n * 100) / 100);

export const FIT_COUPON = defineBoardType({
  id: 'fit-coupon',
  name: 'Fit test coupon',
  description: `${FIT_COUPON_TILES} slots at ${FIT_COUPON_TILES} clearances, to find the one that fits your printer.`,
  settings: defineSettings([
    {
      kind: 'number',
      key: 'clearanceFromMm',
      label: 'First slot clearance',
      unit: 'mm',
      default: 0,
      min: -0.5,
      max: 1,
      step: 0.05,
      help: 'Added to the 5 × 15 mm slot in the first tile, marked with one dot.',
    },
    {
      kind: 'number',
      key: 'clearanceStepMm',
      label: 'Clearance step',
      unit: 'mm',
      default: 0.1,
      min: 0,
      max: 0.3,
      step: 0.05,
      help: 'Added again for each tile after the first; the fourth tile has four dots.',
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
  build: (engine, v) => makeFitCoupon(engine, fitCouponParams(v)),
  label: (v) =>
    `${mm(v.thicknessMm)}mm-${mm(v.clearanceFromMm)}-to-${mm(v.clearanceFromMm + (FIT_COUPON_TILES - 1) * v.clearanceStepMm)}`,
});
