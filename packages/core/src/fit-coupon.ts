// The fit coupon (backlog item fit-coupon; D67, D68): a small test print that settles the slot clearance
// before a whole board is printed. Four 40 mm tiles in a row, each with its slot at its own clearance,
// told apart by 1 to 4 dots in the front face: push an IKEA hook into each, and keep the clearance that
// fits best. Its left and right sides are open and its top and bottom closed (D68); on one row the open
// sides hold no half slots, since the only grid points on its edges are its corners, so its corners stay
// square. Built as it hangs, front toward +z, like every part (D66).
import type { Manifold } from 'manifold-3d';
import { makeSolidBoard, solidBoardParams, SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { TILE_MM } from './skadis.js';
import type { Sides } from './slots.js';

export const FIT_COUPON_TILES = 4;
const SIDES: Readonly<Sides> = Object.freeze({ left: 'open', right: 'open', bottom: 'closed', top: 'closed' });

export interface FitCouponParams {
  thicknessMm: number;
  clearanceFromMm: number; // the first tile's slot clearance
  clearanceStepMm: number; // added for each tile after it
  slotChamferMm: number;
  sides: Sides;
}

export function fitCouponParams(given: Partial<Omit<FitCouponParams, 'sides'>>): FitCouponParams {
  const p: FitCouponParams = {
    thicknessMm: SOLID_BOARD_DEFAULTS.thicknessMm,
    clearanceFromMm: 0,
    clearanceStepMm: 0.1,
    slotChamferMm: SOLID_BOARD_DEFAULTS.slotChamferMm,
    ...given,
    sides: { ...SIDES },
  };
  // at 0 every slot would have the same clearance (Q8)
  if (!(p.clearanceStepMm > 0)) throw new RangeError('The clearance step must be more than 0 mm');
  return p;
}

// The dots: 1.6 mm across, 0.6 mm deep, 3 mm apart, centred over each tile's slot near its top edge,
// clear of the slot and its chamfer (the slot ends at 27.6 mm, its chamfer at 28.6 mm; the dots sit at 34).
const DOT = { diameterMm: 1.6, depthMm: 0.6, spacingMm: 3, yMm: 34 } as const;

function dots(engine: Engine, thicknessMm: number): Manifold[] {
  const cutters: Manifold[] = [];
  for (let tile = 0; tile < FIT_COUPON_TILES; tile++) {
    const count = tile + 1;
    for (let k = 0; k < count; k++) {
      const x = TILE_MM * tile + TILE_MM / 2 + (k - (count - 1) / 2) * DOT.spacingMm;
      const dot = engine.Manifold.cylinder(DOT.depthMm + 1, DOT.diameterMm / 2, DOT.diameterMm / 2, 24);
      cutters.push(dot.translate([x, DOT.yMm, thicknessMm - DOT.depthMm]));
      dot.delete();
    }
  }
  return cutters;
}

export function makeFitCoupon(engine: Engine, params: FitCouponParams): Manifold {
  const p = fitCouponParams(params);
  return makeSolidBoard(
    engine,
    solidBoardParams({
      columns: FIT_COUPON_TILES,
      rows: 1,
      thicknessMm: p.thicknessMm,
      sides: p.sides,
      slotChamferMm: p.slotChamferMm,
      slotClearanceMm: p.clearanceFromMm,
    }),
    {
      clearanceOf: (slot) => p.clearanceFromMm + p.clearanceStepMm * Math.floor(slot.xMm / TILE_MM),
      extraCutters: (e) => dots(e, p.thicknessMm),
    },
  );
}
