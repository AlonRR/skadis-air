// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The nut standoff's engineering pass (30 Oct 2026): the 1-board taped standoff for M3, M4 and M5, each cut across at
// its nut's mid-height, the nut in orange where it sits, so the post's wall round the pocket shows: 0.1 mm at M3,
// broken through at the pocket's closed end at M4 and M5; and the standoff for 2 boards one above the other as it
// hangs, its lower nut's way in facing down. Each part the library's own.
//
//   node scripts/figures/shoot.mjs nut-pass      -> .check/figures/nut-pass/

/** Where a nut sits in its pocket, as standoff.ts cuts it (C597): its floor under the gable and the 1.5 mm roof. */
const nutFloor = (lib, screwMm, heightMm) => {
  const nut = lib.ISO_4032_NUTS[screwMm];
  return heightMm - 1.5 - (nut.acrossMm + 0.3 - 1) / 2 - (nut.tallMm + 0.3);
};

export function build(kit) {
  const { lib, engine, box, cylinder, mesh, COLOURS, CrossSection } = kit;
  const h = 18; // the taped standoff's starting height (C604)
  /** The nut at (x, y), flats on the pocket's sides, its hole through it, on its pocket's floor. */
  const nutAt = (screwMm, x, y, z, along) => {
    const nut = lib.ISO_4032_NUTS[screwMm];
    const hex = CrossSection.circle(nut.acrossMm / Math.sqrt(3), 6).rotate(along ? 0 : 90);
    return hex
      .extrude(nut.tallMm)
      .subtract(cylinder(0, 0, screwMm / 2, -1, nut.tallMm + 1))
      .translate([x, y, z + 0.15]);
  };

  // M3, M4 and M5 side by side, each cut at its nut's mid-height, the part above taken away
  const sizes = [3, 4, 5];
  const cutMeshes = [];
  const labels = [];
  sizes.forEach((screwMm, i) => {
    const x = (i - 1) * 32;
    const part = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut', screwMm, heightMm: h }));
    const floor = nutFloor(lib, screwMm, h);
    const mid = floor + (lib.ISO_4032_NUTS[screwMm].tallMm + 0.3) / 2;
    const cut = part.subtract(box(-20, 20, -20, 20, mid, h + 1)).translate([x, 0, 0]);
    cutMeshes.push(mesh(cut, COLOURS.grey), mesh(nutAt(screwMm, x, 0, floor, true), COLOURS.orange));
    const wall = {
      3: 'M3: 0.1 mm of wall at the pocket’s end',
      4: 'M4: the pocket breaks through',
      5: 'M5: breaks through',
    };
    labels.push({ text: wall[screwMm], at: [x, -8, mid], dx: 0, dy: 70 });
  });
  const wallsScene = {
    id: 'nut-walls',
    title: 'Standoff · nut, taped: the post round the nut',
    caption: [
      'The 1-board taped standoff, 18 mm, for M3, M4 and M5, each cut across at its nut’s mid-height, the nut in orange.',
      'The post is the screw plus 6 mm across; the nut’s way in leaves 0.1 mm at M3 and opens two windows at M4 and M5.',
    ],
    legend: [
      ['the nut, ISO 4032, in its pocket', COLOURS.orange],
      ['the standoff below the cut', COLOURS.grey],
    ],
    camera: { position: [0, -78, 92], target: [0, 2, 6], fov: 29 },
    labels,
    meshes: cutMeshes,
  };

  // the 2-stacked one as it hangs: the wall face on z = 0, up the wall +y; each nut where it sits
  const stacked = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut', boards: '2-stacked', heightMm: h }));
  const floor4 = nutFloor(lib, 4, h);
  const nuts = [-10, 10].map((y) => nutAt(4, 0, y, floor4, false));
  const wall = box(-30, 30, -30, 30, -1, 0);
  const stackedScene = {
    id: 'nut-stacked-mouth',
    title: 'Standoff · 2 boards stacked, nut, taped: as it hangs',
    caption: [
      'The standoff for 2 boards one above the other, as it hangs on the wall, before its boards go on: each nut slides',
      'in out from the seam, so the upper one goes in from above and the lower one from below, its way in facing down.',
    ],
    legend: [
      ['the nuts, M4', COLOURS.orange],
      ['the standoff, taped to the wall', COLOURS.grey],
    ],
    camera: { position: [62, -44, 44], target: [0, -2, 9], fov: 34, up: [0, 1, 0] },
    labels: [{ text: 'the lower nut’s way in faces down', at: [0, -15, floor4], dx: 0, dy: 60 }],
    meshes: [mesh(wall, COLOURS.wall), mesh(stacked, COLOURS.grey), ...nuts.map((n) => mesh(n, COLOURS.orange))],
  };
  return [wallsScene, stackedScene];
}
