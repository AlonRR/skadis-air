// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the parts whose roots D375 rounds (docs/research/2026-10-23-physics-tests.md, D375) into
// .check/root-parts/<label>/, each as one STL laid as the page downloads it, with its .parts beside it for
// stl-check.sh: the three 80 x 80 mm boards closed all round, on countersunk corner screws and 15 mm standoffs on the
// back, and on keyholes standing on 15 mm standoffs, the physics tests' boards (C335); and the slot clip for 2 boards,
// 15 mm deep, with its starting screw and with no fixing, as the physics tests load it (C336). Prints each file's
// plastic, mm3, as JSON on the last line. Reads a library's build, today's unless --lib names another, so the same
// parts can be written before a change and after it:
//
//   npm run build -w skadis-air
//   node scripts/checks/write-root-parts.mjs --label after
//   node scripts/checks/write-root-parts.mjs --lib <worktree>/packages/core/dist/index.js --label before
//   FILAMENT="PETG Basic NPETG087-ZX" bash scripts/checks/stl-check.sh .check/root-parts/<label>/<name>.stl
//   uv run --no-project python scripts/checks/overhang-report.py .check/root-parts/<label>/<name>.gcode
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values: args } = parseArgs({
  options: {
    lib: { type: 'string', default: join(root, 'packages', 'core', 'dist', 'index.js') },
    label: { type: 'string', default: 'today' },
  },
});
const lib = await import(pathToFileURL(resolve(args.lib)).href);
const { boardType, buildBoard, defaultValues, loadEngine, meshOf, printedPart, readValues, toStl } = lib;

const out = join(root, '.check', 'root-parts', args.label);
const engine = await loadEngine();

/** A page type's part at its starting values and the given ones, as the page downloads it. */
function pagePart(id, given) {
  const type = boardType(id);
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(`${id}: ${built.problem}`);
  const printed = printedPart(type, built.solid);
  built.solid.delete();
  return printed;
}

const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const BOARD = { widthMm: 80, heightMm: 80, sides: CLOSED, standoffs: 'corners', standoffHeightMm: 15 };
const PARTS = [
  ...['solid', 'lightened', 'skeleton'].flatMap((id) => [
    { name: `${id}-80-standoffs`, make: () => pagePart(id, { ...BOARD, screwHead: 'countersunk' }) },
    { name: `${id}-80-keyholes`, make: () => pagePart(id, { ...BOARD, screwHead: 'keyhole' }) },
  ]),
  { name: 'slot-clip-2', make: () => pagePart('slot-clip', { boards: '2', depthMm: 15 }) },
  { name: 'slot-clip-2-none', make: () => pagePart('slot-clip', { boards: '2', depthMm: 15, fixing: 'none' }) },
];

rmSync(out, { recursive: true, force: true }); // never judge a file a previous run left behind
mkdirSync(out, { recursive: true });
const volumes = {};
for (const { name, make } of PARTS) {
  const solid = make();
  const parts = solid.decompose();
  const bodies = parts.length;
  for (const p of parts) p.delete();
  if (bodies !== 1) throw new Error(`${name}: ${String(bodies)} parts`);
  const file = join(out, `${name}.stl`);
  writeFileSync(file, toStl(meshOf(solid), `Skadis Air root parts: ${name}`));
  writeFileSync(join(out, `${name}.parts`), '1');
  const { min, max } = solid.boundingBox();
  volumes[name] = Math.round(solid.volume() * 100) / 100;
  const size = [0, 1, 2].map((k) => (max[k] - min[k]).toFixed(k < 2 ? 0 : 2)).join(' x ');
  console.log(`${file}: ${size} mm`);
  solid.delete();
}
console.log(JSON.stringify(volumes));
