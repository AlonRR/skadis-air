// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The cross-sections the hand calculations (hand.py) treat as beams, cut from the built boards: the rim below a slot,
// cut across it on the slot's axis, and a diagonal web halfway between two slots, cut square to it. Each section's
// area and second moments about its own centroid: "in" for bending in the board's plane (a hook's weight), "out" for
// bending through its thickness (a hook's prying couple), and the distances from the centroid to the outermost fibres.
//
//   node scripts/physics/sections.mjs [--lib <dist/index.js>] [--version <label>]   prints JSON
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values: args } = parseArgs({
  options: {
    lib: { type: 'string', default: join(root, 'packages', 'core', 'dist', 'index.js') },
    version: { type: 'string', default: 'today' },
    types: { type: 'string', default: 'solid,lightened,skeleton' },
  },
});
const lib = await import(pathToFileURL(resolve(args.lib)).href);
const { boardType, buildBoard, defaultValues, loadEngine } = lib;
const engine = await loadEngine();
const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

/** Area, centroid and second moments of polygons (u, v), outer contours counter-clockwise, holes clockwise. */
function properties(polygons) {
  let [a, su, sv, suu, svv] = [0, 0, 0, 0, 0];
  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i++) {
      const [u0, v0] = poly[i];
      const [u1, v1] = poly[(i + 1) % poly.length];
      const c = u0 * v1 - u1 * v0;
      a += c / 2;
      su += ((u0 + u1) * c) / 6;
      sv += ((v0 + v1) * c) / 6;
      suu += ((u0 * u0 + u0 * u1 + u1 * u1) * c) / 12;
      svv += ((v0 * v0 + v0 * v1 + v1 * v1) * c) / 12;
    }
  }
  const [cu, cv] = [su / a, sv / a];
  const us = polygons.flat().map((p) => p[0]);
  const vs = polygons.flat().map((p) => p[1]);
  return {
    area: a,
    centroid: [cu, cv],
    // about the axis along v through the centroid: bending in u
    Iu: suu - a * cu * cu,
    Iv: svv - a * cv * cv,
    cu: Math.max(Math.max(...us) - cu, cu - Math.min(...us)),
    cv: Math.max(Math.max(...vs) - cv, cv - Math.min(...vs)),
  };
}

/** The section of `solid` on the plane through `point` square to `axis` (a unit vector in x-y), kept within `half` mm of
 * the point across the plane's in-board direction: polygons in (across, z). */
function sectionAt(solid, point, axis, half) {
  const angle = (Math.atan2(axis[1], axis[0]) * 180) / Math.PI;
  // turn the axis onto +x, then +x onto +z, so the plane is z = const after the turns
  const moved = solid.translate([-point[0], -point[1], 0]).rotate([0, 0, -angle]).rotate([0, -90, 0]);
  const cut = moved.slice(0);
  // after the turns: the board's across-axis is y, its thickness is x (sign flipped)
  const box = engine.CrossSection.square([40, 2 * half]).translate([-20, -half]);
  const kept = cut.intersect(box);
  const polys = kept.toPolygons().map((poly) => poly.map(([x, y]) => [y, -x])); // (across, z)
  for (const m of [moved, cut, box, kept]) m.delete();
  return properties(polys);
}

const out = {};
for (const id of args.types.split(',')) {
  const type = boardType(id);
  const values = { ...defaultValues(type.settings), widthMm: 160, heightMm: 160, sides: CLOSED, thicknessMm: 5 };
  const built = buildBoard(engine, type, values);
  if (!built.ok) throw new Error(built.problem);
  const board = built.solid;
  const hh = (15 + values.slotClearanceMm) / 2;
  // the rim below the slot at (80, 80): cut on x = 80, square to x, kept from the slot's end down 6 mm
  const rim = sectionAt(board, [80, 80 - hh - 3], [1, 0], 3);
  // the diagonal web from the slot at (80, 80) to the one at (100, 100), halfway, square to it
  const s = Math.SQRT1_2;
  const web = sectionAt(board, [90, 90], [s, s], 5);
  out[id] = { rim, web };
  board.delete();
}
console.log(JSON.stringify({ version: args.version, sections: out }, null, 1));
