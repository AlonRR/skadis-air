// The room a part must leave behind a board: each slot's outline grown by its 1 mm chamfer and a margin,
// run back from the board's back face, so a hook fits. Shared by the tests of whatever stands behind a
// board (built-in standoffs, the standoff connector, the slot clip); not a test file itself.
import type { CrossSection, Manifold } from 'manifold-3d';
import type { Engine } from '../src/engine.js';
import { stadium } from '../src/rings.js';
import { HOOK_DROP_MM, HOOK_WIDTH_MM } from '../src/skadis.js';
import { type Sides, slotPlaces } from '../src/slots.js';

/** The board's slots, but those at the places given: the slots a part's own pegs fill. */
function slotsBut(board: { columns: number; rows: number; sides: Sides }, except: readonly [number, number][]) {
  return slotPlaces(board.columns, board.rows, board.sides).filter(
    (s) => !except.some(([x, y]) => Math.hypot(s.xMm - x, s.yMm - y) < 1e-6),
  );
}

/** The zone behind a board of this size, `depthMm` deep, ending 0.01 mm short of its back face. */
export function slotClearZone(
  engine: Engine,
  board: { columns: number; rows: number; sides: Sides },
  marginMm: number,
  depthMm = 30,
  keep: <T extends Manifold | CrossSection>(m: T) => T = (m) => m,
  except: readonly [number, number][] = [],
): Manifold {
  const outline = keep(
    new engine.CrossSection(
      slotsBut(board, except).map((s) => stadium(s.xMm, s.yMm, 5.2, 15.2, 1 + marginMm)),
      'NonZero',
    ),
  );
  return keep(keep(outline.extrude(depthMm)).translate([0, 0, -depthMm - 0.01]));
}

/**
 * The room a hook takes behind the board, from each slot's bottom end down: the hook's back tab, its width
 * and its drop below the slot (docs/skadis-standard.md), each grown by the margin, `depthMm` deep.
 */
export function hookRoomZone(
  engine: Engine,
  board: { columns: number; rows: number; sides: Sides },
  marginMm: number,
  depthMm: number,
  keep: <T extends Manifold | CrossSection>(m: T) => T = (m) => m,
  except: readonly [number, number][] = [],
): Manifold {
  const [width, drop] = [HOOK_WIDTH_MM + 2 * marginMm, HOOK_DROP_MM + marginMm];
  const boxes = slotsBut(board, except).map((s) => {
    const bottom = s.yMm - 15.2 / 2; // the slot's bottom end, where the hook rests
    return keep(
      engine.Manifold.cube([width, drop, depthMm]).translate([s.xMm - width / 2, bottom - drop, -depthMm - 0.01]),
    );
  });
  return keep(engine.Manifold.union(boxes));
}
