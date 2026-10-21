// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The boards as the design pass's answers built them (21 Oct 2026; D276 to D282): each board as the page builds it,
// what changed in orange.

const T = 5; // the board's thickness

export function build(kit) {
  const { box, mesh, split, built, COLOURS, CrossSection } = kit;
  const scenes = [];
  const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
  // two 80 mm boards side by side, open where they meet at x = 80: the slot across the seam is at (80, 40)
  const left = built('solid', { widthMm: 80, heightMm: 80, sides: { ...closed, right: 'open' } });
  const right = built('solid', { widthMm: 80, heightMm: 80, sides: { ...closed, left: 'open' } }).translate([80, 0, 0]);
  // the front's chamfers along the seam, either side of it
  const groove = box(78.8, 81.2, -1, 81, T - 1.05, T + 0.1);

  // G1: the V groove, where it runs into the slot the seam crosses
  scenes.push({
    id: 'g1-seam-groove',
    title: 'Boards · the V groove at the seam, through a slot (D277)',
    caption: [
      "Each open side's front edge is chamfered 1 mm (orange), so two boards meet in a 2 mm V. Where the seam crosses a",
      "slot, the groove runs into the slot's own 1 mm chamfer at each end, inside the front millimetre the chamfer takes.",
    ],
    legend: [
      ["the open sides' front chamfers, the V groove", COLOURS.orange],
      ['two solid boards, open where they meet', COLOURS.grey],
    ],
    camera: { position: [96, 6, 40], target: [80, 36, 2], fov: 30 },
    labels: [
      { text: 'the V groove', at: [80, 20, T], dx: 60, dy: 40 },
      { text: 'the slot across the seam', at: [82.6, 40, T], dx: 90, dy: -60 },
    ],
    meshes: [...split(left, groove), ...split(right, groove)],
  });

  // G2: a cut 0.4 mm into the right board, along the seam, through the slot's bottom end, seen straight on
  {
    const at = 80.4;
    const half = right.intersect(box(at, 100, -1, 81, -1, T + 1));
    const cutFace = box(at, at + 0.2, -1, 81, -1, T + 1);
    scenes.push({
      id: 'g2-seam-slot-end',
      title: "Boards · the slot's end at the seam, cut: where a hook rests is whole (D277)",
      caption: [
        "Cut along the seam, 0.4 mm into the right board, through the slot's bottom end, where a hook rests. The groove",
        "takes only the front millimetre (top), as the slot's own chamfer does; the straight wall under it is untouched.",
      ],
      legend: [
        ['the cut face, the front at the top', COLOURS.orange],
        ['the slot beyond the cut', COLOURS.grey],
      ],
      camera: { position: [20, 31, 2.5], target: [at, 31, 2.5], fov: 9 },
      labels: [
        { text: 'the V groove: the front 1 mm', at: [at, 26, 4.6], dx: -60, dy: -90 },
        { text: "the slot's end: a straight wall from 1 to 4 mm deep", at: [at, 32.4, 2.5], dx: -120, dy: 120 },
        { text: 'the slot', at: [at, 36, 2.5], dx: 60, dy: -110 },
      ],
      meshes: [mesh(half.subtract(cutFace), COLOURS.grey), mesh(half.intersect(cutFace), COLOURS.orange)],
    });
  }

  // G3: a board closed all round, its edges chamfered front and back
  {
    const board = built('solid', { widthMm: 80, heightMm: 80, sides: closed });
    // all but what lies 1.05 mm inside the outline, as a cut through its middle draws it
    const rings = board.slice(T / 2).toPolygons();
    const ring = rings.reduce((a, r) => (r.length > a.length ? r : a), rings[0]);
    const inside = new CrossSection([ring])
      .offset(-1.05, 'Round')
      .extrude(T + 4)
      .translate([0, 0, -2]);
    const outer = box(-1, 81, -1, 81, -1, T + 1).subtract(inside);
    scenes.push({
      id: 'g3-closed-edges',
      title: 'Boards · closed edges chamfered 1 mm, front and back (D276)',
      caption: [
        "A closed side's edges are chamfered 1 mm at the front, on the bed as it prints, and at the back (orange); an",
        "open side's at the front only, as its back meets the next board's over the clip behind them.",
      ],
      legend: [
        ['the outer edge, front and back', COLOURS.orange],
        ['solid board, 80 x 80 mm, closed', COLOURS.grey],
      ],
      camera: { position: [128, -64, 62], target: [40, 34, 0], fov: 32 },
      labels: [
        { text: 'front edge', at: [80, 40, T], dx: 60, dy: -60 },
        { text: 'back edge', at: [80, 30, 0], dx: 70, dy: 60 },
      ],
      meshes: split(board, outer),
    });
  }
  return scenes;
}
