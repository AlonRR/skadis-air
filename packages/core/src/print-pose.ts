// How a part goes to the printer (D66): face down, its back up, so whatever is on the back (the
// standoffs some designs call for) prints on top. Parts are built as they hang, front toward the
// viewer (+z), x across and y up the wall; printPose turns a part over about the vertical (y) axis,
// as a person turns it over to lay it on the bed, and sets it at the origin. A turn, not a mirror:
// what is on the left as it hangs is at the far x seen from above the bed, and comes back to the left
// when the printed part is turned over again and hung.
import type { Manifold } from 'manifold-3d';
import type { Bed } from './printer.js';

export function printPose(solid: Manifold): Manifold {
  const turned = solid.rotate([0, 180, 0]);
  const { min } = turned.boundingBox();
  const placed = turned.translate([-min[0], -min[1], -min[2]]);
  turned.delete();
  return placed;
}

/** A part that prints as it is built (C101): set at the origin, not turned. */
export function placeOnBed(solid: Manifold): Manifold {
  const { min } = solid.boundingBox();
  return solid.translate([-min[0], -min[1], -min[2]]);
}

/** Whether a part lying as its box does fits the bed only turned a quarter on it. */
export function fitsOnlyTurned(box: { min: readonly number[]; max: readonly number[] }, bed: Bed): boolean {
  const [x, y] = [(box.max[0] ?? 0) - (box.min[0] ?? 0), (box.max[1] ?? 0) - (box.min[1] ?? 0)];
  const fits = (across: number, deep: number) => across <= bed.xMm + 1e-6 && deep <= bed.yMm + 1e-6;
  return !fits(x, y) && fits(y, x);
}

/**
 * A part on the bed, set at the origin, and turned a quarter about the vertical where it fits the bed only so (Q3):
 * a wall's panels are cut to fit the bed either way round, whichever makes fewer (D176), and each file now fits as it
 * comes. A part that fits as it lies, or fits neither way, stays as it lies.
 */
export function onBed(solid: Manifold, bed: Bed): Manifold {
  if (!fitsOnlyTurned(solid.boundingBox(), bed)) return placeOnBed(solid);
  const turned = solid.rotate([0, 0, 90]);
  const placed = placeOnBed(turned);
  turned.delete();
  return placed;
}
