// What a board type is (backlog item registry; D11): an id, a name, the settings it takes, how it
// builds from their values, and the part of its file name its values decide. A new type is one file
// that calls defineBoardType and one line in the list in index.ts; the page, the value checks and the
// file names are derived from that (the extension-registry practice).
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import { onBed, placeOnBed, printPose } from '../print-pose.js';
import { DEFAULT_BED, type Bed } from '../printer.js';
import { problemKeys, readValues, type Setting, type Values } from '../settings.js';
import { panelPlaces, wallPlan, type PanelKind } from '../tiling.js';

/** Where the page lists a type (D91): with the boards, or under "Connectors". */
export type Group = 'board' | 'connector';

export interface BoardType<S extends readonly Setting[]> {
  id: string; // lower-case words joined by hyphens; part of every file name
  name: string; // as the page lists it
  group?: Group; // a board unless set
  prints?: 'face-down' | 'as-built'; // how it goes on the bed: turned over (D66) unless set (C101)
  parts?: number; // the separate parts in one file: 1 unless set, as for a test pair (C107)
  /** A print that tests the printer before a board, as the fit coupon does (D357): a board, which the page offers
   * under "Test prints" at the top of every board's Advanced fold, not in the list of boards. Not one unless set. */
  testPrint?: boolean;
  description?: string;
  settings: S;
  // Methods, not function properties, so that a type with its own settings is still a board type.
  build(engine: Engine, values: Values<S>): Manifold;
  label(values: Values<S>): string; // the file name after "skadis-<id>-"
  /** What each screw passes, as a sentence the page shows beside the screw size (D264); none for a part with no
   * screw. */
  screws?(values: Values<S>): string | undefined;
  /** What the tape under the part holds, as a sentence the page shows beside the tape's settings (D609 a); none for a
   * part not on tape. */
  tape?(values: Values<S>): string | undefined;
}

export type AnyBoardType = BoardType<readonly Setting[]>;

export function groupOf(type: { group?: Group }): Group {
  return type.group ?? 'board';
}

/** Keeps a type's literal setting keys, so its build and label are typed from its own declaration. */
export function defineBoardType<const S extends readonly Setting[]>(type: BoardType<S>): BoardType<S> {
  return type;
}

/** A part built, or why it cannot be, and the settings to change for it by key, none when no one setting is to blame
 * (Q13). */
export type Built = { ok: true; solid: Manifold } | { ok: false; problem: string; keys: string[] };

/** The part as it goes to the printer: turned over, face down (D66), or as built for a type that says so; and, given
 * the bed, turned a quarter on it where it fits the bed only so, as a wall's panels may be cut to (D176; Q3). */
export function printedPart(type: { prints?: 'face-down' | 'as-built' }, solid: Manifold, bed?: Bed): Manifold {
  const posed = type.prints === 'as-built' ? placeOnBed(solid) : printPose(solid);
  if (bed === undefined) return posed;
  const placed = onBed(posed, bed);
  posed.delete();
  return placed;
}

/** A wall (D175): each kind of panel built once, as it is printed, with the places of its copies. */
export interface BuiltWall {
  panels: (PanelKind & { solid: Manifold })[];
}

/** The wall's panels in place as one solid; they touch at the seams. The panels stay the caller's. */
export function wallSolid(engine: Engine, wall: BuiltWall): Manifold {
  const copies = wall.panels.flatMap((p) => panelPlaces(p).map(([x, y]) => p.solid.translate([x, y, 0])));
  const solid = engine.Manifold.compose(copies);
  for (const c of copies) c.delete();
  return solid;
}

/** The wall a board type's values describe on this bed, or null when they describe one board. Throws a
 * RangeError, as a build does, when a panel cannot be made. */
export function buildWall<S extends readonly Setting[]>(
  engine: Engine,
  type: BoardType<S>,
  values: Values<S>,
  bed: Bed,
): BuiltWall | null {
  const plan = wallPlan(values, bed);
  if (plan === null) return null;
  const panels: BuiltWall['panels'] = [];
  try {
    for (const kind of plan.panels) {
      const read = readValues(type.settings, kind.values);
      if (!read.ok) throw new RangeError(read.errors.map((e) => e.message).join('; '));
      panels.push({ ...kind, solid: type.build(engine, read.values) });
    }
  } catch (error) {
    for (const p of panels) p.solid.delete();
    throw error;
  }
  return { panels };
}

/** Builds any board type, a wall on the default bed unless one is given; a combination of values it cannot
 * make comes back as a problem, not a throw. */
export function buildBoard<S extends readonly Setting[]>(
  engine: Engine,
  type: BoardType<S>,
  values: Values<S>,
  bed: Bed = DEFAULT_BED,
): Built {
  try {
    const wall = buildWall(engine, type, values, bed);
    if (wall === null) return { ok: true, solid: type.build(engine, values) };
    const solid = wallSolid(engine, wall);
    for (const p of wall.panels) p.solid.delete();
    return { ok: true, solid };
  } catch (error) {
    if (error instanceof RangeError) return { ok: false, problem: error.message, keys: problemKeys(error) };
    throw error;
  }
}

export function boardFileName<S extends readonly Setting[]>(
  type: BoardType<S>,
  values: Values<S>,
  extension: 'stl' | '3mf',
): string {
  return `skadis-${type.id}-${type.label(values)}.${extension}`;
}
