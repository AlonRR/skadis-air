// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The printed grams of each board (D313, 28 Oct 2026): a 200 x 200 mm board of each type at its starting values, the
// lightened and skeleton boards in each look, made as the page downloads it (face down), sliced by
// scripts/checks/stl-check.sh, and the filament the slicer counts written to docs/board-grams.json, which the page, the
// README and the Printables text read. Reads the library's build, so run `npm run build -w skadis-air` first;
// `npm run grams` at the repo root does both.
//
//   FILAMENT="PETG Basic NPETG087-ZX" node scripts/checks/write-board-grams.mjs
//
// The STLs and their G-code go to .check/board-grams/. A slice that fails stops the script with nothing written, so a
// figure is never one the slicer did not give.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const out = join(root, '.check', 'board-grams');
const FILAMENT = process.env['FILAMENT'] ?? 'PETG Basic NPETG087-ZX';
const PRINTER = process.env['PRINTER'] ?? 'Original Prusa i3 MK3S & MK3S+';
const PROFILE = process.env['PRINT_PROFILE'] ?? '0.2mm QUALITY @MK3 - no skirt, no brim, no crossing perimeter';
const SIZE_MM = 200;

/** The filament the slicer says a G-code file uses, in grams, from its `; total filament used [g] = ` line. */
export function gramsOfGcode(text) {
  const match = /^; total filament used \[g\] = ([0-9.]+)\s*$/m.exec(text);
  if (match === null) throw new Error('no "total filament used [g]" line in the G-code');
  return Number(match[1]);
}

const samples = [
  { key: 'solid', type: 'solid', values: {} },
  ...['lightened', 'skeleton'].flatMap((type) =>
    ['curved', 'straight'].map((look) => ({ key: `${type}-${look}`, type, values: { look } })),
  ),
];

async function main() {
  rmSync(out, { recursive: true, force: true }); // never read a G-code a previous run left behind
  mkdirSync(out, { recursive: true });
  const engine = await loadEngine();
  const files = [];
  for (const { key, type: id, values } of samples) {
    const type = boardType(id);
    const built = buildBoard(engine, type, {
      ...defaultValues(type.settings),
      ...values,
      widthMm: SIZE_MM,
      heightMm: SIZE_MM,
    });
    if (!built.ok) throw new Error(`${key}: ${built.problem}`);
    const printed = printedPart(type, built.solid); // as the page downloads it: a board face down (D66)
    const stl = join(out, `${key}.stl`);
    writeFileSync(stl, toStl(meshOf(printed), key));
    printed.delete();
    built.solid.delete();
    files.push(stl);
  }
  const slice = spawnSync('bash', [join(root, 'scripts', 'checks', 'stl-check.sh'), ...files], {
    env: { ...process.env, FILAMENT, PRINTER, PRINT_PROFILE: PROFILE },
    encoding: 'utf8',
  });
  process.stdout.write(slice.stdout ?? '');
  if (slice.status !== 0) throw new Error('stl-check.sh failed; nothing written');
  const grams = {};
  for (const { key } of samples) grams[key] = gramsOfGcode(readFileSync(join(out, `${key}.gcode`), 'utf8'));
  const json = {
    sample: `a ${SIZE_MM} x ${SIZE_MM} mm board at its starting values, face down, sliced for a Prusa MK3S, 0.2 mm QUALITY profile`,
    filament: FILAMENT,
    sizeMm: SIZE_MM,
    gramsByBoard: grams,
  };
  writeFileSync(join(root, 'docs', 'board-grams.json'), `${JSON.stringify(json, null, 2)}\n`);
  console.log(JSON.stringify(grams));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
