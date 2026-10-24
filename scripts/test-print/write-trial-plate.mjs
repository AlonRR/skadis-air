// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the trial print as one plate (T151, T268, D267; C234, C273) into .check/test-print/: the 80 x 80 mm
// lightened board on keyholes and its standoffs (T151); the slot clip's two trial grips (T268), three ribbed clips
// with nubs 0.35, 0.45 and 0.55 mm proud and a clip with split, lipped pegs and the two fills that lock them; and the
// standoff's tight section (D267), three 1-board standoffs with pilots 0.8, 0.85 and 0.9 times the 4 mm screw. Each
// of a set of three carries 1, 2 or 3 dots recessed 0.4 mm in that order: the clips' in their bed face, the
// standoffs' in the board face, which is up as they print, so the dots cost them no bed contact (C464, 24 Oct 2026;
// the marks are in trial-standoffs.mjs). The trial parts are the
// library's, with settings the page does not offer until a print says they work. Laid in rows 10 mm apart. Reads
// the library's build, so run `npm run build -w skadis-air` first; `npm run trial-plate` does both and checks it.
//
//   node scripts/test-print/write-trial-plate.mjs [grips | keyhole | standoffs]
//
// `grips` writes the T268 and D267 parts alone, as skadis-trial-grips.stl; `keyhole` T151's board alone, as
// skadis-trial-keyhole.stl; `standoffs` D267's three standoffs alone, as skadis-trial-standoffs.stl (24 Oct 2026,
// while the slot clip and the keyhole board were being changed). One file, as write-test-plate.mjs says why: PrusaSlicer's command line slices each input
// file on its own.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardType,
  buildBoard,
  defaultValues,
  loadEngine,
  makeSlotClip,
  makeSlotFill,
  meshOf,
  printedPart,
  readValues,
  slotClipParams,
  toStl,
} from '../../packages/core/dist/index.js';
import { dotted, trialStandoffs } from './trial-standoffs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'test-print');
const BED = { xMm: 250, yMm: 210 }; // an MK3S's
const GAP_MM = 10;
const only = process.argv[2];
const stem = ['grips', 'keyhole', 'standoffs'].includes(only) ? `skadis-trial-${only}` : 'skadis-trial-grips-keyhole';

const engine = await loadEngine();
const { Manifold } = engine;

/** A page type's part at its starting values and the given ones, as the page downloads it. */
function pagePart(id, given) {
  const type = boardType(id);
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${id}: ${built.problem}`);
  return printedPart(type, built.solid);
}

const clipAt = (given) => makeSlotClip(engine, slotClipParams({ boards: '2', fixing: 'none', ...given }));
const NUBS = [0.35, 0.45, 0.55]; // proud of the peg: 0.15, 0.25 and 0.35 mm past the slot's straight wall
const LIP = slotClipParams({ boards: '2', fixing: 'none', grip: 'lip' });

// built in this order, clips, then standoffs, then the keyhole board: Manifold numbers its meshes as they are made, so
// another order writes the same plate with its triangles in another order
const clips = [
  ...NUBS.map((nubMm, k) => ({
    name: `slot clip, nubs ${nubMm} mm (T268)`,
    solid: dotted(
      engine,
      clipAt({ nubMm }),
      [
        [-3, 0],
        [0, 0],
        [3, 0],
      ],
      k + 1,
      1.6,
    ),
  })),
  { name: 'slot clip, split pegs with lips (T268)', solid: makeSlotClip(engine, LIP) },
  ...[0, 40].map((dx) => {
    const fill = makeSlotFill(engine, LIP).translate([dx, 0, 0]);
    const flat = fill.rotate([0, 90, 0]); // flat on the bed: its 1.2 mm in six layers
    const { min } = flat.boundingBox();
    const laid = flat.translate([-min[0], -min[1], -min[2]]);
    for (const m of [fill, flat]) m.delete();
    return { name: 'fill for the split pegs (T268)', solid: laid };
  }),
];
const standoffs = trialStandoffs(engine);
const grips = [...clips, ...standoffs];
const keyhole = [
  {
    name: 'lightened board on keyholes, 80 x 80 mm (T151)',
    solid: pagePart('lightened', { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back' }),
  },
];
const PARTS = { grips, keyhole, standoffs }[only] ?? [...keyhole, ...grips];

// In rows across the bed, left to right, a new row 10 mm behind the deepest part of the last.
let [x, y, rowDepth] = [0, 0, 0];
const placed = PARTS.map(({ name, solid }) => {
  const { min, max } = solid.boundingBox();
  const [w, d] = [max[0] - min[0], max[1] - min[1]];
  if (x > 0 && x + w > BED.xMm) [x, y, rowDepth] = [0, y + rowDepth + GAP_MM, 0];
  const moved = solid.translate([x - min[0], y - min[1], -min[2]]);
  console.log(`  ${name}: ${w.toFixed(0)} x ${d.toFixed(0)} x ${(max[2] - min[2]).toFixed(1)} mm`);
  [x, rowDepth] = [x + w + GAP_MM, Math.max(rowDepth, d)];
  return moved;
});
const plate = Manifold.union(placed);

// The plate must be every part, apart, on the bed.
const parts = plate.decompose().length;
const box = plate.boundingBox();
if (parts !== PARTS.length) throw new Error(`the plate has ${parts} parts, expected ${PARTS.length}`);
if (box.max[0] > BED.xMm || box.max[1] > BED.yMm)
  throw new Error(`the plate is ${box.max[0].toFixed(0)} x ${box.max[1].toFixed(0)} mm, larger than the bed`);

mkdirSync(out, { recursive: true });
const file = join(out, `${stem}.stl`);
writeFileSync(file, toStl(meshOf(plate), 'Skadis Air trial print: trial grips and a keyhole board'));
writeFileSync(join(out, `${stem}.parts`), String(PARTS.length)); // for stl-check.sh (C107)
console.log(
  `${file}: ${parts} parts, ${box.max[0].toFixed(0)} x ${box.max[1].toFixed(0)} mm, ${plate.volume().toFixed(0)} mm3`,
);
