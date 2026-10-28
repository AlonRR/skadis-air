// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The lightened and skeleton boards in each look (Q510, 28 Oct 2026; the owner's 515 answer): Curved, today's, and
// Straight, the eased pocket corners left out, drawn from the same cameras as the board history: a 160 x 160 mm board at
// its type's starting values, its front three-quarter, a corner slot close, and the middle close. Also writes each
// board's 200 x 200 mm STL, as built, into .check/straight-boards-stl/ to slice, and their volumes, with the solid
// board's, into .check/figures/straight-boards/numbers.json.
//
//   node scripts/figures/shoot.mjs straight-boards
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TYPES = [
  { type: 'lightened', name: 'Lightened', corners: "1 mm round, as the first lightened board's (L1)" },
  { type: 'skeleton', name: 'Skeleton', corners: "sharp, as the first skeleton board's (S1), on today's I-beam" },
];
const LOOKS = [
  {
    look: 'curved',
    lookName: 'Curved',
    line: () => "today's board: the pockets run into the rims and webs on long eased curves (D278)",
  },
  {
    look: 'straight',
    lookName: 'Straight',
    line: (corners) => `the eased curves left out, the pockets' corners ${corners}`,
  },
];
const VIEWS = [
  {
    view: 'front',
    viewName: 'front, three-quarter',
    camera: { position: [215, -95, 190], target: [80, 70, 0], fov: 38 },
  },
  {
    view: 'corner',
    viewName: 'a corner slot, close',
    camera: { position: [78, -22, 70], target: [24, 24, 2.5], fov: 30 },
  },
  {
    view: 'middle',
    viewName: 'the middle, close',
    camera: { position: [134, 34, 70], target: [80, 80, 2.5], fov: 30 },
  },
];

export function build(kit) {
  const { mesh, built, COLOURS, lib } = kit;
  const scenes = [];
  const numbers = {};
  const stlDir = join(process.cwd(), '.check', 'straight-boards-stl');
  mkdirSync(stlDir, { recursive: true });
  const big = { widthMm: 200, heightMm: 200 };
  const solid = built('solid', big);
  numbers.solid = { mm3: solid.volume() };
  writeFileSync(join(stlDir, 'solid.stl'), lib.toStl(lib.meshOf(solid), 'solid'));
  for (const { type, name, corners } of TYPES) {
    for (const { look, lookName, line } of LOOKS) {
      const board = built(type, { widthMm: 160, heightMm: 160, look });
      for (const { view, viewName, camera } of VIEWS) {
        scenes.push({
          id: `${type}-${look}-${view}`,
          title: `${name} board · ${lookName} · ${viewName}`,
          caption: [`The look "${lookName}": ${line(corners)}.`],
          legend: [['the board, 160 x 160 mm, starting values', COLOURS.grey]],
          camera,
          labels: [],
          meshes: [mesh(board, COLOURS.grey)],
        });
      }
      const large = built(type, { ...big, look });
      const key = `${type}-${look}`;
      numbers[key] = { mm3: large.volume() };
      writeFileSync(join(stlDir, `${key}.stl`), lib.toStl(lib.meshOf(large), key));
      console.log(key, JSON.stringify(numbers[key]));
    }
  }
  const figures = join(process.cwd(), '.check', 'figures', 'straight-boards');
  mkdirSync(figures, { recursive: true });
  writeFileSync(join(figures, 'numbers.json'), `${JSON.stringify(numbers, null, 2)}\n`);
  return scenes;
}
