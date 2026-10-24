// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The trial plate's marks and its three 1-board standoffs (T274, D267), apart from the plate so a test can build them.
// `dotted` cuts 1, 2 or 3 dots into a part to tell a set of three apart; `trialStandoffs` is D267's three standoffs.
import { makeStandoff, standoffParams } from '../../packages/core/dist/index.js';

export const PILOTS = [0.8, 0.85, 0.9].map((k) => k * 4);
/** The dots' size and depth: 1 mm across, 0.4 mm (two layers) deep. */
export const DOT_ACROSS_MM = 1;
export const DOT_DEEP_MM = 0.4;

/**
 * `count` dots `DOT_DEEP_MM` deep in a part, at the points given, so a set of three tells apart. On the part's bed
 * face (z = 0) unless `topMm` is given, which is the z of a face that is up as the part prints: then the dots are
 * pockets in it, with floors, and nothing is printed over air.
 */
export function dotted(engine, solid, points, count, acrossMm, topMm) {
  if (count === 0) return solid;
  const { CrossSection, Manifold } = engine;
  const [from, to] = topMm === undefined ? [-1, DOT_DEEP_MM] : [topMm - DOT_DEEP_MM, topMm + 1];
  const dots = points.slice(0, count).map(([x, y]) => {
    const disc = new CrossSection([
      Array.from({ length: 24 }, (_, k) => [
        x + (acrossMm / 2) * Math.cos((2 * Math.PI * k) / 24),
        y + (acrossMm / 2) * Math.sin((2 * Math.PI * k) / 24),
      ]),
    ]);
    const dot = disc.extrude(to - from).translate([0, 0, from]);
    disc.delete();
    return dot;
  });
  const cut = Manifold.union(dots);
  const marked = solid.subtract(cut);
  for (const m of [...dots, cut]) m.delete();
  return marked;
}

/** Where the dots go on a 1-board standoff's board face (C464): on the flat of the ring, 0.6 mm clear of the pilot (at
 * most 1.8 mm out) and of the chamfer that starts 4 mm out, as the face is up as it prints. */
export const STANDOFF_DOT_RADIUS_MM = 2.9;
export const standoffDotPoints = () =>
  [90, 130, 170].map((a) => [
    STANDOFF_DOT_RADIUS_MM * Math.cos((a * Math.PI) / 180),
    STANDOFF_DOT_RADIUS_MM * Math.sin((a * Math.PI) / 180),
  ]);

/** D267's three standoffs, pilots 0.8, 0.85 and 0.9 times the 4 mm screw, told apart by 1, 2 or 3 dots. */
export function trialStandoffs(engine) {
  return PILOTS.map((pilotMm, k) => {
    const params = standoffParams({ boards: '1', pilotMm });
    return {
      name: `standoff, pilot ${pilotMm.toFixed(2)} mm (D267)`,
      solid: dotted(engine, makeStandoff(engine, params), standoffDotPoints(), k + 1, DOT_ACROSS_MM, params.heightMm),
    };
  });
}
