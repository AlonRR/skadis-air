// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Tape standoffs and the nut standoff, as built (D592 a, D593, Q594, D600, C601, D603; 30 Oct 2026): a solid board's back on
// tape standoffs, each rectangular pad in orange; the standoff held by a nut, cut through its nut's seat, the nut in
// orange pulled home (D607 a), beside a 2-board one whole; and the nut standoff screwed to the wall, its foot's screws in
// orange. Each part the library's own.
//
//   node scripts/figures/shoot.mjs tape-nut      -> .check/figures/tape-nut/

export function build(kit) {
  const { lib, engine, box, cylinder, mesh, split, built, COLOURS, CrossSection } = kit;
  const board = built('solid', { screwHead: 'tape' });
  // the pads: all of the standoffs past the hooks' 8 mm room behind the board
  const padRegion = box(-5, 165, -5, 165, -19, -8);
  const tapeScene = {
    id: 'tape-board-back',
    title: 'Board · tape standoffs, from behind',
    caption: [
      'A 160 x 160 mm solid board on 18 mm standoffs "For tape": each corner post flares out at 45 degrees behind the',
      "hooks' 8 mm room to a 19 x 19 mm pad at the wall, a piece cut from a 19 mm roll. No screw holes; it prints face down.",
    ],
    legend: [
      ['the pads and their flare, past the hooks’ room', COLOURS.orange],
      ['the board and its posts', COLOURS.grey],
    ],
    camera: { position: [290, -110, -230], target: [80, 70, -4], fov: 30 },
    labels: [],
    meshes: split(board, padRegion),
  };

  // the 1-board nut standoff, cut through its axis, and the nut pulled home in its seat (D607 a)
  const one = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut' }));
  const half = one.subtract(box(-12, 12, -12, 0, -1, 17)); // the near half away, so the cut faces the camera
  const nut = lib.ISO_4032_NUTS[4];
  const floor = 3 + 0.1; // the seat 3 mm up and 0.1 mm over the nut, the nut against its ceiling (C611)
  const hex = CrossSection.circle(nut.acrossMm / Math.sqrt(3), 6);
  const nutSolid = hex
    .extrude(nut.tallMm)
    .translate([0, 0, floor])
    .subtract(cylinder(0, 0, 2, floor - 1, floor + 5))
    .subtract(box(-6, 6, -6, 0, floor - 1, floor + 5));
  const two = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut', boards: '2' })).translate([0, 34, 0]);
  const nutScene = {
    id: 'nut-standoff-cut',
    title: 'Standoff · held by a nut, taped to the wall',
    caption: [
      'Front: the 1-board standoff cut through its M4 nut (orange), pulled up into its seat from the wall side; a',
      'countersunk M4 machine screw through the board threads into it. Back: the 2-board one, on one pad.',
    ],
    legend: [
      ['the nut, ISO 4032 M4, 7 mm across the flats', COLOURS.orange],
      ['the standoff, on a 19 x 19 mm tape pad', COLOURS.grey],
    ],
    camera: { position: [62, -70, 48], target: [4, 14, 6], fov: 30 },
    labels: [],
    meshes: [mesh(half, COLOURS.grey), mesh(nutSolid, COLOURS.orange), mesh(two, COLOURS.grey)],
  };
  // the nut standoff screwed to the wall (D600): for 1 board and for 2, the foot screws' countersunk holes marked by a
  // countersunk screw standing in each
  const screwedOne = lib.makeStandoff(engine, lib.standoffParams({ fixing: 'nut-screwed' }));
  const screwedTwo = lib
    .makeStandoff(engine, lib.standoffParams({ fixing: 'nut-screwed', boards: '2' }))
    .translate([0, 44, 0]);
  const feet = [...lib.footScrewPlaces('1'), ...lib.footScrewPlaces('2').map(([x, y]) => [x, y + 44])];
  // a 4 mm countersunk screw's head, 8 mm across and 2.48 mm tall, seated in the foot 4 mm thick, its shank below
  const screws = feet.map(([x, y]) =>
    cylinder(x, y, 2, -6, 2).add(
      CrossSection.circle(4, 32)
        .extrude(2.48, 0, 0, [2 / 4, 2 / 4])
        .mirror([0, 0, 1])
        .translate([x, y, 4]),
    ),
  );
  const screwedScene = {
    id: 'nut-standoff-screwed',
    title: 'Standoff · held by a nut, screwed to the wall',
    caption: [
      'The standoffs for 1 board and for 2 with a nut in each post, each standing on a foot screwed to the wall by two',
      'countersunk 4 mm screws (orange), driven before the boards go on; the boards then cover them. No tape.',
    ],
    legend: [
      ['the foot screws, countersunk from the board side', COLOURS.orange],
      ['the standoff and its foot', COLOURS.grey],
    ],
    camera: { position: [75, -80, 70], target: [4, 20, 4], fov: 30 },
    labels: [],
    meshes: [
      mesh(screwedOne, COLOURS.grey),
      mesh(screwedTwo, COLOURS.grey),
      ...screws.map((m) => mesh(m, COLOURS.orange)),
    ],
  };
  return [tapeScene, nutScene, screwedScene];
}
