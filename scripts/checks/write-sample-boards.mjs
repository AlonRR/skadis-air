// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes a set of sample boards as STL into .check/boards/, for scripts/checks/stl-check.sh to judge.
// Reads the library's build, so run `npm run build -w skadis-air` first;
// `npm run check:stl` at the repo root does both, then the check.
//
//   node scripts/checks/write-sample-boards.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOARD_TYPES,
  boardType,
  buildBoard,
  defaultValues,
  loadEngine,
  meshOf,
  printedPart,
  toStl,
} from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'boards');

const open = { left: 'open', right: 'open', bottom: 'open', top: 'open' };
const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const solid = boardType('solid');
const solidAt = (widthMm, heightMm, sides) => ({ ...defaultValues(solid.settings), widthMm, heightMm, sides });
const lightened = boardType('lightened');
const skeleton = boardType('skeleton');
const skeletonAt = (widthMm, heightMm, sides) => ({ ...defaultValues(skeleton.settings), widthMm, heightMm, sides });
const lightenedAt = (widthMm, heightMm, sides) => ({ ...defaultValues(lightened.settings), widthMm, heightMm, sides });

// Every listed type at its starting values, so a new type is checked without touching this file; the
// solid board with one of each kind of edge: open all round, closed all round with rounded corners,
// both on one board, and the largest a 250 x 210 mm bed takes (240 x 200 mm); and its mounting
// (D73 to D75): standoffs with each head, the largest screw at the largest corner radius; the lightened
// board (D141 to D145) closed all round with standoffs, and at its narrowest rim and webs on the largest
// board; keyholes (D155 to D158) with lock screws on a closed solid board, and on the lightened board; the
// skeleton board (D146, D147) closed with keyholes, and at its thinnest on the largest board; and the standoff
// connector at the largest screw and its tallest.
const samples = [
  ...BOARD_TYPES.map((type) => ({ name: `${type.id}-default`, type, values: defaultValues(type.settings) })),
  { name: 'solid-1x1-open', type: solid, values: solidAt(40, 40, open) },
  { name: 'solid-1x1-closed', type: solid, values: solidAt(40, 40, closed) },
  {
    name: 'solid-2x2-left-bottom-closed',
    type: solid,
    values: solidAt(80, 80, { ...open, left: 'closed', bottom: 'closed' }),
  },
  { name: 'solid-3x2-closed', type: solid, values: solidAt(120, 80, closed) },
  { name: 'solid-6x5-open', type: solid, values: solidAt(240, 200, open) },
  {
    name: 'solid-2x2-round-standoffs',
    type: solid,
    values: { ...solidAt(80, 80, open), screwHead: 'round', standoffs: 'back' },
  },
  {
    name: 'solid-2x2-closed-countersunk-standoffs',
    type: solid,
    values: { ...solidAt(80, 80, closed), screwMm: 5, cornerRadiusMm: 20, standoffs: 'back' },
  },
  {
    name: 'lightened-3x2-closed-standoffs',
    type: lightened,
    values: { ...lightenedAt(120, 80, closed), standoffs: 'back' },
  },
  {
    name: 'lightened-6x5-open-thinnest',
    type: lightened,
    values: { ...lightenedAt(240, 200, open), rimMm: 1.2, webMm: 1.2 },
  },
  {
    name: 'solid-2x2-closed-keyholes-lock-screws',
    type: solid,
    values: { ...solidAt(80, 80, closed), screwHead: 'keyhole', lockScrews: 'bottom', standoffs: 'back' },
  },
  {
    name: 'lightened-4x4-keyholes',
    type: lightened,
    values: { ...lightenedAt(160, 160, open), screwHead: 'keyhole', standoffs: 'back' },
  },
  {
    name: 'skeleton-3x2-closed-keyholes',
    type: skeleton,
    values: { ...skeletonAt(120, 80, closed), screwHead: 'keyhole', lockScrews: 'bottom', standoffs: 'back' },
  },
  {
    name: 'skeleton-6x5-open-thinnest',
    type: skeleton,
    values: { ...skeletonAt(240, 200, open), rimMm: 1.2, webMm: 1.2, coreMm: 0.8 },
  },
  { name: 'standoff-1-40mm-screw-5', type: boardType('standoff'), values: { boards: '1', heightMm: 40, screwMm: 5 } },
  { name: 'standoff-2-12mm-screw-3', type: boardType('standoff'), values: { boards: '2', heightMm: 12, screwMm: 3 } },
  { name: 'standoff-4-20mm-screw-5', type: boardType('standoff'), values: { boards: '4', heightMm: 20, screwMm: 5 } },
];

rmSync(out, { recursive: true, force: true }); // never judge a file a previous run left behind
mkdirSync(out, { recursive: true });
const engine = await loadEngine();
for (const { name, type, values } of samples) {
  const built = buildBoard(engine, type, values);
  if (!built.ok) throw new Error(`${name}: ${built.problem}`);
  const board = built.solid;
  const printed = printedPart(type, board); // as the page downloads it: a board face down (D66)
  writeFileSync(join(out, `${name}.stl`), toStl(meshOf(printed), name));
  // stl-check.sh expects one part unless told otherwise (C107)
  if ((type.parts ?? 1) !== 1) writeFileSync(join(out, `${name}.parts`), String(type.parts));
  printed.delete();
  console.log(`${name}.stl  volume ${board.volume().toFixed(1)} mm3  genus ${board.genus()}`);
  board.delete();
}
