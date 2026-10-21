// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// What every design pass's figures are made of: the library's own parts, split into the area a finding is about
// (orange) and the rest (grey), with pieces for context (a board, a room, a screw), as meshes a page draws with
// three.js (render.html). A pass is a module whose `build(kit)` returns its scenes; shoot.mjs runs it.
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

export const COLOURS = {
  grey: '#aeb4bb',
  orange: '#f76707',
  pale: '#ffc078',
  blue: '#339af0',
  glass: '#868e96',
  wall: '#dee2e6',
};

export async function makeKit(repo) {
  const lib = await import(pathToFileURL(join(repo, 'packages/core/dist/index.js')).href);
  const engine = await lib.loadEngine();
  const { Manifold } = engine;
  const box = (x0, x1, y0, y1, z0, z1) => Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
  const cylinder = (x, y, r, z0, z1, top = r) => Manifold.cylinder(z1 - z0, r, top, 96).translate([x, y, z0]);
  /** A solid as the page draws it: its points rounded to a micron, and whether its edges are drawn. */
  const mesh = (solid, color, opacity = 1, edges = true) => {
    const m = lib.meshOf(solid);
    return {
      color,
      opacity,
      edges,
      positions: Array.from(m.positions, (v) => Math.round(v * 1000) / 1000),
      triangles: Array.from(m.triangles),
    };
  };
  /** The part, its area of interest in orange and the rest in grey. */
  const split = (part, region) => [
    mesh(part.subtract(region), COLOURS.grey),
    mesh(part.intersect(region), COLOURS.orange),
  ];
  /** A page type's part at its starting values and the given ones, as it is built (not as it prints). */
  const built = (id, given = {}) => {
    const type = lib.boardType(id);
    const read = lib.readValues(type.settings, { ...lib.defaultValues(type.settings), ...given });
    if (!read.ok) throw new Error(`${id}: ${read.errors.map((e) => e.message).join('; ')}`);
    const made = lib.buildBoard(engine, type, read.values);
    if (!made.ok) throw new Error(`${id}: ${made.problem}`);
    return made.solid;
  };
  return { lib, engine, Manifold, CrossSection: engine.CrossSection, box, cylinder, mesh, split, built, COLOURS };
}
