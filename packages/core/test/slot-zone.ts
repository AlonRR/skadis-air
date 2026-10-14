// The room a part must leave behind a board: each slot's outline grown by its 1 mm chamfer and a margin,
// run back from the board's back face, so a hook fits. Shared by the tests of whatever stands behind a
// board (built-in standoffs, the standoff connector); not a test file itself.
import type { CrossSection, Manifold } from 'manifold-3d';
import type { Engine } from '../src/engine.js';
import { stadium } from '../src/rings.js';
import { type Sides, slotPlaces } from '../src/slots.js';

/** The zone behind a board of this size, `depthMm` deep, ending 0.01 mm short of its back face. */
export function slotClearZone(
  engine: Engine,
  board: { columns: number; rows: number; sides: Sides },
  marginMm: number,
  depthMm = 30,
  keep: <T extends Manifold | CrossSection>(m: T) => T = (m) => m,
): Manifold {
  const outline = keep(
    new engine.CrossSection(
      slotPlaces(board.columns, board.rows, board.sides).map((s) => stadium(s.xMm, s.yMm, 5.2, 15.2, 1 + marginMm)),
      'NonZero',
    ),
  );
  return keep(keep(outline.extrude(depthMm)).translate([0, 0, -depthMm - 0.01]));
}
