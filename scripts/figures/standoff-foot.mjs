// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The 1-board standoff's foot (C463, 24 Oct 2026; the owner: "if a print needs a brim it should be reworked"): three
// standoffs side by side, the bed face seen from under the bed and the standoff in three-quarter view. Left to right:
// as it was (1 mm chamfer on the bed edge), as built now (0.4 mm, the library's own part), and the option not taken
// (a foot 1 mm wider, its chamfer kept). The first layer, the section 0 to 0.2 mm, is orange: what holds it to the bed.
//
//   node scripts/figures/shoot.mjs standoff-foot      -> .check/figures/standoff-foot/
//
// The "as it was" and "wider foot" are drawn here, as bodies of revolution with the library's dimensions; the
// scene checks its drawing of the part now against the library's own, in volume, so a wrong drawing shows.

const H = 15; // a standoff's starting height (D238)
const HOLE_R = 2.25; // the hole of a 4 mm screw, 4.5 mm across
const BODY_R = 5; // and the ring round it, 10 mm across
const MOUTH = 0.5; // the hole's chamfer, at each end
const TOP = 1; // the board edge's chamfer

/** A standoff as a body of revolution: the wall edge chamfered `bed` mm, and a foot `foot` mm wider than the ring. */
function revolved(kit, { bed, foot }) {
  const { Manifold, CrossSection } = kit;
  const outer =
    foot > 0
      ? [
          [BODY_R + foot - bed, 0],
          [BODY_R + foot, bed],
          [BODY_R, bed + foot],
        ]
      : [
          [BODY_R - bed, 0],
          [BODY_R, bed],
        ];
  const profile = [
    [HOLE_R + MOUTH, 0],
    ...outer,
    [BODY_R, H - TOP],
    [BODY_R - TOP, H],
    [HOLE_R + MOUTH, H],
    [HOLE_R, H - MOUTH],
    [HOLE_R, MOUTH],
  ];
  const section = new CrossSection([profile]);
  const solid = Manifold.revolve(section, 96);
  section.delete();
  return solid;
}

export async function build(kit) {
  const { box, mesh, lib, engine, COLOURS } = kit;
  const parts = [
    { id: 'was', x: -16, label: 'as it was', solid: revolved(kit, { bed: 1, foot: 0 }) },
    { id: 'now', x: 0, label: 'as built now', solid: lib.makeStandoff(engine, lib.standoffParams({ boards: '1' })) },
    { id: 'wider', x: 16, label: 'option not taken', solid: revolved(kit, { bed: 1, foot: 1 }) },
  ];
  // the drawing of "as it was" is checked against the library's part with the old chamfer's volume: the same body of
  // revolution with the new chamfer must match the library's part now
  const drawn = revolved(kit, { bed: lib.BED_CHAMFER_MM, foot: 0 }).volume();
  const real = parts[1].solid.volume();
  if (Math.abs(drawn - real) / real > 0.005) throw new Error(`the drawing is ${drawn} mm3, the library's part ${real}`);

  const placed = parts.map((p) => ({ ...p, area: p.solid.slice(0.1).area(), at: p.solid.translate([p.x, 0, 0]) }));
  const caption = [
    'A 10 mm ring, 15 mm tall, prints standing on its wall face: what holds it to the bed is the section 0.1 mm up',
    '(orange, the first layer). Chamfer 1 mm: 30.7 mm2 (49 % of its outline). 0.4 mm: 47.2 mm2 (76 %). A foot 1 mm wider: 59.6 mm2.',
  ];
  const legend = [
    ['the first layer, 0 to 0.2 mm', COLOURS.orange],
    ['the standoff', COLOURS.grey],
  ];
  const meshes = placed.flatMap((p) => {
    const layer = box(p.x - 9, p.x + 9, -9, 9, 0, 0.2);
    return [mesh(p.at.subtract(layer), COLOURS.grey), mesh(p.at.intersect(layer), COLOURS.orange)];
  });
  const labelsFor = (z, dy) =>
    placed.map((p) => ({ text: `${p.label}: ${p.area.toFixed(1)} mm2`, at: [p.x, -BODY_R, z], dx: 0, dy }));
  return [
    {
      id: 'bed-face',
      title: 'Standoff · the bed face and its first layer',
      caption,
      legend,
      // seen from under the bed, looking up, y down the screen so that x runs to the right
      camera: { position: [0, 6, -62], target: [0, 0, 0], fov: 30, up: [0, -1, 0] },
      labels: placed.map((p) => ({
        text: `${p.label}: ${p.area.toFixed(1)} mm2`,
        at: [p.x, BODY_R, 0],
        dx: 0,
        dy: 90,
      })),
      meshes,
    },
    {
      id: 'three-quarter',
      title: 'Standoff · in three-quarter view',
      caption,
      legend,
      camera: { position: [34, -58, 42], target: [0, 0, 5], fov: 30 },
      labels: labelsFor(0, 60),
      meshes,
    },
    await trialScene(kit),
  ];
}

/** The trial plate's three standoffs, their dots in the board face, which is up as they print (C464). */
export async function trialScene(kit) {
  const { mesh, engine, COLOURS } = kit;
  const { trialStandoffs } = await import('../test-print/trial-standoffs.mjs');
  const trial = trialStandoffs(engine).map(({ solid }, k) => mesh(solid.translate([(k - 1) * 14, 0, 0]), COLOURS.grey));
  return {
    id: 'trial-dots',
    title: 'Trial standoffs · the dots on the face that is up as they print',
    caption: [
      '1, 2 or 3 dots, 1 mm across and 0.4 mm deep, in the board face (pilots 3.2, 3.4 and 3.6 mm);',
      'the bed face under them is whole.',
    ],
    legend: [['the three trial standoffs', COLOURS.grey]],
    camera: { position: [0, -22, 60], target: [0, 0, 15], fov: 30 },
    labels: [],
    meshes: trial,
  };
}
