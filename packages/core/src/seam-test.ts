// The seam-test pair (D69): printed with the fit coupon, it tests a seam before tiling is built. Two
// 40 x 80 mm tiles, each closed on three sides and open on the side that faces the other, so pushed
// together they make one whole slot across the seam (D15): does a hook fit a slot made of two halves,
// do the tiles butt flush, does the pitch stay 40 mm across the seam. 40 x 80 is the smallest pair
// that does: on an edge, a 40 x 40 tile has grid points only at its corners, which keep a slot only
// where both their sides are open. Built as it hangs, front toward +z, the two side by side with
// their open sides facing; it prints face down like a board (D66).
import type { Manifold } from 'manifold-3d';
import { makeSolidBoard, solidBoardParams, SOLID_BOARD_DEFAULTS } from './board-solid.js';
import type { Engine } from './engine.js';
import { TILE_MM } from './skadis.js';

/** How far apart the two tiles lie on the bed (C106). */
export const SEAM_TEST_GAP_MM = 10;

export interface SeamTestParams {
  thicknessMm: number;
  slotClearanceMm: number;
  slotChamferMm: number;
}

export function seamTestParams(given: Partial<SeamTestParams>): SeamTestParams {
  return {
    thicknessMm: SOLID_BOARD_DEFAULTS.thicknessMm,
    slotClearanceMm: SOLID_BOARD_DEFAULTS.slotClearanceMm,
    slotChamferMm: SOLID_BOARD_DEFAULTS.slotChamferMm,
    ...given,
  };
}

export function makeSeamTest(engine: Engine, params: SeamTestParams): Manifold {
  const p = seamTestParams(params);
  const tile = (open: 'left' | 'right') =>
    makeSolidBoard(
      engine,
      solidBoardParams({
        columns: 1,
        rows: 2,
        thicknessMm: p.thicknessMm,
        slotClearanceMm: p.slotClearanceMm,
        slotChamferMm: p.slotChamferMm,
        sides: { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed', [open]: 'open' },
      }),
    );
  const left = tile('right');
  const right = tile('left');
  const moved = right.translate([TILE_MM + SEAM_TEST_GAP_MM, 0, 0]);
  const pair = left.add(moved);
  for (const m of [left, right, moved]) m.delete();
  return pair;
}
