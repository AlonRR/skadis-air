// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Tape standoffs and the nut standoff, as built (D592 a, D593, Q594; 30 Oct 2026): a solid board's back on tape
// standoffs, each pad in orange; and the standoff held by a nut, cut through its nut's pocket, the nut in orange where
// it sits, beside a 2-board one whole. Each part the library's own.
//
//   node scripts/figures/shoot.mjs tape-nut      -> .check/figures/tape-nut/

export function build(kit) {
  const { lib, engine, box, cylinder, mesh, split, built, COLOURS, CrossSection } = kit;
  const board = built('solid', { screwHead: 'none', standoffs: 'tape' });
  // the pads: all of the standoffs past the hooks' 8 mm room behind the board
  const padRegion = box(-5, 165, -5, 165, -16, -8);
  const tapeScene = {
    id: 'tape-board-back',
    title: 'Board · tape standoffs, from behind',
    caption: [
      'A 160 x 160 mm solid board on 15 mm standoffs "For tape": each corner post flares out at 45 degrees behind the',
      "hooks' 8 mm room to a round pad 19 mm across (the tape width) at the wall. No screw holes; the board prints face down.",
    ],
    legend: [
      ['the pads and their flare, past the hooks’ room', COLOURS.orange],
      ['the board and its posts', COLOURS.grey],
    ],
    camera: { position: [290, -110, -230], target: [80, 70, -4], fov: 30 },
    labels: [],
    meshes: split(board, padRegion),
  };

  // the 1-board nut standoff, cut through the middle of its nut's way in, and the nut where it sits
  const one = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut' }));
  const half = one.subtract(box(-12, 12, -12, 0, -1, 17)); // the near half away, so the cut faces the camera
  const nut = lib.ISO_4032_NUTS[4];
  const floor = 15 - 1.5 - (nut.acrossMm + 0.3 - 1) / 2 - (nut.tallMm + 0.3);
  const hex = CrossSection.circle(nut.acrossMm / Math.sqrt(3), 6);
  const nutSolid = hex
    .extrude(nut.tallMm)
    .translate([0, 0, floor + 0.15])
    .subtract(cylinder(0, 0, 2, floor - 1, floor + 5))
    .subtract(box(-6, 6, -6, 0, floor - 1, floor + 5));
  const two = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut', boards: '2' })).translate([0, 34, 0]);
  const nutScene = {
    id: 'nut-standoff-cut',
    title: 'Standoff · held by a nut, taped to the wall',
    caption: [
      'Front: the 1-board standoff cut through its M4 nut (orange), slid in from the side under a 1.5 mm roof; a',
      'countersunk M4 machine screw through the board and the roof threads into it. Back: the 2-board one, on one pad.',
    ],
    legend: [
      ['the nut, ISO 4032 M4, 7 mm across the flats', COLOURS.orange],
      ['the standoff, on a 19 mm tape pad', COLOURS.grey],
    ],
    camera: { position: [62, -70, 48], target: [4, 14, 6], fov: 30 },
    labels: [],
    meshes: [mesh(half, COLOURS.grey), mesh(nutSolid, COLOURS.orange), mesh(two, COLOURS.grey)],
  };
  return [tapeScene, nutScene];
}
