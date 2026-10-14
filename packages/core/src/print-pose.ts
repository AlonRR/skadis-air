// How a part goes to the printer (D66): face down, its back up, so whatever is on the back (the
// standoffs some designs call for) prints on top. Parts are built as they hang, front toward the
// viewer (+z), x across and y up the wall; printPose turns a part over about the vertical (y) axis,
// as a person turns it over to lay it on the bed, and sets it at the origin. A turn, not a mirror:
// what is on the left as it hangs is at the far x seen from above the bed, and comes back to the left
// when the printed part is turned over again and hung.
import type { Manifold } from 'manifold-3d';

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
