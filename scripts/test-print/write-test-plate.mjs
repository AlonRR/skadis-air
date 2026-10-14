// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the test print as one plate: the fit coupon (D67) and the seam-test pair (D69), each as the page
// downloads it, the pair 10 mm behind the coupon, into .check/test-print/. Reads the library's build, so
// run `npm run build -w skadis-air` first; `npm run test-plate` does both.
//
//   node scripts/test-print/write-test-plate.mjs [name=value ...]
//
// name=value sets a seam-pair setting, such as slotClearanceMm=0.3, to reprint the pair at the clearance
// the coupon chose; the coupon keeps its starting values. Why one file: PrusaSlicer's command line slices
// each input file on its own, so two STLs with one -o leave only the second in the G-code, and --merge
// wrote nothing at all (14 Oct 2026). One STL holding every part slices as one plate.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardType,
  buildBoard,
  defaultValues,
  loadEngine,
  meshOf,
  printedPart,
  toStl,
} from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'test-print');
const BED = { xMm: 250, yMm: 210 }; // the smallest bed it is meant for, an MK3S's

const pairValues = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.split('=');
    return [key, Number(value)];
  }),
);

const engine = await loadEngine();
const part = (id, given = {}) => {
  const type = boardType(id);
  const built = buildBoard(engine, type, { ...defaultValues(type.settings), ...given });
  if (!built.ok) throw new Error(`${id}: ${built.problem}`);
  return printedPart(type, built.solid);
};
const coupon = part('fit-coupon');
const pair = part('seam-test', pairValues);
const plate = coupon.add(pair.translate([0, coupon.boundingBox().max[1] + 10, 0]));

// The plate must be every part, apart, on the bed: the coupon and the pair's two tiles.
const parts = plate.decompose().length;
const box = plate.boundingBox();
if (parts !== 3) throw new Error(`the plate has ${parts} parts, expected 3`);
if (box.max[0] > BED.xMm || box.max[1] > BED.yMm)
  throw new Error(`the plate is larger than ${BED.xMm} x ${BED.yMm} mm`);

mkdirSync(out, { recursive: true });
const file = join(out, 'skadis-coupon-seam.stl');
writeFileSync(file, toStl(meshOf(plate), 'Skadis Air test print'));
writeFileSync(join(out, 'skadis-coupon-seam.parts'), '3'); // for scripts/checks/stl-check.sh (C107)
console.log(
  `${file}: ${parts} parts, ${box.max[0].toFixed(0)} x ${box.max[1].toFixed(0)} mm, ${plate.volume().toFixed(0)} mm3`,
);
