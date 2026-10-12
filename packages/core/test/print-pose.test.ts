// How a part goes to the printer (D66): face down, its back up, so standoffs on the back print on top.
// A board is built as it hangs, front toward the viewer; to print, it is turned over about the
// vertical axis, as a person turns it over to lay it on the bed. Its sides keep their places as seen
// hanging: what is left on the wall is at the far x of the STL, seen from above the bed.
import type { Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { makeSolidBoard, solidBoardParams } from '../src/board-solid.js';
import { loadEngine } from '../src/engine.js';
import { printPose } from '../src/print-pose.js';
import { ALL_OPEN } from '../src/slots.js';

const engine = await loadEngine();
const made: Manifold[] = [];
const keep = (m: Manifold) => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

// The plastic in a 1 mm strip along one side of the board's middle cut: a closed side is solid there,
// an open one has its half slots taken out of it.
function stripArea(solid: Manifold, fromX: number, toX: number): number {
  const box = solid.boundingBox();
  const cutter = keep(
    engine.Manifold.cube([toX - fromX, box.max[1] - box.min[1], 1]).translate([fromX, box.min[1], 2]),
  );
  const piece = keep(solid.intersect(cutter));
  return piece.volume();
}

describe('printPose', () => {
  const hanging = keep(
    makeSolidBoard(engine, solidBoardParams({ columns: 2, rows: 2, sides: { ...ALL_OPEN, left: 'closed' } })),
  );
  const printed = keep(printPose(hanging));

  it('keeps the size, from the origin', () => {
    const box = printed.boundingBox();
    expect(box.min.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0]);
    expect(box.max.map((v) => Math.round(v * 1e6) / 1e6)).toEqual([80, 80, 5]);
    expect(printed.volume()).toBeCloseTo(hanging.volume(), 6);
  });

  it('puts the side closed on the left as it hangs at the far x as it prints, and the open side at x = 0', () => {
    // As it hangs, the closed left is the solid strip at x = 0, the open right has its notches at x = 80.
    expect(stripArea(hanging, 0, 1)).toBeGreaterThan(stripArea(hanging, 79, 80) + 1);
    // Turned over, they swap ends.
    expect(stripArea(printed, 79, 80)).toBeCloseTo(stripArea(hanging, 0, 1), 6);
    expect(stripArea(printed, 0, 1)).toBeCloseTo(stripArea(hanging, 79, 80), 6);
  });

  it('turns rather than mirrors: a part with a top and a bottom has them swapped', () => {
    // a step on the back of a plate (z from 5 to 7, the left half) ends on the bed side's opposite face
    const plate = keep(engine.Manifold.cube([80, 40, 5]));
    const step = keep(engine.Manifold.cube([40, 40, 2]).translate([0, 0, 5]));
    const part = keep(plate.add(step));
    const turned = keep(printPose(part));
    expect(turned.boundingBox().max[2]).toBeCloseTo(7, 9);
    // the step, on the left and on top as built, is on the right and at the bottom once turned over
    const lowRight = keep(turned.intersect(keep(engine.Manifold.cube([40, 40, 2]).translate([40, 0, 0])))).volume();
    expect(lowRight).toBeCloseTo(40 * 40 * 2, 6);
  });
});
