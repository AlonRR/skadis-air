// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The boards' design pass's figures (21 Oct 2026; docs/research/2026-10-21-boards-design-pass.md): each board as the
// page builds it, its front face up, the area of each finding in orange.

const T = 5; // the board's thickness

/** A ring's area, by the shoelace formula. */
const area = (ring) =>
  Math.abs(
    ring.reduce((a, [x, y], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length];
      return a + x * y2 - x2 * y;
    }, 0),
  ) / 2;

/** The outer ring of a board's outline, as a section through its middle draws it, with its area. */
function outerRing(kit, board) {
  const section = board.slice(T / 2);
  const rings = section.toPolygons();
  section.delete();
  return rings.reduce((best, ring) => (area(ring) > area(best) ? ring : best), rings[0]);
}

/** How far a ring reaches along x (k = 0) or y (k = 1). */
const span = (ring, k) => Math.max(...ring.map((p) => p[k])) - Math.min(...ring.map((p) => p[k]));
/** How far a ring's middle lies from the 80 mm board's centre. */
const fromMiddle = (ring) =>
  Math.hypot(
    ring.reduce((a, p) => a + p[0], 0) / ring.length - 40,
    ring.reduce((a, p) => a + p[1], 0) / ring.length - 40,
  );

export function build(kit) {
  const { box, cylinder, mesh, split, built, COLOURS, CrossSection, Manifold } = kit;
  const scenes = [];
  const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };

  // B1: the board's outer edges, front and back, square: the front one is the bed's edge when it prints
  {
    const board = built('solid', { widthMm: 80, heightMm: 80, sides: closed });
    const outline = new CrossSection([outerRing(kit, board)]);
    const strip = outline.offset(1, 'Round').subtract(outline.offset(-1.2, 'Round'));
    const band = Manifold.union([
      strip.extrude(1.2).translate([0, 0, T - 1.2]),
      strip.extrude(1.2).translate([0, 0, -0.01]),
    ]);
    scenes.push({
      id: 'b1-board-edges',
      title: 'Boards · the outer edges, front and back, square',
      caption: [
        "A board's front prints on the bed, so its outer edge there shows the first layer's spread; front and back, the",
        "edges are square (orange), where the connectors now take a 1 mm chamfer, the slots' own. A closed edge here.",
      ],
      legend: [
        ['the outer edges, front and back', COLOURS.orange],
        ['solid board, 80 x 80 mm, closed', COLOURS.grey],
      ],
      camera: { position: [128, -64, 62], target: [40, 34, 0], fov: 32 },
      labels: [
        { text: 'front edge: on the bed', at: [80, 40, T], dx: 60, dy: -60 },
        { text: 'back edge', at: [80, 30, 0], dx: 70, dy: 60 },
      ],
      meshes: split(board, band),
    });
  }

  // B2: the seam between two boards, two flat faces butted on the show face
  {
    const left = built('solid', { widthMm: 80, heightMm: 80, sides: { ...closed, right: 'open' } });
    const right = built('solid', { widthMm: 80, heightMm: 80, sides: { ...closed, left: 'open' } }).translate([
      80, 0, 0,
    ]);
    const seam = box(78.8, 81.2, -1, 81, T - 1, T + 0.1);
    scenes.push({
      id: 'b2-seam',
      title: 'Boards · the seam, two flat faces butted on the front',
      caption: [
        'Two boards meet at their open sides, the slots running on across the seam. On the front the two faces simply',
        'butt (orange), so any step between them catches the light; the practice puts a V groove there, from chamfers.',
      ],
      legend: [
        ['the seam on the front', COLOURS.orange],
        ['two solid boards, open where they meet', COLOURS.grey],
      ],
      camera: { position: [118, -70, 92], target: [80, 32, 0], fov: 28 },
      labels: [{ text: 'the seam, butted', at: [80, 12, T], dx: 90, dy: -70 }],
      meshes: [...split(left, seam), ...split(right, seam)],
    });
  }

  // B3: the lightened board's cells, cut off where a closed edge crosses them
  {
    const board = built('lightened', { widthMm: 120, heightMm: 120, sides: closed });
    // the strip along the closed left edge, clear of the screw holes in its corners
    const cells = box(3, 14, 18, 102, 0.2, T - 0.2).subtract(board);
    scenes.push({
      id: 'b3-cut-cells',
      title: 'Lightened and skeleton boards · cells cut off by a closed edge',
      caption: [
        'Where a closed edge crosses the lattice, its cells end as part-cells against the edge band (shown filled,',
        "orange). At an open side the part-cells meet the next board's and make whole ones; at a closed edge they stay cut.",
      ],
      legend: [
        ['the cut cells at a closed edge', COLOURS.orange],
        ['lightened board, 120 x 120 mm, closed', COLOURS.grey],
      ],
      camera: { position: [-50, -40, 150], target: [30, 55, 0], fov: 32 },
      labels: [{ text: 'a cell cut off by the edge band', at: [6, 40, T], dx: -40, dy: -120 }],
      meshes: [mesh(board, COLOURS.grey), mesh(cells, COLOURS.orange, 0.85, false)],
    });
  }

  // B4: the lightened board's pocket corners, short circular rounds where the webs meet the rims
  {
    const board = built('lightened', { widthMm: 80, heightMm: 80 });
    // the pockets: the section's rings that are neither the outline nor a slot nor a screw hole
    const section = board.slice(T / 2);
    const rings = section.toPolygons();
    section.delete();
    const pockets = rings.filter((r) => span(r, 0) > 8 && span(r, 0) < 40 && span(r, 1) > 8 && span(r, 1) < 40);
    const pocket = pockets.reduce((best, r) => {
      return fromMiddle(r) < fromMiddle(best) ? r : best;
    }, pockets[0]);
    const corners = [0, 1].flatMap((k) => [
      pocket.reduce((a, p) => (p[k] < a[k] ? p : a), pocket[0]),
      pocket.reduce((a, p) => (p[k] > a[k] ? p : a), pocket[0]),
    ]);
    const near = Manifold.union(corners.map(([x, y]) => cylinder(x, y, 2.2, -1, T + 1)));
    const [cx, cy] = [corners[0][0], corners[0][1]];
    scenes.push({
      id: 'b4-pocket-corners',
      title: 'Lightened and skeleton boards · pocket corners, short circular rounds',
      caption: [
        "Each pocket's corners, where a web meets a rim, are rounded 1 mm (orange): a short circular fillet, the kind",
        'the practice finds reads as a feature of its own, where a long eased curve would run one member into the next.',
      ],
      legend: [
        ["round a pocket's corners", COLOURS.orange],
        ['lightened board, front', COLOURS.grey],
      ],
      camera: { position: [cx + 6, cy - 40, 52], target: [cx + 8, cy + 2, 2], fov: 30 },
      labels: [{ text: 'a 1 mm round where a web meets a rim', at: [cx, cy, T], dx: -80, dy: -90 }],
      meshes: split(board, near),
    });
  }

  // B5: a round head stands proud of the front
  {
    const board = built('solid', { widthMm: 80, heightMm: 80, sides: closed, screwHead: 'round' });
    const keep = box(-1, 81, 10, 81, -1, T + 1);
    const head = cylinder(10, 10, 4, T, T + 3.2);
    const shank = cylinder(10, 10, 2, -14, T);
    scenes.push({
      id: 'b5-round-head',
      title: 'Boards · a round head stands 3.2 mm proud of the front',
      caption: [
        'Cut through a corner hole. With "Round head" the hole is plain, so a pan head (orange, 8 x 3.2 mm for a 4 mm',
        'screw) stands on the show face, where the practice wants every head flush unless a limit forces a step.',
      ],
      legend: [
        ['the screw and its head', COLOURS.orange],
        ['solid board, cut', COLOURS.grey],
      ],
      camera: { position: [52, -52, 40], target: [16, 16, 3], fov: 30 },
      labels: [{ text: 'head proud of the front', at: [14, 10, T + 3.2], dx: 80, dy: -50 }],
      meshes: [
        mesh(board.intersect(keep), COLOURS.grey),
        mesh(head.intersect(box(0, 20, 10, 20, 0, 10)), COLOURS.orange),
        mesh(shank.intersect(box(0, 20, 10, 20, -20, 10)), COLOURS.orange),
      ],
    });
  }

  // B6: a board's own standoff, square where it meets the back and at its wall end
  {
    const board = built('solid', { widthMm: 80, heightMm: 80, sides: closed, standoffs: 'corners' });
    const h = 15;
    const ring = cylinder(10, 10, 6.4, -1.2, 0.6).subtract(cylinder(10, 10, 4.6, -2, 1));
    const end = cylinder(10, 10, 6, -h - 0.01, -h + 1).subtract(cylinder(10, 10, 4, -h - 1, -h + 2));
    scenes.push({
      id: 'b6-standoff',
      title: 'Boards · their own standoffs, square at the back and at the wall',
      caption: [
        "From behind: each standoff meets the board's back at a square inside corner, and its wall end is a square edge",
        '(orange). The corner is kept clear of the slot beside it (C83), so a blend there has little room; the end has all it needs.',
      ],
      legend: [
        ['where a standoff meets the back, and its wall end', COLOURS.orange],
        ['solid board on standoffs, from behind', COLOURS.grey],
      ],
      camera: { position: [-30, -46, -70], target: [16, 18, -6], fov: 32 },
      labels: [
        { text: 'meets the back, square', at: [10, 4.5, 0], dx: -100, dy: -70 },
        { text: 'wall end, square', at: [10, 4.5, -h], dx: -110, dy: 60 },
      ],
      meshes: split(board, Manifold.union([ring, end])),
    });
  }
  return scenes;
}
