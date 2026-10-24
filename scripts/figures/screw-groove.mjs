// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The lock screws at the screw size as built (D479, A248; 24 Oct 2026): a 4 mm lock screw's 8 mm head does not pass a
// slot 5.2 mm wide, so each lock screw's slot has a groove in its sides for the head, round the slot's middle, clear of
// its bottom end, where a hook rests, and behind the hook's room the countersunk head seats on a 45 degree countersink
// (D370 a); a 2.5 mm lock screw of its own size, whose pan head passes the slot, keeps its flat recess. Each part as the
// page builds it, 80 x 80 mm closed all round on lock screws alone and 15 mm standoffs, the groove's walls and the
// head's seat in orange; the bottom left corner slot, (20, 20), close up.
//
//   node scripts/figures/shoot.mjs screw-groove

const T = 5; // the board's thickness
const [X, Y] = [20, 20]; // the bottom left corner slot's middle
const R = (8 + 0.5) / 2; // the groove: a 4 mm screw's 8 mm head and 0.5 mm
const REACH = Math.sqrt(R ** 2 - 2.6 ** 2); // where it crosses the slot's sides, either side of the middle

export function build(kit) {
  const { box, cylinder, split, built, COLOURS } = kit;
  const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
  const board = (given = {}) =>
    built('solid', { widthMm: 80, heightMm: 80, sides: closed, screwHead: 'lock', standoffs: 'back', ...given });
  /** The slot as drawn, 5.2 x 15.2 mm, through z0 to z1. */
  const slot = (z0, z1) =>
    box(X - 2.6, X + 2.6, Y - 5, Y + 5, z0, z1)
      .add(cylinder(X, Y - 5, 2.6, z0, z1))
      .add(cylinder(X, Y + 5, 2.6, z0, z1));
  // the plate within 0.6 mm of the groove's wall: the groove's walls, not the slot's
  const walls = cylinder(X, Y, R + 0.6, -0.01, T + 0.01).subtract(slot(-1, T + 1));
  const legend = [
    ["the groove's walls, for the 8 mm head", COLOURS.orange],
    ['the board, 80 mm, on lock screws alone', COLOURS.grey],
  ];
  const labels = [
    { text: `groove 8.5 mm across, ${(2 * REACH).toFixed(1)} mm along the slot`, at: [X + R, Y, T], dx: 120, dy: -40 },
    {
      text: `slot's bottom end, 5.2 mm wide for ${(7.6 - REACH).toFixed(2)} mm: where a hook rests`,
      at: [X, Y - 7, T],
      dx: 90,
      dy: 70,
    },
  ];
  const scenes = [];

  scenes.push({
    id: 'g1-front',
    title: "Lock screws at the screw size · the groove for a 4 mm screw's 8 mm head, from the front (D479, A248)",
    caption: [
      'The bottom left corner slot of an 80 mm board on lock screws alone, from the front. The head goes in through the',
      "slot, so the slot's sides are cut back round its middle (orange); its bottom end, where a hook rests, keeps 5.2 mm.",
    ],
    legend,
    camera: { position: [X + 10, Y - 14, 70], target: [X, Y, T / 2], fov: 30, up: [0, 1, 0] },
    labels,
    meshes: split(board(), walls),
  });

  // from the back, the standoff cut away at the hook's room's ceiling, 8 mm behind the board, so the slot shows
  {
    const part = board().intersect(box(-1, 81, -1, 81, -7.9, T + 1));
    scenes.push({
      id: 'g2-back',
      title: "Lock screws at the screw size · the same slot from the back, inside the hook's room (D479, A248)",
      caption: [
        "From the back, so left and right swap, the standoff behind the slot cut away where the hook's room ends, 8 mm",
        "behind the board. The groove runs through the plate; the head sits in the standoff, behind the hook's room.",
      ],
      legend,
      camera: { position: [X - 12, Y - 16, -60], target: [X, Y, 0], fov: 32, up: [0, 1, 0] },
      labels: [
        { text: 'groove through the plate', at: [X - R, Y, 0], dx: -150, dy: -50 },
        { text: "the hook's room, cut open", at: [X, Y - 12, -7.9], dx: -120, dy: 80 },
      ],
      meshes: split(part, walls),
    });
  }

  // cut through the slot's middle, seen from the side: the screw's way from the front to the wall, the head's seat in
  // orange with the groove: a 4 mm countersunk head bears 2.53 mm behind the hook's 8 mm of room (D370 a)
  const SEAT = -8 - (0.62 * 4 - 0.25 + 0.3);
  const seat = walls.add(cylinder(X, Y, R + 0.6, SEAT - 0.6, -8));
  const section = (given, id, title, caption, seatText) => {
    const part = board(given).intersect(box(-1, X, -1, 81, -16, T + 1));
    scenes.push({
      id,
      title,
      caption,
      legend: [
        ["the groove's walls and the head's seat", COLOURS.orange],
        ['the board, 80 mm, on lock screws alone, cut through the slot', COLOURS.grey],
      ],
      camera: { position: [X + 70, Y - 25, -2], target: [X, Y, -5], fov: 34 },
      labels: [
        { text: 'plate, 5 mm', at: [X, Y + 7, T / 2], dx: 90, dy: -60 },
        { text: "hook's room, 8 mm", at: [X, Y + 6, -4], dx: 110, dy: -10 },
        { text: seatText, at: [X, Y + 3, SEAT + 1], dx: 110, dy: 40 },
        { text: 'shank to the wall', at: [X, Y, -14], dx: 90, dy: 80 },
      ],
      meshes: split(part, seat),
    });
  };
  section(
    {},
    'g3-section',
    "Lock screws at the screw size · cut through the slot's middle: the countersunk head's 45 degree seat (D479, D370 a)",
    [
      'Cut through the middle of the slot, seen from the side, the front up. The 8 mm head passes the plate through the',
      "groove, crosses the hook's 8 mm of room and seats on a 45 degree countersink, as a keyhole's head does: nothing over air.",
    ],
    '45 degree seat, 2.53 mm behind the room',
  );
  section(
    { lockScrewSize: 'own', lockScrewMm: 2.5 },
    'g5-section-2.5mm',
    "Lock screws of their own size, 2.5 mm · cut through the slot's middle: the pan head's flat recess (A248)",
    [
      'The same cut with a 2.5 mm lock screw of its own size: its 5 mm pan head passes the slot as it is, and bears on',
      "a flat recess 2.3 mm behind the hook's room, as before D479; that floor prints over air round the shank.",
    ],
    'flat recess, 2.3 mm behind the room',
  );

  // the control: a lock screw of its own, 2.5 mm, its 5 mm head through the slot as it is
  scenes.push({
    id: 'g4-front-2.5mm',
    title: 'Lock screws of their own size, 2.5 mm · no groove: the 5 mm head passes the slot (A248)',
    caption: [
      'The same slot with a 2.5 mm lock screw, chosen as its own size under Advanced, the start before D479: its 5 mm',
      'head passes through the slot, which stays as it is.',
    ],
    legend: [['the board, 80 mm, on 2.5 mm lock screws', COLOURS.grey]],
    camera: { position: [X + 10, Y - 14, 70], target: [X, Y, T / 2], fov: 30, up: [0, 1, 0] },
    labels: [],
    meshes: split(board({ lockScrewSize: 'own', lockScrewMm: 2.5 }), walls),
  });
  return scenes;
}
