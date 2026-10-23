// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Writes the keyhole printability pass's options (23 Oct 2026; docs/research/2026-10-23-keyhole-printability.md) into
// .check/keyhole-pass/, each as one STL laid as it prints, with its .parts beside it for stl-check.sh: T151's board,
// the 80 x 80 mm lightened board on keyholes and 15 mm standoffs, with each keyhole seat and each hook-room exit the
// library's prototypes offer (KeyholeSeat, RoomExit), and the slot clip with a keyhole in each seat. A seat whose least
// standoff is over 15 mm is tried at the whole millimetre above it. Prints each file's plastic, mm3, as JSON on the last
// line. Reads the library's build, so run `npm run build -w skadis-air` first; slice them one at a time:
//
//   node scripts/checks/write-keyhole-options.mjs
//   FILAMENT="PETG Basic NPETG087-ZX" bash scripts/checks/stl-check.sh .check/keyhole-pass/<name>.stl
//   uv run --no-project python scripts/checks/overhang-report.py .check/keyhole-pass/<name>.gcode
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardType,
  defaultValues,
  keyholeSeat,
  latticeParams,
  loadEngine,
  makeLightenedBoard,
  makeSlotClip,
  meshOf,
  MIN_BEHIND_CHANNEL_MM,
  MIN_KEYHOLE_STANDOFF_MM,
  mountingOf,
  printedPart,
  readValues,
  slotClipParams,
  STANDOFF_DEFAULT_MM,
  toStl,
} from '../../packages/core/dist/index.js';
import { boardParamsOf } from '../../packages/core/dist/board-types/solid.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'keyhole-pass');
const engine = await loadEngine();

/** The least standoff a seat takes for a 4 mm screw, and the height it is tried at: 15 mm, or the mm above. */
const least = (seat) => keyholeSeat(4, seat).depthMm + MIN_BEHIND_CHANNEL_MM + MIN_KEYHOLE_STANDOFF_MM;
const tall = (seat) => Math.max(STANDOFF_DEFAULT_MM, Math.ceil(least(seat) - 1e-9));

/** T151's board with a seat and an exit, as the page builds the lightened type and lays it to print. */
function board(seat, roomExit) {
  const type = boardType('lightened');
  const given = { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back', standoffHeightMm: tall(seat) };
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
  const v = read.values;
  const mounting = { ...mountingOf(v), keyholeSeat: seat, roomExit };
  const lattice = latticeParams({ rimMm: v.rimMm, webMm: v.webMm });
  return printedPart(type, makeLightenedBoard(engine, boardParamsOf(v), lattice, mounting));
}

/** The slot clip for 2 boards with a keyhole in a seat, as it prints: as built, its wall face on the bed (C199). */
function clip(seat) {
  const p = slotClipParams({ fixing: 'keyhole', keyholeSeat: seat, depthMm: tall(seat) });
  return printedPart(boardType('slot-clip'), makeSlotClip(engine, p));
}

const OPTIONS = [
  { name: 'k0-today', make: () => board('flat', 'flat') },
  { name: 'k1-countersunk', make: () => board('countersunk', 'flat') },
  { name: 'k2-either', make: () => board('either', 'flat') },
  { name: 'k3-ledge', make: () => board('ledge', 'flat') },
  { name: 'r1-ramp', make: () => board('flat', 'ramp') },
  { name: 'kr-countersunk-ramp', make: () => board('countersunk', 'ramp') },
  { name: 'c0-clip-today', make: () => clip('flat') },
  { name: 'c1-clip-countersunk', make: () => clip('countersunk') },
  { name: 'c2-clip-either', make: () => clip('either') },
  { name: 'c3-clip-ledge', make: () => clip('ledge') },
];

mkdirSync(out, { recursive: true });
const volumes = {};
for (const { name, make } of OPTIONS) {
  const solid = make();
  const parts = solid.decompose().length;
  if (parts !== 1) throw new Error(`${name}: ${String(parts)} parts`);
  const file = join(out, `${name}.stl`);
  writeFileSync(file, toStl(meshOf(solid), `Skadis Air keyhole pass: ${name}`));
  writeFileSync(join(out, `${name}.parts`), '1');
  const { min, max } = solid.boundingBox();
  volumes[name] = Math.round(solid.volume() * 100) / 100;
  const size = [0, 1, 2].map((k) => (max[k] - min[k]).toFixed(k < 2 ? 0 : 2)).join(' x ');
  console.log(`${file}: ${size} mm`);
}
console.log(JSON.stringify(volumes));
