// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Open sides between the slots as built (21 Oct 2026; D282, D288 a, D289 a, D290 a): each part as the page builds it,
// what the answers changed in orange.

const T = 5; // the board's thickness
const sides = (left, right, bottom, top) => ({ left, right, bottom, top });

export function build(kit) {
  const { box, mesh, split, built, COLOURS } = kit;
  const scenes = [];
  const between = { seams: 'between', screwHead: 'none' };

  // B1: four 80 mm boards, a wall closed round its edge, their seams between the slots, 10 mm right of and above the
  // grid lines they would run through: the bottom left board 90 mm a side, the top right 70
  {
    const at = (x, y, s) => built('solid', { ...between, widthMm: 80, heightMm: 80, sides: s }).translate([x, y, 0]);
    const boards = [
      at(0, 0, sides('closed', 'open', 'closed', 'open')),
      at(80, 0, sides('open', 'closed', 'closed', 'open')),
      at(0, 80, sides('closed', 'open', 'open', 'closed')),
      at(80, 80, sides('open', 'closed', 'open', 'closed')),
    ];
    // the seams, where the open sides' front chamfers meet in a V
    const seams = [box(88.8, 91.2, -1, 161, T - 1.05, T + 0.1), box(-1, 161, 88.8, 91.2, T - 1.05, T + 0.1)];
    const seam = seams[0].add(seams[1]);
    scenes.push({
      id: 'b1-seams-between',
      title: 'Boards · open sides between the slots: four boards, every slot whole (D282, D288 a)',
      caption: [
        'Each open side runs 10 mm right of or above the grid line it ran through (orange: the seams), midway between',
        "two columns of slots, and across the web between two slots' ends; the closed sides stay. Every slot is whole.",
      ],
      legend: [
        ['the seams, between the slots', COLOURS.orange],
        ['four 80 mm boards, closed round the wall', COLOURS.grey],
      ],
      camera: { position: [80, -40, 260], target: [80, 80, 0], fov: 38 },
      labels: [
        { text: 'between two slot columns', at: [90, 130, T], dx: 80, dy: -40 },
        { text: "between two slots' ends", at: [130, 90, T], dx: 80, dy: 50 },
        { text: '90 mm: its right and top sides moved out', at: [20, 20, T], dx: -60, dy: 70 },
      ],
      meshes: boards.flatMap((b) => split(b, seam)),
    });
  }

  // B2: a board between the slots, open all round, on keyholes with lock screws, from the back: no corner screw, the
  // top standoffs behind the corner tiles' slots, the bottom ones a row up, where they stay on the board (D289 a)
  {
    const board = built('solid', {
      seams: 'between',
      widthMm: 120,
      heightMm: 120,
      screwHead: 'keyhole',
      standoffs: 'back',
      lockScrews: 'bottom',
    });
    const behind = box(-1, 141, -1, 141, -40, -0.01);
    scenes.push({
      id: 'b2-standoffs-between',
      title: 'Keyholes between the slots · each standoff behind the nearest slot that keeps it on the board (D289 a)',
      caption: [
        'From the back, so left and right swap; open all round. No corner screw: 10 mm in, it would land on a slot. The',
        "keyhole standoffs (orange) stay behind the corner tiles' slots; the bottom ones move up a row, to (40, 40) and its mirror.",
      ],
      legend: [
        ['the standoffs, keyholes at the top, lock screws at the bottom', COLOURS.orange],
        ['a board 120 mm a side, between the slots', COLOURS.grey],
      ],
      camera: { position: [70, -60, -230], target: [70, 70, 0], fov: 38, up: [0, 1, 0] },
      labels: [
        { text: 'keyhole', at: [20, 100, -15], dx: -70, dy: -50 },
        { text: 'lock screw, a row up', at: [40, 40, -15], dx: -80, dy: 60 },
      ],
      meshes: split(board, behind),
    });
  }

  // B3: lock screws alone (D289): a standoff behind a slot at each corner, a lock screw through each
  {
    const board = built('solid', {
      widthMm: 80,
      heightMm: 80,
      sides: sides('closed', 'closed', 'closed', 'closed'),
      screwHead: 'lock',
      standoffs: 'back',
    });
    const behind = box(-1, 81, -1, 81, -40, -0.01);
    scenes.push({
      id: 'b3-lock-screws',
      title: 'Lock screws alone, in place of keyholes (D289)',
      caption: [
        'From the back: a standoff behind the slot at each corner (orange), a lock screw through each slot into it,',
        "its head in a recess behind the hook's room, so the slot still takes a hook.",
      ],
      legend: [
        ['the four standoffs, each with its lock screw hole', COLOURS.orange],
        ['an 80 mm board, closed all round', COLOURS.grey],
      ],
      camera: { position: [40, -50, -160], target: [40, 40, 0], fov: 38, up: [0, 1, 0] },
      labels: [{ text: "a hook's room behind the slot", at: [20, 12, -4], dx: -80, dy: 60 }],
      meshes: split(board, behind),
    });
  }

  // B4: the slot clip between the slots (D290 a), fitted behind two boards side by side, seen from the back
  {
    const left = built('solid', {
      ...between,
      widthMm: 80,
      heightMm: 80,
      sides: sides('closed', 'open', 'closed', 'closed'),
    });
    const right = built('solid', {
      ...between,
      widthMm: 80,
      heightMm: 80,
      sides: sides('open', 'closed', 'closed', 'closed'),
    }).translate([80, 0, 0]);
    const clip = built('slot-clip', { seams: 'between', depthMm: 15 }).translate([90, 50, -15.005]);
    scenes.push({
      id: 'b4-clip-between',
      title: 'Slot clip between the slots · pegs 10 mm each side of the seam, a row apart (D290 a)',
      caption: [
        "From the back, so left and right swap: the clip's pegs in the nearest slot each side of the seam, its bar on the",
        "diagonal; its screw past the right board's post, reached before that board goes up. It joins boards stacked too.",
      ],
      legend: [
        ['the slot clip, 15 mm deep', COLOURS.orange],
        ['two 80 mm boards meeting between the slots', COLOURS.grey],
      ],
      camera: { position: [100, -30, -170], target: [90, 50, 0], fov: 34, up: [0, 1, 0] },
      labels: [
        { text: 'the seam, at x = 90', at: [90, 10, 0], dx: -60, dy: 60 },
        { text: 'the screw', at: [110.6, 70.6, -15], dx: 70, dy: -50 },
      ],
      meshes: [mesh(left, COLOURS.grey), mesh(right, COLOURS.grey), mesh(clip, COLOURS.orange)],
    });
  }
  return scenes;
}
