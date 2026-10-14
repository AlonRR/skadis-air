// The standoff connector (backlog item conn-standoff; D92 to D94): a hollow spacer that goes between a
// board and the wall at a corner screw hole, the screw through both (D93). It is the size of the built-in
// standoffs (D94, C83), so it keeps the same room round the slots. Built standing on z = 0, centred on
// its hole; this is the spacer for one board.
import type { CrossSection, Manifold } from 'manifold-3d';
import type { Engine } from './engine.js';
import { screwHole } from './mounting.js';
import { circle } from './rings.js';
import { WALL_DISTANCE_MM } from './skadis.js';

export interface StandoffParams {
  heightMm: number; // how far it holds the board off the wall (D94)
  screwMm: number; // the screw's diameter (D76)
}

export const STANDOFF_DEFAULTS: StandoffParams = { heightMm: WALL_DISTANCE_MM, screwMm: 4 };

/** A standoff's settings, with the starting values filled in, refused when they cannot make one. */
export function standoffParams(given: Partial<StandoffParams>): StandoffParams {
  const p: StandoffParams = { ...STANDOFF_DEFAULTS, ...given };
  if (!(p.heightMm > 0)) throw new RangeError('The standoff must be more than 0 mm tall');
  if (!(p.screwMm > 0)) throw new RangeError('The screw size must be more than 0 mm');
  return p;
}

export function makeStandoff(engine: Engine, params: StandoffParams): Manifold {
  const p = standoffParams(params);
  const { holeMm, standoffDiameterMm } = screwHole(p.screwMm);
  // One outline with the hole inside it, extruded once: a single solid, nothing joined.
  const ring: CrossSection = new engine.CrossSection(
    [circle(0, 0, standoffDiameterMm), circle(0, 0, holeMm)],
    'EvenOdd',
  );
  const part = ring.extrude(p.heightMm);
  ring.delete();
  return part;
}
